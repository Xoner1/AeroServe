# Bugs & Fixes Log

## Critical Issues (Resolved)

### 1. Avatar Routing for Users Without Avatar
- **File:** `auth/profile/profile.ts` — `load()` method
- **Problem:** Some users have no `avatar` field. The component called `this.api.get('users/' + ...)` with a potentially undefined user ID, causing a 422 error.
- **Fix:** Added safe navigation `user?.id` check before the API call.

### 2. Categories Filtered by Product Type
- **File:** `pages/category/category.ts`
- **Problem:** When a `CHEF_MAGASIN` user added a category, the `type` field was not sent, causing a 422 validation error from the backend.
- **Fix:** Added `type` dropdown to the category form, defaulting to the user's product type context.

### 3. PDV Dropdown Not Pre-selecting Value
- **File:** `pages/points-de-vente/points-de-vente.component.ts`
- **Problem:** The edit modal was opening with no pre-selected PDV value in the dropdown.
- **Fix:** Added `[(ngModel)]` binding to the select element.

### 4. Caissier Order by Status
- **File:** `pages/caissier/caissier.ts`
- **Problem:** Caissiers were shown in arbitrary order instead of grouped by status.
- **Fix:** Added `sort` call to order by status string before rendering the table.

### 5. FOOD Stock Validation
- **File:** `pages/menus/menus.component.ts`
- **Problem:** Stock validation endpoint was called with a wrong parameter structure, causing a backend rejection.
- **Fix:** Adjusted payload format to match the backend schema.

## Improvements (Resolved)

### 6. Error Messages for API Failures
- **Files:** Multiple components
- **Change:** Wrapped all API subscriptions with proper `error` handlers displaying backend error messages instead of generic console logs.

### 7. Caissier Form Validation Error
- **File:** `pages/caissier/caissier.ts`
- **Change:** Added form field validation before submit, matching backend expectations (required fields: `first_name`, `last_name`, `email`, `phone`).

### 8. Planning Overlap Detection
- **File:** `pages/plannings/plannings.component.ts`
- **Change:** Added overlap detection logic that warns when a caissier is assigned to consecutive shifts with less than 2 hours gap.

### 9. Product Type Filter
- **File:** `pages/products/products.component.ts`
- **Change:** Added a dropdown filter to filter products by type (FOOD / COMMERCIAL / RAW_MATERIAL).

### 10. FOOD Category Removal
- **File:** `pages/category/category.ts`
- **Change:** Added ability to remove FOOD-type categories when the user has CHEF_CUISINE role.

### 11. Approved Product Lock
- **File:** `pages/products/products.component.ts`
- **Change:** Locked editing of products that are in `is_validated === true` state; shows a warning badge.

### 12. FIFO Movement UI
- **File:** `pages/stocks/stocks.component.ts`
- **Change:** Added a modern slide-over panel for stock movement history, showing entries sorted by date with remaining quantities.

## New Features (Resolved)

### 13. WebSocket Notifications
- **Files:** `core/services/websocket.service.ts`, `core/services/notification.service.ts`, `layout/layout.component.ts`
- **Feature:** Added persistent WebSocket connection with auto-reconnect, ping/pong keepalive, and real-time notification display in the topbar bell icon.

### 14. QR Scanner Integration
- **Files:** `shared/qr-scanner/qr-scanner.component.ts`, `pages/hygiene-reports/hygiene-reports.component.ts`
- **Feature:** Camera-based QR code scanning using `@zxing/ngx-scanner` with device selection and torch toggle. Integrated into hygiene reports to auto-fill product names.

### 15. Slide-Over Panels
- **Files:** `shared/slide-over/slide-over.component.ts`, used in stocks, products, sales
- **Feature:** Reusable slide-over panel component with configurable width, title, and backdrop close. Replaced modal dialogs for detail views in stocks (FIFO movements), products (recipe builder), sales (transaction details).
