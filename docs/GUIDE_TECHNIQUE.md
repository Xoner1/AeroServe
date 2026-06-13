# GUIDE TECHNIQUE — AEROSERVE

Document de référence pour l'architecture du code, le rôle de chaque fichier, et le fonctionnement détaillé du système AeroServe.

---

## 1. Architecture Générale du Code

```
AeroserveBackendAhlem-main/          ← API REST (Laravel 12)
├── app/
│   ├── Http/Controllers/Api/        ← 16 contrôleurs (toute la logique métier)
│   ├── Http/Middleware/             ← CheckRole.php (autorisation par rôle)
│   ├── Models/                      ← 18 modèles Eloquent (tables DB)
│   ├── Traits/                      ← FifoStockTrait (algorithme FIFO)
│   ├── Console/Commands/            ← Tâches planifiées (Scheduler)
│   ├── Mail/                        ← Emails (création utilisateur, reset password)
│   ── Providers/                   ← Configuration application
├── routes/
│   ├── api.php                      ← Toutes les routes API (~220 lignes)
│   ├── web.php                      ← Routes web (redirection vers frontend)
│   └── channels.php                 ← Broadcasting WebSocket
├── database/
│   ├── migrations/                  ← 42+ migrations (schéma de la DB)
│   └── seeders/                     ← Données d'exemple (DatabaseSeeder + SampleDataSeeder)
└── config/                          ← Configuration Laravel (JWT, CORS, broadcasting, queue)

AeroservefrontendAhlem-main/         ← Application Web (Angular 20)
├── src/
│   ├── app/
│   │   ├── auth/                    ← Login + Profile
│   │   ├── core/                    ← Services, Guards, Modèles, Intercepteurs
│   │   ├── dashboard/               ← Page Dashboard unique (rôle-dépendant)
│   │   ├── layout/                  ← Sidebar + Navbar + Chatbot (cadre principal)
│   │   ├── pages/                   ← 12 pages fonctionnelles
│   │   ├── public/                  ← Landing page
│   │   └── shared/                  ← Composants réutilisables (icon, page-loading, qr-scanner)
│   └── environments/                ← Configuration API URL
└── package.json                     ← Dépendances NPM

aeroservemobileahlem-main/           ← Application Mobile (Flutter)
└── lib/                             ← Code Flutter (Caissier, Hygiène, Magasinier)
```

---

## 2. Backend — Contrôleurs (Controllers)

Chaque contrôleur correspond à un domaine fonctionnel. Tous héritent de `Controller` et retournent du JSON.

### 2.1 AuthController — `app/Http/Controllers/Api/AuthController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `login()` | `POST /api/login` | Authentification JWT. Valide email/password via `JWTAth::attempt()`, retourne `access_token` + user. |
| `me()` | `GET /api/me` | Retourne le profil de l'utilisateur connecté avec rôle et PDV. |
| `logout()` | `POST /api/logout` | Invalide le token JWT en cours. |
| `refresh()` | `POST /api/refresh` | Renouvelle un token expiré (durée: 60 min). |
| `updateProfile()` | `PUT /api/profile` | Mise à jour du profil (nom, email, avatar, bio, âge). Supporte upload d'image (FormData). |
| `resetPassword()` | `POST /api/password/reset` | Changement de mot de passe (mot de passe actuel requis). |
| `forgotPassword()` | `POST /api/forgot-password` | Génère un token de réinitialisation et envoie un email. |
| `resetPasswordWithToken()` | `POST /api/password/reset-with-token` | Réinitialise le mot de passe avec le token reçu par email (expire après 60 min). |

