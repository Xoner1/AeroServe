# AeroServe Role-by-Role Refinement Checklist & Action Plan

This document serves as our complete master checklist for the page-by-page review, correction, and styling refinement of the AeroServe application across all user roles. 

---

## 🏁 Progress Summary

* **[x] RESPONSABLE_FB** (`fb@aeroserve.com`) — **100% COMPLETED**
* **[x] CHEF_CUISINE** (`cuisine@aeroserve.com`) — **100% COMPLETED**
* **[x] CHEF_MAGASIN** (`magasin@aeroserve.com`) — **100% COMPLETED**
* **[x] RESPONSABLE_ACHAT** (`achat@aeroserve.com`) — **100% COMPLETED**
* **[x] RESPONSABLE_HYGIENE** (`hygiene@aeroserve.com`) — **100% COMPLETED**
* **[x] CAISSIER** (`caissier@aeroserve.com`) — **100% COMPLETED**
* **[x] SUPER_ADMIN** (`admin@aeroserve.com`) — **100% COMPLETED**

---

## 🟢 Completed: F&B Manager (`RESPONSABLE_FB` / fb@aeroserve.com)

We verified and refined the user experience for the F&B Manager role.

- **[x] Dashboard Component (`/dashboard`)**
  - Removed the decommissioned "Approbation Caissiers" shortcut card.
  - Polished the Flight-Strip header (ambient radial glow, role-specific color accents, layout spacing).
  - Enhanced KPI cards with colored border indicators (orders, processed, waste, revenue, load) and soft shadow glows.
  - Revamped Shortcut Cards (hover shimmer animations, enlarged icon gradient backgrounds, cubic-bezier transition curves).
  - Cleaned up dark-mode / standard contrast values.
- **[x] Planning Grid (`/plannings`)**
  - Redesigned the calendar/planning matrix into a responsive, scrollable grid.
  - Configured layout to only show active shifts to avoid empty clutter.
  - Replaced text inputs with a select dropdown in the modal for seamless shift assignments.
  - Fixed timezone offset bugs inside `getDayPlannings()` mapping backend `user_id` properly.
- **[x] Internal Commands (`/internal-orders`)**
  - Verified navigation links and routing.
  - Tested creation and listing of internal orders.
- **[x] Profile (`/profile`)**
  - Checked profile updating and avatar upload functionality.

---

## 🟡 Up Next: Chef Cuisine (`CHEF_CUISINE` / cuisine@aeroserve.com)

The Chef Cuisine manages kitchen stock, menus, recipe details, and orders raw materials.

### Checklist & Tasks:
- **[x] Dashboard (`/dashboard`)**
  - [x] Check if kitchen load KPI cards and charts display correct values.
  - [x] Polish colors to match the theme (e.g., orange/red accenting).
  - [x] Ensure list views for active menus and ingredients are responsive and premium.
- **[x] Products (`/products`)**
  - [x] Ensure that only `Food` type products are shown (filter constraint is hardcoded/correct).
  - [x] Verify that the "Nouveau Produit" modal operates correctly and limits inputs to food items.
  - [x] Confirm image upload and display works perfectly.
- **[x] Stocks (`/stocks`)**
  - [x] Verify kitchen inventory view.
  - [x] Test recording stock movements: specifically kitchen input, output, and kitchen waste logging.
  - [x] Check if critical stock warnings appear correctly.
- **[x] Internal Commands (`/internal-orders`)**
  - [x] Test creating a new command for raw materials from the store/reserve.
  - [x] Confirm kitchen orders appear in the table with correct status (e.g., `pending`).
- **[x] Menus (`/menus`)**
  - [x] Verify recipe manager interface.
  - [x] Check ingredient mapping forms for potential UI issues or input field styling.
  - [x] Polish recipe builder card layout to look modern and premium.
