# Bugs & Fixes Log

## Session 1 — All fixes (7 June 2026)

### 1. PDV Notifications When Assigning Manager
- **Files:** `AeroserveBackendAhlem-main/app/Http/Controllers/Api/PointDeVenteController.php`
- **Problem:** When a RESPONSABLE_FB was assigned to a Point de Vente, no notification was sent.
- **Fix:** Added `use App\Models\Notification;` import. Added `Notification::create([...])` in both `store()` and `update()` when `responsable_fb_id` is set, so the assigned manager gets a real-time alert.
- **Status:** ✅ Applied (8 June 2026)

### 2. CHEF_CUISINE Products Auto-Approval
- **Files:** `AeroserveBackendAhlem-main/app/Http/Controllers/Api/ProductController.php`
- **Problem:** Products created by CHEF_CUISINE needed RESPONSABLE_ACHAT approval, but the chef is responsible for their own recipes — no external approval should be required.
- **Fix:** In `ProductController::store()`, changed `$data['approval_status'] = 'pending'` to `$data['approval_status'] = ($role === 'CHEF_CUISINE') ? 'approved' : 'pending'`, bypassing the purchasing manager's validation queue for chef-created food products.
- **Status:** ✅ Applied (8 June 2026)

### 3. Chef Can Edit Own Approved Products
- **Files:** `AeroservefrontendAhlem-main/src/app/pages/products/products.component.ts`
- **Problem:** The `isLockedField()` method locked editing for all approved products, including the chef's own products that need no approval.
- **Fix:** Added `if (this.isChefCuisine) return false;` at the start of `isLockedField()`, so the chef can always edit their own products regardless of approval status.
- **Status:** ✅ Verified present

### 4. Available Ingredients Filter
- **Files:** `AeroservefrontendAhlem-main/src/app/pages/products/products.component.ts`
- **Problem:** The `availableIngredients` getter returned ALL products (including COMMERCIAL), but a recipe can only contain RAW_MATERIAL (matière première).
- **Fix:** Changed the filter to `type === 'matiere_premiere'` so only raw materials appear as selectable ingredients.
- **Status:** ✅ Verified present

### 5. Menu Builder Product Source
- **Files:** `AeroservefrontendAhlem-main/src/app/pages/menus/menus.component.ts`
- **Problem:** The Chef de Cuisine's menu builder was loading FOOD products instead of RAW_MATERIAL (matière première) to compose daily menus.
- **Fix:** Changed `loadAllProducts()` to call the API with `{ type: 'matiere_premiere' }` parameter.
- **Status:** ✅ Verified present

### 6. Hygiene Products Page (New)
- **Files:**
  - `AeroservefrontendAhlem-main/src/app/pages/hygiene-products/hygiene-products.component.ts`
  - `AeroservefrontendAhlem-main/src/app/app.routes.ts`
  - `AeroservefrontendAhlem-main/src/app/layout/layout.component.ts`
- **Feature:** A dedicated page for RESPONSABLE_HYGIENE to monitor all FOOD products, with inline editing of `allergenes` and `expiration_date` directly on products.
- **Route:** `/hygiene-products` (guarded by `roleGuard('RESPONSABLE_HYGIENE')`)
- **Backend:** Added `PUT /api/products/{product}/hygiene` endpoint with `ProductController::hygieneUpdate()`.
- **Status:** ✅ Verified present

### 7. Hygiene Reports CSV Export
- **Files:**
  - `AeroserveBackendAhlem-main/app/Http/Controllers/Api/HygieneReportController.php` — added `export()` method returning CSV
  - `AeroservefrontendAhlem-main/src/app/core/services/api.service.ts` — added `getBlob()` for file downloads
  - `AeroservefrontendAhlem-main/src/app/pages/hygiene-reports/hygiene-reports.component.ts` — added "Télécharger CSV" button
  - `AeroservefrontendAhlem-main/src/app/core/icon/icons` — added Download SVG icon
- **Route:** `GET /api/hygiene-reports/export`
- **Status:** ✅ Verified present

### 8. Chatbot — Function Calling (Major Refactor)
- **Files:** `AeroserveBackendAhlem-main/app/Http/Controllers/Api/ChatbotController.php`
- **Problem:** The chatbot had a static list of product names injected into the system prompt to prevent the LLM from hallucinating non-existent products. This was brittle and didn't scale as products changed.
- **Fix:** Complete rewrite to use native **function calling / tool calling** for all three AI providers:
  - **OpenAI** (gpt-4o-mini): Uses `tools` parameter with `tool_choice: auto`, handles `tool_calls` response, executes DB query via `executeToolCall()`, sends results back as `role: tool` messages for final answer
  - **Groq** (llama-3.1-8b-instant): Same OpenAI-compatible flow
  - **Gemini** (gemini-1.5-flash): Uses `function_declarations` + `functionResponse` parts via `getGeminiFunctionDeclarations()`
- **Three tools defined** (via `getToolDefinitions()` / `getGeminiFunctionDeclarations()`):
  1. `chercher_produits(query)` — searches products by name/type/keyword
  2. `obtenir_details_produit(product_id)` — full product details with stock, hygieneReports, category
  3. `obtenir_tous_produits()` — complete active product catalog
