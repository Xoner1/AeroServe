# AeroServe - Airport F&B Management System

Full-stack airport food & beverage management system with role-based dashboards, real-time notifications, AI-powered stock predictions, and a companion mobile app.

## Repository Structure

```
AeroserveBackendAhlem-main/     -> Laravel backend API
AeroservefrontendAhlem-main/    -> Angular frontend (main application)
aeroservemobileahlem-main/      -> Flutter mobile app (Caissier, F&B, Hygiène)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular, Standalone Components, Signals, New Control Flow |
| Backend | Laravel (PHP) |
| Mobile | Flutter |
| Real-time | Native WebSocket with auto-reconnect + exponential backoff |
| Design | Sage & Stone custom design system |
| Fonts | Fraunces + DM Sans + JetBrains Mono |
| Icons | Lucide |

## The 7 User Roles

| Role | Access |
|------|--------|
| Super Admin | Full access, global KPIs, user management |
| Responsable F&B | Internal orders, planning, kitchen/warehouse load |
| Chef de Cuisine | FOOD products, recipes, weekly menu |
| Chef Magasin | Stock FIFO, product tracking, alerts |
| Responsable Achat | Product approval, pricing, AI predictions |
| Responsable Hygiène | Hygiene reports, allergen control, QR inspections |
| Caissier | Unified in main user table, shift plannings, health chatbot |

## Quick Start - Frontend

```bash
cd AeroservefrontendAhlem-main
npm install
ng serve
# Open http://localhost:4200
```

Backend expected at `http://127.0.0.1:8000/api`.

## What Was Built (v3.0 - Security and Account Isolation)

### Account and Role Isolation
- **Chatbot Context Isolation:** Chatbot completions (OpenAI, Groq, Gemini) now dynamically fetch the user's profile, their 5 recent shifts, and their 5 recent internal orders. This summary is injected into the system prompt to restrict assistance to the connected user's work, strictly preventing cross-account leaks or data exposure.
- **Cashier Health-Only Chatbot:** Cashier accounts are restricted to querying food/beverage health compatibility, allergens, and ingredients based on declarations configured by the Hygiene Officer (HygieneReport). General, administrative, shift planning, or stock queries are blocked.
- **Internal Orders Security Filters:** Added dynamic permission checks (authorizeOrder) to verify if the connected user has the right to view, update, fulfill, or delete the order. The index query filters orders based on user role (Super Admin sees all, F&B sees their own and point of sale orders, Chefs see created/assigned, others see created only).

### Code Cleanup
- **Decommissioned Sales Tables:** Dropped sales and sale_items tables and deleted related endpoints/components to simplify the cashier workflow to focus on shift plannings.
- **Emoji Cleanup:** Removed all emojis from comments and string literals in modified controllers.

### Critical Bugs Fixed (v2.0)
- Avatar image loading (safe-navigation for missing avatar field)
- 422 error in categories (extract Laravel validation errors)
- PDV dropdown loading (handle 3 API response formats)
- Caissier order status restriction (sidebar + API enforcement)
- FOOD product stock validation (ingredient qty check against stock)

### Improvements (v2.0)
- Error messages redesigned with Sage & Stone alert components
- Weekly planning overlap prevention (Mon-Sun week bounds)
- FOOD/COMMERCIAL order type filter
- FOOD product category field removed
- Approved product lock (status-only editing)
- FIFO stock UI with lot-by-lot consumption preview
- Unified CRUD slide-over panels

### New Features (v2.0)
- WebSocket real-time notifications with auto-reconnect
- QR Code scanner with @zxing/ngx-scanner
- Slide-over panel component system

## Design System

Complete Sage & Stone palette applied across all 16+ frontend files:
- **Deep Moss #2C3E35** - sidebar background
- **Sage Base #6B8F71** - primary brand color, buttons, links
- **Warm Cream #F5F2ED** - page backgrounds
- **Terracotta #E8663A** - CTA accents, alerts
- **CSS custom properties** in `_variables.scss` for tokens

## Documentation

| File | Contents |
|------|----------|
| `docs/RAPPORT_TECHNIQUE.md` | Comprehensive technical report including relational schemas, diagrams, API references, functional descriptions, schedulers, and install guides |
| `docs/ARCHITECTURE.md` | System architecture, routing, auth flow, WebSocket lifecycle |
| `docs/API_REFERENCE.md` | All API endpoints by module |
| `docs/ROLES_AND_PERMISSIONS.md` | Role access matrix + nav items per role |
| `docs/COMPONENTS.md` | All Angular components with inputs, outputs, behavior |
| `docs/DATA_MODELS.md` | All TypeScript interfaces with full field listings |
| `docs/SERVICES.md` | ApiService, AuthService, LoadingService, NotificationService, WebSocketService |
| `docs/UI_GUIDE.md` | Design tokens, component styles, form/table/modal patterns |
| `docs/BUGS_AND_FIXES.md` | Complete fix history |

## Build

```bash
cd AeroservefrontendAhlem-main
ng build --configuration production
# Result: zero errors, output in dist/AeroServeFront/
```

## Environment

Edit `AeroservefrontendAhlem-main/src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  wsUrl: 'ws://127.0.0.1:8000/ws'
};
```
