# API Service

## Base Usage

`ApiService` wraps `HttpClient` with a base URL from `environment.apiUrl`.

```ts
constructor(private api: ApiService) {}

load() {
  this.api.get('products').subscribe(res => this.items = res.data);
}

create() {
  this.api.post('products', { name, price }).subscribe(...);
}

update(id: number) {
  this.api.put(`products/${id}`, { price }).subscribe(...);
}

remove(id: number) {
  this.api.delete(`products/${id}`).subscribe(...);
}
```

All methods return typed `Observable<T>`; pass an optional generic:
```ts
this.api.get<Product[]>('products')
```

## Endpoints Summary

| Module | Endpoint | Methods | Notes |
|---|---|---|---|
| Auth | `login` | POST | returns `{token, user}` |
| Auth | `register` | POST | user registration |
| Users | `users` | GET/POST | |
| Users | `users/{id}` | GET/PUT/DELETE | |
| Users | `users/{id}/status` | PATCH | activate/deactivate |
| Users | `users/me` | GET | current user profile |
| Users | `users/profile` | PUT | update own profile |
| Categories | `categories` | GET/POST | |
| Categories | `categories/{id}` | GET/PUT/DELETE | |
| Products | `products` | GET/POST | |
| Products | `products/{id}` | GET/PUT/DELETE | |
| Products | `products/recipe/{id}` | GET | nested recipe items |
| Products | `products/validate/{id}` | PATCH | toggle validated status |
| Products | `products/clone/{id}` | POST | duplicate product with recipe |
| Products | `products/dashboard` | GET | product dashboard stats |
| Stocks | `stocks` | GET/POST | |
| Stocks | `stocks/{id}` | GET/PUT/DELETE | |
| Stocks | `stocks/movements` | GET | FIFO movement log |
| Stocks | `stocks/kpi` | GET | stock KPIs |
| Stocks | `stocks/dashboard` | GET | stock dashboard stats |
| Stocks | `stock-predictions` | GET/POST | AI consumption predictions |
| Points de Vente | `points-de-vente` | GET/POST | |
| Points de Vente | `points-de-vente/{id}` | GET/PUT/DELETE | |
| Caissiers | `caissiers` | GET | List active cashiers |
| Caissiers | `users/{id}/assign-pdv` | PUT | Assign point de vente to cashier |
| Caissiers | `caissiers/pending` | GET | List pending cashiers (Super Admin) |
| Caissiers | `users/{id}/approve` | PUT | Approve cashier user (Super Admin) |
| Caissiers | `users/{id}/reject` | PUT | Reject cashier user (Super Admin) |
| Caissiers | `caissiers` | POST | Create cashier user (Responsable F&B) |
| Caissiers | `caissier` | GET | List all cashiers (Responsable F&B) |
| Caissiers | `caissiers/{id}/status` | PUT | Kanban status change (Responsable F&B) |
| Caissiers | `users/{id}/caissier` | PUT | Update cashier user details (Responsable F&B) |
| Caissiers | `users/{id}/caissier` | DELETE | Delete cashier user (Responsable F&B) |
| Sales | `sales` | GET | |
| Sales | `sales/{id}` | GET | detail with items |
| Sales | `sales/dashboard` | GET | daily cashier KPI |
| Internal Orders | `internal-orders` | GET/POST | |
| Internal Orders | `internal-orders/{id}` | GET/PUT/DELETE | |
| Internal Orders | `internal-orders/{id}/status` | PATCH | advance status through workflow |
| Internal Orders | `internal-orders/{id}/items` | POST | add item to order |
| Internal Orders | `internal-orders/{id}/items/{itemId}` | PUT/DELETE | update/remove order item |
| Internal Orders | `internal-orders/{id}/comments` | POST | add comment |
| Internal Orders | `internal-orders/dashboard` | GET | KPI dashboard data |
| Menus | `menus` | GET/POST | |
| Menus | `menus/{id}` | GET/PUT/DELETE | |
| Menus | `menus/{id}/validate-stock` | POST | stock availability check |
| Menus | `menus/weekly` | GET | current week's menu |
| Plannings | `plannings` | GET/POST | |
| Plannings | `plannings/{id}` | GET | single planning |
| Plannings | `plannings/generate` | POST | auto-generate weekly shifts |
| Plannings | `plannings/dashboard` | GET | planning KPIs |
| Hygiene | `hygiene-reports` | GET/POST | |
| Hygiene | `hygiene-reports/{id}` | GET/PUT/DELETE | |
| Hygiene | `hygiene-reports/{id}/publish` | PATCH | publish report |
| Hygiene | `hygiene-reports/dashboard` | GET | hygiene KPIs |
| Notifications | `notifications` | GET | fetch all |
| Notifications | `notifications/{id}/read` | PATCH | mark single as read |
| Notifications | `notifications/read-all` | PATCH | mark all as read |
| Notifications | `notifications/unread-count` | GET | |
| Change Password | `change-password` | POST | old + new password |
| Change Password | `change-password-request` | POST | forgot-password email |
| Change Password | `reset-password` | POST | reset with token |
| Dashboard | `dashboard/kpi` | GET | role-specific KPIs |
| Dashboard | `dashboard/trends` | GET | trend chart data |
| Dashboard | `dashboard/notifications` | GET | recent notifications |

All endpoints automatically receive the `Authorization: Bearer <token>` header via the auth interceptor. Errors are handled in components with toast or SweetAlert2.
