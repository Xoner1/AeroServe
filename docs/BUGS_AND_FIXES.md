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

## Frontend Audit & Refactoring (May 2026)

A comprehensive quality-of-code and UI/UX audit was executed on the Angular 20 frontend codebase. The following critical bugs, memory leaks, security issues, UX details, and architectural improvements were resolved:

### 16. Products Validation Route & Mode (BUG-01)
- **Files:** `src/app/app.routes.ts`, `src/app/pages/products/products.component.ts`
- **Problem:** The `products-validation` route pointed to the standard `ProductsComponent` without any filtering or validation actions, rendering the page duplicate and useless. The `EN_ATTENTE` dropdown filter option had an incorrect value.
- **Fix:** Injected `ActivatedRoute` and check `validationMode` from route data. The UI now hides the "+ Ajouter" button, changes page title dynamically, and shows green Approve (`✔️`) and red Reject (`❌`) buttons in the product list. Fixed filter value from `EN_ATTENTE` to `pending`.

### 17. SPA Page Title Reactivity (BUG-02)
- **File:** `src/app/layout/layout.component.ts`
- **Problem:** `getPageTitle()` used `window.location.pathname` to fetch the path, which does not update reactively on Angular SPA router navigations, causing stale or incorrect page titles.
- **Fix:** Refactored `getPageTitle()` to use the Angular Router's url `this.router.url` which reactively triggers updates inside template bindings on every change detection cycle.

### 18. Sidebar Navigation Deduplication (BUG-03 / ARCH-01)
- **Files:** `src/app/layout/layout.component.ts`, `src/app/layout/layout.component.html`
- **Problem:** The `navItems` array had 99 lines of massive redundancy, duplicating the same link configuration for every single user role. The loop track key was `item.route` which caused duplicate key warnings because paths were identical across roles.
- **Fix:** Deduplicated `navItems` to a single flat array where each route has a list of authorized roles. Changed the `@for` loop track key to `$index` in the template to avoid any key duplication warnings.

### 19. Authenticated Login Guard (BUG-04)
- **Files:** `src/app/core/guards/login.guard.ts`, `src/app/app.routes.ts`
- **Problem:** Authenticated users could still access the `/login` route, creating potential session inconsistencies.
- **Fix:** Introduced `loginGuard` that redirects logged-in users back to the `/dashboard`.

### 20. Dashboard Query Structure (BUG-05)
- **File:** `src/app/pages/dashboard/dashboard.component.ts`
- **Problem:** The dashboard API request nested query parameters under a `{ params: { date_from, date_to } }` structure, whereas `ApiService.get()` expected a flat object, causing parameters to serialize as `?params=[object Object]`.
- **Fix:** Flattened parameters to `{ date_from, date_to }` directly.

### 21. Background Loading Spinner Exclusions (BUG-06 / UX-02)
- **File:** `src/app/core/interceptors/loading.interceptor.ts`
- **Problem:** The global loading interceptor locked the entire screen spinner on background requests such as WebSocket, notification queries, and chatbot actions, interrupting user workflows.
- **Fix:** Excluded background URLs containing `chatbot` and `notifications` from triggering the full-screen loading spinner.

### 22. Dynamic Lazy-Loaded Components (BUG-07 / CODE-06)
- **File:** `src/app/app.routes.ts`
- **Problem:** `ChangePasswordRequest` and `ProfileComponent` were eagerly imported in routes, increasing the initial bundle size.
- **Fix:** Converted static routes to use dynamic imports `loadComponent: () => import(...)`.

### 23. Sales Submission Error Toast (BUG-08)
- **File:** `src/app/pages/sales/sales.component.ts`
- **Problem:** The sales `save()` API call had no error handlers, resulting in silent failures when creating sales and keeping modal dialogs open without feedback.
- **Fix:** Added SweetAlert2 success and error alerts, displaying clear user feedback.

### 24. Layout Subscriptions Leak (LEAK-01)
- **File:** `src/app/layout/layout.component.ts`
- **Problem:** Four RxJS subscriptions in `ngOnInit` (`currentUser$`, `unreadCount$`, `connectionStatus$`, `notifications$`) were never unsubscribed, leaking memory on component destruction.
- **Fix:** Injected `DestroyRef` and applied the `takeUntilDestroyed` operator to all subscriptions.

### 25. Notifications Array Copy Mutation (LEAK-02)
- **File:** `src/app/layout/layout.component.ts`
- **Problem:** `current` array was pointing directly to reference `this.notifications` and mutates it before calling slice, allowing array sizes to grow indefinitely and leaking memory.
- **Fix:** Made a shallow copy `[...this.notifications]` before mutating and slicing the notifications array.

