<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Notification;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Menu::with('items.product', 'creator')->orderBy('week_start', 'desc')->paginate(10)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'week_start' => 'required|date',
            'week_end' => 'required|date|after:week_start',
            'items' => 'sometimes|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.day_of_week' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'items.*.meal_type' => 'sometimes|in:breakfast,lunch,dinner,snack',
        ]);

        // Check stock availability for each item
        $insufficientStock = [];
        if ($request->has('items')) {
            foreach ($request->items as $item) {
                $product = Product::with('stock')->find($item['product_id']);
                if (!$product || !$product->stock) {
                    $insufficientStock[] = [
                        'product' => $product?->name ?? 'Unknown',
                        'reason' => 'No stock available'
                    ];
                    continue;
                }

                $requiredQty = $item['quantity'] ?? 1;
                if ($product->stock->quantity < $requiredQty) {
                    $insufficientStock[] = [
                        'product' => $product->name,
                        'required' => $requiredQty,
                        'available' => $product->stock->quantity,
                        'reason' => 'Insufficient stock'
                    ];
                }
            }
        }

        // If stock is insufficient, reject and notify Chef Magasin
        if (count($insufficientStock) > 0) {
            $this->notifyChefMagasinLowStock($insufficientStock);

            return response()->json([
                'message' => 'Insufficient stock to create this menu.',
                'details' => $insufficientStock,
            ], 422);
        }

        // If stock is sufficient, accept menu and update stock (FIFO)
        $menu = Menu::create([
            ...$request->only(['name', 'week_start', 'week_end']),
            'created_by' => auth()->id(),
        ]);

        if ($request->has('items')) {
            foreach ($request->items as $item) {
                $menu->items()->create($item);

                // Update stock using FIFO
                $product = Product::with('stock')->find($item['product_id']);
                if ($product && $product->stock) {
                    $requiredQty = $item['quantity'] ?? 1;
                    $this->fifoDeduction($product->stock, $requiredQty);
                }
            }
        }

        return response()->json([
            'message' => 'Menu créé et stock mis à jour.',
            'menu' => $menu->load('items.product'),
        ], 201);
    }

    public function show(Menu $menu): JsonResponse
    {
        return response()->json($menu->load('items.product', 'creator'));
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'week_start' => 'sometimes|date',
            'week_end' => 'sometimes|date',
            'is_active' => 'sometimes|boolean',
            'items' => 'sometimes|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.day_of_week' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'items.*.meal_type' => 'sometimes|in:breakfast,lunch,dinner,snack',
        ]);

        $menu->update($request->only(['name', 'week_start', 'week_end', 'is_active']));

        if ($request->has('items')) {
            $menu->items()->delete();
            foreach ($request->items as $item) {
                $menu->items()->create($item);
            }
        }

        return response()->json([
            'message' => 'Menu mis à jour.',
            'menu' => $menu->fresh()->load('items.product'),
        ]);
    }

    public function destroy(Menu $menu): JsonResponse
    {
        $menu->delete();

        return response()->json(['message' => 'Menu supprimé.']);
    }

    public function currentWeek(): JsonResponse
    {
        $menu = Menu::with('items.product')
            ->where('is_active', true)
            ->where('week_start', '<=', now())
            ->where('week_end', '>=', now())
            ->first();

        return response()->json($menu);
    }

    // ─── FIFO Deduction Helper ───────────────────────────────────────────────

    private function fifoDeduction(Stock $stock, float $quantity): void
    {
        $batches = \App\Models\StockMovement::where('stock_id', $stock->id)
            ->where('type', 'in')
            ->where('quantity', '>', 0)
            ->orderByRaw('ISNULL(expiration_date) ASC')
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $remaining = $quantity;

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;

            if ($batch->quantity >= $remaining) {
                $batch->decrement('quantity', $remaining);
                $remaining = 0;
            } else {
                $remaining -= $batch->quantity;
                $batch->update(['quantity' => 0]);
            }
        }

        $stock->decrement('quantity', $quantity);
    }

    private function notifyChefMagasinLowStock(array $insufficientStock): void
    {
        $chefMagasinUsers = User::whereHas('role', fn($q) => $q->where('name', 'CHEF_MAGASIN'))->get();

        $stockDetails = collect($insufficientStock)->map(function ($item) {
            if (isset($item['required'])) {
                return "- {$item['product']}: Requis {$item['required']}, Disponible {$item['available']}";
            }
            return "- {$item['product']}: {$item['reason']}";
        })->implode("\n");

        foreach ($chefMagasinUsers as $user) {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Stock Insuffisant pour Menu',
                'message' => "Impossible de créer le menu. Stock insuffisant pour:\n{$stockDetails}",
                'type' => 'warning',
                'is_read' => false,
                'data' => ['stock_issues' => $insufficientStock],
            ]);
        }
    }
}
