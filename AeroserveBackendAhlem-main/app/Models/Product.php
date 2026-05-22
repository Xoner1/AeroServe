<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Product extends Model
{
    protected $fillable = [
        'name', 'description', 'type', 'category_id', 'price',
        'image', 'is_active', 'allergens', 'expiration_date',
        'approval_status', 'created_by', 'usage_status',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'allergens' => 'array',
            'price' => 'decimal:2',
            'expiration_date' => 'date',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stock(): HasOne
    {
        return $this->hasOne(Stock::class);
    }

    // For food products: ingredients (matiere_premiere)
    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_recipe', 'food_product_id', 'ingredient_id')
            ->withPivot('quantity', 'unit')
            ->withTimestamps();
    }

    // For matiere_premiere: used in which food products
    public function usedInRecipes(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_recipe', 'ingredient_id', 'food_product_id')
            ->withPivot('quantity', 'unit')
            ->withTimestamps();
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function hygieneReports(): HasMany
    {
        return $this->hasMany(HygieneReport::class);
    }
}
