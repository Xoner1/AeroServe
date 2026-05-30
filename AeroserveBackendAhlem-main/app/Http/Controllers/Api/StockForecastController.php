<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StockForecastController extends Controller
{
    /**
     * Tendance de consommation et prévision de stockout
     */
    public function forecast(): JsonResponse
    {
        $products = Product::with('stock')->where('is_active', true)->get();
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        $forecastData = [];

        foreach ($products as $product) {
            $currentStock = $product->stock ? $product->stock->quantity : 0;
            $unit = $product->stock ? $product->stock->unit : 'unit';

            // Calculate total 'out' movements in the last 30 days
            $totalWithdrawn = StockMovement::whereHas('stock', function ($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->where('type', 'out')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->sum('quantity');

            $dailyAvg = round($totalWithdrawn / 30, 2);
            $daysLeft = null;
            $status = 'STABLE';

            if ($dailyAvg > 0) {
                $daysLeft = round($currentStock / $dailyAvg, 1);
                if ($daysLeft <= 3) {
                    $status = 'CRITIQUE';
                } elseif ($daysLeft <= 7) {
                    $status = 'MOYEN';
                }
            } else {
                $daysLeft = 999; // Unlimited if no consumption
            }

            $forecastData[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'type' => $product->type,
                'current_stock' => $currentStock,
                'unit' => $unit,
                'daily_average' => $dailyAvg,
                'days_left' => $daysLeft === 999 ? '∞' : $daysLeft,
                'status' => $status
            ];
        }

        return response()->json($forecastData);
    }

    /**
     * Détecter les anomalies de consommation (ex: aujourd'hui > 3x la moyenne)
     */
    public function anomalies(): JsonResponse
    {
        $products = Product::with('stock')->where('is_active', true)->get();
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $todayStart = Carbon::today();

        $anomalies = [];

        foreach ($products as $product) {
            // Get 30-day average daily out movement
            $totalWithdrawn = StockMovement::whereHas('stock', function ($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->where('type', 'out')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->sum('quantity');

            $dailyAvg = $totalWithdrawn / 30;

            // Get today's out movements
            $todayWithdrawn = StockMovement::whereHas('stock', function ($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->where('type', 'out')
            ->where('created_at', '>=', $todayStart)
            ->sum('quantity');

            if ($dailyAvg > 0.5 && $todayWithdrawn > ($dailyAvg * 3)) {
                $anomalies[] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'daily_average' => round($dailyAvg, 2),
                    'today_consumption' => $todayWithdrawn,
                    'ratio' => round($todayWithdrawn / $dailyAvg, 1),
                    'message' => "Surconsommation détectée: la quantité sortie aujourd'hui est " . round($todayWithdrawn / $dailyAvg, 1) . " fois supérieure à la moyenne habituelle."
                ];
            }
        }

        return response()->json($anomalies);
    }

    /**
     * Recommandations d'achat basées sur les prévisions
     */
    public function recommendations(): JsonResponse
    {
        $products = Product::with('stock')->where('is_active', true)->get();
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        $recommendations = [];

        foreach ($products as $product) {
            $currentStock = $product->stock ? $product->stock->quantity : 0;
            $unit = $product->stock ? $product->stock->unit : 'unit';

            $totalWithdrawn = StockMovement::whereHas('stock', function ($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->where('type', 'out')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->sum('quantity');

            $dailyAvg = $totalWithdrawn / 30;

            if ($dailyAvg > 0) {
                $daysLeft = $currentStock / $dailyAvg;
                // If stock runs out within 10 days
                if ($daysLeft <= 10) {
                    // Recommend quantities to cover 30 days of consumption
                    $recommendedQty = ceil(($dailyAvg * 30) - $currentStock);
                    if ($recommendedQty > 0) {
                        $recommendations[] = [
                            'product_id' => $product->id,
                            'name' => $product->name,
                            'type' => $product->type,
                            'current_stock' => $currentStock,
                            'unit' => $unit,
                            'days_left' => round($daysLeft, 1),
                            'recommended_qty' => $recommendedQty,
                            'reason' => "Le stock actuel de " . round($currentStock) . " {$unit} risque d'être épuisé d'ici " . round($daysLeft, 1) . " jours."
                        ];
                    }
                }
            }
        }

        return response()->json($recommendations);
    }
}
