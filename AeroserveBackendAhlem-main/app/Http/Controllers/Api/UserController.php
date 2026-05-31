<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Mail\UserCreatedMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    // ─── List all users ───────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = User::with('role', 'pointDeVente');

        if ($request->has('role')) {
            $query->whereHas('role', fn($q) => $q->where('name', $request->role));
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

 public function updateCaissier(Request $request, User $user): JsonResponse
    {
        $authUser = auth()->user();

        if ($user->role?->name !== 'CAISSIER') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un caissier.'], 422);
        }

        // FB cannot modify inactive or en_attente caissier
        if ($authUser->role?->name === 'RESPONSABLE_FB' && ($user->status === 'inactive' || $user->status === 'en_attente')) {
            return response()->json(['message' => 'Operation forbidden for this cashier status.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'phone'      => 'nullable|string|max:20',
            'pdv_id'     => 'nullable|exists:points_de_vente,id',
            'status'     => 'sometimes|in:active,inactive',
            'age'        => 'nullable|integer|min:18|max:70',
            'experience' => 'nullable|boolean',
            'bio'        => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Validate status: cannot set back to en_attente if already active/inactive
        if ($request->has('status') && $request->status === 'en_attente') {
            return response()->json([
                'message' => 'Impossible de remettre un caissier en attente une fois activé ou désactivé.'
            ], 422);
        }

        $user->update($request->only([
            'first_name', 'last_name', 'email', 'phone', 'pdv_id', 'status', 'age', 'experience', 'bio'
        ]));

        return response()->json([
            'message' => 'Caissier mis à jour avec succès.',
            'user' => $user->fresh()->load('role')
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'role_id'    => 'required|exists:roles,id',
            'phone'      => 'nullable|string|max:20',
            'pdv_id'     => 'nullable|exists:points_de_vente,id',
            'avatar'     => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

      $role = Role::findOrFail($request->role_id);

if ($role->name === 'SUPER_ADMIN') {
    return response()->json([
        'message' => 'You are not allowed to create a SUPER ADMIN user.'
    ], 403);
}

// existing rule
if ($role->name === 'CAISSIER') {
    return response()->json([
        'message' => 'Use /caissiers endpoint to create a cashier.'
    ], 403);
}

        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        // Status is NOT provided at creation — defaults to 'active'
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $request->email,
            'role_id'    => $request->role_id,
            'phone'      => $request->phone,
            'pdv_id'     => $request->pdv_id,
            'password'   => Hash::make($request->password),
            'status'     => 'active',
            'avatar'     => $avatarPath,
        ]);

        Mail::to($user->email)->send(
            new UserCreatedMail($user, $request->password, $role->name)
        );

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'user' => $user->load('role')
        ], 201);
    }

    // ─── Show user ────────────────────────────────────────────────────────────


    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('role', 'pointDeVente.airport'));
    }

    // ─── Update user (role NOT modifiable) ───────────────────────────────────

    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'phone'      => 'sometimes|nullable|string|max:20',
            'pdv_id'     => 'sometimes|nullable|exists:points_de_vente,id',
            'status'     => 'sometimes|in:active,en_attente,inactive',
            'avatar'     => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        // Validate cashier status: cannot set back to en_attente if already active/inactive
        if ($request->has('status') && $request->status === 'en_attente' && $user->role?->name === 'CAISSIER' && in_array($user->status, ['active', 'inactive'])) {
            return response()->json([
                'message' => 'Impossible de remettre un caissier en attente une fois activé ou désactivé.'
            ], 422);
        }

        // Role is NOT modifiable after creation
        $data = $request->only([
            'first_name', 'last_name', 'email', 'phone', 'pdv_id', 'status',
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    // ─── Delete user ──────────────────────────────────────────────────────────

    public function destroy(User $user): JsonResponse
    {
        $user->delete();
        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    // ─── Roles list ───────────────────────────────────────────────────────────

    public function roles(): JsonResponse
    {
        return response()->json(Role::all());
    }

    // ─── Check email ──────────────────────────────────────────────────────────

    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $exists = User::where('email', $request->email)->exists();
        return response()->json(['exists' => $exists]);
    }

    // ─── Caissier management ──────────────────────────────────────────────────

    public function createCaissier(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'phone'      => 'nullable|string|max:20',
            'pdv_id'     => 'nullable|exists:points_de_vente,id',
            'password'   => 'required|min:8',
            'age'        => 'nullable|integer|min:18|max:70',
            'experience' => 'nullable|boolean',
            'bio'        => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $caissierRole = Role::where('name', 'CAISSIER')->firstOrFail();

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $request->email,
            'phone'      => $request->phone,
            'pdv_id'     => $request->pdv_id,
            'password'   => Hash::make($request->password),
            'role_id'    => $caissierRole->id,
            'status'     => 'en_attente',
            'age'        => $request->age,
            'experience' => $request->experience ?? false,
            'bio'        => $request->bio,
        ]);

        return response()->json([
            'message' => 'Caissier créé avec succès.',
            'user' => $user->load('role')
        ], 201);
    }

    public function listCaissiers(): JsonResponse
    {
        $caissiers = User::whereHas('role', fn($q) => $q->where('name', 'CAISSIER'))
            ->with('role', 'pointDeVente')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($caissiers);
    }


    public function updateCaissierStatus(Request $request, User $user): JsonResponse
    {
        if ($user->role?->name !== 'CAISSIER') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un caissier.'], 422);
        }

        $request->validate([
            'status' => 'required|in:active,en_attente,inactive',
        ]);

        // Cannot set back to en_attente if already active or inactive
        if ($request->status === 'en_attente' && in_array($user->status, ['active', 'inactive'])) {
            return response()->json([
                'message' => 'Impossible de remettre un caissier en attente s\'il est déjà actif ou inactif.'
            ], 422);
        }

        $user->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Statut du caissier mis à jour.',
            'user' => $user->fresh()->load('role', 'pointDeVente'),
        ]);
    }

    public function approveCaissier(User $user): JsonResponse
    {
        if ($user->role?->name !== 'CAISSIER') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un caissier.'], 422);
        }
        $user->update(['status' => 'active']);
        return response()->json([
            'message' => 'Caissier approuvé.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function rejectCaissier(User $user): JsonResponse
    {
        if ($user->role?->name !== 'CAISSIER') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un caissier.'], 422);
        }
        $user->update(['status' => 'inactive']);
        return response()->json([
            'message' => 'Caissier rejeté.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function pendingCaissiers(): JsonResponse
    {
        $pending = User::whereHas('role', fn($q) => $q->where('name', 'CAISSIER'))
            ->where('status', 'en_attente')
            ->with('role', 'pointDeVente')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($pending);
    }

    public function deleteCaissier(User $user): JsonResponse
    {
        if ($user->role?->name !== 'CAISSIER') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un caissier.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Caissier supprimé avec succès.']);
    }

    public function getCaissiers(): JsonResponse
    {
        return response()->json(
            User::caissiers()
                ->with('pointDeVente')
                ->get()
        );
    }

    public function assignPointDeVente(Request $request, User $user): JsonResponse
    {
        $user->update([
            'point_de_vente_id' => $request->point_de_vente_id,
            'caissier_status'   => $request->status ?? 'active',
        ]);
        return response()->json($user->load('pointDeVente'));
    }
}
