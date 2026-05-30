<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Stock;
use App\Traits\FifoStockTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    use FifoStockTrait;
    public function index(Request $request): JsonResponse
    {
        $query = Sale::with('caissier', 'pointDeVente', 'items.product');

        if ($request->has('pdv_id')) {
            $query->where('pdv_id', $request->pdv_id);
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'pdv_id' => 'nullable|exists:points_de_vente,id',
            'payment_method' => 'sometimes|in:cash,card,other',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        $pdvId = $request->pdv_id ?? auth()->user()?->pdv_id;
        if (!$pdvId) {
            return response()->json(['message' => 'Le point de vente est requis.'], 422);
        }

        // 1. Verify stock sufficiency for all items BEFORE proceeding
        foreach ($request->items as $item) {
            $stock = Stock::where('product_id', $item['product_id'])->first();
            $product = Product::find($item['product_id']);
            $productName = $product?->name ?? 'Produit';

            if (!$stock || $stock->quantity < $item['quantity']) {
                $available = $stock ? $stock->quantity : 0;
                return response()->json([
                    'message' => "Stock insuffisant pour \"{$productName}\". Quantité demandée : {$item['quantity']}, Quantité disponible : {$available}."
                ], 422);
            }
        }

        // 2. Create the sale
        $sale = Sale::create([
            'caissier_id' => auth()->id(),
            'pdv_id' => $pdvId,
            'payment_method' => $request->payment_method ?? 'cash',
            'total_amount' => 0,
        ]);

        $total = 0;
        foreach ($request->items as $item) {
            $unitPrice = $item['unit_price'] ?? Product::find($item['product_id'])?->price;
            if ($unitPrice === null) {
                return response()->json(['message' => 'Prix unitaire introuvable pour un article.'], 422);
            }

            $subtotal = $item['quantity'] * $unitPrice;
            $total += $subtotal;

            $sale->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $unitPrice,
                'subtotal' => $subtotal,
            ]);

            // 3. Deduct from stock using unified FIFO trait
            $stock = Stock::where('product_id', $item['product_id'])->first();
            if ($stock) {
                $this->fifoDeduction($stock, (float) $item['quantity'], 'Vente #' . $sale->id);
            }
        }

        $sale->update(['total_amount' => $total]);

        return response()->json([
            'message' => 'Vente enregistrée avec succès.',
            'sale' => $sale->load('items.product'),
        ], 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json($sale->load('caissier', 'pointDeVente', 'items.product'));
    }
}
