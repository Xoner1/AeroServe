# Roles & Permissions Matrix

## Role Definitions

Each role guards its routes via `RoleGuard` and filters its navigation in the sidebar.

| Module / Route | SUPER_ADMIN | RESPONSABLE_FB | CHEF_CUISINE | CHEF_MAGASIN | RESPONSABLE_ACHAT | RESPONSABLE_HYGIENE | CAISSIER |
|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users (CRUD) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Points de Vente | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Caissiers | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Caissier Approval | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Categories | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Products (all) | ✅ | ❌ | ✅(FOOD) | ✅ | ❌ | ❌ | ❌ |
| Products Validate | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Stocks | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stock Predictions | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Internal Orders | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Menus | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Plannings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hygiene Reports | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| QR Scanner | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Sales | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Nav Items by Role

### SUPER_ADMIN — Full access (15 items)
Dashboard, Points de Vente, Stock, Stock Predictions, Products, Menus, Internal Orders, Users, Categories, Caissiers, Caissier Approval, Plannings, Hygiene, QR Scanner, Sales

### RESPONSABLE_FB — 7 items
Dashboard, Internal Orders, Caissiers, Caissier Approval, Plannings, Sales, Profile

### CHEF_CUISINE — 5 items
Dashboard, Products (FOOD only), Menus, Internal Orders, Profile

### CHEF_MAGASIN — 5 items
Dashboard, Products, Stock, Categories, Internal Orders

### RESPONSABLE_ACHAT — 4 items
Dashboard, Categories, Products Validate, Stock Predictions

### RESPONSABLE_HYGIENE — 4 items
Dashboard, Hygiene Reports, QR Scanner, Profile

### CAISSIER — 3 items
Dashboard, Sales, Profile

## Guard Implementation

```ts
// app.routes.ts
{
  path: 'users',
  loadComponent: () => ...,
  canActivate: [roleGuard('SUPER_ADMIN')]
}

// role.guard.ts
export function roleGuard(...allowedRoles: string[]) {
  return () => {
    const auth = inject(AuthService);
    return allowedRoles.some(r => auth.hasRole(r)) || Router.parseUrl('/dashboard');
  };
}
```
