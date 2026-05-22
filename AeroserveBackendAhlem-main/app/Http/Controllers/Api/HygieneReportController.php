<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HygieneReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HygieneReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = HygieneReport::with('product', 'inspector');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'allergens_verified' => 'required|boolean',
            'expiration_verified' => 'required|boolean',
            'status' => 'required|in:conforme,non_conforme,en_cours',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $report = HygieneReport::create([
            ...$request->only(['product_id', 'allergens_verified', 'expiration_verified', 'status', 'remarks']),
            'inspected_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Rapport d\'hygiène créé.',
            'report' => $report->load('product', 'inspector'),
        ], 201);
    }

    public function show(HygieneReport $hygieneReport): JsonResponse
    {
        return response()->json($hygieneReport->load('product.allergens', 'inspector'));
    }

    public function update(Request $request, HygieneReport $hygieneReport): JsonResponse
    {
        $request->validate([
            'allergens_verified' => 'sometimes|boolean',
            'expiration_verified' => 'sometimes|boolean',
            'status' => 'sometimes|in:conforme,non_conforme,en_cours',
            'remarks' => 'sometimes|nullable|string|max:1000',
        ]);

        $hygieneReport->update($request->only([
            'allergens_verified', 'expiration_verified', 'status', 'remarks',
        ]));

        return response()->json([
            'message' => 'Rapport mis à jour.',
            'report' => $hygieneReport->fresh()->load('product', 'inspector'),
        ]);
    }

    public function destroy(HygieneReport $hygieneReport): JsonResponse
    {
        $hygieneReport->delete();

        return response()->json(['message' => 'Rapport supprimé.']);
    }
}
