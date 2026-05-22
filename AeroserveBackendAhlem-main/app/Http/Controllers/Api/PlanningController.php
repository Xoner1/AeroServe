<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Planning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanningController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Planning::with('caissier.role', 'pointDeVente', 'createdBy');

        if ($request->has('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        if ($request->has('caissier_id')) {
            $query->where('caissier_id', $request->caissier_id);
        }

        if ($request->has('pdv_id')) {
            $query->where('pdv_id', $request->pdv_id);
        }

        return response()->json($query->orderBy('date')->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'caissier_id' => 'required|exists:users,id',
            'pdv_id' => 'required|exists:points_de_vente,id',
            'date' => 'required|date',
            'is_day_off' => 'sometimes|boolean',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
        ]);

        $planning = Planning::create([
            ...$request->only(['caissier_id', 'pdv_id', 'date', 'is_day_off', 'start_time', 'end_time']),
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Planning créé.',
            'planning' => $planning->load('caissier', 'pointDeVente'),
        ], 201);
    }

    public function update(Request $request, Planning $planning): JsonResponse
    {
        $request->validate([
            'pdv_id' => 'sometimes|exists:points_de_vente,id',
            'date' => 'sometimes|date',
            'is_day_off' => 'sometimes|boolean',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
        ]);

        $planning->update($request->only(['pdv_id', 'date', 'is_day_off', 'start_time', 'end_time']));

        return response()->json([
            'message' => 'Planning mis à jour.',
            'planning' => $planning->fresh()->load('caissier', 'pointDeVente'),
        ]);
    }

    public function destroy(Planning $planning): JsonResponse
    {
        $planning->delete();

        return response()->json(['message' => 'Planning supprimé.']);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'plannings' => 'required|array|min:1',
            'plannings.*.caissier_id' => 'required|exists:users,id',
            'plannings.*.pdv_id' => 'required|exists:points_de_vente,id',
            'plannings.*.date' => 'required|date',
            'plannings.*.is_day_off' => 'sometimes|boolean',
            'plannings.*.start_time' => 'nullable|date_format:H:i',
            'plannings.*.end_time' => 'nullable|date_format:H:i',
        ]);

        $created = [];
        foreach ($request->plannings as $plan) {
            $created[] = Planning::updateOrCreate(
                ['caissier_id' => $plan['caissier_id'], 'date' => $plan['date']],
                [
                    ...$plan,
                    'created_by' => auth()->id(),
                ]
            );
        }

        return response()->json([
            'message' => count($created) . ' plannings créés/mis à jour.',
            'plannings' => $created,
        ], 201);
    }
}
