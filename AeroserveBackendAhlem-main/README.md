# AeroServe Backend

Backend API for the AeroServe airport catering management system, built with **Laravel 13** and **JWT authentication**.

## Requirements

- PHP >= 8.3
- Composer
- PostgreSQL (or Neon.tech cloud DB)
- Node.js & npm (for Vite assets)

## Installation

```bash
# Clone the repository
git clone git@github.com:AeroServe-Solution/AeroServeBackend.git
cd AeroServeBackend

# Install PHP dependencies
composer install

# Copy environment file and configure it
cp .env.example .env

# Generate application key
php artisan key:generate

# Generate JWT secret
php artisan jwt:secret
```

## Configuration

Edit `.env` with your database credentials:

```env
DB_CONNECTION=pgsql
DB_HOST=ep-nameless-butterfly-alydt252.c-3.eu-central-1.aws.neon.tech
DB_PORT=5432
DB_DATABASE=AeroServe
DB_USERNAME=neondb_owner
DB_PASSWORD=npg_A7aE3TVOUnGf
DB_SSLMODE=require
```

## Database Setup

```bash
# Run migrations
php artisan migrate

# Seed the database (roles, admin user, sample data)
php artisan db:seed
```

## Running the Server

```bash
# Start the development server
php artisan serve --host=0.0.0.0 --port=8000
```

The API will be available at `http://localhost:8000/api`.

## API Modules

- **Authentication** – Login, logout, JWT token management
- **Users** – CRUD with role-based access
- **Points de vente** – Sales point management per airport
- **Products & Categories** – Product catalog with recipes
- **Stocks** – Inventory tracking with stock movements
- **Internal Orders** – Inter-department order management
- **Menus** – Menu composition and planning
- **Plannings** – Shift and schedule management
- **Sales** – POS transactions with sale items
- **Hygiene Reports** – Health and safety reports
- **Notifications** – In-app notification system

## Testing

```bash
php artisan test
```
