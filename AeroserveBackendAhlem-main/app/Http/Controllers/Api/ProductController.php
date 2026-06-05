<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Notification;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category', 'creator', 'stock');

        $user = auth()->user();
        $role = $user->role?->name;

        // Chef Magasin: only COMMERCIAL and MATIERE_PREMIERE
        if ($role === 'CHEF_MAGASIN') {
            $query->whereIn('type', ['commercial', 'matiere_premiere']);
        }

        // Chef Cuisine: only FOOD (unless requesting ingredients/all types for recipe builder)
        if ($role === 'CHEF_CUISINE') {
            if (!$request->boolean('all_types')) {
                $query->where('type', 'food');
            }
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('approval_status')) {
            $query->where('approval_status', $request->approval_status);
        }

        if ($request->boolean('no_paginate')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        $role = $user->role?->name;

        // Chef Magasin: simplified validation (no price, expiration, allergens)
        if ($role === 'CHEF_MAGASIN') {
            $request->validate([
                'name' => 'required|string|max:255|unique:products,name',
                'description' => 'nullable|string',
                'type' => 'required|in:commercial,matiere_premiere',
                'category_id' => 'required|exists:categories,id',
                'image' => 'nullable|image|max:2048',
            ]);
        } elseif ($role === 'CHEF_CUISINE') {
            $request->validate([
                'name' => 'required|string|max:255|unique:products,name',
                'description' => 'nullable|string',
                'type' => 'required|in:food',
                'category_id' => 'required|exists:categories,id',
                'image' => 'nullable|image|max:2048',
                'quantity_per_batch' => 'required|integer|min:1',
                'ingredients' => 'required|array|min:1',
                'ingredients.*.product_id' => 'required|exists:products,id',
                'ingredients.*.quantity' => 'required|numeric|min:0.01',
                'ingredients.*.unit' => 'sometimes|string',
            ]);
        } else {
            $request->validate([
                'name' => 'required|string|max:255|unique:products,name',
                'description' => 'nullable|string',
                'type' => 'required|in:commercial,matiere_premiere,food',
                'category_id' => 'required|exists:categories,id',
                'price' => 'nullable|numeric|min:0',
                'image' => 'nullable|image|max:2048',
                'allergens' => 'nullable|array',
                'expiration_date' => 'nullable|date',
            ]);
        }

        // CHECK TYPE vs CATEGORY
        if ($request->filled('category_id')) {
            $category = Category::find($request->category_id);
            if ($category && $category->type !== $request->type) {
                return response()->json([
                    'message' => 'Le type du produit ne correspond pas à la catégorie.'
                ], 422);
            }
        } elseif ($request->type !== 'food') {
            return response()->json([
                'message' => 'La catégorie est obligatoire pour ce type de produit.'
            ], 422);
        }

        $data = $request->only(['name', 'description', 'type']);
        $data['created_by'] = $user->id;
        $data['approval_status'] = 'pending';

        if ($request->has('quantity_per_batch')) {
            $data['quantity_per_batch'] = $request->quantity_per_batch;
        }

        if ($request->filled('category_id')) {
            $data['category_id'] = $request->category_id;
        } elseif ($request->type === 'food') {
            // Auto-assign first food category for food products
            $foodCategory = Category::where('type', 'food')->first();
            if ($foodCategory) {
                $data['category_id'] = $foodCategory->id;
            }
        }

        // Only add price/allergens/expiration if role allows it
        if (!in_array($role, ['CHEF_MAGASIN', 'CHEF_CUISINE'])) {
            if ($request->has('price')) $data['price'] = $request->price;
            if ($request->has('allergens')) $data['allergens'] = $request->allergens;
            if ($request->has('expiration_date')) $data['expiration_date'] = $request->expiration_date;
        }

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        if ($request->has('ingredients')) {
            $stockIssues = [];
            $approvalIssues = [];
            $batchSize = $request->quantity_per_batch ?? 1;
            foreach ($request->ingredients as $ingredient) {
                $ingredientProduct = Product::with('stock')->find($ingredient['product_id']);
                if (!$ingredientProduct) {
                    $stockIssues[] = [
                        'product' => 'Inconnu (ID: ' . $ingredient['product_id'] . ')',
                        'reason' => 'Produit introuvable',
                    ];
                    continue;
                }

                // Check that ingredient is APPROVED
                if ($ingredientProduct->approval_status !== 'approved') {
                    $approvalIssues[] = $ingredientProduct->name;
                }

                // Check stock sufficiency: ingredient.quantity × batchSize vs available
                $requiredQty = $ingredient['quantity'] * $batchSize;
                $stockQty = $ingredientProduct->stock ? $ingredientProduct->stock->quantity : 0;
                if ($stockQty < $requiredQty) {
                    $unit = $ingredient['unit'] ?? 'piece';
                    $stockIssues[] = [
                        'product' => $ingredientProduct->name,
                        'required' => $requiredQty,
                        'available' => $stockQty,
                        'unit' => $unit,
                    ];
                }
            }

            if (count($approvalIssues) > 0) {
                return response()->json([
                    'message' => 'Les ingrédients doivent être approuvés.',
                    'unapproved_ingredients' => $approvalIssues,
                ], 422);
            }

            if (count($stockIssues) > 0) {
                $details = collect($stockIssues)->map(fn($i) =>
                    "{$i['product']} : Stock insuffisant — {$i['available']} {$i['unit']} disponible(s), {$i['required']} {$i['unit']} requis(es)"
                )->implode("\n");
                return response()->json([
                    'message' => 'Stock insuffisant pour les ingrédients.',
                    'stock_issues' => $stockIssues,
                    'details' => $details,
                ], 422);
            }
        }

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create($data);

            // Sync ingredients recipe if provided
            if ($request->has('ingredients')) {
                $syncData = [];
                foreach ($request->ingredients as $ingredient) {
                    $syncData[$ingredient['product_id']] = [
                        'quantity' => $ingredient['quantity'],
                        'unit' => $ingredient['unit'] ?? 'piece',
                    ];
                }
                $product->ingredients()->sync($syncData);
            }

            // Auto-create stock with threshold 15
            $product->stock()->create([
                'quantity' => 0,
                'min_threshold' => 15,
                'unit' => 'piece',
            ]);

            return $product;
        });

        return response()->json([
            'message' => 'Produit créé.',
            'product' => $product->load('category', 'stock', 'ingredients'),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(
            $product->load('category', 'creator', 'stock', 'ingredients', 'hygieneReports.inspector')
        );
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $user = auth()->user();
        $role = $user->role?->name;

        // Prevent modification if approval_status is not 'pending' for Chef Magasin
        if ($role === 'CHEF_MAGASIN' && $product->approval_status !== 'pending') {
            // Chef Magasin can only update usage_status or image for approved/rejected products
            if (!empty(array_diff(array_keys($request->all()), ['usage_status', 'image']))) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas modifier ce produit après approbation ou rejet.'
                ], 403);
            }
        }

        // Chef Magasin: can only update if product is pending
        // If approved, can only change usage_status or image
        if ($role === 'CHEF_MAGASIN') {
            if ($product->approval_status === 'approved') {
                $request->validate([
                    'usage_status' => 'sometimes|in:IN_USE,NOT_IN_USE,OUT_OF_STOCK',
                    'image' => 'nullable|image|max:2048',
                ]);

                $data = $request->only(['usage_status']);

                if ($request->hasFile('image')) {
                    if ($product->image && Storage::disk('public')->exists($product->image)) {
                        Storage::disk('public')->delete($product->image);
                    }
                    $data['image'] = $request->file('image')->store('products', 'public');
                }

                $product->update($data);

                if ($role === 'CHEF_MAGASIN') {
                    $this->notifyResponsableAchat(
                        'Produit modifié',
                        "Le produit \"{$product->name}\" a été modifié par le Chef Magasin.",
                        'info',
                        ['product_id' => $product->id]
                    );
                }

                return response()->json([
                    'message' => 'Statut d\'utilisation mis à jour.',
                    'product' => $product->fresh()->load('category', 'stock'),
                ]);
            }

            // Pending: can update basic fields, image
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'sometimes|nullable|string',
                'category_id' => 'sometimes|nullable|exists:categories,id',
                'image' => 'nullable|image|max:2048',
            ]);

            $data = $request->only(['name', 'description', 'category_id']);
        } elseif ($role === 'CHEF_CUISINE') {
            // Chef Cuisine: can update name, description, recipe, quantity_per_batch
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'sometimes|nullable|string',
                'image' => 'nullable|image|max:2048',
                'quantity_per_batch' => 'sometimes|integer|min:1',
                'ingredients' => 'sometimes|array|min:1',
                'ingredients.*.product_id' => 'sometimes|exists:products,id',
                'ingredients.*.quantity' => 'sometimes|numeric|min:0.01',
                'ingredients.*.unit' => 'sometimes|string',
            ]);

            $data = $request->only(['name', 'description']);
            if ($request->has('quantity_per_batch')) {
                $data['quantity_per_batch'] = $request->quantity_per_batch;
            }

            // Re-check stock for recipe update
            if ($request->has('ingredients')) {
                $stockIssues = [];
                $approvalIssues = [];
                $batchSize = $product->quantity_per_batch ?? $request->quantity_per_batch ?? 1;
                foreach ($request->ingredients as $ingredient) {
                    $ingredientProduct = Product::with('stock')->find($ingredient['product_id']);
                    if ($ingredientProduct && $ingredientProduct->approval_status !== 'approved') {
                        $approvalIssues[] = $ingredientProduct->name;
                    }
                    if ($ingredientProduct && $ingredientProduct->stock) {
                        $requiredQty = $ingredient['quantity'] * $batchSize;
                        if ($ingredientProduct->stock->quantity < $requiredQty) {
                            $unit = $ingredient['unit'] ?? 'piece';
                            $stockIssues[] = [
                                'product' => $ingredientProduct->name,
                                'required' => $requiredQty,
                                'available' => $ingredientProduct->stock->quantity,
                                'unit' => $unit,
                            ];
                        }
                    }
                }

                if (count($approvalIssues) > 0) {
                    return response()->json([
                        'message' => 'Les ingrédients doivent être approuvés.',
                        'unapproved_ingredients' => $approvalIssues,
                    ], 422);
                }

                if (count($stockIssues) > 0) {
                    $details = collect($stockIssues)->map(fn($i) =>
                        "{$i['product']} : Stock insuffisant — {$i['available']} {$i['unit']} disponible(s), {$i['required']} {$i['unit']} requis(es)"
                    )->implode("\n");
                    return response()->json([
                        'message' => 'Stock insuffisant pour les ingrédients.',
                        'stock_issues' => $stockIssues,
                        'details' => $details,
                    ], 422);
                }
            }
        } else {
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'sometimes|nullable|string',
                'type' => 'sometimes|in:commercial,matiere_premiere,food',
                'category_id' => 'sometimes|nullable|exists:categories,id',
                'price' => 'sometimes|numeric|min:0',
                'image' => 'sometimes|nullable|image|max:2048',
                'is_active' => 'sometimes|boolean',
                'allergens' => 'sometimes|nullable|array',
                'expiration_date' => 'sometimes|nullable|date',
            ]);

            $data = $request->only([
                'name', 'description', 'type', 'category_id', 'price',
                'is_active', 'allergens', 'expiration_date',
            ]);
        }

        if ($request->hasFile('image')) {
            if ($product->image && Storage::disk('public')->exists($product->image)) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);

        // Sync recipe ingredients
        if ($request->has('ingredients')) {
            $syncData = [];
            foreach ($request->ingredients as $ingredient) {
                $syncData[$ingredient['product_id']] = [
                    'quantity' => $ingredient['quantity'],
                    'unit' => $ingredient['unit'] ?? 'piece',
                ];
            }
            $product->ingredients()->sync($syncData);
        }

        // Notify Responsable Achat when product is modified (by any role except Responsable Achat)
        if ($role !== 'RESPONSABLE_ACHAT') {
            $this->notifyResponsableAchat(
                'Produit modifié',
                "Le produit \"{$product->name}\" a été modifié.",
                'info',
                ['product_id' => $product->id]
            );
        }

        // Notify Chef Magasin when product is modified by Responsable Achat
        if ($role === 'RESPONSABLE_ACHAT') {
            $chefMagasinUsers = User::whereHas('role', fn($q) =>
                $q->where('name', 'CHEF_MAGASIN'))->get();
            foreach ($chefMagasinUsers as $chefUser) {
                Notification::create([
                    'user_id' => $chefUser->id,
                    'title'   => 'Produit modifié',
                    'message' => "Responsable Achat a modifié: {$product->name}",
                    'type'    => 'info',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'message' => 'Produit mis à jour.',
            'product' => $product->fresh()->load('category', 'stock'),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $productName = $product->name;
        $user = auth()->user();
        $role = $user->role?->name;

        $product->delete();

        // Notify Responsable Achat on deletion
        if ($role !== 'RESPONSABLE_ACHAT') {
            $this->notifyResponsableAchat(
                'Produit supprimé',
                "Le produit \"{$productName}\" a été supprimé.",
                'warning',
                ['product_name' => $productName]
            );
        }

        // Notify Chef Magasin if deletion was by Responsable Achat
        if ($role === 'RESPONSABLE_ACHAT') {
            $this->notifyChefMagasin(
                'Produit supprimé',
                "Le produit \"{$productName}\" a été supprimé par le Responsable Achat.",
                'warning',
                ['product_name' => $productName]
            );
        }

        return response()->json(['message' => 'Produit supprimé.']);
    }

    public function toggleActive(Product $product): JsonResponse
    {
        $product->update(['is_active' => !$product->is_active]);

        return response()->json([
            'message' => $product->is_active ? 'Produit activé.' : 'Produit désactivé.',
            'product' => $product,
        ]);
    }

    public function approveProduct(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'approval_status' => 'required|in:approved,rejected',
            'price' => 'nullable|numeric|min:0',
        ]);

        $data = ['approval_status' => $request->approval_status];

        // Add price when approving
        if ($request->approval_status === 'approved' && $request->has('price')) {
            $data['price'] = $request->price;
        }

        $product->update($data);

        // Notify Chef Magasin
        $status = $request->approval_status === 'approved' ? 'approuvé' : 'rejeté';
        $this->notifyChefMagasin(
            'Produit ' . $status,
            "Votre produit \"{$product->name}\" a été {$status} par le Responsable Achat.",
            $request->approval_status === 'approved' ? 'success' : 'warning',
            ['product_id' => $product->id]
        );

        return response()->json([
            'message' => 'Statut du produit mis à jour.',
            'product' => $product->fresh(),
        ]);
    }

    // Recipe management for food products
    public function setRecipe(Request $request, Product $product): JsonResponse
    {
        if ($product->type !== 'food') {
            return response()->json(['message' => 'Seuls les produits food peuvent avoir une recette.'], 422);
        }

        $request->validate([
            'ingredients' => 'required|array|min:1',
            'ingredients.*.product_id' => 'required|exists:products,id',
            'ingredients.*.quantity' => 'required|numeric|min:0.01',
            'ingredients.*.unit' => 'sometimes|string',
        ]);

        // Check stock and approval status for each ingredient
        $stockIssues = [];
        $approvalIssues = [];
        $batchSize = $product->quantity_per_batch ?? 1;
        foreach ($request->ingredients as $ingredient) {
            $ingredientProduct = Product::with('stock')->find($ingredient['product_id']);
            if ($ingredientProduct && $ingredientProduct->approval_status !== 'approved') {
                $approvalIssues[] = $ingredientProduct->name;
            }
            if ($ingredientProduct && $ingredientProduct->stock) {
                $requiredQty = $ingredient['quantity'] * $batchSize;
                if ($ingredientProduct->stock->quantity < $requiredQty) {
                    $unit = $ingredient['unit'] ?? 'piece';
                    $stockIssues[] = [
                        'product' => $ingredientProduct->name,
                        'required' => $requiredQty,
                        'available' => $ingredientProduct->stock->quantity,
                        'unit' => $unit,
                    ];
                }
            }
        }

        if (count($approvalIssues) > 0) {
            return response()->json([
                'message' => 'Les ingrédients doivent être approuvés.',
                'unapproved_ingredients' => $approvalIssues,
            ], 422);
        }

        if (count($stockIssues) > 0) {
            $details = collect($stockIssues)->map(fn($i) =>
                "{$i['product']} : Stock insuffisant — {$i['available']} {$i['unit']} disponible(s), {$i['required']} {$i['unit']} requis(es)"
            )->implode("\n");
            return response()->json([
                'message' => 'Stock insuffisant pour les ingrédients de la recette.',
                'stock_issues' => $stockIssues,
                'details' => $details,
            ], 422);
        }

        $syncData = [];
        foreach ($request->ingredients as $ingredient) {
            $syncData[$ingredient['product_id']] = [
                'quantity' => $ingredient['quantity'],
                'unit' => $ingredient['unit'] ?? 'piece',
            ];
        }

        $product->ingredients()->sync($syncData);

        return response()->json([
            'message' => 'Recette mise à jour.',
            'product' => $product->load('ingredients'),
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(Category::all());
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'type' => 'required|in:commercial,matiere_premiere,food',
            'code' => 'nullable|string|max:255|unique:categories,code',
        ]);

        $code = $request->code;
        if (empty($code)) {
            $prefix = match($request->type) {
                'commercial' => 'COM',
                'matiere_premiere' => 'MAT',
                'food' => 'FOOD',
            };
            $baseCode = substr($prefix . '_' . strtoupper(\Illuminate\Support\Str::slug($request->name, '_')), 0, 240);
            $code = $baseCode;
            // Ensure unique code
            $counter = 1;
            while (Category::where('code', $code)->exists()) {
                $code = $baseCode . '_' . $counter++;
            }
        }

        $category = Category::create([
            'name' => $request->name,
            'type' => $request->type,
            'code' => $code,
        ]);

        return response()->json([
            'message' => 'Catégorie créée avec succès.',
            'category' => $category
        ], 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255|unique:categories,name,' . $category->id,
            'code' => 'nullable|string|max:255|unique:categories,code,' . $category->id,
        ]);

        $category->update($request->only(['name', 'code']));

        return response()->json([
            'message' => 'Catégorie mise à jour.',
            'category' => $category->fresh()
        ]);
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer une catégorie qui contient des produits.'
            ], 422);
        }
        $category->delete();
        return response()->json(['message' => 'Catégorie supprimée.']);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function notifyResponsableAchat(string $title, string $message, string $type, array $data = []): void
    {
        $users = User::whereHas('role', fn($q) => $q->where('name', 'RESPONSABLE_ACHAT'))->get();
        foreach ($users as $user) {
            Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'is_read' => false,
                'data' => $data,
            ]);
        }
    }

    private function notifyChefMagasin(string $title, string $message, string $type, array $data = []): void
    {
        $users = User::whereHas('role', fn($q) => $q->where('name', 'CHEF_MAGASIN'))->get();
        foreach ($users as $user) {
            Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'is_read' => false,
                'data' => $data,
            ]);
        }
    }
}
