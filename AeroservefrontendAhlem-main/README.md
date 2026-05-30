# AeroServe — Airport F&B Operations Platform

Single-page Angular 20 application for managing airport food & beverage operations:
stock, kitchen, internal orders, weekly menus, hygiene control, cashier scheduling,
point-of-sale sales tracking, and AI-powered stock predictions.

## Roles

| Role | Code | Scope |
|---|---|---|
| Super Admin | `SUPER_ADMIN` | Full access — users, products, stocks, orders, menus, planning, hygiene, sales, categories, points of sale |
| Responsable F&B | `RESPONSABLE_FB` | Internal orders, cashier management, weekly planning, dashboard |
| Chef de Cuisine | `CHEF_CUISINE` | FOOD products (recipes), weekly menus, internal orders |
| Chef Magasin | `CHEF_MAGASIN` | Products (commercial + raw materials), stocks (FIFO), internal orders |
| Responsable Achat | `RESPONSABLE_ACHAT` | Product validation, categories, AI stock predictions |
| Responsable Hygiène | `RESPONSABLE_HYGIENE` | Hygiene reports, product inspections, QR code scanning |
| Caissier | `CAISSIER` | Sales listing, dashboard with daily KPIs |

## Quick Start

```bash
npm install
ng serve
```

Opens at `http://localhost:4200`. Backend expected at `http://127.0.0.1:8000/api`.

## Environment

Edit `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  wsUrl: 'ws://127.0.0.1:8000/ws'
};
```

## Build

```bash
ng build --configuration production
```

Output in `dist/AeroServeFront/`.

## Tech Stack

- Angular 20 (standalone components, signals, new control flow)
- Lucide icons (via `lucide` npm package)
- SweetAlert2 for modals and confirmations
- @zxing/ngx-scanner for QR code scanning
- @angular/cdk drag-drop for Kanban and column reorder
- WebSocket native API for real-time notifications
