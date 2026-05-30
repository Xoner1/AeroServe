<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\User;

Broadcast::channel('notifications.{userId}', function (User $user, int $userId) {
    return (int) $user->id === $userId;
});

Broadcast::channel('orders', function (User $user) {
    return true;
});

Broadcast::channel('hygiene', function (User $user) {
    return in_array($user->role?->name, ['SUPER_ADMIN', 'CHEF_MAGASIN', 'CHEF_CUISINE', 'RESPONSABLE_ACHAT', 'RESPONSABLE_HYGIENE']);
});
