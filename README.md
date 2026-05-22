# ✈️ AeroServe — Comprehensive System Documentation
### The Ultimate Airport Food & Beverage (F&B) Management System

AeroServe is a modern, enterprise-grade, multi-platform ecosystem designed to digitize and automate the entire supply chain, inventory, and point-of-sale operations for airport catering and concessions across multiple locations. 

The system leverages a robust **Laravel REST API** backend, an interactive **Angular Web Dashboard** for operations, and a highly responsive **Flutter Mobile App** for sales and cashier personnel.

---

## 🗺️ System Architecture Overview

```
                        ┌───────────────────────────────────────────────────┐
                        │                   CLIENT LAYER                    │
                        │  ┌─────────────────────┐   ┌───────────────────┐  │
                        │  │ Angular Web Control │   │ Flutter Mobile    │  │
                        │  │ panel (Operations)  │   │ app (Cashier/POS) │  │
                        │  └──────────┬──────────┘   └─────────┬─────────┘  │
                        └─────────────┼────────────────────────┼────────────┘
                                      │                        │
                                      │ HTTPS + JWT Auth       │
                        ┌─────────────▼────────────────────────▼────────────┐
                        │                  BACKEND API LAYER                │
                        │                  Laravel 11 REST API              │
                        │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │
                        │  │ Auth/JWT │ │ Inventory│ │ Orders   │ │ Alerts│ │
                        │  └──────────┘ └──────────┘ └──────────┘ └──────┘  │
                        └────────────────────────┬──────────────────────────┘
                                                 │
                        ┌────────────────────────▼──────────────────────────┐
                        │                  DATA STORAGE LAYER               │
                        │               MySQL Database (Alwaysdata)         │
                        └───────────────────────────────────────────────────┘
```

---

## 🌟 Core System Features

### 1. Role-Based Access Control (RBAC)
AeroServe enforces strict privilege-scoping across **8 distinct user roles** to protect data integrity and separate business functions:
* **Super Admin (`SUPER_ADMIN`):** Full administrative controls, user management, point-of-sale setup.
* **F&B Manager (`RESPONSABLE_FB`):** Directs daily operations, shifts scheduling, internal orders approval.
* **Warehouse Chef (`CHEF_MAGASIN`):** Manages raw material batches, stocks, warehouse logistics.
* **Kitchen Chef (`CHEF_CUISINE`):** Configures recipes, compiles and publishes weekly dining menus.
* **Purchase Manager (`RESPONSABLE_ACHAT`):** Product creation/review, supplier relations, catalog pricing.
* **Hygiene Officer (`RESPONSABLE_HYGIENE`):** Publishes compliance reports, performs safety inspections.
* **Cashier (`CAISSIER`):** Conducts counter sales, processes checkouts on POS terminals.
* **Client / Consumer (`CLIENT`):** Terminal orders interface.

### 2. Smart Inventory & FIFO Engine
* **First-In, First-Out (FIFO):** Automatic batch-deduction engine that decrements stocks starting from the oldest active expiration dates first.
* **Batch Tracing:** Full traceability from purchase receipt down to consumption.
* **Proactive Threshold Alerts:** System-wide triggers notify the operations panel when product stocks hit safety buffer lines or approach expiration dates.

### 3. Kitchen & Ordering Workflows
* **Kanban Order Tracking:** Visual drag-and-drop workflow tracking internal orders from `Pending` ➔ `In Preparation` ➔ `Ready` ➔ `Delivered`.
* **Weekly Menu Automation:** Kitchen Chefs design menu planners that automatically cross-reference warehouse ingredient availability before publish approval.

### 4. POS and Payment Systems
* **Terminal Operations:** Tailored mobile interfaces for rapid checkout.
* **Multi-channel Payments:** Supports cash, vouchers, and card processing.

---

## 📁 Repository Structure

```
AeroServe/
├── AeroserveBackendAhlem-main/    # Laravel 11 REST API Backend
├── AeroservefrontendAhlem-main/   # Angular 17 Management Web Panel
├── aeroservemobileahlem-main/     # Flutter Mobile Application
├── CLIENT_FINAL_REPORT.md         # Final client delivery technical report
└── README.md                      # This comprehensive documentation file
```

---

## 🛠️ Module Setup & Installation Guides

---

### 💻 1. Backend REST API (Laravel 11)
Located under: `AeroserveBackendAhlem-main/`

#### Prerequisites
* **PHP:** `^8.2` (with JSON, PDO, OpenSSL, BCMath, and Mbstring extensions active)
* **Dependency Manager:** Composer
* **Database:** MySQL 8.0+

#### Installation Steps
1. Navigate to the backend directory:
   ```bash
   cd AeroserveBackendAhlem-main
   ```
2. Install project dependencies:
   ```bash
   composer install
   ```
3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` database parameters:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=aeroserve
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```
5. Generate the application encryption key:
   ```bash
   php artisan key:generate
   ```
6. Run database migrations and seed system defaults:
   ```bash
   php artisan migrate --seed
   ```
7. Start the local development server:
   ```bash
   php artisan serve
   ```
   *The API will be accessible locally at `http://127.0.0.1:8000`*

---

### 🌐 2. Web Management Control Panel (Angular 17)
Located under: `AeroservefrontendAhlem-main/`

#### Prerequisites
* **Runtime:** Node.js (v18 or v20 recommended)
* **Package Manager:** npm

#### Installation Steps
1. Navigate to the frontend directory:
   ```bash
   cd AeroservefrontendAhlem-main
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Set your backend endpoints in `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://127.0.0.1:8000/api'
   };
   ```
4. Launch the local compilation development server:
   ```bash
   npm start
   ```
   *Open `http://localhost:4200` inside your browser to access the control panel.*

---

### 📱 3. Mobile Cashier POS App (Flutter)
Located under: `aeroservemobileahlem-main/`

#### Prerequisites
* **Development Kit:** Flutter SDK (`^3.19.0` or higher)
* **Target Platforms:** Android / iOS

#### Installation Steps
1. Navigate to the mobile app directory:
   ```bash
   cd aeroservemobileahlem-main
   ```
2. Fetch package dependencies:
   ```bash
   flutter pub get
   ```
3. Run the application on an active emulator or connected test device:
   ```bash
   flutter run
   ```

---

## ☁️ Deployment & Alwaysdata Hosting
AeroServe is optimized for seamless deployment to **Alwaysdata** managed hosting:
* **Database Platform:** MySQL 8.0 with InnoDB engine, supporting JSON field structures and relational foreign key constraints.
* **Static Assets Storage:** Standardized Symlink structures resolving `public/storage` directly to persistent volumes.
* **Cron Queue Jobs:** Supports cron orchestration for handling background tasks and FIFO expiration scans.
