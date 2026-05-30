# Services Guide

## ApiService (`core/services/api.service.ts`)

Generic HTTP wrapper. Injects `HttpClient`. All methods return `Observable<T>`.

```ts
get<T>(endpoint, params?): Observable<T>
post<T>(endpoint, body): Observable<T>
put<T>(endpoint, body): Observable<T>
delete<T>(endpoint): Observable<T>
```

- Prepends `environment.apiUrl` to every endpoint
- No error handling (delegated to components or interceptors)
- Recommended: use `.subscribe({ next, error })` in components

## AuthService (`core/services/auth.service.ts`)

Manages authentication state.

| Method | Returns | Description |
|---|---|---|
| `login(credentials)` | `Observable<{token, user}>` | POST to `/login`, stores token + user in localStorage, emits to `currentUser$` |
| `logout()` | `void` | Clears localStorage, resets `currentUser$` to null |
| `getToken()` | `string \| null` | Reads from localStorage |
| `currentUser$` | `BehaviorSubject<User \| null>` | Subscribe to get current user reactively |
| `hasRole(role: string)` | `boolean` | Checks current user's role |
| `updateProfile(data)` | `Observable<User>` | PUT to `/users/profile` |

**State persistence:** User data and JWT stored in `localStorage('user')` and `localStorage('token')`. Survives page refresh.

## LoadingService (`core/services/loading.service.ts`)

Simple loading state tracker.

```ts
loading$ = new BehaviorSubject<boolean>(false);

start()  → emits true
stop()   → emits false
```

The `loadingInterceptor` calls `start()` on every HTTP request and `stop()` on response (using `finalize`). The `App` component subscribes via `toSignal()` to show a global overlay.

## NotificationService (`core/services/notification.service.ts`)

Central notification hub.

| Property | Description |
|---|---|
| `notifications$` | `BehaviorSubject<Notification[]>` — full list |
| `unreadCount$` | `BehaviorSubject<number>` |
| `wsStatus$` | `BehaviorSubject<'connected' | 'disconnected'>` |

| Method | Description |
|---|---|
| `load()` | GET `/notifications`, updates `notifications$` and `unreadCount$` |
| `markRead(id)` | PATCH `/notifications/{id}/read`, decrements unread |
| `markAllRead()` | PATCH `/notifications/read-all`, resets unread to 0 |
| `connectWebSocket()` | Initializes WebSocket connection; merges WS messages into `notifications$` |

WebSocket messages auto-update the UI. The layout component uses `wsStatus$` for the connection indicator.

## WebSocketService (`core/services/websocket.service.ts`)

Low-level WebSocket manager.

| Method | Description |
|---|---|
| `connect(token)` | Opens `ws://host/ws?token=<JWT>` |
| `disconnect()` | Closes connection, clears ping interval |
| `messages$` | `Subject<any>` — emits parsed JSON from `onmessage` |
| `status$` | `BehaviorSubject<boolean>` — connected/disconnected |

**Reconnect logic:** Exponential backoff: 1s → 2s → 4s → 8s → ... → max 30s. Resets on successful connect. Implements `visibilitychange` listener to avoid unnecessary reconnects when tab is hidden.

**Ping:** Every 30 seconds sends `{ type: "ping" }` to keep connection alive.

## Services Dependency Flow

```
ApiService (HTTP)
    ↑
AuthService (login/logout/token)
    ↑
NotificationService (REST + WebSocket)
    ↑
WebSocketService (WS lifecycle)
```

Components inject `ApiService` for data and `NotificationService` for real-time updates.
