<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Stock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        // Total sales
        $totalSales = Sale::whereBetween('created_at', [$dateFrom, $dateTo])->sum('total_amount');
        $salesCount = Sale::whereBetween('created_at', [$dateFrom, $dateTo])->count();

        // Popular products
        $popularProducts = SaleItem::select('product_id', DB::raw('SUM(quantity) as total_sold'))
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->groupBy('product_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->with('product')
            ->get();

        // Low stock alerts
        $lowStockCount = Stock::whereColumn('quantity', '<=', 'min_threshold')->count();

        // Expired products
        $expiredCount = Product::where('expiration_date', '<', now())->where('is_active', true)->count();

        // Sales by PDV
        $salesByPdv = Sale::select('pdv_id', DB::raw('SUM(total_amount) as total'), DB::raw('COUNT(*) as count'))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('pdv_id')
            ->with('pointDeVente')
            ->get();

        // Daily sales for chart
        $dailySales = Sale::select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'total_sales' => $totalSales,
            'sales_count' => $salesCount,
            'popular_products' => $popularProducts,
            'low_stock_count' => $lowStockCount,
            'expired_products_count' => $expiredCount,
            'sales_by_pdv' => $salesByPdv,
            'daily_sales' => $dailySales,
        ]);
    }
}
