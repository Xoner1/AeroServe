<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Traits\FifoStockTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    use FifoStockTrait;
    public function index(Request $request): JsonResponse
    {
        $query = Stock::with('product.category');

        // Stock should only show approved products
        $query->whereHas('product', fn($q) => $q->where('approval_status', 'approved'));

        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'min_threshold');
        }

        $paginated = $query->paginate(15);
        
        // Calculate daily stats
        $dailyInputs = StockMovement::where('type', 'in')
            ->whereDate('created_at', today())
            ->sum('quantity');

        $dailyOutputs = StockMovement::where('type', 'out')
            ->whereDate('created_at', today())
            ->sum('quantity');

        $totalStock = Stock::whereHas('product', fn($q) => $q->where('approval_status', 'approved'))
            ->sum('quantity');

        $criticalCount = Stock::whereHas('product', fn($q) => $q->where('approval_status', 'approved'))
            ->whereColumn('quantity', '<=', 'min_threshold')
            ->count();

        return response()->json([
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'kpis' => [
                'total_stock' => $totalStock,
                'daily_inputs' => $dailyInputs,
                'daily_outputs' => $dailyOutputs,
                'critical_count' => $criticalCount
            ]
        ]);
    }

    public function show(Stock $stock): JsonResponse
    {
        return response()->json(
            $stock->load('product.category', 'movements.user')
        );
    }

    public function addMovement(Request $request, Stock $stock): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'nullable|string|max:500',
            'expiration_date' => 'nullable|date',
        ]);

        DB::transaction(function () use ($stock, $request) {
            if ($request->type === 'out') {
                // FIFO: deduct from oldest/soonest-expiring batches first
                $this->fifoDeduction($stock, (float) $request->quantity, $request->reason);
            } else {
                $stock->movements()->create([
                    'type' => $request->type,
                    'quantity' => $request->quantity,
                    'reason' => $request->reason,
                    'expiration_date' => $request->expiration_date,
                    'user_id' => auth()->id(),
                ]);

                match ($request->type) {
                    'in' => $stock->increment('quantity', $request->quantity),
                    'adjustment' => $stock->update(['quantity' => $request->quantity]),
                    default => null,
                };
            }
        });

        $stock->refresh();

        // Alert if stock falls below threshold
        $this->notifyLowStockIfNecessary($stock);

        // Alert for near-expiration products
        $this->checkExpirationAlerts($stock);

        return response()->json([
            'message' => 'Mouvement de stock enregistré.',
            'stock' => $stock->fresh()->load('product'),
        ]);
    }

    public function movements(Stock $stock): JsonResponse
    {
        $movements = $stock->movements()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($movements);
    }

    public function updateThreshold(Request $request, Stock $stock): JsonResponse
    {
        $request->validate([
            'min_threshold' => 'required|numeric|min:0',
        ]);

        $stock->update(['min_threshold' => $request->min_threshold]);

        return response()->json([
            'message' => 'Seuil mis à jour.',
            'stock' => $stock,
        ]);
    }

    public function lowStockAlerts(): JsonResponse
    {
        $lowStocks = Stock::with('product')
            ->whereHas('product', fn($q) => $q->where('approval_status', 'approved'))
            ->whereColumn('quantity', '<=', 'min_threshold')
            ->get();

        return response()->json($lowStocks);
    }

    public function expiredProducts(): JsonResponse
    {
        $expired = StockMovement::where('type', 'in')
            ->whereNotNull('expiration_date')
            ->where('expiration_date', '<', now())
            ->where('quantity', '>', 0)
            ->with('stock.product')
            ->get();

        return response()->json($expired);
    }

    private function checkExpirationAlerts(Stock $stock): void
    {
        $nearExpiry = StockMovement::where('stock_id', $stock->id)
            ->where('type', 'in')
            ->whereNotNull('expiration_date')
            ->where('expiration_date', '<=', now()->addDays(7))
            ->where('expiration_date', '>=', now())
            ->exists();

        if ($nearExpiry) {
            $productName = $stock->product?->name ?? 'Produit';
            $users = User::whereHas('role', fn($q) => $q->whereIn('name', ['CHEF_MAGASIN', 'RESPONSABLE_HYGIENE']))->get();

            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'Produit proche expiration',
                    'message' => "Le produit \"{$productName}\" expire bientôt.",
                    'type' => 'alert',
                    'is_read' => false,
                    'data' => ['stock_id' => $stock->id],
                ]);
            }
        }
    }
}
