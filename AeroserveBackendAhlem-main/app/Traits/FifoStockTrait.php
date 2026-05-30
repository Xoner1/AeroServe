<?php

namespace App\Traits;

use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Notification;

trait FifoStockTrait
{
    /**
     * Deduct quantity from a stock using FIFO strategy and record the movement.
     *
     * @param Stock $stock
     * @param float $quantityNeeded
     * @param string|null $reason
     * @return void
     */
    protected function fifoDeduction(Stock $stock, float $quantityNeeded, ?string $reason = null): void
    {
        $batches = StockMovement::where('stock_id', $stock->id)
            ->where('type', 'in')
            ->where('quantity', '>', 0)
            ->orderByRaw('ISNULL(expiration_date) ASC')
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $remaining = $quantityNeeded;

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

        // Record the out movement
        $stock->movements()->create([
            'type' => 'out',
            'quantity' => $quantityNeeded,
            'reason' => $reason ?? 'FIFO deduction',
            'user_id' => auth()->id(),
        ]);

        $stock->decrement('quantity', $quantityNeeded);

        // Check and trigger low stock notification
        $this->notifyLowStockIfNecessary($stock);
    }

    /**
     * Check if stock quantity is below min_threshold and notify users.
     */
    protected function notifyLowStockIfNecessary(Stock $stock): void
    {
        if ($stock->quantity <= $stock->min_threshold) {
            $productName = $stock->product?->name ?? 'Produit';
            $users = User::whereHas('role', fn($q) => $q->whereIn('name', ['CHEF_MAGASIN', 'RESPONSABLE_ACHAT']))->get();

            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'Alerte stock bas',
                    'message' => "Le stock de \"{$productName}\" est bas ({$stock->quantity} unités restantes).",
                    'type' => 'warning',
                    'is_read' => false,
                    'data' => ['stock_id' => $stock->id, 'product_id' => $stock->product_id],
                ]);
            }
        }
    }
}
