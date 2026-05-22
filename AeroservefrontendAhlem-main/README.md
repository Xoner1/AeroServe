# AeroServe Front Web

Frontend web application for the AeroServe airport catering management system, built with **Angular 20** and **SCSS**.

## Requirements

- Node.js >= 18
- npm >= 9

## Installation

```bash
# Clone the repository
git clone git@github.com:AeroServe-Solution/AeroServeFrontWeb.git
cd AeroServeFrontWeb

# Install dependencies
npm install
```

## Configuration

Edit the API URL in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api'
};
```

For production, update `src/environments/environment.prod.ts` accordingly.

## Running the App

```bash
# Start the development server
ng serve
# or
npm start
```

The app will be available at `http://localhost:4200`.

## Build for Production

```bash
ng build --configuration production
```

The output will be in the `dist/` folder.

## Project Structure

```
src/app/
├── auth/               # Login page
├── core/
│   ├── guards/         # Route guards (auth, role)
│   ├── interceptors/   # HTTP interceptors (JWT)
│   ├── models/         # TypeScript interfaces
│   └── services/       # API services
├── layout/             # Sidebar + topbar layout
└── pages/
    ├── dashboard/
    ├── users/
    ├── points-de-vente/
    ├── products/
    ├── stocks/
    ├── internal-orders/
    ├── menus/
    ├── plannings/
    ├── sales/
    └── hygiene-reports/
```

## Features

- JWT-based authentication
- Role-based access control (Super Admin, Responsable F&B, Chef Magasin, Chef Cuisine, Caissier, Responsable Hygiène)
- Dashboard with key metrics
- Full CRUD for all modules
- Responsive sidebar navigation