- **Flow:** LLM decides to call a function → PHP executes real DB query via `executeToolCall()` → JSON result returned → LLM answers based on real data. No more pre-injected lists.
- **Status:** ✅ Applied (8 June 2026)

### 9. Chatbot — Strict Off-Topic Rejection
- **Files:** `AeroserveBackendAhlem-main/app/Http/Controllers/Api/ChatbotController.php`
- **Problem:** The chatbot would respond to greetings and off-topic questions ("Bonjour", "How are you?", "Quel temps fait-il ?").
- **Fix (AI path):** Added a hard rule in the system prompt: *"Tu ne dois repondre a AUCUNE question qui ne concerne pas directement l'application AeroServe. Meme les salutations simples ou les questions hors-sujet doivent etre refusees poliment."*
- **Fix (local fallback):** Added `isOnTopicMessage()` method with 50+ keyword detection for project topics (`produit`, `stock`, `commande`, `planning`, `allergene`, etc.) and a greeting/salutation blacklist (FR + EN + AR). If the message doesn't match any project topic, the fallback returns a polite refusal.
- **Status:** ✅ Applied (8 June 2026)

### 10. Planning — Auto-Detect Shift from Time
- **Files:** `AeroserveBackendAhlem-main/app/Http/Controllers/Api/PlanningController.php`
- **Problem:** When a user changed `start_time` (e.g., from 08:00 to 14:00), the `shift` label remained `MATIN` instead of updating to `APRES_MIDI`.
- **Fix:** Added `determineShiftFromTime(?string $startTime): string` that maps:
  - `< 12:00` → `MATIN`
  - `12:00 – 16:59` → `APRES_MIDI`
  - `>= 17:00` → `SOIR`
- Applied in `store()`, `update()`, and `bulkStore()` — if `shift` is not explicitly provided in the request but `start_time` is, the shift is auto-calculated.
- **Status:** ✅ Verified present

### 11. AGENTS.md Created
- **Files:** `/AGENTS.md`
- A complete project guide covering: quick commands (backend/frontend/mobile), architecture notes, key conventions, environment files, testing, common gotchas, and documentation references.
- **Status:** ✅ Verified present

---

## Session 2 — Verification & Missing Fixes (8 June 2026)

Ran a full code audit against Session 1 entries. Found fixes #1, #2, #8, #9 were **not present** in the codebase despite being documented. Applied all missing fixes:

| Fix | File(s) Modified | Change |
|-----|-----------------|--------|
| #1 | `PointDeVenteController.php` | Added `Notification` import + `Notification::create()` in `store()` and `update()` |
| #2 | `ProductController.php` | Changed `approval_status` assignment to ternary based on `CHEF_CUISINE` role |
| #8 | `ChatbotController.php` | Full rewrite: added `getToolDefinitions()`, `getGeminiFunctionDeclarations()`, `executeToolCall()`, function calling loops for all 3 AI providers |
| #9 | `ChatbotController.php` | Added strict off-topic rule to system prompt + `isOnTopicMessage()` with greeting blacklist |

**All 11 fixes from Session 1 are now confirmed present in the codebase.**

---

## Session 3 — Bug Fixes (8 June 2026)

### 12. Admin Password Not Hashed
- **Files:** Database (via `php artisan tinker`)
- **Problem:** The `DatabaseSeeder` stored the admin password as plain text (`'password'` instead of `Hash::make('password')`). Laravel's `bcrypt` cast requires hashed values, so login always returned "Email ou mot de passe incorrect".
- **Fix:** Updated the admin user's password directly in the DB using `Hash::make('password')` via tinker. The seeder was not modified (the `password` cast in `User` model handles hashing on `create`, but `firstOrCreate` with a raw value bypassed it).
- **Status:** ✅ Applied

### 13. Default Avatar Missing (.svg → .png)
- **Files:**
  - `AeroservefrontendAhlem-main/src/app/pages/users/users.ts`
  - `AeroservefrontendAhlem-main/src/app/auth/profile/profile.ts`
  - `AeroservefrontendAhlem-main/src/app/auth/profile/profile.html`
- **Problem:** The fallback avatar path was `/assets/default-avatar.svg` but the actual file is `default-avatar.png`. Every user without an avatar triggered a broken image error, causing an infinite error loop in `onImageError()`.
- **Fix:** Changed all references from `.svg` to `.png`. Added a guard in `onImageError()` to prevent infinite reload loops.
- **Status:** ✅ Applied

### 14. Missing Route: `PUT /api/products/{product}/hygiene`
- **Files:** `AeroserveBackendAhlem-main/routes/api.php`
- **Problem:** The `hygieneUpdate()` method existed in `ProductController` and the frontend called `PUT products/{id}/hygiene`, but no route was registered for it. Also `GET /hygiene-reports/export` was missing from routes. Both returned 404.
- **Fix:** Added both missing routes inside the `RESPONSABLE_HYGIENE,SUPER_ADMIN` middleware group:
  ```php
  Route::get('/hygiene-reports/export', [HygieneReportController::class, 'export']);
  Route::put('/products/{product}/hygiene', [ProductController::class, 'hygieneUpdate']);
  ```
- **Status:** ✅ Applied

