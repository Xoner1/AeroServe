<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'commentable_type' => 'required|in:internal_order,product',
            'commentable_id' => 'required|integer',
            'body' => 'required|string|max:1000',
        ]);

        $typeMap = [
            'internal_order' => \App\Models\InternalOrder::class,
            'product' => \App\Models\Product::class,
        ];

        $comment = Comment::create([
            'user_id' => auth()->id(),
            'commentable_type' => $typeMap[$request->commentable_type],
            'commentable_id' => $request->commentable_id,
            'body' => $request->body,
        ]);

        // Send notifications
        $userName = auth()->user()->first_name . ' ' . auth()->user()->last_name;
        if ($request->commentable_type === 'internal_order') {
            $order = \App\Models\InternalOrder::find($request->commentable_id);
            if ($order) {
                // Notify creator (F&B) if not current user
                if ($order->created_by && $order->created_by !== auth()->id()) {
                    Notification::create([
                        'user_id' => $order->created_by,
                        'title' => 'New Comment on Order',
                        'message' => "{$userName} added a comment on Order #{$order->id}: \"{$comment->body}\"",
                        'type' => 'comment',
                        'is_read' => false,
                        'data' => ['order_id' => $order->id]
                    ]);
                }
                // Notify assignee (Chef Cuisine / Chef Magasin) if not current user
                if ($order->assigned_to && $order->assigned_to !== auth()->id()) {
                    Notification::create([
                        'user_id' => $order->assigned_to,
                        'title' => 'New Comment on Order',
                        'message' => "{$userName} added a comment on Order #{$order->id}: \"{$comment->body}\"",
                        'type' => 'comment',
                        'is_read' => false,
                        'data' => ['order_id' => $order->id]
                    ]);
                }
            }
        } elseif ($request->commentable_type === 'product') {
            $product = \App\Models\Product::find($request->commentable_id);
            if ($product) {
                // Notify product creator if not current user
                if ($product->created_by && $product->created_by !== auth()->id()) {
                    Notification::create([
                        'user_id' => $product->created_by,
                        'title' => 'New Comment on Product',
                        'message' => "{$userName} added a comment on Product \"{$product->name}\": \"{$comment->body}\"",
                        'type' => 'comment',
                        'is_read' => false,
                        'data' => ['product_id' => $product->id]
                    ]);
                }

                // Notify Responsable Achat if not current user
                $purchasingUsers = User::whereHas('role', fn($q) => $q->where('name', 'RESPONSABLE_ACHAT'))->get();
                foreach ($purchasingUsers as $pu) {
                    if ($pu->id !== auth()->id()) {
                        Notification::create([
                            'user_id' => $pu->id,
                            'title' => 'New Comment on Product',
                            'message' => "{$userName} added a comment on Product \"{$product->name}\": \"{$comment->body}\"",
                            'type' => 'comment',
                            'is_read' => false,
                            'data' => ['product_id' => $product->id]
                        ]);
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Commentaire ajouté.',
            'comment' => $comment->load('user'),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'commentable_type' => 'required|in:internal_order,product',
            'commentable_id' => 'required|integer',
        ]);

        $typeMap = [
            'internal_order' => \App\Models\InternalOrder::class,
            'product' => \App\Models\Product::class,
        ];

        $comments = Comment::where('commentable_type', $typeMap[$request->commentable_type])
            ->where('commentable_id', $request->commentable_id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($comments);
    }
}
