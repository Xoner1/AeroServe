# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with three separate applications:

| Directory | Description |
|-----------|-------------|
| `AeroserveBackendAhlem-main/` | Laravel 12 API (PHP 8.2+) |
| `AeroservefrontendAhlem-main/` | Angular 20 web application |
| `aeroservemobileahlem-main/` | Flutter companion mobile app |

The project is an airport Food & Beverage management system (ERP-style) with role-based dashboards, FIFO stock management, kitchen operations, weekly menus, hygiene control, cashier planning, and AI-powered stock predictions.

## Key Commands

### Backend (Laravel)

```bash
cd AeroserveBackendAhlem-main

# First-time setup (creates .env, migrates DB, seeds)
composer run setup

# Development (server + queue + logs concurrently via concurrently)
composer run dev

# Run tests
composer run test

# Individual artisan commands
php artisan serve                          # Start server at http://127.0.0.1:8000
php artisan migrate                        # Run database migrations
php artisan key:generate                   # Generate app key
php artisan stock:check-ingredients        # Custom: check ingredient stock availability
```

### Frontend (Angular)

```bash
cd AeroservefrontendAhlem-main

npm install
ng serve                                    # Start at http://localhost:4200
ng build --configuration production         # Production build → dist/AeroServeFront/
ng test                                     # Unit tests (Karma + Jasmine)
```

### Mobile (Flutter)

```bash
cd aeroservemobileahlem-main

flutter pub get
flutter run                                 # Run on connected device/emulator
flutter build                               # Production build
```

## Architecture Overview

### Backend (Laravel 12)

- **Authentication:** Stateless JWT via `php-open-source-saver/jwt-auth`. Tokens sent in `Authorization: Bearer <token>` header.
- **Authorization:** Role-based middleware (`role:ROLE_NAME`) in `app/Http/Middleware/CheckRole.php`. Roles are enforced at route level in `routes/api.php`.
- **Real-time:** Pusher broadcasting + native WebSocket service with auto-reconnect and exponential backoff.
- **Database:** MySQL with InnoDB. 42+ migrations. 18 Eloquent models in `app/Models/`.

#### Key Models

| Model | Purpose |
|-------|---------|
| `User` / `Role` | Users with JWT auth, belongs to one of 7 roles |
| `Product` | Products with recipes, allergens (JSON), expiration dates, approval_status |
| `Stock` / `StockMovement` | Stock levels with min_threshold alerts, FIFO lot tracking |
| `InternalOrder` / `InternalOrderItem` | Internal orders (food/commercial) with Kanban status workflow |
| `Menu` / `MenuItem` | Weekly menus with staff_count, status, day/meal_type items |
| `Planning` | Cashier shift scheduling (MATIN/APRES_MIDI/SOIR) |
| `HygieneReport` | Hygiene audits with allergen/expiration verification |
| `PurchaseNeed` / `PurchaseNeedItem` | AI-predicted purchase needs |
| `PointDeVente` | Sales points (restaurant, cafe, boutique, lounge) per Airport |
| `Category` | Product categories (food, commercial, matiere_premiere, plat) |
| `Notification` | Real-time notifications |
| `Comment` | Polymorphic comments (morphMany) |

#### Important Patterns

- **FIFO Stock:** `FifoStockTrait` handles lot-by-lot consumption based on `expiration_date`. Stock movements track individual lots.
- **Route organization:** `routes/api.php` groups endpoints by role using middleware stacks. Shared read routes are grouped separately (~line 193).
- **Method spoofing:** Some controllers accept `POST` for `PUT` updates (e.g., profile updates with FormData/file uploads).
- **API response:** Controllers return JSON responses. The frontend expects consistent response format — check `ApiResponse` pattern in controllers.

#### API Route Structure

Routes are defined in `routes/api.php` with role-gated middleware groups:
- **Public:** `POST /login`, `POST /forgot-password`, `POST /password/reset`
- **Auth (all):** `/me`, `/logout`, `/refresh`, `/profile`, `/notifications`, `/comments`, `/chatbot/ask`, `/dashboard`
- **SUPER_ADMIN:** `/users`, `/points-de-vente`, `/airports`
- **Role-specific groups:** Products, Stocks, Internal Orders, Menus, Plannings, Hygiene Reports, Purchase Needs, Stock Forecast/AI
- **Shared read (CAISSIER excluded):** Products list/show, Categories, Internal Orders list/show, Stock alerts

### Frontend (Angular 20)

- **Components:** Standalone components with Signals for state management.
- **Routing:** Lazy-loaded feature modules with `authGuard` and `roleGuard`.
- **HTTP:** Auth, Loading, and Error interceptors in `core/interceptors/`.
- **UI:** Custom "Sage & Stone" design system with CSS custom properties. Lucide icons, SweetAlert2 modals, @zxing/ngx-scanner for QR codes.
- **Design tokens:** Deep Moss `#2C3E35`, Sage Base `#6B8F71`, Warm Cream `#F5F2ED`, Terracotta `#E8663A`.

#### Environment Configuration

`AeroservefrontendAhlem-main/src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  wsUrl: 'ws://127.0.0.1:8000/ws'
};
```

## User Roles (7)

| Role | Key Capabilities |
|------|-----------------|
| SUPER_ADMIN | Full access to all features |
| RESPONSABLE_FB | Internal orders, planning, cashier management |
| CHEF_CUISINE | FOOD products, recipes, weekly menus, purchase needs |
| CHEF_MAGASIN | Stock FIFO, product tracking, internal order fulfillment |
| RESPONSABLE_ACHAT | Product approval, pricing, AI predictions |
| RESPONSABLE_HYGIENE | Hygiene reports, allergen control, QR inspections |
| CAISSIER | Shift planning viewing, health-only chatbot |

## Critical Business Logic

1. **FIFO Stock Deduction:** Consumption deducted lot-by-lot by earliest `expiration_date`.
2. **Menu → Purchase Needs:** Automatic calculation from planned menus × `staff_count`.
3. **Shift Auto-Detection:** Planning shifts auto-calculated from `start_time`.
4. **Product Auto-Activation:** Scheduler checks ingredient availability for FOOD products.
5. **Recipe Management:** FOOD products composed of RAW_MATERIAL ingredients with quantities.
6. **Approval Workflow:** Products require RESPONSABLE_ACHAT approval (CHEF_CUISINE self-approved).
7. **Chatbot Context Isolation:** Dynamic user profile injection into LLM prompts prevents cross-account data leaks.

## Documentation

Comprehensive docs in `docs/`:
- `RAPPORT_TECHNIQUE.md` — Full technical report (schemas, diagrams, API references)
- `BUGS_AND_FIXES.md` — Complete fix history

## Deployment

- Backend deployment script: `AeroserveBackendAhlem-main/alwaysdata_deploy.sh` (AlwaysData hosting)
- CORS allowed origins configured in `.env` / `config/cors.php`