- **[x] Purchase Needs (`/purchase-needs`)**
  - [x] Add the page to layout navigation sidebar if missing.
  - [x] Test the automatic ingredient needs calculator based on active menus and current stock.
- **[x] Profile (`/profile`)**
  - [x] Verify update profile and avatar upload.

---

## 🔴 Pending: Chef Magasin (`CHEF_MAGASIN` / magasin@aeroserve.com)

Responsible for raw materials, inventory controls, expiries, and processing kitchen requests.

### Checklist & Tasks:
- **[x] Dashboard (`/dashboard`)**
  - [x] Test critical stock threshold bars (Fixed layout grid mismatch).
  - [x] Verify "Lots Expirés" (expired batches) list.
  - [x] Check recent stock movement listing formatting.
- **[x] Products (`/products`)**
  - [x] Ensure view defaults to `matiere_premiere` (raw materials) or `commercial` products (Reserve).
- **[x] Stocks (`/stocks`)**
  - [x] Test incoming goods entry (Entrée de stock).
  - [x] Verify inventory adjustments (Ajustement) and waste reporting.
  - [x] Check batch/lot number generation and expiration date inputs (Verified auto-incrementing ID lot numbering).
- **[x] Internal Commands (`/internal-orders`)**
  - [x] Verify receipt of kitchen commands.
  - [x] Test the "Approve/Dispatch" flow for kitchen orders.
- **[x] Purchase Needs (`/purchase-needs`)**
  - [x] Check raw material purchase lists.
- **[x] Profile (`/profile`)**
  - [x] Verify layout and edits.

---

## 🟡 Up Next: Responsable Achat (`RESPONSABLE_ACHAT` / achat@aeroserve.com)

Manages procurement, supplier products catalog, and categorization.

### Checklist & Tasks:
- **[x] Dashboard (`/dashboard`)**
  - [x] Verify AI Predictive Stock assistant panel.
  - [x] Confirm depletion forecasts list dates match actual calculations.
- **[x] Products (`/products`)**
  - [x] Test full CRUD capabilities for catalog items.
- **[x] Products Validation (`/products-validation`)**
  - [x] Review approval/rejection flows for products.
- **[x] Category (`/category`)**
  - [x] Polish category creation/management views.
- **[x] Profile (`/profile`)**
  - [x] Verify profile management.

---

## 🟡 Up Next: Responsable Hygiène (`RESPONSABLE_HYGIENE` / hygiene@aeroserve.com)

Records audits, compliance reviews, and checks sanitary standards.

### Checklist & Tasks:
- **[x] Dashboard (`/dashboard`)**
  - [x] Check hygiene scores presentation and compliance alerts.
- **[x] Hygiene Reports (`/hygiene-reports`)**
  - [x] Verify creation, update, and deletion of hygiene audits.
  - [x] Refine report submission form layout.
- **[x] Profile (`/profile`)**
  - [x] Verify profile edits.

---

## 🟡 Up Next: Caissier (`CAISSIER` / caissier@aeroserve.com)

Sales staff checking planning.

### Checklist & Tasks:
- **[x] Plannings (`/plannings`)**
  - [x] Ensure they only see their assigned calendar (read-only mode).
  - [x] Verify shift start/end timestamps and timezone consistency.
- **[x] Profile (`/profile`)**
  - [x] Verify profile updates.

---

## 🟡 Up Next: Super Admin (`SUPER_ADMIN` / admin@aeroserve.com)

Complete system administrative cockpit.

### Checklist & Tasks:
- **[x] Dashboard (`/dashboard`)**
  - [x] Check global KPI stats (effectif, retards, total waste).
  - [x] Verify global charts rendering.
- **[x] Users (`/users`)**
  - [x] Verify full CRUD operations on user database.
  - [x] Check status toggling and role changes.
- **[x] Points of Sales (`/points-de-vente`)**
  - [x] Verify PDV management interface.
- **[x] Profile (`/profile`)**
  - [x] Verify profile details.
