<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InternalOrder;
use App\Models\Notification;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InternalOrder::with('creator', 'assignee', 'pointDeVente', 'items.product');

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // If user is Chef Cuisine, only show food orders assigned to them
        $user = auth()->user();
        if ($user->role?->name === 'CHEF_CUISINE') {
            $query->where('type', 'food')->where('assigned_to', $user->id);
        } elseif ($user->role?->name === 'CHEF_MAGASIN') {
            $query->where('type', 'commercial')->where('assigned_to', $user->id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }
public function getProductsByCategories(Request $request): JsonResponse
{
    $request->validate([
        'category_ids' => 'required|array|min:1',
        'category_ids.*' => 'exists:categories,id',
    ]);

    $products = Product::whereIn('category_id', $request->category_ids)
        ->where('is_active', true)
        ->where('approval_status', 'approved')
        ->select('id', 'name', 'price', 'category_id', 'type', 'image')
        ->get();

    return response()->json([
        'data' => $products
    ]);
}
 public function store(Request $request): JsonResponse
{
    $request->validate([
        'type' => 'required|in:food,commercial',
        'pdv_id' => 'nullable|exists:points_de_vente,id',
        'notes' => 'nullable|string',
        'delivery_date' => 'nullable|date',

        'items' => 'required|array|min:1',
        'items.*.product_id' => 'required|exists:products,id',
        'items.*.quantity_requested' => 'required|numeric|min:0.01',
    ]);

    // 🔥 assignation automatique chef
    $assignedRole = $request->type === 'food'
        ? 'CHEF_CUISINE'
        : 'CHEF_MAGASIN';

    $assignee = User::whereHas('role', function ($q) use ($assignedRole) {
        $q->where('name', $assignedRole);
    })->first();

    // 🧾 création commande
    $order = InternalOrder::create([
        'type' => $request->type,
        'status' => 'EN_ATTENTE', // 🔥 IMPORTANT (initial state)
        'created_by' => auth()->id(),
        'assigned_to' => $assignee?->id,
        'pdv_id' => $request->pdv_id,
        'notes' => $request->notes,
        'delivery_date' => $request->delivery_date,
    ]);

    // 📦 items (produits sélectionnés)
    foreach ($request->items as $item) {

        $product = Product::find($item['product_id']);

        // 🔥 sécurité métier
        if (!$product || !$product->is_active || $product->approval_status !== 'approved') {
            continue;
        }

        $order->items()->create([
            'product_id' => $product->id,
            'quantity_requested' => $item['quantity_requested'],
            'quantity_fulfilled' => 0,
        ]);
    }

    // Notify assignee about the new order
    if ($assignee) {
        Notification::create([
            'user_id' => $assignee->id,
            'title' => 'New Internal Order',
            'message' => "A new internal order of type {$order->type} has been created and assigned to you.",
            'type' => 'info',
            'is_read' => false,
            'data' => ['order_id' => $order->id]
        ]);
    }

    return response()->json([
        'message' => 'Commande créée avec succès',
        'order' => $order->load('items.product', 'assignee')
    ], 201);
}
    public function show(InternalOrder $internalOrder): JsonResponse
    {
        return response()->json(
            $internalOrder->load('creator', 'assignee', 'pointDeVente', 'items.product', 'comments.user')
        );
    }

    public function updateStatus(Request $request, InternalOrder $internalOrder): JsonResponse
    {
        // Prevent caissier from updating status
        $user = auth()->user();
        if ($user->role?->name === 'CAISSIER') {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à modifier le statut de la commande.',
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:EN_ATTENTE,DISPONIBLE,PARTIELLEMENT_DISPONIBLE,NON_DISPONIBLE',
        ]);

        $oldStatus = $internalOrder->status;
        $internalOrder->update(['status' => $request->status]);

        // Send notifications
        $this->notifyOrderStatusChanged($internalOrder, $oldStatus);

        return response()->json([
            'message' => 'Statut de la commande mis à jour.',
            'order' => $internalOrder->fresh()->load('items.product'),
        ]);
    }

    public function fulfillItem(Request $request, InternalOrder $internalOrder, int $itemId): JsonResponse
    {
        $item = $internalOrder->items()->findOrFail($itemId);

        $request->validate([
            'quantity_fulfilled' => 'required|numeric|min:0|max:' . $item->quantity_requested,
        ]);

        $oldStatus = $internalOrder->status;
        $item->update(['quantity_fulfilled' => $request->quantity_fulfilled]);

        // Auto-update order status based on fulfillment
        $order = $internalOrder->fresh()->load('items');
        $totalRequested = $order->items->sum('quantity_requested');
        $totalFulfilled = $order->items->sum('quantity_fulfilled');

        $newStatus = 'PARTIELLEMENT_DISPONIBLE';
        if ($totalFulfilled == 0) {
            $newStatus = 'NON_DISPONIBLE';
        } elseif ($totalFulfilled >= $totalRequested) {
            $newStatus = 'DISPONIBLE';
        }

        $order->update(['status' => $newStatus]);

        if ($oldStatus !== $newStatus) {
            $this->notifyOrderStatusChanged($order, $oldStatus);
        }

        return response()->json([
            'message' => 'Quantité mise à jour.',
            'order' => $order->load('items.product'),
        ]);
    }

    private function notifyOrderStatusChanged(InternalOrder $order, string $oldStatus): void
    {
        // Notify creator (F&B Manager) if not current user
        if ($order->created_by && $order->created_by !== auth()->id()) {
            Notification::create([
                'user_id' => $order->created_by,
                'title' => 'Order Status Updated',
                'message' => "Internal Order #{$order->id} status changed from {$oldStatus} to {$order->status}.",
                'type' => 'info',
                'is_read' => false,
                'data' => ['order_id' => $order->id]
            ]);
        }

        // Notify assignee if not current user
        if ($order->assigned_to && $order->assigned_to !== auth()->id()) {
            Notification::create([
                'user_id' => $order->assigned_to,
                'title' => 'Order Status Updated',
                'message' => "Internal Order #{$order->id} status changed from {$oldStatus} to {$order->status}.",
                'type' => 'info',
                'is_read' => false,
                'data' => ['order_id' => $order->id]
            ]);
        }
    }

    public function destroy(InternalOrder $internalOrder): JsonResponse
    {
        $internalOrder->delete();

        return response()->json(['message' => 'Commande interne supprimée.']);
    }
}