### 26. WebSocket Connection Leaks & Types (LEAK-03)
- **File:** `src/app/core/services/websocket.service.ts`
- **Problem:** Reconnection timer subscriptions were not cancelled when `disconnect()` was invoked, starting duplicate concurrent WebSocket sessions. `pingInterval` lacked clean types.
- **Fix:** Added `reconnectSubscription` tracking and unsubscribed on all state transitions. Typed `pingInterval` with `ReturnType<typeof setInterval>`.

### 27. Object URL Previews (LEAK-04)
- **Files:** `src/app/pages/users/users.ts`, `src/app/auth/profile/profile.ts`
- **Problem:** Avatar image preview urls generated via `URL.createObjectURL` were not revoked, creating browser memory leaks.
- **Fix:** Implemented `OnDestroy` and invoked `URL.revokeObjectURL(this.avatarPreview / this.previewAvatar)` in `ngOnDestroy()`.

### 28. Browser Notifications Permissions Check (LEAK-05)
- **File:** `src/app/core/services/websocket.service.ts`
- **Problem:** `new Notification()` was invoked directly on socket message without checking permissions, causing browser execution blocks.
- **Fix:** Wrapped notification trigger inside `'Notification' in window && Notification.permission === 'granted'` checks.

### 29. Robust JWT Token Split (SEC-03)
- **File:** `src/app/core/services/auth.service.ts`
- **Problem:** JWT tokens were parsed by splitting on dots and accessing index `1` directly without segment checks, risking crashes on malformed tokens.
- **Fix:** Check that the token splits into exactly 3 parts before base64 parsing.

### 30. Demo Accounts Production Protection (SEC-04)
- **File:** `src/app/auth/login.component.ts`
- **Problem:** Test admin credentials were shown publicly on the login template regardless of the environment.
- **Fix:** Wrapped demo account credentials element in `@if (showDemoCredentials)` controlled by `!environment.production`.

### 31. Centralized Error HTTP Interceptor (UX-01 / ARCH-02)
- **Files:** `src/app/core/interceptors/error.interceptor.ts`, `src/app/app.config.ts`
- **Problem:** There was no central place handling generic errors, forcing manual handlers or leaving errors silent.
- **Fix:** Built a global `errorInterceptor` that handles 401 (forces logout and redirects to login), 403 (unauthorized access toast), 500 (internal server failure toast), and 0 (offline network toast) using modern SweetAlert2 alerts.

### 32. Pending Users Count in Dashboard (UX-06)
- **File:** `src/app/pages/users/users.ts`
- **Problem:** The `pendingUsersCount` getter counted users with `inactive` status instead of the correct `en_attente` status.
- **Fix:** Fixed filter to `u.status === 'en_attente'`.

### 33. French Language Concordance (UX-07)
- **Files:** `src/app/pages/users/users.ts`, `src/app/auth/profile/profile.ts`
- **Problem:** Multiple backend/validation error messages were shown in English in a fully French user interface.
- **Fix:** Translated all user management and profile validation messages to French.

### 34. Web Contrast Ratio (A11Y-04)
- **File:** `src/_variables.scss`
- **Problem:** `$text-muted` value `#7A8078` on light background `#F5F2ED` had a contrast ratio of `3.69:1`, failing the WCAG AA minimum contrast ratio (4.5:1).
- **Fix:** Darkened muted color to `#5C625A`, satisfying WCAG AA ratio with a compliant `5.68:1` contrast level.

### 35. Double Font-Family Button Styling (CODE-05)
- **File:** `src/styles.scss`
- **Problem:** The `button` reset element had double `font-family` properties declared.
- **Fix:** Cleaned up declarations into a single `font-family: var(--font-body)` reset block.

### 36. Semantic HTML & ARIA Landmarks (A11Y-01 / A11Y-05)
- **File:** `src/app/layout/layout.component.html`
- **Problem:** Essential elements (sidebars, notification indicators, buttons) lacked screen reader semantics.
- **Fix:** Enhanced layout structure with semantic roles (`role="navigation"`, `role="complementary"`, `role="dialog"`), labels (`aria-label`), and interactive states (`aria-expanded`, `aria-haspopup`).

### 37. Extreme Tree-Shaken Icons Optimization (ARCH-04)
- **File:** `src/app/shared/icon/app-icon.component.ts`
- **Problem:** `icons` was imported in bulk from `lucide`, loading 1400+ unused SVGs and bloating the browser bundle by ~230KB.
- **Fix:** Excluded bulk imports. Imported only the 23 explicitly used icons. Registered them dynamically using Lucide `createIcons` API.

### 38. Profile Boolean Form Typo (CODE-04)
- **File:** `src/app/auth/profile/profile.ts`
- **Problem:** `experience` property was initialized as an empty string `''` instead of a boolean value `false`.
- **Fix:** Configured to initialize as a boolean `false` and populated appropriately in `fillForm`.

### 39. Missing Closing Class Braces (CODE-02)
- **File:** `src/app/change-password/change-password.ts`
- **Problem:** The final closing bracket of the component class was missing, preventing compilation.
- **Fix:** Added the class brace `}` and clean indentations.
