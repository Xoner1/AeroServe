# Architecture

## Folder Structure

```
src/
├── app/
│   ├── app.config.ts          — App-wide providers (router, HTTP, interceptors, locale)
│   ├── app.routes.ts           — All route definitions with guards
│   ├── app.ts / app.html / .scss  — Root component with global loading overlay
│   ├── auth/
│   │   ├── login.component.*   — Login page (standalone)
│   │   └── profile/            — User profile (avatar, name, bio, phone, age)
│   ├── change-password/        — Password reset with token flow
│   ├── change-password-request/— Forgot-password email form
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts   — Redirects to /login if no JWT token
│   │   │   └── role.guard.ts   — Factory: checks user role against allowed roles
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts  — Attaches Bearer token to every HTTP request
│   │   │   └── loading.interceptor.ts — Calls LoadingService.start/stop on each request
│   │   ├── models/
│   │   │   └── index.ts        — All TypeScript interfaces (User, Product, Stock, etc.)
│   │   └── services/
│   │       ├── api.service.ts        — Generic HTTP wrapper (get/post/put/delete)
│   │       ├── auth.service.ts       — Login, logout, profile, token/state management
│   │       ├── loading.service.ts    — BehaviorSubject-based loading state
│   │       ├── notification.service.ts — Notification CRUD + WebSocket stream merge
│   │       └── websocket.service.ts  — Native WebSocket with auto-reconnect + JWT auth
│   ├── dashboard/
│   │   ├── chef/               — Chef de Cuisine dashboard components
│   │   ├── responsable-fb/     — Responsable F&B dashboard components
│   │   └── super-admin/        — Super Admin dashboard components
│   ├── features/dashboard/     — Legacy dashboard module wrapper
│   ├── layout/
│   │   ├── layout.component.*  — Sidebar (role-filtered nav), topbar, notifications, chatbot
│   ├── pages/
│   │   ├── caissier/           — CRUD for cashier users
│   │   ├── caissier-approval/  — Kanban drag-drop for cashier status approval
│   │   ├── category/           — CRUD for product categories
│   │   ├── dashboard/          — Main dashboard (role-differentiated KPI views)
│   │   ├── hygiene-reports/    — CRUD for food safety inspection reports
│   │   ├── internal-orders/    — Multi-step wizard + Kanban + comments for supply orders
│   │   ├── menus/              — Weekly menu planner (7 days × 4 courses), stock validation
│   │   ├── plannings/          — Weekly cashier shift grid (3 shifts/day), overlap detection
│   │   ├── points-de-vente/    — CRUD for points of sale (airside/landside)
│   │   ├── products/           — CRUD for all product types (food/commercial/raw), recipe builder
│   │   ├── sales/              — Sales transaction listing and details
│   │   ├── stocks/             — Stock list, FIFO movement modal, KPIs
│   │   └── users/              — CRUD for system users (employees) with role assignment
│   ├── public/
│   │   └── landing.component.* — Public landing/marketing page
│   └── shared/
│       ├── icon/               — Lucide icon wrapper (AppIconComponent)
│       ├── page-loading/       — Skeleton shimmer loading placeholder
│       ├── qr-scanner/         — Camera-based QR code scanner via @zxing
│       └── slide-over/         — Reusable slide-over panel component
├── environments/
│   └── environment.ts          — apiUrl, wsUrl, production flag
├── styles.scss                 — Global styles, CSS custom properties, font imports
└── _variables.scss             — SCSS variables (palette, fonts, shadows, radii)
```

## Routing & Auth Flow

1. App loads → `app.config.ts` provides `authInterceptor` and `loadingInterceptor`
2. `authInterceptor` reads JWT from `localStorage('token')` and sets `Authorization: Bearer <token>` on every request
3. `authGuard` checks for token existence; if missing → redirect to `/login`
4. `roleGuard` (factory) checks `AuthService.hasRole(...)`; if unauthorized → redirect to `/dashboard`
5. After login, `AuthService.login()` stores token + user in localStorage and emits via `BehaviorSubject`
6. Layout loads after guard passes; `LayoutComponent` subscribes to `AuthService.currentUser$`
7. Sidebar renders `filteredNavItems` — only items whose roles match the current user
8. Each route under the layout is lazy-loaded and protected by role guards

## WebSocket Lifecycle

1. `NotificationService.connectWebSocket()` → `WebSocketService.connect()`
2. Constructs URL: `ws://host/ws?token=<JWT>`
3. On `onopen`: resets reconnect count, pings every 30s
4. On `onmessage`: parses JSON → emits via `messages$` Subject
5. `NotificationService` subscribes to `messages$` and merges into `notifications$` BehaviorSubject
6. On `onclose`: clears ping, schedules reconnect with exponential backoff (1s → 2s → 4s → ... → max 30s)
7. On tab visibility change + notification message → triggers `new Notification()` (browser API)
8. Layout component shows green pulsing dot when connected, grey dot when disconnected

## Signals & Patterns Used

- `toSignal()` in `App` component to convert `LoadingService.loading$` Observable to a signal
- `BehaviorSubject` for user state, unread count, notification list, WebSocket connection status
- Standalone components (no NgModules) with `imports` arrays
- Angular 20 `@if`/`@for` control flow syntax
- `inject()` for DI in guards; constructor injection in components/services
