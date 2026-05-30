import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { loginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./public/landing.component').then(m => m.LandingComponent) },
  { path: 'login', canActivate: [loginGuard], loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  {
    path: 'forgot-password',
    loadComponent: () => import('./change-password-request/change-password-request').then(m => m.ChangePasswordRequest)
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./change-password/change-password')
        .then(m => m.ChangePasswordComponent)
  },

  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'profile', loadComponent: () => import('./auth/profile/profile').then(m => m.ProfileComponent) },


      /* SUPER_ADMIN only */
      {
        path: 'users',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () => import('./pages/users/users').then(m => m.Users)
      },
      {
        path: 'points-de-vente',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () => import('./pages/points-de-vente/points-de-vente.component').then(m => m.PointsDeVenteComponent)
      },

      /* SUPER_ADMIN + RESPONSABLE_FB */
      {
        path: 'caissier',
        canActivate: [roleGuard('RESPONSABLE_FB', 'SUPER_ADMIN')],
        loadComponent: () => import('./pages/caissier/caissier').then(m => m.CaissierComponent)
      },
      {
        path: 'caissiers-approval',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/caissier-approval/caissier-approval').then(m => m.CaissierApprovalComponent)
      },
      {
        path: 'plannings',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/plannings/plannings.component').then(m => m.PlanningsComponent)
      },

      /* CHEF_CUISINE + CHEF_MAGASIN + SUPER_ADMIN (products) */
      {
        path: 'products',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT', 'RESPONSABLE_FB', 'RESPONSABLE_HYGIENE')],
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
      },

      /* Stocks: SUPER_ADMIN + CHEF_MAGASIN */
      {
        path: 'stocks',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_MAGASIN')],
        loadComponent: () => import('./pages/stocks/stocks.component').then(m => m.StocksComponent)
      },

      /* Internal orders: SUPER_ADMIN + RESPONSABLE_FB + CHEF_CUISINE + CHEF_MAGASIN */
      {
        path: 'internal-orders',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN')],
        loadComponent: () => import('./pages/internal-orders/internal-orders.component').then(m => m.InternalOrdersComponent)
      },

      /* Menus: SUPER_ADMIN + CHEF_CUISINE only */
      {
        path: 'menus',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_CUISINE')],
        loadComponent: () => import('./pages/menus/menus.component').then(m => m.MenusComponent)
      },

      /* Sales: SUPER_ADMIN + CAISSIER only */
      {
        path: 'sales',
        canActivate: [roleGuard('SUPER_ADMIN', 'CAISSIER')],
        loadComponent: () => import('./pages/sales/sales.component').then(m => m.SalesComponent)
      },

      /* Hygiene Reports: SUPER_ADMIN + RESPONSABLE_HYGIENE */
      {
        path: 'hygiene-reports',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_HYGIENE')],
        loadComponent: () => import('./pages/hygiene-reports/hygiene-reports.component').then(m => m.HygieneReportsComponent)
      },

      /* Category: SUPER_ADMIN + RESPONSABLE_ACHAT */
      {
        path: 'category',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_ACHAT')],
        loadComponent: () => import('./pages/category/category').then(m => m.CategoryComponent)
      },

      /* Products Validation: SUPER_ADMIN + RESPONSABLE_ACHAT */
      {
        path: 'products-validation',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_ACHAT')],
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent),
        data: { validationMode: true }
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
