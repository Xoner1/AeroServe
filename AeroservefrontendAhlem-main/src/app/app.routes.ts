import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ChangePasswordRequest } from './change-password-request/change-password-request';
import { ProfileComponent } from './auth/profile/profile';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./public/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  {
    path: 'forgot-password',
    component: ChangePasswordRequest
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
      { path: 'profile', component: ProfileComponent },
      {
        path: 'caissier',
        canActivate: [roleGuard('RESPONSABLE_FB', 'SUPER_ADMIN')],
        loadComponent: () => import('./pages/caissier/caissier').then(m => m.CaissierComponent)
      },
      {
        path: 'category',
        canActivate: [roleGuard('RESPONSABLE_ACHAT', 'SUPER_ADMIN')],
        loadComponent: () => import('./pages/category/category').then(m => m.CategoryComponent)
      },
      {
        path: 'caissiers-approval',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/caissier-approval/caissier-approval').then(m => m.CaissierApprovalComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () => import('./pages/users/users').then(m => m.Users)
      },
      {
        path: 'points-de-vente',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/points-de-vente/points-de-vente.component').then(m => m.PointsDeVenteComponent)
      },
      {
        path: 'products',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'stocks',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_MAGASIN', 'CHEF_CUISINE', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/stocks/stocks.component').then(m => m.StocksComponent)
      },
      {
        path: 'internal-orders',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN')],
        loadComponent: () => import('./pages/internal-orders/internal-orders.component').then(m => m.InternalOrdersComponent)
      },
      {
        path: 'menus',
        canActivate: [roleGuard('SUPER_ADMIN', 'CHEF_CUISINE', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/menus/menus.component').then(m => m.MenusComponent)
      },
      {
        path: 'plannings',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/plannings/plannings.component').then(m => m.PlanningsComponent)
      },
      {
        path: 'sales',
        canActivate: [roleGuard('SUPER_ADMIN', 'CAISSIER', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/sales/sales.component').then(m => m.SalesComponent)
      },
      {
        path: 'hygiene-reports',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESPONSABLE_HYGIENE', 'RESPONSABLE_FB')],
        loadComponent: () => import('./pages/hygiene-reports/hygiene-reports.component').then(m => m.HygieneReportsComponent)
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
