# Component Documentation

## Shared Components

### `PageLoadingComponent`
- **Selector:** `app-page-loading`
- **Inputs:** `variant: 'table' | 'cards'` (default `'table'`), `rows: number` (default `8`)
- **Behavior:** Renders skeleton shimmer placeholders matching the table or card layout style. Animates via CSS `@keyframes shimmer` with a gradient sweep. Used across all list/detail pages during HTTP load.

### `AppIconComponent`
- **Selector:** `app-icon`
- **Inputs:** `name: string` (Lucide icon name), `size: number` (default `18`)
- **Behavior:** Dynamically creates a Lucide SVG icon element. Falls back gracefully if an unknown icon name is passed. Used throughout sidebar, buttons, action bars, and form sections.

### `SlideOverComponent`
- **Selector:** `app-slide-over`
- **Inputs:** `open: boolean`, `title: string`, `width: string` (default `'480px'`)
- **Outputs:** `close: EventEmitter<void>`
- **Behavior:** Renders a right-side slide-over panel with backdrop overlay, enter/leave CSS transition (translateX + opacity). Projects content via `<ng-content>`. Used for detail views and quick-edit forms.

### `QrScannerComponent`
- **Selector:** `app-qr-scanner`
- **Outputs:** `scanSuccess: EventEmitter<string>`, `scanError: EventEmitter<string>`
- **Behavior:** Wraps `@zxing/ngx-scanner` with camera device selection dropdown and torch toggle. Auto-starts scanning on init, stops on destroy. Emits decoded QR text. Includes a flip-camera button and device-switch fallback. Used in Hygiene module to quickly open product inspection forms.

## Page Components

### Dashboard (`/dashboard`)
- **File:** `pages/dashboard/dashboard.component.ts`
- **Component:** `DashboardComponent`
- **Allowed roles:** All (7 roles)
- **Behavior:** Role-based KPI display. Renders different stat cards, charts, and recent-activity lists depending on `currentUser.role`. Each role sees relevant metrics (e.g., CAISSIER sees today's sales total, CHEF_CUISINE sees menu validations, RESPONSABLE_HYGIENE sees open reports). Uses `*ngIf` blocks keyed by role string.

### Products (`/products`)
- **File:** `pages/products/products.component.ts`
- **Component:** `ProductsComponent`
- **Allowed roles:** SUPER_ADMIN, CHEF_CUISINE, CHEF_MAGASIN
- **Behavior:**
  - CHEF_CUISINE: filtered to `type === 'FOOD'` only; sees recipe builder panel and clone button
  - CHEF_MAGASIN: sees all types (COMMERCIAL, RAW_MATERIAL, FOOD); sees validate/categories columns
  - SUPER_ADMIN: full CRUD + validation toggle
  - Recipe panel uses `app-slide-over` to show nested product ingredients with quantities
  - CSV export button available for CHEF_MAGASIN

### Internal Orders (`/internal-orders`)
- **File:** `pages/internal-orders/internal-orders.component.ts`
- **Component:** `InternalOrdersComponent`
- **Allowed roles:** SUPER_ADMIN, RESPONSABLE_FB, CHEF_CUISINE, CHEF_MAGASIN
- **Behavior:** Multi-state wizard:
  1. Create order (select PDV, items from products table with qty)
  2. View in Kanban board columns: `brouillon → validé → en_cours → préparé → livré → facturé`
  3. Drag-drop between stages updates status via API
  4. Comments panel on each order card
  5. Chef Magasin can validate stock availability per item
  6. Chef Cuisine sees FOOD items only

### Menus (`/menus`)
- **File:** `pages/menus/menus.component.ts`
- **Component:** `MenusComponent`
- **Allowed roles:** SUPER_ADMIN, CHEF_CUISINE
- **Behavior:**
  - Weekly grid: 7 days × 4 courses (Entrée, Plat Principal, Dessert, Accompagnement)
  - Add dishes from FOOD products only
  - Validate stock button → POST `/menus/{id}/validate-stock` → shows green/red per ingredient
  - Publish/unpublish toggle
  - Week navigation (prev/next week arrows)

### Plannings (`/plannings`)
- **File:** `pages/plannings/plannings.component.ts`
- **Component:** `PlanningsComponent`
- **Allowed roles:** SUPER_ADMIN, RESPONSABLE_FB
- **Behavior:**
  - Weekly grid: 7 days × 3 shifts (Matin, Après-midi, Nuit)
  - Assign caissiers to each shift slot
  - Overlap detection: warns when a caissier is assigned to overlapping shifts (same day, consecutive slots with <2h gap)
  - Auto-generate button → POST `/plannings/generate`
  - Week selector (ISO weeks)

### Stocks (`/stocks`)
- **File:** `pages/stocks/stocks.component.ts`
- **Component:** `StocksComponent`
- **Allowed roles:** SUPER_ADMIN, CHEF_MAGASIN
- **Behavior:**
  - Table of all stock items with product name, warehouse quantity, threshold, unit
  - Status badges: green (≥ threshold), yellow (≤ threshold + 20%), red (below threshold)
  - FIFO movement modal: for a selected stock item, shows layered movements (received date, qty, remaining) in LIFO order
  - Open modal opens movement log for each stock entry
  - KPI cards at top: total products, low stock count, total stock value, avg turnover

### Sales (`/sales`)
- **File:** `pages/sales/sales.component.ts`
- **Component:** `SalesComponent`
- **Allowed roles:** SUPER_ADMIN, RESPONSABLE_FB, CAISSIER
- **Behavior:**
  - Transaction list with caissier name, PDV, total, payment method, date
  - Detail modal with items table
  - Pagination
  - Date range filter
  - Stats row: total amount + transaction count

### Hygiene Reports (`/hygiene-reports`)
- **File:** `pages/hygiene-reports/hygiene-reports.component.ts`
- **Component:** `HygieneReportsComponent`
- **Allowed roles:** SUPER_ADMIN, RESPONSABLE_HYGIENE
- **Behavior:**
  - CRUD for inspection reports
  - Rating badges (A/B/C/D)
  - Publish toggle
  - QR scanner integration: scan product code → auto-fills product field

### Caissier Approval (`/caissier-approval`)
- **File:** `pages/caissier-approval/caissier-approval.ts`
- **Component:** `CaissierApprovalComponent`
- **Allowed roles:** SUPER_ADMIN, RESPONSABLE_FB
- **Behavior:**
  - 3-column Kanban: `en_attente` | `active` | `inactive`
  - Drag-drop between columns updates status via PUT `caissiers/{id}/status`
  - Blocks re-dragging from active/inactive back to en_attente
  - Toast notifications for success/error with rollback on failure

### Users (`/users`)
- **File:** `pages/users/users.ts`
- **Component:** `UsersComponent`
- **Allowed roles:** SUPER_ADMIN only
- **Behavior:**
  - Full CRUD table with role badge, email, status toggle
  - Modal form for create/edit
  - Delete confirmation via SweetAlert2
  - Paginated table

### Points de Vente (`/points-de-vente`)
- **File:** `pages/points-de-vente/points-de-vente.component.ts`
- **Component:** `PointsDeVenteComponent`
- **Allowed roles:** SUPER_ADMIN only
- **Behavior:**
  - CRUD table with name, location, type badge (airside/landside), status toggle
  - Modal form for create/edit
  - Pagination