### 2.2 UserController — `app/Http/Controllers/Api/UserController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/users` | Liste tous les utilisateurs. Filtres: `role`, `status`. |
| `store()` | `POST /api/users` | Crée un nouvel utilisateur avec hashage Bcrypt du mot de passe. Envoie un email de bienvenue (`UserCreatedMail`). |
| `show()` | `GET /api/users/{user}` | Détails d'un utilisateur (rôle + PDV). |
| `update()` | `POST /api/users/{user}` | Mise à jour utilisateur (FormData — method spoofing). Le rôle n'est pas modifiable. |
| `destroy()` | `DELETE /api/users/{user}` | Suppression d'un utilisateur. |
| `roles()` | `GET /api/roles` | Liste tous les rôles disponibles (utilisé par le frontend pour les dropdowns). |
| `checkEmail()` | `GET /api/users/check-email` | Vérifie si un email existe déjà (validation en temps réel). |
| `listCaissiers()` | `GET /api/caissier` | Liste les caissiers (filtré si l'utilisateur est lui-même caissier). |
| `getCaissiers()` | `GET /api/caissiers` | Liste tous les caissiers via le scope `caissiers()` du modèle User. |
| `updateCaissier()` | `PUT /api/users/{user}/caissier` | Mise à jour spécifique d'un caissier (nom, PDV, statut, âge, expérience). |
| `updateCaissierStatus()` | `PUT /api/caissiers/{user}/status` | Change le statut (active/inactive/en_attente). Notifie les Super Admins en cas de suspension. |
| `deleteCaissier()` | `DELETE /api/users/{user}/caissier` | Suppression d'un caissier. |
| `assignPointDeVente()` | `PUT /api/users/{user}/assign-pdv` | Affecte un PDV à un utilisateur. |

### 2.3 ProductController — `app/Http/Controllers/Api/ProductController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/products` | Liste les produits. **Filtrage par rôle automatique** : CHEF_CUISINE → food/plat seulement, CHEF_MAGASIN → commercial/matiere_premiere seulement, RESPONSABLE_ACHAT → commercial/matiere_premiere seulement. Paramètre `all_types=true` bypass le filtre. |
| `store()` | `POST /api/products` | Crée un produit. **Auto-approbation** si créateur = CHEF_CUISINE. Validation stricte des ingrédients pour food/plat (doivent être approved). |
| `show()` | `GET /api/products/{product}` | Détails d'un produit. |
| `update()` | `POST /api/products/{product}` | Mise à jour (FormData). Verrouillage des champs après approbation (sauf pour CHEF_CUISINE sur ses propres produits). |
| `destroy()` | `DELETE /api/products/{product}` | Suppression. |
| `toggleActive()` | `PUT /api/products/{product}/toggle-active` | Active/désactive un produit. |
| `approveProduct()` | `PUT /api/products/{product}/approve` | RESPONSABLE_ACHAT approuve/rejette un produit et fixe le prix. |
| `setRecipe()` | `PUT /api/products/{product}/recipe` | CHEF_CUISINE définit les ingrédients d'un produit food/plat. |
| `hygieneUpdate()` | `PUT /api/products/{product}/hygiene` | RESPONSABLE_HYGIENE modifie les allergènes et expiration d'un produit. |
| `categories()` | `GET /api/categories` | Liste toutes les catégories. |
| `storeCategory()` | `POST /api/categories` | Crée une catégorie. |
| `updateCategory()` | `PUT /api/categories/{category}` | Modifie une catégorie. |
| `destroyCategory()` | `DELETE /api/categories/{category}` | Supprime une catégorie. |

### 2.4 MenuController — `app/Http/Controllers/Api/MenuController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/menus` | Liste les menus (paginé). |
| `store()` | `POST /api/menus` | Crée un menu brouillon. Vérifie chevauchement de dates. Génère automatiquement les besoins d'achat (`PurchaseNeedController::generateForMenu()`). |
| `submit()` | `POST /api/menus/{menu}/submit` | Soumet un brouillon. **Vérifie le stock** : pour chaque ingrédient, `required = quantité_recette × staff_count`. Si stock insuffisant → REFUSE + commentaire automatique + notification. Si suffisant → VALIDE + **déduction FIFO**. |
| `show()` | `GET /api/menus/{menu}` | Détails d'un menu. |
| `update()` | `PUT /api/menus/{menu}` | Modification (uniquement BROUILLON). Regénère les besoins d'achat. |
| `destroy()` | `DELETE /api/menus/{menu}` | Suppression. |
| `clone()` | `POST /api/menus/{menu}/clone` | Duplique un menu vers une nouvelle semaine. Simule le stock immédiatement. |
| `currentWeek()` | `GET /api/menus/current-week` | Retourne le menu de la semaine en cours. |

### 2.5 StockController — `app/Http/Controllers/Api/StockController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/stocks` | Liste les stocks (paginé) avec KPIs intégrés. |
| `show()` | `GET /api/stocks/{stock}` | Détails d'un stock. |
| `addMovement()` | `POST /api/stocks/{stock}/movements` | Ajoute un mouvement (in/out/adjustment). Met à jour la quantité du stock. |
| `movements()` | `GET /api/stocks/{stock}/movements` | Historique des mouvements d'un stock. |
| `updateThreshold()` | `PUT /api/stocks/{stock}/threshold` | Modifie le seuil d'alerte minimum. |
| `lowStockAlerts()` | `GET /api/stocks/alerts/low` | Retourne les stocks en dessous du seuil. |
| `expiredProducts()` | `GET /api/stocks/alerts/expired` | Retourne les lots expirés. |

### 2.6 InternalOrderController — `app/Http/Controllers/Api/InternalOrderController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/internal-orders` | Liste les commandes. **Filtrage par rôle** : SUPER_ADMIN → tout, RESPONSABLE_FB → ses créations + PDVs, CHEF_CUISINE → type=food ou ses créations, CHEF_MAGASIN → type=commercial ou ses créations. |
| `store()` | `POST /api/internal-orders` | Crée une commande. **Assignation automatique** : tout va à CHEF_MAGASIN. Notifie le destinataire. |
| `show()` | `GET /api/internal-orders/{id}` | Détails. Vérifie `authorizeOrder()`. |
| `updateStatus()` | `PUT /api/internal-orders/{id}/status` | Change le statut. Interdit pour CAISSIER et RESPONSABLE_ACHAT. |
| `fulfillItem()` | `PUT /api/internal-orders/{id}/items/{item}/fulfill` | Met à jour la quantité servie. **Déduit du stock** via FIFO si quantité augmentée. Recalcule automatiquement le statut de la commande (DISPONIBLE/PARTIELLEMENT/NON_DISPONIBLE). |
| `getProductsByCategories()` | `POST /api/products/by-categories` | Retourne les produits actifs/approuvés pour les catégories demandées. |
| `destroy()` | `DELETE /api/internal-orders/{id}` | Suppression. Vérifie `authorizeOrder()`. |

### 2.7 PlanningController — `app/Http/Controllers/Api/PlanningController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/plannings` | Liste les plannings. Filtres: `week_start`, `user_id`. Charge relations: user, pointDeVente, created_by. |
| `store()` | `POST /api/plannings` | Crée un shift. **Auto-détection du shift** via `determineShiftFromTime()` (<12h = MATIN, 12-17h = APRES_MIDI, ≥17h = SOIR). |
| `update()` | `PUT /api/plannings/{planning}` | Modification. Re-vérifie le chevauchement si les horaires changent. |
| `destroy()` | `DELETE /api/plannings/{planning}` | Suppression. |
| `bulkStore()` | `POST /api/plannings/bulk` | Insertion en masse pour une semaine complète. Vérifie: même semaine calendrier, pas de chevauchement, max 2 PDVs par shift/jour. |

### 2.8 ChatbotController — `app/Http/Controllers/Api/ChatbotController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `ask()` | `POST /api/chatbot/ask` | **Cœur du chatbot multi-rôles**. 4 fournisseurs en cascade: OpenAI → Groq → Gemini → Local NLP. Chaque fournisseur supporte le function calling (3 outils: chercher_produits, obtenir_details_produit, obtenir_tous_produits). |

**Logique détaillée de `ask()` :**
1. **Restriction Caissier** : sans `product_id` → rejet. Questions hors santé → rejet.
2. **Construction du system prompt** : description du rôle + contexte utilisateur (5 derniers shifts, 5 dernières commandes) + contexte produit (allergènes, stock, rapports hygiène).
3. **Appel API** : essai OpenAI (gpt-4o-mini) → si échec, Groq (llama-3.1-8b-instant) → si échec, Gemini (1.5-flash) → si échec, moteur local.
4. **Function calling** : l'IA appelle un outil → PHP exécute la requête DB → résultat JSON → l'IA répond.
5. **Local NLP** (`getLocalNlpResponse()`) : basé **uniquement** sur les rapports d'hygiène du RESPONSABLE_HYGIENE. Pas de keyword lists injectés. Si pas de rapport → "Aucune donnée sanitaire".

### 2.9 StockForecastController — `app/Http/Controllers/Api/StockForecastController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `forecast()` | `GET /api/stock-forecast` | Jours de couverture restants par produit (stock  consommation moyenne). |
| `anomalies()` | `GET /api/stock-anomalies` | Détection de sorties anormales (>3× la moyenne). |
| `recommendations()` | `GET /api/stock-recommendations` | Quantités recommandées pour 30 jours. |
| `aiReport()` | `GET /api/stock-ai-report` | Rapport consolidé pour RESPONSABLE_ACHAT. |

### 2.10 PurchaseNeedController — `app/Http/Controllers/Api/PurchaseNeedController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/purchase-needs` | Liste les besoins d'achat calculés (paginé). |
| `show()` | `GET /api/purchase-needs/{id}` | Détails d'un besoin d'achat. |
| `generateForMenu()` (static) | — | **Calculé automatiquement** quand un menu est créé/modifié/soumis. Pour chaque ingrédient : `total = quantité_recette × staff_count × nombre_jours`. Shortfall = max(0, total - stock). |

### 2.11 HygieneReportController — `app/Http/Controllers/Api/HygieneReportController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/hygiene-reports` | Liste les rapports (filtre par produit). |
| `store()` | `POST /api/hygiene-reports` | Crée un rapport. Si non_conforme → notification aux CHEF_CUISINE/CHEF_MAGASIN/RESPONSABLE_ACHAT. |
| `show()` | `GET /api/hygiene-reports/{id}` | Détails. |
| `update()` | `PUT /api/hygiene-reports/{id}` | Modification. |
| `destroy()` | `DELETE /api/hygiene-reports/{id}` | Suppression. |
| `export()` | `GET /api/hygiene-reports/export` | Export CSV de tous les rapports. |

### 2.12 NotificationController — `app/Http/Controllers/Api/NotificationController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/notifications` | Notifications de l'utilisateur connecté (non lues en premier). |
| `unreadCount()` | `GET /api/notifications/unread-count` | Compte les notifications non lues (pour le badge navbar). |
| `markAsRead()` | `PUT /api/notifications/{id}/read` | Marque comme lue. |
| `markAllAsRead()` | `PUT /api/notifications/read-all` | Marque toutes comme lues. |

### 2.13 CommentController — `app/Http/Controllers/Api/CommentController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/comments` | Commentaires pour un objet (morph: Menu ou Product). |
| `store()` | `POST /api/comments` | Ajoute un commentaire. |
| `update()` | `PUT /api/comments/{id}` | Modification (auteur uniquement). |
| `destroy()` | `DELETE /api/comments/{id}` | Suppression. |

### 2.14 DashboardController — `app/Http/Controllers/Api/DashboardController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/dashboard` | KPIs par rôle. Retourne : stock alerts, commandes en attente, menus, données spécifiques au rôle (ex: latest_purchase_need pour le chef). |

### 2.15 PointDeVenteController — `app/Http/Controllers/Api/PointDeVenteController.php`

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /api/points-de-vente` | Liste les PDVs. |
| `store()` | `POST /api/points-de-vente` | Crée un PDV. Si `responsable_fb_id` défini → notification. |
| `show()` | `GET /api/points-de-vente/{id}` | Détails. |
| `update()` | `PUT /api/points-de-vente/{id}` | Modification. |
| `destroy()` | `DELETE /api/points-de-vente/{id}` | Suppression. |
| `airports()` | `GET /api/airports` | Liste les aéroports. |

---

## 3. Backend — Modèles (Models)

Chaque modèle correspond à une table. Les relations sont définies avec Eloquent ORM.

### 3.1 User — `app/Models/User.php`

- **Table** : `users`
- **Relations** :
  - `role()` → BelongsTo `Role`
  - `pointDeVente()` → BelongsTo `PointDeVente` (via `point_de_vente_id`)
  - `pdvsResponsable()` → HasMany `PointDeVente` (via `responsable_fb_id`)
  - `notifications()` → HasMany `Notification`
  - `comments()` → HasMany `Comment`
  - `plannings()` / `shifts()` → HasMany `Planning`
- **JWT** : Implémente `JWTSubject`. Payload contient `role` (du modèle Role ou `caissier_role`).
- **Casts** : `password` → `hashed` (auto-hash), `experience` → `boolean`.
- **Scopes** : `scopeCaissiers()` → filtre par `caissier_role = 'CAISSIER'`.
- **Helper** : `isCaissier()` → vérifie si rôle = CAISSIER.
- **Appends** : `avatar_url` → URL complète de l'avatar.

### 3.2 Product — `app/Models/Product.php`

- **Table** : `products`
- **Types** : `commercial`, `matiere_premiere`, `food`, `plat`
- **Relations** :
  - `category()` → BelongsTo `Category`
  - `creator()` → BelongsTo `User` (via `created_by`)
  - `stock()` → HasOne `Stock`
  - `ingredients()` → BelongsToMany `Product` (via `product_recipe`) — pour food/plat: liste les ingrédients (matiere_premiere)
  - `usedInRecipes()` → BelongsToMany inverse — pour matiere_premiere: liste les plats qui l'utilisent
  - `comments()` → MorphMany `Comment`
  - `hygieneReports()` → HasMany `HygieneReport`
- **Casts** : `allergens` → `array`, `price` → `decimal:2`, `expiration_date` → `date`.

### 3.3 Stock — `app/Models/Stock.php`

- **Table** : `stocks`
- **One-to-One** avec Product.
- **Relations** :
  - `product()` → BelongsTo `Product`
  - `movements()` → HasMany `StockMovement`
- **Status** : `IN_USE` (ingrédients disponibles) / `OUT_OF_STOCK` (rupture).
- **Seuil** : `min_threshold` pour les alertes.

### 3.4 StockMovement — `app/Models/StockMovement.php`

- **Table** : `stock_movements`
- **Types** : `in` (entrée), `out` (sortie), `adjustment` (ajustement)
- **Relation** : `stock()` → BelongsTo `Stock`.
- **FIFO** : Les mouvements `in` sont triés par `expiration_date` ASC puis `created_at` ASC.

### 3.5 InternalOrder — `app/Models/InternalOrder.php`

- **Table** : `internal_orders`
- **Types** : `food`, `commercial`
- **Status** : `EN_ATTENTE` → `PREPARATION` → `DISPONIBLE` / `PARTIELLEMENT_DISPONIBLE` / `NON_DISPONIBLE`
- **Relations** :
  - `creator()` → BelongsTo `User`
  - `assignee()` → BelongsTo `User` (via `assigned_to`)
  - `pointDeVente()` → BelongsTo `PointDeVente`
  - `items()` → HasMany `InternalOrderItem`
  - `comments()` → MorphMany `Comment`

### 3.6 Menu — `app/Models/Menu.php`

- **Table** : `menus`
- **Status** : `BROUILLON` → `VALIDE` / `REFUSE`
- **Relations** :
  - `creator()` → BelongsTo `User`
  - `items()` → HasMany `MenuItem`
  - `comments()` → MorphMany `Comment`

### 3.7 Planning — `app/Models/Planning.php`

- **Table** : `plannings`
- **Shifts** : `MATIN` (08:00-16:00), `APRES_MIDI` (16:00-00:00), `SOIR` (00:00-08:00)
- **Day Status** : `ON`, `OFF`, `CONGE`
- **Relations** :
  - `user()` → BelongsTo `User`
  - `pointDeVente()` → BelongsTo `PointDeVente`
  - `createdBy()` → BelongsTo `User`

### 3.8 HygieneReport — `app/Models/HygieneReport.php`

- **Table** : `hygiene_reports`
- **Status** : `conforme`, `non_conforme`, `en_cours`
- **Relations** :
  - `product()` → BelongsTo `Product`
  - `inspector()` → BelongsTo `User` (via `inspected_by`)

### 3.9 PurchaseNeed / PurchaseNeedItem — `app/Models/PurchaseNeed{Item}.php`

- **Tables** : `purchase_needs` + `purchase_need_items`
- **PurchaseNeed** : `menu_id`, `week_start`, `staff_count`, `generated_at`
- **PurchaseNeedItem** : `ingredient_id`, `ingredient_name`, `unit`, `current_stock`, `required_quantity`, `shortfall`
- **Relations** : `menu()` → BelongsTo `Menu`, `items()` → HasMany `PurchaseNeedItem`.

### 3.10 Autres modèles (simples)

| Modèle | Table | Description |
|--------|-------|-------------|
| `Role` | `roles` | 7 rôles : SUPER_ADMIN, RESPONSABLE_FB, CHEF_CUISINE, CHEF_MAGASIN, RESPONSABLE_ACHAT, RESPONSABLE_HYGIENE, CAISSIER |
| `Airport` | `airports` | Aéroports (code IATA, pays). Relation HasMany `pointsDeVente`. |
| `PointDeVente` | `points_de_vente` | Points de vente (restaurant, cafe, boutique, lounge). |
| `Category` | `categories` | Catégories de produits. Types: `food`, `commercial`, `matiere_premiere`, `plat`. |
| `MenuItem` | `menu_items` | Ligne de menu: `product_id`, `day_of_week`, `meal_type`. |
| `InternalOrderItem` | `internal_order_items` | Ligne de commande: `quantity_requested`, `quantity_fulfilled`. |
| `Comment` | `comments` | Polymorphique: `commentable_type` (Menu ou Product). |
| `Notification` | `notifications` | Types: `info`, `warning`, `alert`, `success`. |

---

## 4. Backend — Components Non-Controllers

### 4.1 FifoStockTrait — `app/Traits/FifoStockTrait.php`

**Fichier unique, utilisé par** `MenuController` et `InternalOrderController`.

```
Algorithme FIFO :
1. Récupère tous les lots "in" avec quantity > 0
2. Trie par expiration_date ASC (le plus proche expire en premier)
3. Pour chaque lot :
   - Si lot.quantity >= reste → décrémente le lot, reste = 0
   - Si lot.quantity < reste → vide le lot (quantity = 0), soustrait du reste
4. Crée un mouvement "out" avec la quantité totale déduite
5. Décrémente le stock global
6. Vérifie le seuil min_threshold → notification si nécessaire
```

### 4.2 CheckRole — `app/Http/Middleware/CheckRole.php`

**Middleware d'autorisation.** Vérifie si l'utilisateur connecté possède l'un des rôles requis. Retourne 403 sinon.

```php
// Usage dans routes/api.php :
Route::middleware('role:CHEF_MAGASIN,SUPER_ADMIN')->group(function () { ... });
```

### 4.3 Artisan Command — `app/Console/Commands/CheckIngredientStock.php`

**Commande planifiée** (`hourly()`). Parcourt tous les produits `food`/`plat` approuvés. Si un ingrédient de la recette a un stock de 0 → `is_active = false` + `usage_status = 'OUT_OF_STOCK'`. Si stock positif → `is_active = true` + `usage_status = 'IN_USE'`.

### 4.4 Mails

- `ResetPasswordMail` — Token de réinitialisation de mot de passe.
- `UserCreatedMail` — Envoi des identifiants de connexion lors de la création d'un utilisateur par le SUPER_ADMIN.

---

## 5. Calculs & Formules Métier

Cette section détaille toutes les opérations mathématiques et algorithmiques sur lesquelles repose le système.

### 5.1 Validation de Menu — Calcul du stock requis

**Fichier** : `MenuController::submit()` (ligne ~113)

Pour chaque ingrédient de chaque plat du menu :

```
quantité_requise_par_jour = ingredient.pivot.quantity × staff_count
```

| Variable | Source | Exemple |
|----------|--------|---------|
| `ingredient.pivot.quantity` | Quantité dans la recette (par personne) | 0.15 kg (poulet pour un sandwich) |
| `staff_count` | Nombre de convives estimé | 50 personnes |
| `quantité_requise` | Résultat | 0.15 × 50 = **7.5 kg** |

Le système compare ensuite avec le stock disponible :

```
si stock.quantity < quantité_requise → INSUFFISANT
    → Menu = REFUSE
    → Commentaire automatique généré
    → Notification au Chef Magasin + F&B
```

Si tout est suffisant :

```
Menu = VALIDE → Déduction FIFO immédiate de tous les ingrédients
```

### 5.2 Besoins d'Achat — Calcul automatique (Purchase Needs)

**Fichier** : `PurchaseNeedController::generateForMenu()` (ligne ~40-86)

Le système agrège les besoins en ingrédients sur **toute la semaine** :

```
Pour chaque jour de la semaine :
    Pour chaque plat dans le menu :
        Pour chaque ingrédient du plat :
            besoin_jour = ingredient.quantity × staff_count
            total_ingrédient += besoin_jour

shortfall = max(0, total_ingrédient - stock_actuel)
```

**Exemple complet** :

| Jour | Plat | Ingrédient | Qté/personne | Staff | Besoin jour |
|------|------|------------|-------------|-------|-------------|
| Lundi | Sandwich | Poulet | 0.15 kg | 50 | 7.5 kg |
| Mardi | Poulet Grillé | Poulet | 0.20 kg | 50 | 10 kg |
| Mercredi | Sandwich | Poulet | 0.15 kg | 50 | 7.5 kg |
| Jeudi | Pas de poulet | — | — | — | 0 |
| Vendredi | Sandwich | Poulet | 0.15 kg | 50 | 7.5 kg |

```
Total Poulet requis = 7.5 + 10 + 7.5 + 0 + 7.5 = 32.5 kg
Stock actuel = 4.0 kg
Shortfall = max(0, 32.5 - 4.0) = 28.5 kg  ← À acheter
```

Seuls les ingrédients avec `shortfall > 0` sont persistés en base (optimisation ligne 74).

### 5.3 Déduction FIFO — Algorithme lot par lot

**Fichier** : `FifoStockTrait::fifoDeduction()` (ligne 15-53)

**Principe** : Consommer les lots les plus proches de la date d'expiration d'abord.

```
Entrée : stock, quantité_à_déduire (Q)

1. Récupérer tous les lots "in" avec quantity > 0
2. Trier par : expiration_date ASC, puis created_at ASC
3. Reste_à_déduire = Q

4. Pour chaque lot (du plus ancien au plus récent) :
   Si Reste_à_déduire <= 0 → STOP
   
   Si lot.quantity >= Reste_à_déduire :
       lot.quantity = lot.quantity - Reste_à_déduire
       Reste_à_déduire = 0
   Sinon :
       Reste_à_déduire = Reste_à_déduire - lot.quantity
       lot.quantity = 0  (lot vidé)

5. Créer mouvement "out" avec la quantité totale Q
6. Décrémenter le stock global : stock.quantity -= Q
7. Vérifier le seuil d'alerte : si stock.quantity <= min_threshold → notification
```

**Exemple concret** :

| Lot | Date entrée | DLC | Quantité initiale | Quantité restante |
|-----|------------|-----|------------------|------------------|
| #1 | 01/06 | 10/06 | 5 kg | 2 kg |
| #2 | 05/06 | 15/06 | 10 kg | 10 kg |
| #3 | 08/06 | 20/06 | 8 kg | 8 kg |

Déduction de **7 kg** :
```
Étape 1 : Lot #1 a 2 kg → vide complètement → reste à déduire = 7 - 2 = 5 kg
Étape 2 : Lot #2 a 10 kg → prend 5 kg → reste à déduire = 5 - 5 = 0 kg → STOP
Résultat : Lot #1 = 0 kg, Lot #2 = 5 kg, Lot #3 = 8 kg
```

### 5.4 Prévisions IA — Stock Forecast

**Fichier** : `StockForecastController` (4 méthodes)

#### 5.4.1 Jours de couverture restants (`forecast()`)

```
consommation_moyenne_jour = Σ(sorties_30_jours) / 30
jours_restants = stock_actuel / consommation_moyenne_jour

Statut :
  jours_restants > 7   → OK
  3 < jours_restants ≤ 7  → ATTENTION
  jours_restants ≤ 3   → CRITIQUE
```

#### 5.4.2 Détection d'anomalies (`anomalies()`)

```
si sorties_aujourdhui > 3 × consommation_moyenne_jour → ALERTE
    → Possible perte, vol, ou erreur de saisie
```

#### 5.4.3 Quantité recommandée (`recommendations()`)

```
quantité_recommandée = (consommation_moyenne_jour × 30) - stock_actuel

Si résultat < 0 → Pas besoin de commander
Sinon → Commander cette quantité exacte pour couvrir 30 jours
```

### 5.5 Auto-détection du Shift

**Fichier** : `PlanningController` (méthode `determineShiftFromTime()`)

```
Si start_time < 12:00     → shift = MATIN (08:00 - 16:00)
Si 12:00 ≤ start_time ≤ 16:59 → shift = APRES_MIDI (16:00 - 00:00)
Si start_time ≥ 17:00     → shift = SOIR (00:00 - 08:00)
```

### 5.6 Vérification de Chevauchement de Planning

**Fichier** : `PlanningController::store()` et `bulkStore()`

Pour un même caissier, même jour, même shift :

```
Nouveau chevauche Existant si :
    nouveau.start_time < existant.end_time
    ET
    nouveau.end_time > existant.start_time
```

### 5.7 Auto-activation des Produits (Scheduler)

**Fichier** : `app/Console/Commands/CheckIngredientStock.php`

```
Pour chaque produit food/plat approuvé :
    is_active = true
    usage_status = IN_USE
    
    Pour chaque ingrédient de sa recette :
        Si ingredient.stock.quantity <= 0 :
            is_active = false
            usage_status = OUT_OF_STOCK
            STOP (un seul ingrédient manquant suffit)
```

### 5.8 Chatbot IA — Architecture & Intégration API

**Fichier principal** : `ChatbotController::ask()` (`app/Http/Controllers/Api/ChatbotController.php`)

Le chatbot est le composant le plus complexe du système. Il repose sur une **architecture multi-fournisseurs en cascade** avec function calling natif.

#### 5.8.1 Fournisseurs d'IA (en cascade)

Le système tente 3 fournisseurs dans l'ordre. Si l'un échoue, il passe au suivant :

| Priorité | Fournisseur | Modèle | Endpoint |
|----------|-------------|--------|----------|
| 1 | OpenAI | gpt-4o-mini | `https://api.openai.com/v1/chat/completions` |
| 2 | Groq | llama-3.1-8b-instant | `https://api.groq.com/openai/v1/chat/completions` |
| 3 | Gemini | gemini-1.5-flash | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` |
| 4 | **Local NLP** (fallback) | Moteur de règles | Aucun appel externe |

**Configuration** : Les clés API sont stockées dans `config/services.php` :
```php
'openai' => ['key' => env('OPENAI_API_KEY')],
'groq'   => ['key' => env('GROQ_API_KEY')],
'gemini' => ['key' => env('GEMINI_API_KEY')],
```

#### 5.8.2 Comment Groq a été intégré

Groq utilise le **format compatible OpenAI**, ce qui simplifie l'intégration :

```php
// Le même code de function calling est réutilisé pour OpenAI et Groq
$url = "https://api.groq.com/openai/v1/chat/completions";  // URL Groq
// Le même getToolDefinitions() est utilisé
// Le même executeToolCall() est utilisé
// Seul le model change : "llama-3.1-8b-instant" au lieu de "gpt-4o-mini"
```

**Pourquoi Groq ?** 
- API compatible OpenAI → même code, aucun refactor
- Modèle Llama 3.1 8B → rapide et précis
- Latence ultra-faible (groq.com est optimisé pour l'inférence)
- Alternative gratuite/abordable si OpenAI est indisponible

#### 5.8.3 Flux de Function Calling

Le chatbot ne contient **aucune liste statique de produits**. Il utilise le function calling natif pour interroger la base de données en temps réel :

```
Étape 1 : Frontend → POST /api/chatbot/ask
    { product_id: 12, message: "Est-ce que ce produit contient du gluten ?" }

Étape 2 : Backend construit le system prompt
    - Description du rôle de l'utilisateur
    - Contexte utilisateur (5 derniers shifts, 5 dernières commandes)
    - Contexte produit (nom, ingrédients, prix, allergènes, rapports hygiène)
    - Directives de sécurité (pas de données tierces, pas de hors-sujet)

Étape 3 : Premier appel à l'IA
    Messages : [system_prompt, message_utilisateur]
    Tools : [chercher_produits, obtenir_details_produit, obtenir_tous_produits]
    
    → L'IA décide : "J'ai besoin de détails sur ce produit"
    → Retourne : tool_call("obtenir_details_produit", {product_id: 12})

Étape 4 : PHP exécute la requête DB
    executeToolCall("obtenir_details_produit", {product_id: 12})
    → Product::with('stock', 'hygieneReports', 'category', 'ingredients')->find(12)
    → Retourne JSON : {"nom": "Sandwich Poulet", "allergenes": ["gluten"], ...}

Étape 5 : Deuxième appel à l'IA
    Messages : [system, user, assistant(tool_call), tool(resultat)]
    → L'IA formule la réponse finale basée sur les données réelles
    
Étape 6 : Retour au frontend
    { success: true, response: "...", source: "groq_function_calling" }
```

#### 5.8.4 Les 3 Outils (Tools) définis

| Outil | Description | Requête DB exécutée |
|-------|-------------|---------------------|
| `chercher_produits(query)` | Recherche par nom/type/mot-clé | `Product::where('name', 'like', "%query%")->limit(10)` |
| `obtenir_details_produit(id)` | Détails complets d'un produit | `Product::with('stock', 'hygieneReports', 'category', 'ingredients')->find(id)` |
| `obtenir_tous_produits()` | Catalogue complet | `Product::where('is_active', true)->where('approval_status', 'approved')->get()` |

#### 5.8.5 Format des appels HTTP

**OpenAI / Groq** (format identique) :
```php
Http::withHeaders([
    'Authorization' => "Bearer {$apiKey}",
    'Content-Type'  => 'application/json',
])->post($url, [
    'model'       => 'gpt-4o-mini',        // ou 'llama-3.1-8b-instant' pour Groq
    'messages'    => $messages,
    'tools'       => $tools,
    'tool_choice' => 'auto',
    'temperature' => 0.5,
    'max_tokens'  => 800,
]);
```

**Gemini** (format différent) :
```php
Http::withHeaders(['Content-Type' => 'application/json'])
    ->post($url, [
        'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
        'tools'    => [['function_declarations' => $functionDeclarations]],
    ]);
```

#### 5.8.6 Moteur Local de Secours (Local NLP)

Si les 3 APIs externes sont indisponibles, le système bascule sur un parseur de règles local :

**Fichier** : `ChatbotController::getLocalNlpResponse()`

- Analyse les mots-clés de la question (FR + AR)
- Consulte **uniquement** les données des rapports d'hygiène du RESPONSABLE_HYGIENE
- Détecte : gluten, lactose, arachides, diabète, hypertension
- Aucune hallucination possible — répond uniquement avec les données en base

**Exemple de détection** :
```php
$commonAllergens = [
    'gluten (قمح/جلوتين)' => ['gluten', 'farine', 'blé', 'pain', 'pâte', 'جلوتين', 'قمح', 'خبز'],
    'lactose (حليب/لاكتوز)' => ['lait', 'lactose', 'fromage', 'crème', 'حليب', 'لاكتوز'],
    // ...
];
```

#### 5.8.7 Sécurité & Isolation

| Mécanisme | Implémentation |
|-----------|----------------|
| **Isolation par rôle** | System prompt différent selon le rôle (7 descriptions différentes) |
| **Isolation par utilisateur** | `getUserContextText()` injecte uniquement les données de l'utilisateur connecté |
| **Restriction Caissier** | Sans product_id → rejet immédiat. Questions hors santé → rejet |
| **Rejet hors-sujet** | `isOnTopicMessage()` vérifie 50+ mots-clés + blacklist de salutations |
| **Pas de données tierces** | Le prompt contient explicitement : "TU NE DOIS JAMAIS divulguer de données d'autres comptes" |
| **Pas d'emojis** | Directive explicite dans le system prompt |

---

## 6. Frontend — Architecture

### 5.1 Structure des composants

```
src/app/
├── app.config.ts              ← Configuration Angular (interceptors, providers)
├── app.routes.ts              ← Routes avec guards (authGuard, roleGuard)
├── app.ts                     ← Composant racine
├── auth/                      ← login.component.ts, profile/profile.ts
├── change-password*/          ← Demande + exécution de changement de mot de passe
├── core/                      ← Services + Guards + Models + Interceptors
│   ├── guards/                ← auth.guard, login.guard, role.guard
│   ├── interceptors/          ← auth (ajoute token), loading, error
│   ├── models/index.ts        ← Toutes les interfaces TypeScript
│   ── services/              ← ApiService, AuthService, LoadingService, NotificationService, WebSocketService
── dashboard/                 ← dashboard.component.ts (page unique multi-rôles)
├── layout/                    ← layout.component.ts (sidebar + navbar + chatbot)
├── pages/                     ← 12 pages fonctionnelles
│   ├── dashboard/             ← Tableau de bord multi-rôles
│   ├── products/              ← Catalogue produits + création/édition
│   ├── stocks/                ← Gestion des stocks FIFO
│   ├── internal-orders/       ← Commandes internes Kanban
│   ├── menus/                 ← Menus hebdomadaires
│   ├── plannings/             ← Planning des caissiers
│   ├── purchase-needs/        ← Besoins d'achat
│   ├── hygiene-reports/       ← Rapports d'hygiène
│   ├── hygiene-products/      ← Produits alimentaires (surveillance)
│   ├── points-de-vente/       ← Gestion des PDV
│   ├── users/                 ← Gestion des utilisateurs
│   └── category/              ← Gestion des catégories
├── public/                    ← landing.component.ts (page d'accueil)
└── shared/                    ← Composants réutilisables
    ├── icon/                  ← app-icon.component.ts (lucide icons)
    ├── page-loading/          ← Skeleton loading
    ── qr-scanner/            ← QR code scanner (@zxing)
```

### 5.2 Services Core

| Service | Fichier | Rôle |
|---------|---------|------|
| `ApiService` | `core/services/api.service.ts` | Wrapper HttpClient. Gère les requêtes GET/POST/PUT/DELETE avec les intercepteurs. |
| `AuthService` | `core/services/auth.service.ts` | Login, logout, stockage du token en localStorage, `getUserRole()`, `hasRole()`, `currentUser$` (Observable). |
| `NotificationService` | `core/services/notification.service.ts` | Récupération et comptage des notifications. |
| `LoadingService` | `core/services/loading.service.ts` | Spinner global pour les requêtes longues. |
| `WebSocketService` | `core/services/websocket.service.ts` | Connexion WebSocket native avec auto-reconnect + exponential backoff. |

### 5.3 Interceptors

| Interceptor | Rôle |
|-------------|------|
| `AuthInterceptor` | Ajoute `Authorization: Bearer <token>` à chaque requête. Intercepte 401 → déconnexion. Intercepte 403 → alerte. |
| `LoadingInterceptor` | Active le spinner pendant les requêtes, le désactive à la fin. |
| `ErrorInterceptor` | Transforme les erreurs HTTP en messages lisibles (extrait les erreurs de validation Laravel). |

### 5.4 Guards

| Guard | Rôle |
|-------|------|
| `authGuard` | Vérifie si l'utilisateur est authentifié (token valide). Redirige vers /login si non. |
| `loginGuard` | Redirige vers /dashboard si déjà authentifié. |
| `roleGuard(...roles)` | Vérifie si l'utilisateur possède l'un des rôles spécifiés. Redirige vers /dashboard si non autorisé. |

### 5.5 Layout — `layout.component.ts`

**Composant principal qui entoure toutes les pages.** Contient :
- **Sidebar** : Navigation avec `navItems` filtrés par rôle (`filteredNavItems`).
- **Navbar** : Notifications (bell icon avec badge), profil utilisateur (dropdown), déconnexion.
- **Chatbot** : Panel latéral avec messages, input, intégration avec `POST /api/chatbot/ask`.
- **WebSocket** : Connexion temps réel pour les notifications.

### 5.6 Pages — Résumé par page

| Page | Fichier | Rôle(s) | Description |
|------|---------|---------|-------------|
| Dashboard | `pages/dashboard/dashboard.component.ts` | Tous | KPIs multi-rôles. Affichage conditionnel selon le rôle. |
| Produits | `pages/products/products.component.ts` | CHEF_CUISINE, CHEF_MAGASIN, RESPONSABLE_ACHAT | Catalogue CRUD. Filtre type selon rôle. Slide-over pour création/édition. |
| Validation Produits | `pages/products/` (validationMode) | RESPONSABLE_ACHAT | Même composant avec `validationMode=true` pour approuver/rejeter les produits pending. |
| Stocks | `pages/stocks/stocks.component.ts` | CHEF_MAGASIN, CHEF_CUISINE | Tableau des stocks avec KPIs. Boutons Entrée/Sortie uniquement pour CHEF_MAGASIN. Modal FIFO preview. |
| Commandes Internes | `pages/internal-orders/internal-orders.component.ts` | RESPONSABLE_FB, CHEF_CUISINE, CHEF_MAGASIN | Kanban par statut. Création, suivi, fulfillment des items. |
| Menus | `pages/menus/menus.component.ts` | CHEF_CUISINE | Builder hebdomadaire. Ajout de produits par jour/repas. Soumission avec validation stock. Clonage de menus. |
| Plannings | `pages/plannings/plannings.component.ts` | RESPONSABLE_FB, CAISSIER | Grille hebdomadaire. Affectation des caissiers par day/shift/PDV. Contrôle de chevauchement. |
| Besoins d'Achat | `pages/purchase-needs/purchase-needs.component.ts` | CHEF_CUISINE | Liste des calculs de besoins d'achat (générés automatiquement depuis les menus). |
| Rapports Hygiène | `pages/hygiene-reports/hygiene-reports.component.ts` | RESPONSABLE_HYGIENE | CRUD des rapports. Export CSV. |
| Produits Alimentaires | `pages/hygiene-products/hygiene-products.component.ts` | RESPONSABLE_HYGIENE | Surveillance des produits FOOD. Édition inline des allergènes et expiration. |
| Points de Vente | `pages/points-de-vente/points-de-vente.component.ts` | SUPER_ADMIN | CRUD des PDV. Affectation des gérants RESPONSABLE_FB. |
| Utilisateurs | `pages/users/users.ts` | SUPER_ADMIN | CRUD des utilisateurs. Gestion des rôles. |
| Catégories | `pages/category/category.ts` | RESPONSABLE_ACHAT | CRUD des catégories. |

### 5.7 Design System

**Fichier** : `src/styles.scss` (variables CSS custom properties)

```scss
--color-deep-moss: #2C3E35    // sidebar background
--color-sage-base: #6B8F71    // primary brand color
--color-warm-cream: #F5F2ED   // page backgrounds
--color-terracotta: #E8663A   // CTA accents, alerts
```

**Polices** : Fraunces (titres), DM Sans (texte), JetBrains Mono (code).
**Icônes** : Lucide (via `app-icon.component.ts`).
**Modals** : SweetAlert2 (`Swal`).

---

## 7. Routes API — Organisation

Le fichier `routes/api.php` (~220 lignes) est organisé en groupes par rôle :

```
Public :           login, forgot-password, password/reset
Auth (tous) :      /me, /logout, /refresh, /profile, /notifications, /comments, /chatbot/ask, /dashboard
SUPER_ADMIN :      /users, /points-de-vente, /airports
RESPONSABLE_FB :   /plannings, /caissiers (status)
CHEF_CUISINE :     /menus, /purchase-needs
CHEF_MAGASIN :     /stocks (read + write), /stocks/movements
RESPONSABLE_ACHAT : /stock-forecast, /products/{id}/approve, /categories
RESPONSABLE_HYGIENE : /hygiene-reports, /products/{id}/hygiene
CAISSIER :         (aucune route exclusive)
Lecture partagée : /products (read), /categories, /internal-orders (read), /stocks/alerts
```

**Important** : Les routes sont groupées avec `Route::middleware('role:...')`. Un utilisateur ne peut accéder qu'aux routes de son groupe. Le middleware `CheckRole` vérifie le rôle côté serveur (double sécurité avec les guards frontend).

---

## 8. Flux Métier — De A à Z

### 7.1 Création d'un produit FOOD par le Chef de Cuisine

```
1. Chef accède à /products → clique "Nouveau Produit"
2. Formulaire : nom, description, type=food/plat, allergènes, catégorie
3. Ajout d'ingrédients (matière première) via recipe builder (dropdown + quantité + unité)
4. Submit → POST /api/products
5. Backend : ProductController::store()
   - Vérifie que tous les ingrédients sont approved
   - Auto-approuve (approval_status = 'approved' car créateur = CHEF_CUISINE)
   - Crée le produit + sync les ingrédients (product_recipe)
   - Crée le stock initial (si pas existant)
6. Retour → produit apparaît dans le catalogue
```

### 7.2 Création et soumission d'un menu hebdomadaire

```
1. Chef accède à /menus → crée un brouillon (name, dates, staff_count)
2. Ajoute des produits (food/plat) pour chaque jour/repas
3. Submit → POST /api/menus/{id}/submit
4. Backend : MenuController::submit()
   - Charge menu.items.product.ingredients.stock
   - Pour chaque ingrédient : required = quantité_recette × staff_count
   - Compare avec stock disponible
   - Si insuffisant → statut = REFUSE + commentaire automatique + notification Chef Magasin + notification F&B
   - Si suffisant → statut = VALIDE + is_active = true
     → Déduction FIFO de chaque ingrédient (FifoStockTrait)
     → Création du PurchaseNeed automatiquement
5. Retour → menu validé ou refusé avec détails
```

### 7.3 Commande interne — du Chef Cuisine au Chef Magasin

```
1. Chef accède à /internal-orders → clique "Nouvelle Commande"
2. Sélectionne des produits (commercial via getProductsByCategories)
3. Définit les quantités demandées
4. Submit → POST /api/internal-orders
5. Backend : InternalOrderController::store()
   - Type = commercial (toujours)
   - Assigné automatiquement à CHEF_MAGASIN
   - Statut = EN_ATTENTE
   - Notification envoyée au Chef Magasin
6. Chef Magasin reçoit la notification → accède à /internal-orders
7. Remplit les quantités servies (fulfillItem) → déduction FIFO du stock
8. Statut auto-calculé : DISPONIBLE / PARTIELLEMENT_DISPONIBLE / NON_DISPONIBLE
9. Notification de changement de statut envoyée au RESPONSABLE_FB et à l'assigné
```

### 7.4 Planification des shifts caissiers

```
1. Responsable F&B accède à /plannings
2. Sélectionne la semaine → grille hebdomadaire s'affiche
3. Pour chaque caissier : clique "+ Affecter" sur un jour
4. Modal : date, shift (MATIN/APRES_MIDI/SOIR), statut (ON/OFF/CONGE), PDV, horaires
5. Submit → POST /api/plannings
6. Backend : PlanningController::store()
   - Auto-détection du shift à partir de start_time
   - Vérification de chevauchement horaire
   - Vérification max 2 PDVs par shift/jour
7. Retour → caissier affecté, grille mise à jour
```

### 7.5 Chatbot — Question d'un client sur un allergène

```
1. Caissier accède à un produit → clique l'icône chatbot
2. Tape : "Est-ce que ce produit contient du gluten ?"
3. Frontend → POST /api/chatbot/ask (product_id + message)
4. Backend : ChatbotController::ask()
   - Vérifie le rôle (CAISSIER → mode santé uniquement)
   - Construit le system prompt avec contexte produit + rapports hygiène
   - Essai OpenAI → Groq → Gemini → Local NLP
   - Function calling si nécessaire (chercher_produits, obtenir_details_produit)
5. Réponse → affichée dans le panel chatbot
```

---

## 9. Sécurité — Résumé

| Couche | Mécanisme | Fichier |
|--------|-----------|---------|
| Authentification | JWT avec token 60 min + refresh | `jwt-auth` package |
| Autorisation backend | Middleware `role:` sur chaque route | `CheckRole.php` |
| Autorisation frontend | Guards `authGuard` + `roleGuard` | `core/guards/` |
| Interceptors | Token injecté automatiquement, erreur 401 → déconnexion | `core/interceptors/` |
| Chatbot isolation | Context utilisateur injecté dans system prompt | `ChatbotController::getUserContextText()` |
| Chatbot restriction Caissier | Questions hors santé rejetées | `isForbiddenForCashier()` |
| Données sensibles | `password` hidden dans User model, `approval_status` verrouillé après approbation | `User.php` casts + `products.component.ts` isLockedField() |
| CORS | Origins configurées dans `.env` | `config/cors.php` |

---

## 10. Application Mobile Flutter — Architecture du code

```
aeroservemobileahlem-main/lib/
├── core/
│   ├── app_theme.dart         ← Design system (couleurs, spacing, radius)
│   └── app_icons.dart         ← Icônes centralisées
├── models/
│   └── models.dart            ← Toutes les classes Dart (User, Planning, Product, HygieneReport…)
├── providers/
│   └── auth_provider.dart     ← ChangeNotifier : login, logout, user courant
├── services/
│   └── api_service.dart       ← Wrapper HTTP : get/post/put/delete avec token JWT
└── screens/
    ├── login_screen.dart       ← Connexion + configuration URL serveur (icône ⚙️)
    ├── home_screen.dart        ← Nav bas + polling notifications (15s)
    ├── dashboard_screen.dart   ← KPIs multi-rôles
    ├── orders_screen.dart      ← Commandes internes + catalogue interactif
    ├── planning_screen.dart    ← Planning personnel avec badge PDV par shift
    ├── profile_screen.dart     ← Profil + badge PDV + notifications
    ├── chatbot_screen.dart     ← Chatbot IA (sans product_id requis pour CAISSIER)
    ├── cashier_kanban_screen.dart ← Onglets Actifs/Inactifs + assignation PDV
    ├── hygiene_products_screen.dart ← Liste produits food approuvés + badge conformité
    ├── hygiene_check_screen.dart    ← Formulaire inspection + soumission rapport
    ├── menu_planning_screen.dart    ← Planning des menus
    ├── sales_screen.dart            ← Ventes (SUPER_ADMIN)
    └── stock_alerts_screen.dart     ← Alertes stock bas
```

### Navigation par rôle (`home_screen.dart`)

| Rôle | Onglets disponibles |
|------|---------------------|
| `SUPER_ADMIN` | Dashboard, Commandes, Ventes, Stocks, Planning, Profil |
| `RESPONSABLE_FB` | Dashboard, Commandes, Caissiers, Planning, Profil |
| `CHEF_CUISINE` | Dashboard, Commandes, Menus, Stocks, Profil |
| `CHEF_MAGASIN` | Dashboard, Commandes, Stocks, Profil |
| `RESPONSABLE_ACHAT` | Dashboard, Profil |
| `RESPONSABLE_HYGIENE` | Contrôle Produits, Profil |
| `CAISSIER` | Planning, Chatbot IA, Profil |

### Modèle `Planning.fromJson()` — Parsing du PDV

```dart
// Supporte snake_case (Laravel) ET camelCase (fallback)
final pdv = json['point_de_vente'] ?? json['pointDeVente'];
if (pdv is Map) {
  pName = pdv['name'];
  pId   = pdv['id'];
}
```

### Badge de conformité hygiène — Logique de tri

```dart
// hygiene_products_screen.dart
// Trier par created_at DESC → prendre le plus récent
final sorted = List.from(reports)
  ..sort((a, b) => DateTime.parse(b['created_at'])
      .compareTo(DateTime.parse(a['created_at'])));
final latest = sorted.first;
```

### Chatbot Caissier — Sans scan requis

```dart
// chatbot_screen.dart — product_id n'est plus obligatoire
await ApiService.post('/chatbot/ask', {
  'message': _input,
  // product_id omis → le backend accepte sans product_id pour CAISSIER
});
```
