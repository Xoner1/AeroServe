<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\InternalOrder;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Menu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $role = $user->role?->name;

        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        // Total sales
        $totalSales = Sale::whereBetween('created_at', [$dateFrom, $dateTo])->sum('total_amount');
        $salesCount = Sale::whereBetween('created_at', [$dateFrom, $dateTo])->count();

        // Popular products
        $popularProducts = SaleItem::select('product_id', DB::raw('SUM(quantity) as total_sold'))
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->groupBy('product_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->with('product')
            ->get();

        // Low stock alerts
        $lowStockCount = Stock::whereColumn('quantity', '<=', 'min_threshold')->count();

        // Expired products count
        $expiredCount = Product::where('expiration_date', '<', now())->where('is_active', true)->count();

        // Sales by PDV
        $salesByPdv = Sale::select('pdv_id', DB::raw('SUM(total_amount) as total'), DB::raw('COUNT(*) as count'))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('pdv_id')
            ->with('pointDeVente')
            ->get();

        // Daily sales for chart
        $dailySales = Sale::select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // ─── ACTIVE USERS KPI ───
        $activeUsers = User::where('status', 'active')->count();

        // ─── F&B SPECIFIC METRICS ───
        $pendingOrders = InternalOrder::where('status', 'EN_ATTENTE')->count();
        $processedToday = InternalOrder::whereDate('updated_at', today())
            ->where('status', 'DISPONIBLE')->count();
        $delayedOrders = InternalOrder::where('delivery_date', '<', now())
            ->whereNotIn('status', ['DISPONIBLE'])->count();
        $kitchenLoad = InternalOrder::where('type', 'food')
            ->where('status', 'EN_ATTENTE')->count();
        $warehouseLoad = InternalOrder::where('type', 'commercial')
            ->where('status', 'EN_ATTENTE')->count();

        // ─── GASPILLAGE (WASTE) KPIs ───
        $wasteMovements = StockMovement::where('type', 'out')
            ->where(function($q) {
                $q->where('reason', 'LIKE', '%expir%')
                  ->orWhere('reason', 'LIKE', '%waste%')
                  ->orWhere('reason', 'LIKE', '%gaspill%')
                  ->orWhere('reason', 'LIKE', '%perte%');
            })
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->sum('quantity');

        $expiredBatches = StockMovement::where('type', 'in')
            ->whereNotNull('expiration_date')
            ->where('expiration_date', '<', now())
            ->where('quantity', '>', 0)
            ->sum('quantity');

        $totalWaste = $wasteMovements + $expiredBatches;

        $wasteTrend = StockMovement::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(quantity) as total')
            )
            ->where('type', 'out')
            ->where(function($q) {
                $q->where('reason', 'LIKE', '%expir%')
                  ->orWhere('reason', 'LIKE', '%waste%')
                  ->orWhere('reason', 'LIKE', '%perte%')
                  ->orWhere('reason', 'LIKE', '%gaspill%');
            })
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // ─── ROLE-SPECIFIC METRICS ───
        $roleData = [];

        if ($role === 'CHEF_MAGASIN') {
            $roleData['recent_movements'] = StockMovement::with('stock.product')->latest()->limit(5)->get();
            $roleData['critical_products_list'] = Stock::with('product.category')->whereColumn('quantity', '<=', 'min_threshold')->limit(5)->get();
            $roleData['expired_batches_list'] = StockMovement::with('stock.product')->where('type', 'in')->whereNotNull('expiration_date')->where('expiration_date', '<', now())->where('quantity', '>', 0)->limit(5)->get();
            $roleData['total_stock_qty'] = Stock::sum('quantity');
        } elseif ($role === 'CHEF_CUISINE') {
            $roleData['recipes_count'] = Product::where('type', 'food')->where('approval_status', 'approved')->count();
            $roleData['active_menu'] = Menu::with('items.product')->where('is_active', true)->where('week_start', '<=', now())->where('week_end', '>=', now())->first();
            $roleData['critical_ingredients'] = Stock::with('product')->whereHas('product', fn($q) => $q->whereIn('type', ['matiere_premiere', 'commercial']))->whereColumn('quantity', '<=', 'min_threshold')->limit(5)->get();
        } elseif ($role === 'CAISSIER') {
            $roleData['my_sales_today'] = Sale::where('caissier_id', $user->id)->whereDate('created_at', today())->sum('total_amount');
            $roleData['my_sales_count_today'] = Sale::where('caissier_id', $user->id)->whereDate('created_at', today())->count();
            $roleData['my_payment_breakdown'] = Sale::select('payment_method', DB::raw('SUM(total_amount) as total'))->where('caissier_id', $user->id)->whereDate('created_at', today())->groupBy('payment_method')->get();
            $roleData['my_recent_sales'] = Sale::where('caissier_id', $user->id)->latest()->limit(5)->with('pointDeVente')->get();
        }

        return response()->json([
            'total_sales' => $totalSales,
            'sales_count' => $salesCount,
            'popular_products' => $popularProducts,
            'low_stock_count' => $lowStockCount,
            'expired_products_count' => $expiredCount,
            'sales_by_pdv' => $salesByPdv,
            'daily_sales' => $dailySales,
            
            // New metrics
            'active_users' => $activeUsers,
            'pending_orders' => $pendingOrders,
            'processed_today' => $processedToday,
            'delayed_orders' => $delayedOrders,
            'kitchen_load' => $kitchenLoad,
            'warehouse_load' => $warehouseLoad,
            'total_waste' => $totalWaste,
            'waste_trend' => $wasteTrend,

            // Role specific
            'role_specific' => $roleData,
        ]);
    }
}
