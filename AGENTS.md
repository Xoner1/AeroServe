# AeroServe - AGENTS.md

## Project Overview
Three-part airport F&B management system:
- **Backend**: `AeroserveBackendAhlem-main/` — Laravel 12 API (PHP 8.2), JWT auth, MySQL, WebSocket (Reverb)
- **Frontend**: `AeroservefrontendAhlem-main/` — Angular 20, standalone components, Signals, Sage & Stone design system
- **Mobile**: `aeroservemobileahlem-main/` — Flutter 3.5+, provider state, mobile_scanner for QR

## Quick Commands

### Backend (Laravel)
```bash
cd AeroserveBackendAhlem-main
composer install                    # Install deps
cp .env.example .env                # Copy env (edit DB credentials)
php artisan key:generate
php artisan migrate --force         # Run migrations
php artisan serve                   # API at http://127.0.0.1:8000
php artisan queue:listen            # Queue worker
php artisan reverb:start            # WebSocket server (port 8080)
php artisan test                    # Run tests (Pest/PHPUnit)
./vendor/bin/pint                   # Lint (PHP CS Fixer)
```

### Frontend (Angular)
```bash
cd AeroservefrontendAhlem-main
npm install
ng serve                            # Dev at http://localhost:4200
ng build --configuration production # Production build → dist/AeroServeFront/
ng test                             # Unit tests (Karma/Jasmine)
```

### Mobile (Flutter)
```bash
cd aeroservemobileahlem-main
flutter pub get
flutter run                         # Run on connected device/emulator
flutter build apk                   # Android APK
flutter build ios                   # iOS (macOS only)
```

## Architecture Notes
- **Auth**: JWT tokens (HS256), stored in localStorage (Angular) / shared_preferences (Flutter)
- **Roles**: 7 roles — SUPER_ADMIN, RESPONSABLE_FB, CHEF_CUISINE, CHEF_MAGASIN, RESPONSABLE_ACHAT, RESPONSABLE_HYGIENE, CAISSIER
- **API base**: `http://127.0.0.1:8000/api` (dev) / `https://aeroserve.alwaysdata.net/api` (prod)
- **WebSocket**: `ws://127.0.0.1:8000/ws` (dev) — native WebSocket with auto-reconnect + exponential backoff
- **DB**: MySQL (InnoDB), 19 tables, FIFO stock via `FifoStockTrait`
- **AI**: Groq/Gemini for chatbot (stock predictions, health queries)

## Key Conventions
- **No emojis** in code/comments (enforced by cleanup)
- **Sage & Stone** design tokens in `_variables.scss` — use CSS custom properties
- **Role guards** on both frontend (`roleGuard`) and backend (`role:` middleware)
- **Standalone components** only — no NgModules
- **Signals** for state — avoid RxJS BehaviorSubject where possible
- **Slide-over panels** for CRUD modals (shared component system)

## Environment Files
| File | Purpose |
|------|---------|
| `AeroserveBackendAhlem-main/.env` | Backend config (DB, JWT, Mail, Reverb, AI keys) |
| `AeroservefrontendAhlem-main/src/environments/environment.ts` | Frontend API/WS URLs |
| `aeroservemobileahlem-main/.env` | Not used — config in Dart code |

## Testing
- **Backend**: `php artisan test` (Pest/PHPUnit), uses SQLite in memory
- **Frontend**: `ng test` (Karma/Jasmine), headless Chrome
- **Mobile**: `flutter test` (unit/widget)

## Common Gotchas
1. **DB credentials** in `.env` point to alwaysdata.net (prod) — change for local dev
2. **WebSocket** requires `php artisan reverb:start` running separately
3. **Queue worker** needed for notifications/emails: `php artisan queue:listen`
4. **CORS** configured via `ALLOWED_ORIGINS` in backend `.env`
5. **File uploads** (avatars, product images) use `public/storage` — run `php artisan storage:link`
6. **Role middleware** on API routes — test with correct JWT role claim

## Documentation Reference
All technical docs in `docs/`:
- `RAPPORT_TECHNIQUE.md` — Full specs, schemas, API reference
- `ARCHITECTURE.md` — System architecture, routing, auth, WebSocket lifecycle
- `API_REFERENCE.md` — All endpoints by module
- `ROLES_AND_PERMISSIONS.md` — Role access matrix + nav items
- `COMPONENTS.md` — Angular components with inputs/outputs
- `DATA_MODELS.md` — TypeScript interfaces
- `SERVICES.md` — ApiService, AuthService, WebSocketService, etc.
- `UI_GUIDE.md` — Design tokens, component patterns
- `BUGS_AND_FIXES.md` — Complete fix history

## Refinement Status
All 7 roles completed per `refinement_checklist_plan.md`. Future work = surgical fixes only.