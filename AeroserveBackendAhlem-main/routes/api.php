<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HygieneReportController;
use App\Http\Controllers\Api\InternalOrderController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PlanningController;
use App\Http\Controllers\Api\PointDeVenteController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockForecastController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/password/reset', [AuthController::class, 'resetPasswordWithToken']);

Route::middleware(['jwt.auth'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile', [AuthController::class, 'updateProfile']); // method spoofing for FormData uploads
    Route::put('/reset-password', [AuthController::class, 'resetPassword']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::get('/comments', [CommentController::class, 'index']);
    Route::post('/comments', [CommentController::class, 'store']);
    Route::post('/chatbot/ask', [ChatbotController::class, 'ask']);

    Route::get('/roles', [UserController::class, 'roles']);

    // Shared dashboard for authenticated users
    Route::get('/dashboard', [DashboardController::class, 'index']);

    /*
    |----------------------------------------------------------------------
    | Super Admin
    |----------------------------------------------------------------------
    */
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}', [UserController::class, 'update']); // FormData method spoofing

        Route::apiResource('points-de-vente', PointDeVenteController::class);
        Route::get('/airports', [PointDeVenteController::class, 'airports']);

        Route::get('/caissiers/pending', [UserController::class, 'pendingCaissiers']);
        Route::put('/users/{user}/approve', [UserController::class, 'approveCaissier']);
        Route::put('/users/{user}/reject', [UserController::class, 'rejectCaissier']);

        Route::get('/users/check-email', [UserController::class, 'checkEmail']);
        Route::put('/caissiers/{user}/status', [UserController::class, 'updateCaissierStatus']);
        Route::put('/users/{user}/caissier', [UserController::class, 'updateCaissier']);
        Route::delete('/users/{user}/caissier', [UserController::class, 'deleteCaissier']);
    });

    /*
    |----------------------------------------------------------------------
    | Responsable F&B
    |----------------------------------------------------------------------
    */
    Route::middleware('role:RESPONSABLE_FB,SUPER_ADMIN')->group(function () {
        Route::post('/caissiers', [UserController::class, 'createCaissier']);
        Route::get('/caissier', [UserController::class, 'listCaissiers']);
        Route::put('/caissiers/{user}/status', [UserController::class, 'updateCaissierStatus']);
        Route::put('/users/{user}/caissier', [UserController::class, 'updateCaissier']);
        Route::delete('/users/{user}/caissier', [UserController::class, 'deleteCaissier']);

        Route::post('/products/by-categories', [InternalOrderController::class, 'getProductsByCategories']);

        Route::apiResource('internal-orders', InternalOrderController::class)->only(['index', 'store', 'show', 'destroy']);

        Route::apiResource('plannings', PlanningController::class);
        Route::post('/plannings/bulk', [PlanningController::class, 'bulkStore']);
        Route::get('/points-de-vente', [PointDeVenteController::class, 'index']);
    });

    /*
    |----------------------------------------------------------------------
    | Chef Cuisine (exclusif : recettes, menus)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:CHEF_CUISINE,SUPER_ADMIN')->group(function () {
        Route::put('/products/{product}/recipe', [ProductController::class, 'setRecipe']);

        Route::apiResource('menus', MenuController::class);
        Route::get('/menus/current-week', [MenuController::class, 'currentWeek']);
    });

    /*
    |----------------------------------------------------------------------
    | Chef Magasin (exclusif : stocks)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:CHEF_MAGASIN,SUPER_ADMIN,RESPONSABLE_FB')->group(function () {
        Route::apiResource('stocks', StockController::class)->only(['index', 'show']);
        Route::post('/stocks/{stock}/movements', [StockController::class, 'addMovement']);
        Route::get('/stocks/{stock}/movements', [StockController::class, 'movements']);
        Route::put('/stocks/{stock}/threshold', [StockController::class, 'updateThreshold']);
    });

    /*
    |----------------------------------------------------------------------
    | Produits & Commandes internes — Chef Cuisine + Chef Magasin (mutualisé)
    | ↳ Remplace les deux blocs séparés qui causaient un conflit de routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:CHEF_CUISINE,CHEF_MAGASIN,SUPER_ADMIN')->group(function () {
        Route::apiResource('products', ProductController::class);
        Route::put('/products/{product}/toggle-active', [ProductController::class, 'toggleActive']);

        Route::put('/internal-orders/{internalOrder}/status', [InternalOrderController::class, 'updateStatus']);
        Route::put('/internal-orders/{internalOrder}/items/{item}/fulfill', [InternalOrderController::class, 'fulfillItem']);
    });

    /*
    |----------------------------------------------------------------------
    | Responsable Hygiène
    |----------------------------------------------------------------------
    */
    Route::middleware('role:RESPONSABLE_HYGIENE,SUPER_ADMIN')->group(function () {
        Route::apiResource('hygiene-reports', HygieneReportController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Responsable Achat
    |----------------------------------------------------------------------
    */
    Route::middleware('role:RESPONSABLE_ACHAT,SUPER_ADMIN')->group(function () {
        Route::get('/stock-forecast', [StockForecastController::class, 'forecast']);
        Route::get('/stock-anomalies', [StockForecastController::class, 'anomalies']);
        Route::get('/stock-recommendations', [StockForecastController::class, 'recommendations']);
        Route::put('/products/{product}/approve', [ProductController::class, 'approveProduct']);
        Route::post('/categories', [ProductController::class, 'storeCategory']);
        Route::put('/categories/{category}', [ProductController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [ProductController::class, 'destroyCategory']);
    });

    /*
    |----------------------------------------------------------------------
    | Caissier
    |----------------------------------------------------------------------
    */
    Route::middleware('role:CAISSIER,SUPER_ADMIN')->group(function () {
        Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show']);
    });

    /*
    |----------------------------------------------------------------------
    | Lecture partagée — restreinte aux rôles autorisés (CAISSIER exclu)
    | ↳ Remplace les routes ouvertes à tous les utilisateurs authentifiés
    |----------------------------------------------------------------------
    */
    Route::middleware('role:CHEF_CUISINE,CHEF_MAGASIN,RESPONSABLE_FB,RESPONSABLE_ACHAT,RESPONSABLE_HYGIENE,SUPER_ADMIN')->group(function () {
        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/{product}', [ProductController::class, 'show']);
        Route::get('/categories', [ProductController::class, 'categories']);
        Route::get('/internal-orders', [InternalOrderController::class, 'index']);
        Route::get('/internal-orders/{internalOrder}', [InternalOrderController::class, 'show']);
        Route::get('/stocks/alerts/low', [StockController::class, 'lowStockAlerts']);
        Route::get('/stocks/alerts/expired', [StockController::class, 'expiredProducts']);
    });
});
