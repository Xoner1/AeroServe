# AeroServe — Client Technical Report
### Airport Food & Beverage Management System

---

**Report Date:** May 22, 2026  


---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Database & Data Architecture](#3-database--data-architecture)
4. [Completed Features](#4-completed-features)
5. [Technical Stack](#5-technical-stack)
6. [Security Implementation](#6-security-implementation)
7. [API Endpoints Summary](#7-api-endpoints-summary)

---

## 1. Executive Summary

**AeroServe** is a comprehensive, multi-platform airport food and beverage (F&B) management system designed to digitize and streamline the entire supply chain — from raw material procurement through to point-of-sale cashier operations — across multiple airport locations.

The system serves **8 distinct user roles**, each with a precisely scoped interface and access level. The backend exposes a fully secured **RESTful JSON API**, consumed by two client applications: an **Angular web dashboard** for management and operational staff, and a **Flutter mobile application** for cashiers and field staff.

### Key Deliverables Completed

| Area | Status | Details |
|------|--------|---------|
| Role-based access control | ✅ Complete | 8 roles, route-level enforcement |
| Product lifecycle management | ✅ Complete | Creation → Approval → Stock tracking |
| FIFO inventory system | ✅ Complete | Batch-level stock deduction |
| Automated stock alerts | ✅ Complete | Low stock + expiry date warnings |
| Internal order system (Kanban) | ✅ Complete | Drag & drop board with 4 status columns |
| Weekly menu management | ✅ Complete | Stock validation before acceptance |
| Real-time notifications | ✅ Complete | Cross-role event-driven alerts |
| Hygiene compliance module | ✅ Complete | Inspection reporting system |
| Sales & POS integration | ✅ Complete | Multi-payment method support |
| Dynamic sidebar (web + mobile) | ✅ Complete | Role-aware navigation |
| SweetAlert confirmations (UI) | ✅ Complete | Delete confirmations with feedback |
| Flutter mobile app | ✅ Complete | Dynamic base URL, role-restricted UI |

---

## 2. Project Overview

### 2.1 System Purpose

AeroServe manages the complete F&B operation lifecycle inside an airport environment, covering:
- **Procurement & stock management** of raw materials and commercial products
- **Internal order management** between operational departments
- **Weekly menu planning** with automated stock verification
- **Point-of-sale operations** across multiple airport outlets
- **Cashier scheduling & shift planning**
- **Hygiene inspection and compliance tracking**

### 2.2 User Roles & Responsibilities

The system enforces a **strict role-based hierarchy** with 8 defined roles:

| Role | Code | Primary Responsibility |
|------|------|----------------------|
| Super Admin | `SUPER_ADMIN` | Full system access, user management, PDV configuration |
| Responsable F&B | `RESPONSABLE_FB` | Internal orders, cashier management, planning |
| Chef Magasin | `CHEF_MAGASIN` | Stock management, commercial & raw material products |
| Chef Cuisine | `CHEF_CUISINE` | Food product recipes, weekly menu creation |
| Responsable Achat | `RESPONSABLE_ACHAT` | Product approval/rejection, price setting, category management |
| Responsable Hygiène | `RESPONSABLE_HYGIENE` | Hygiene inspection reports |
| Caissier | `CAISSIER` | Point-of-sale operations, sales recording |

### 2.3 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────────┐    ┌─────────────────────────────┐   │
│  │  Angular Web App     │    │   Flutter Mobile App         │   │
│  │  (Admin Dashboard)   │    │   (Cashier + Field Staff)    │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
└─────────────┼────────────────────────────────┼───────────────────┘
              │  HTTPS + JWT Bearer Token       │
┌─────────────▼────────────────────────────────▼───────────────────┐
│                     BACKEND LAYER                                 │
│                  Laravel 11 REST API                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Auth    │ │ Products │ │  Orders  │ │  Notifications   │   │
│  │  (JWT)   │ │  + Stock │ │  + Menus │ │  + Comments      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                     DATABASE LAYER                                │
│           MySQL / Alwaysdata Hosting Compatible                   │
│          18 Tables — Fully relational, FK-enforced               │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 Airport & Point of Sale Structure

Each airport outlet (`Point de Vente`) is classified as either **AIRSIDE** (post-security) or **LANDSIDE** (public area), and has an assigned Responsable F&B manager.

---

## 3. Database & Data Architecture

The database comprises **18 tables** covering all operational domains. The schema is designed for compatibility with **Alwaysdata's managed MySQL** and follows standard relational normalization.

### 3.1 Complete Table Reference

---

#### `airports`
Stores airport entities. Each airport hosts one or more points of sale.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Airport name |
| `code` | VARCHAR(255) | UNIQUE, NOT NULL | IATA code (e.g., TUN, ALG) |
| `created_at` / `updated_at` | TIMESTAMP | nullable | Audit timestamps |

---

#### `points_de_vente`
Airport retail/food outlets. Each outlet belongs to one airport.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Outlet name |
| `airport_id` | BIGINT UNSIGNED | FK → airports (CASCADE) | Parent airport |
| `is_active` | BOOLEAN | DEFAULT TRUE | Operational status |
| `location` | ENUM | nullable | `AIRSIDE` or `LANDSIDE` |
| `responsable_fb_id` | BIGINT UNSIGNED | FK → users (NULL ON DELETE), nullable | Assigned F&B manager |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `roles`
System-defined user roles. Managed by Super Admin.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `name` | VARCHAR(255) | UNIQUE | Role code (e.g. `CHEF_MAGASIN`) |
| `display_name` | VARCHAR(255) | nullable | Human-readable label |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `users`
All system users across all roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `first_name` | VARCHAR(255) | NOT NULL | First name |
| `last_name` | VARCHAR(255) | NOT NULL | Last name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| `email_verified_at` | TIMESTAMP | nullable | Email verification |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hashed |
| `phone` | VARCHAR(255) | nullable | Contact number |
| `role_id` | BIGINT UNSIGNED | FK → roles (NOT NULL) | User role — immutable after creation |
| `pdv_id` | BIGINT UNSIGNED | FK → points_de_vente, nullable | Assigned outlet |
| `status` | ENUM | DEFAULT `en_attente` | `active`, `en_attente`, `inactive` |
| `avatar` | VARCHAR(255) | nullable | Profile picture path |
| `age` | INT | nullable | User age |
| `experience` | BOOLEAN | DEFAULT FALSE | Has prior experience |
| `bio` | TEXT | nullable | Short biography |
| `remember_token` | VARCHAR(100) | nullable | Laravel session token |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `categories`
Product classification categories, typed by product domain.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Category label |
| `code` | VARCHAR(255) | UNIQUE, nullable | Short code identifier |
| `type` | ENUM | — | `commercial`, `matiere_premiere`, `food` |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `products`
Core product catalog used across procurement, menus, and sales.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `description` | TEXT | nullable | Notes and details |
| `type` | ENUM | NOT NULL | `commercial`, `matiere_premiere`, `food` |
| `category_id` | BIGINT UNSIGNED | FK → categories, nullable | Product category |
| `price` | DECIMAL(10,2) | DEFAULT 0.00 | Set by Responsable Achat on approval |
| `image` | VARCHAR(255) | nullable | Product image path |
| `is_active` | BOOLEAN | DEFAULT TRUE | Product availability flag |
| `allergens` | JSON | nullable | Array of allergen strings |
| `approval_status` | ENUM | DEFAULT `pending` | `pending`, `approved`, `rejected` |
| `usage_status` | ENUM | DEFAULT `IN_USE` | `IN_USE`, `NOT_IN_USE`, `OUT_OF_STOCK` |
| `created_by` | BIGINT UNSIGNED | FK → users, nullable | Creator (Chef Magasin or Chef Cuisine) |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

> **Business Rule:** `price` and `allergens` are only set/updated by Responsable Achat. Chef Magasin cannot modify a product once `approval_status` is `approved` or `rejected` (except `usage_status` and `image`).

---

#### `product_recipe`
Pivot table storing ingredient composition of food products (self-referential on `products`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `food_product_id` | BIGINT UNSIGNED | FK → products (CASCADE) | The food product |
| `ingredient_id` | BIGINT UNSIGNED | FK → products (CASCADE) | Ingredient (commercial/raw) |
| `quantity` | DECIMAL(10,2) | DEFAULT 1 | Amount required |
| `unit` | VARCHAR(255) | DEFAULT `piece` | `piece`, `kg`, `g`, `liter`, `ml` |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `stocks`
One-to-one with products. Tracks current inventory level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `product_id` | BIGINT UNSIGNED | FK → products (CASCADE) | Linked product |
| `quantity` | DECIMAL(10,2) | DEFAULT 0 | Current stock quantity |
| `min_threshold` | DECIMAL(10,2) | DEFAULT 5 | Minimum level before alert fires |
| `unit` | VARCHAR(255) | DEFAULT `piece` | Stock unit |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `stock_movements`
Full audit trail of every stock change. Enables FIFO deduction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `stock_id` | BIGINT UNSIGNED | FK → stocks (CASCADE) | Linked stock |
| `type` | ENUM | NOT NULL | `in`, `out`, `adjustment` |
| `quantity` | DECIMAL(10,2) | NOT NULL | Movement amount |
| `reason` | VARCHAR(255) | nullable | Reason for movement |
| `expiration_date` | DATE | nullable | Batch expiry — used for FIFO ordering |
| `user_id` | BIGINT UNSIGNED | FK → users, nullable | Operator who performed movement |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

> **FIFO Logic:** Deduction orders batches by `expiration_date ASC` (NULLs last), consuming oldest stock first.

---

#### `internal_orders`
Orders placed by Responsable F&B directed to Chef Cuisine or Chef Magasin.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `type` | ENUM | NOT NULL | `food` or `commercial` |
| `status` | ENUM | DEFAULT `EN_ATTENTE` | `EN_ATTENTE`, `DISPONIBLE`, `PARTIELLEMENT_DISPONIBLE`, `NON_DISPONIBLE` |
| `created_by` | BIGINT UNSIGNED | FK → users | Ordering manager |
| `assigned_to` | BIGINT UNSIGNED | FK → users, nullable | Auto-assigned chef |
| `pdv_id` | BIGINT UNSIGNED | FK → points_de_vente, nullable | Target outlet |
| `notes` | TEXT | nullable | Order instructions |
| `delivery_date` | DATE | nullable | Requested delivery date |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `internal_order_items`
Line items for each internal order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `internal_order_id` | BIGINT UNSIGNED | FK → internal_orders (CASCADE) | Parent order |
| `product_id` | BIGINT UNSIGNED | FK → products (CASCADE) | Requested product |
| `quantity_requested` | DECIMAL(10,2) | NOT NULL | Amount requested |
| `quantity_fulfilled` | DECIMAL(10,2) | DEFAULT 0 | Amount fulfilled |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `menus`
Weekly meal plans created by Chef Cuisine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Menu name/label |
| `week_start` | DATE | NOT NULL | Start date of the week |
| `week_end` | DATE | NOT NULL | End date of the week |
| `created_by` | BIGINT UNSIGNED | FK → users | Menu author |
| `is_active` | BOOLEAN | DEFAULT TRUE | Whether this menu is active |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `menu_items`
Products assigned to specific meal slots within a menu.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `menu_id` | BIGINT UNSIGNED | FK → menus (CASCADE) | Parent menu |
| `product_id` | BIGINT UNSIGNED | FK → products (CASCADE) | Assigned food product |
| `day_of_week` | ENUM | NOT NULL | `monday` … `sunday` |
| `meal_type` | ENUM | DEFAULT `lunch` | `breakfast`, `lunch`, `dinner`, `snack` |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `plannings`
Cashier shift scheduling managed by Responsable F&B.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `caissier_id` | BIGINT UNSIGNED | FK → users (CASCADE) | Scheduled cashier |
| `pdv_id` | BIGINT UNSIGNED | FK → points_de_vente (CASCADE) | Assigned outlet |
| `date` | DATE | NOT NULL | Shift date |
| `is_day_off` | BOOLEAN | DEFAULT FALSE | Day off flag |
| `start_time` | TIME | nullable | Shift start |
| `end_time` | TIME | nullable | Shift end |
| `created_by` | BIGINT UNSIGNED | FK → users | Planner |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |
| *(unique)* | — | UNIQUE(`caissier_id`, `date`) | One schedule per cashier per day |

---

#### `sales`
Point-of-sale transaction headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `caissier_id` | BIGINT UNSIGNED | FK → users | Cashier who processed the sale |
| `pdv_id` | BIGINT UNSIGNED | FK → points_de_vente | Outlet where sale occurred |
| `total_amount` | DECIMAL(10,2) | DEFAULT 0 | Total transaction amount |
| `payment_method` | ENUM | DEFAULT `cash` | `cash`, `card`, `other` |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `sale_items`
Individual product lines within a sale transaction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `sale_id` | BIGINT UNSIGNED | FK → sales (CASCADE) | Parent sale |
| `product_id` | BIGINT UNSIGNED | FK → products | Product sold |
| `quantity` | INT | NOT NULL | Units sold |
| `unit_price` | DECIMAL(10,2) | NOT NULL | Price at time of sale |
| `subtotal` | DECIMAL(10,2) | NOT NULL | quantity × unit_price |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `hygiene_reports`
Product safety and compliance inspection records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `product_id` | BIGINT UNSIGNED | FK → products (CASCADE) | Inspected product |
| `inspected_by` | BIGINT UNSIGNED | FK → users | Inspector (Responsable Hygiène) |
| `allergens_verified` | BOOLEAN | DEFAULT FALSE | Allergen check status |
| `expiration_verified` | BOOLEAN | DEFAULT FALSE | Expiry check status |
| `status` | ENUM | DEFAULT `en_cours` | `conforme`, `non_conforme`, `en_cours` |
| `remarks` | TEXT | nullable | Inspector notes |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `notifications`
In-app notification inbox for all users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `user_id` | BIGINT UNSIGNED | FK → users (CASCADE) | Notification recipient |
| `title` | VARCHAR(255) | NOT NULL | Short title |
| `message` | TEXT | NOT NULL | Full notification body |
| `type` | VARCHAR(255) | DEFAULT `info` | `info`, `warning`, `alert`, `success` |
| `is_read` | BOOLEAN | DEFAULT FALSE | Read/unread state |
| `data` | JSON | nullable | Additional structured payload |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

#### `comments`
Polymorphic comment system attached to any model (orders, products, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT UNSIGNED | PK | Primary key |
| `user_id` | BIGINT UNSIGNED | FK → users (CASCADE) | Comment author |
| `commentable_type` | VARCHAR(255) | NOT NULL | Polymorphic model class |
| `commentable_id` | BIGINT UNSIGNED | NOT NULL | Polymorphic model ID |
| `body` | TEXT | NOT NULL | Comment content |
| `created_at` / `updated_at` | TIMESTAMP | — | Audit timestamps |

---

### 3.2 Entity Relationship Overview

```
airports ──< points_de_vente >── users (responsable_fb)
                  │
                  ├──< users (caissiers via plannings)
                  ├──< sales >── sale_items >── products
                  └──< internal_orders

users ──< internal_orders (created_by / assigned_to)
      ──< notifications
      ──< comments
      ──< hygiene_reports

products ──< stocks >── stock_movements
         ──< product_recipe (self-referential: food → ingredients)
         ──< menu_items >── menus
         ──< internal_order_items >── internal_orders
         ──< hygiene_reports

categories ──< products
```

### 3.3 Alwaysdata Hosting Compatibility

The database schema is fully compatible with **Alwaysdata's managed MySQL** (MySQL 8.0):

- All column types (`DECIMAL`, `ENUM`, `JSON`, `TEXT`, `TIMESTAMP`) are natively supported by Alwaysdata's MySQL environment
- Foreign key constraints with `CASCADE` and `NULL ON DELETE` are fully supported by the InnoDB engine on Alwaysdata
- `JSON` columns (`allergens`, notification `data`) require MySQL 5.7.8+ — Alwaysdata's MySQL 8.0 is fully compatible
- `BIGINT UNSIGNED` primary keys support future scaling
- The polymorphic comments table uses a standard Eloquent pattern fully compatible with Alwaysdata's MySQL
- The Laravel `storage/` directory for file uploads is fully supported under Alwaysdata's shared and dedicated hosting plans
- Alwaysdata provides SSH access, enabling `php artisan migrate` to be run directly from the server

---

## 4. Completed Features

All 7 planned feature groups from the project roadmap have been fully implemented.

---

### Feature 1 — SweetAlert2 Confirmations on Delete

**Scope:** Angular Frontend | **Files:** `users.ts`, `products.component.ts`

Both user deletion (Super Admin) and product deletion (Chef Magasin) display a two-step SweetAlert2 modal before executing any destructive action.

**Implementation pattern (both components):**
- Step 1: Warning modal with Cancel / Confirm buttons
- Step 2 (on confirm): API call executed
- Step 3: Success toast shown + list auto-refreshes via `loadUsers()` / `load()`
- On API error: Error toast with server-provided message

---

### Feature 2 — Role-Restricted Product Form Fields

**Scope:** Angular Frontend | **File:** `products.component.ts`

Chef Magasin and Chef Cuisine users see a simplified product creation form. Three sensitive fields are conditionally hidden using Angular's `@if` control flow:

| Field | Chef Magasin / Chef Cuisine | Responsable Achat |
|-------|-----------------------------|-------------------|
| `price` | Hidden | Visible |
| `allergens` | Hidden | Visible |
| `expiration_date` | Hidden | Visible |

Hidden fields are also excluded from the `FormData` payload on submission — the backend never receives these values from restricted roles. The data remains in the database and is accessible to Responsable Achat for price setting upon product approval.

---

### Feature 3 — Product Edit Lock After Approval

**Scope:** Laravel Backend | **File:** `ProductController.php → update()`

When a product's `approval_status` is `approved` or `rejected`, Chef Magasin receives an HTTP 403 error if they attempt to modify any field other than `usage_status` or `image`.

**Allowed for approved products (Chef Magasin only):**
- `usage_status`: `IN_USE` / `NOT_IN_USE` / `OUT_OF_STOCK`
- `image`: Product photo update

This enforces the business rule that approved products are locked — only operational status and visuals may be updated by the warehouse manager.

---

### Feature 4 — Cross-Role Product Modification Notifications

**Scope:** Laravel Backend | **File:** `ProductController.php`

A complete bidirectional notification system operates between Chef Magasin and Responsable Achat:

| Action | Triggered by | Notified party |
|--------|-------------|----------------|
| Product modified | Chef Magasin | All Responsable Achat users |
| Product deleted | Chef Magasin | All Responsable Achat users |
| Product modified | Responsable Achat | All Chef Magasin users |
| Product deleted | Responsable Achat | All Chef Magasin users |
| Product approved / rejected | Responsable Achat | All Chef Magasin users |

Notifications are broadcast to **all users of the target role** (not just one). Each notification is stored in the `notifications` table and visible in the recipient's in-app notification inbox.

---

### Feature 5 — Kanban Board with Drag & Drop

**Scope:** Angular Frontend | **File:** `internal-orders.component.ts`

Internal orders are displayed in a Trello-style Kanban board with 4 status columns. Cards can be dragged between columns to update order status in real time using Angular CDK `DragDropModule`.

| Column | Status Code | Description |
|--------|-------------|-------------|
| En Attente | `EN_ATTENTE` | Order received, not yet processed |
| Disponible | `DISPONIBLE` | Order fully fulfilled |
| Partiellement Disponible | `PARTIELLEMENT_DISPONIBLE` | Partial fulfillment |
| Non Disponible | `NON_DISPONIBLE` | Cannot fulfill |

On card drop: `PUT /api/internal-orders/{id}/status` is called. SweetAlert2 provides success/error feedback. The board is role-aware: Chef Cuisine sees food orders, Chef Magasin sees commercial orders.

---

### Feature 6 — Automatic Stock Validation on Menu Creation

**Scope:** Laravel Backend | **File:** `MenuController.php → store()`

Before accepting a new weekly menu, the system validates stock availability for every listed product.

**Flow:**
1. Request received for new menu with product list
2. For each item: check `stock.quantity >= required_quantity`
3. If any product has insufficient stock:
   - Collect all deficit details
   - Send notification to all Chef Magasin users with itemized shortage report
   - Return HTTP 422 with detailed deficit breakdown
4. If all stock is sufficient:
   - Create the menu record
   - Deduct stock for each item using **FIFO logic** (oldest batches consumed first)
   - Return HTTP 201 with created menu

---

### Feature 7 — Security Hardening

**Scope:** Laravel Backend | **Files:** `api.php`, `InternalOrderController.php`, `categories` migration

Three security measures were implemented:

**a) Unique constraint on `categories.code`:**
The `code` field in the `categories` table now has a database-level `UNIQUE` constraint, preventing duplicate category codes.

**b) Caissier blocked from updating internal order status:**
`InternalOrderController::updateStatus()` checks the caller's role and returns HTTP 403 if the user is a Caissier. This prevents cashiers from manipulating warehouse/kitchen order workflows.

**c) Route deduplication and access restriction:**
- Duplicate product routes (previously registered twice — once for Chef Cuisine, once for Chef Magasin) merged into a single combined middleware group: `role:CHEF_CUISINE,CHEF_MAGASIN,SUPER_ADMIN`
- `GET /products` and `GET /internal-orders` now restricted to 6 explicitly named roles via middleware — Caissier is excluded from these endpoints
- `POST /categories` restricted to Responsable Achat only, removing the previously open shared access

---

## 5. Technical Stack

### 5.1 Backend — Laravel 11

| Component | Technology |
|-----------|-----------|
| Framework | Laravel 11.x |
| Language | PHP 8.2+ |
| Authentication | JWT (tymon/jwt-auth) |
| Database ORM | Eloquent (built-in) |
| API Style | RESTful JSON |
| File Storage | Laravel Storage (public disk / S3-ready) |
| Password Hashing | Bcrypt (built-in) |

**Key patterns used:**
- Route-level middleware for role enforcement (`role:ROLE_NAME`)
- Controller-level business rule enforcement (403 / 422 responses)
- Eloquent relationships: `hasOne`, `hasMany`, `belongsTo`, `belongsToMany` with pivot, `morphTo`/`morphMany`
- FIFO stock deduction via ordered query on `stock_movements`
- Automatic stock record creation (`min_threshold: 15`) on product creation

### 5.2 Frontend — Angular (Web Dashboard)

| Component | Technology |
|-----------|-----------|
| Framework | Angular 17+ (Standalone Components) |
| Language | TypeScript |
| HTTP | Angular HttpClient + JWT interceptor |
| Forms | Reactive Forms + Template-driven Forms |
| Alerts & Modals | SweetAlert2 |
| Drag & Drop | Angular CDK DragDropModule |
| Loading States | Custom `PageLoadingComponent` |

**Key patterns:**
- Standalone components (no NgModules)
- `@if` / `@for` Angular 17 control flow syntax
- Optional chaining (`?.`) throughout templates
- Dynamic sidebar rendering based on role from `localStorage`
- Type assertions in template bindings for type safety
- Role guard: `isRestrictedRole` computed property for field visibility

### 5.3 Mobile — Flutter

| Component | Technology |
|-----------|-----------|
| Framework | Flutter (Dart) |
| Platforms | iOS + Android |
| Auth | JWT Bearer token (persistent storage) |
| Config | Dynamic base URL (environment switchable) |

**Key features:**
- Dynamic base URL — switchable between development and production without rebuilding
- Role-aware UI: Admin/management sections are hidden from Caissier role
- Dynamic sidebar navigation matching the web dashboard's role structure

---

## 6. Security Implementation

### 6.1 Authentication

- **JWT (JSON Web Tokens)** issued on successful login
- All protected API requests require `Authorization: Bearer {token}` header
- Token refresh endpoint: `POST /api/refresh`
- Logout invalidates the token server-side
- Password reset flow with time-limited email tokens

### 6.2 Route-Level Role Enforcement

All protected routes are wrapped in `middleware('role:ROLE_A,ROLE_B')` groups. Requests from users whose role is not listed receive **HTTP 403 Forbidden** before reaching the controller.

### 6.3 Controller-Level Business Rules

| Rule | Controller | Response |
|------|-----------|----------|
| Chef Magasin cannot edit approved/rejected products (except usage_status) | `ProductController::update()` | 403 |
| Caissier cannot update internal order status | `InternalOrderController::updateStatus()` | 403 |
| Product type must match category type | `ProductController::store()` | 422 |
| Food products require at least 1 ingredient | `ProductController::store()` | 422 |
| Menu creation blocked on insufficient stock | `MenuController::store()` | 422 |

### 6.4 Data Validation

Every endpoint performs server-side Laravel validation:
- Required fields, type checks, min/max constraints
- Foreign key existence (`exists:table,column`)
- Enum value restrictions
- File type and size limits (`image|max:2048`)
- Unique constraints (emails, product names, category codes)

### 6.5 Password & Account Security

- Passwords stored as Bcrypt hashes — never plain text
- Caissier accounts require Super Admin approval (`status: en_attente → active`)
- User role is immutable after account creation (enforced by disabling the role_id field in Angular)
- Avatar files stored as paths — never executable

---

## 7. API Endpoints Summary

**Base URL:** `https://[your-domain]/api`  
**Authentication:** `Authorization: Bearer {jwt_token}` required on all protected routes

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate and receive JWT |
| POST | `/forgot-password` | Request password reset email |
| POST | `/password/reset` | Reset password with token |

### Universal (All Authenticated Users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Current user profile |
| POST | `/logout` | Invalidate JWT |
| POST | `/refresh` | Refresh JWT token |
| PUT / POST | `/profile` | Update profile (PUT or FormData POST) |
| PUT | `/reset-password` | Change password |
| GET | `/notifications` | Notification inbox |
| GET | `/notifications/unread-count` | Unread count badge |
| PUT | `/notifications/{id}/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |
| GET / POST | `/comments` | View / add comments |
| GET | `/roles` | Available roles list |
| GET | `/dashboard` | Dashboard summary |

### Super Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/users` | List / create users |
| GET / PUT / DELETE | `/users/{id}` | View / update / delete user |
| POST | `/users/{id}` | Update via FormData (method spoofing) |
| ALL | `/points-de-vente` | Full outlet management |
| GET | `/airports` | Airport list |
| GET | `/caissiers/pending` | Pending cashier approvals |
| PUT | `/users/{id}/approve` | Approve cashier |
| PUT | `/users/{id}/reject` | Reject cashier |
| GET | `/users/check-email` | Email availability check |

### Responsable F&B

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/caissiers` | Create cashier account |
| GET | `/caissier` | List cashiers |
| PUT | `/caissiers/{id}/status` | Toggle cashier status |
| POST | `/products/by-categories` | Products filtered by categories |
| GET / POST | `/internal-orders` | List / create internal orders |
| GET / DELETE | `/internal-orders/{id}` | View / delete order |
| ALL | `/plannings` | Shift scheduling |
| POST | `/plannings/bulk` | Bulk schedule creation |

### Chef Cuisine (exclusive)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/products/{id}/recipe` | Set food product recipe (ingredients) |
| ALL | `/menus` | Weekly menu management |
| GET | `/menus/current-week` | Active menu for current week |

### Chef Cuisine + Chef Magasin (combined)

| Method | Endpoint | Description |
|--------|----------|-------------|
| ALL | `/products` | Full product CRUD |
| PUT | `/products/{id}/toggle-active` | Toggle active status |
| PUT | `/internal-orders/{id}/status` | Update Kanban status |
| PUT | `/internal-orders/{id}/items/{itemId}/fulfill` | Fulfill order item |

### Chef Magasin (stocks — exclusive)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stocks` | Stock list |
| GET | `/stocks/{id}` | Stock detail |
| POST | `/stocks/{id}/movements` | Add stock movement |
| GET | `/stocks/{id}/movements` | Movement history |
| PUT | `/stocks/{id}/threshold` | Update minimum threshold |

### Responsable Achat

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/products/{id}/approve` | Approve or reject product |
| POST | `/categories` | Create category |
| PUT | `/categories/{id}` | Update category |
| DELETE | `/categories/{id}` | Delete category |

### Responsable Hygiène

| Method | Endpoint | Description |
|--------|----------|-------------|
| ALL | `/hygiene-reports` | Hygiene inspection reports |

### Caissier

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/sales` | List / create sales |
| GET | `/sales/{id}` | Sale detail |

### Shared Read Access (All Roles Except Caissier)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Product list (role-filtered by controller) |
| GET | `/products/{id}` | Product detail |
| GET | `/categories` | Category list |
| GET | `/internal-orders` | Order list (role-filtered) |
| GET | `/internal-orders/{id}` | Order detail |
| GET | `/stocks/alerts/low` | Low stock alert list |
| GET | `/stocks/alerts/expired` | Expired/expiring products |

---

*This report was generated based on direct analysis of the AeroServe backend (Laravel 11) and frontend (Angular 17) source code, including 29 database migration files, as of **May 22, 2026**.*

---

**— End of Document — AeroServe Client Technical Report v1.0**
