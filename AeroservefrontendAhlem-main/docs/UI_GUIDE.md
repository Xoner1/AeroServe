# UI / Style Guide

## Design System: Sage & Stone

**Palette** (defined in `_variables.scss`):

| Role | Variable | Hex | Usage |
|---|---|---|---|
| Primary (Sage) | `--clr-primary` | `#7B9C84` | Buttons, links, active states |
| Primary Dark | `--clr-primary-dark` | `#6B8F71` | Hover on primary buttons |
| Primary Light | `--clr-primary-light` | `#A8C5AF` | Light backgrounds, badges |
| Accent (Stone) | `--clr-accent` | `#D4C9B8` | Secondary buttons, borders |
| Accent Dark | `--clr-accent-dark` | `#C4B8A8` | Hover on secondary |
| Background | `--clr-bg` | `#F4F1EC` | Page backgrounds |
| Surface | `--clr-surface` | `#FFFFFF` | Cards, modals, tables |
| Text Primary | `--clr-text` | `#2C2C2C` | Body text |
| Text Muted | `--clr-text-muted` | `#8A8A8A` | Labels, secondary info |
| Success/Fail | `--clr-success` / `--clr-danger` | `#6B8F71` / `#C0483A` | Status indicators |

**Typography:**
- Font stack: `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Headings: `h1` 28px / `h2` 22px / `h3` 18px
- Body: 14px / 15px depending on context
- Font weights: 400 (regular), 500 (medium), 600 (semibold)

**Spacing:**
- Page padding: 24px
- Card padding: 18–20px
- Gap between elements: 14–16px
- Border radius: 12px (cards), 8px (buttons), 6px (inputs)

**Shadows:**
- Card: `0 1px 3px rgba(0,0,0,0.06)`
- Modal: `0 8px 30px rgba(0,0,0,0.15)`
- Hover: `0 4px 12px rgba(0,0,0,0.08)`

## Component Styles

### Buttons

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-accent">Secondary</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-danger">Danger</button>
<button class="btn-sm">Small</button>
```

- Height: 38px (`.btn`), 32px (`.btn-sm`)
- Border radius: 8px (`.btn`), 6px (`.btn-sm`)
- Font weight: 500
- Cursor pointer, transition 200ms ease

### Tables

```html
<div class="card">
  <div class="table-wrap">
    <table>
      <thead><tr><th>...</th></tr></thead>
      <tbody><tr><td>...</td></tr></tbody>
    </table>
  </div>
</div>
```

- Header background: `#F4F1EC` with semibold text
- Row hover: light background tint
- Alternating row stripes (optional)
- `table-wrap` enables horizontal scroll on mobile

### Badges & Chips

```html
<span class="badge success">Active</span>
<span class="badge warning">Pending</span>
<span class="badge danger">Inactive</span>
<span class="badge info">Draft</span>
```

- Border radius: 20px (pill shape)
- Padding: 4px 12px
- Font size: 12px, weight 500

### Cards

```html
<div class="card">
  <!-- content -->
</div>
```

- Background: white
- Border radius: 14px
- Padding: 18px
- Shadow: subtle
- Flex: column layout by default

### Forms

```html
<div class="form-group">
  <label>Field Name</label>
  <input type="text" [(ngModel)]="value" />
</div>
```

- Label: 13px, weight 500, margin-bottom 6px
- Input: height 40px, border `1px solid #D4C9B8`, radius 8px
- Focus: border `#7B9C84`, ring `0 0 0 3px rgba(123,156,132,0.15)`
- Select: same as input styling
- Textarea: min-height 100px, same border styling

### Modal / Overlay

```html
<div class="modal-overlay" (click)="close()">
  <div class="modal" (click)="$event.stopPropagation()">
    <h3>Title</h3>
    <!-- content -->
  </div>
</div>
```

- Overlay: `rgba(0,0,0,0.4)` backdrop
- Modal: white, radius 16px, padding 24px, max-width 520px
- Animation: fadeIn 200ms

### Sidebar (`layout/`)

- Width: 250px
- Background: `#2C2C2C` (dark)
- Text: white with 70% opacity (inactive), white (active)
- Active item: `#7B9C84` left border + subtle background
- User avatar at bottom with role badge
- Toggle button to collapse (icon only mode)

### Topbar (`layout/`)

- Height: 56px
- Background: white
- Right side: notification bell with unread count badge + WebSocket status dot
- Notification dropdown: bell icon opens a list of recent notifications with mark-read
- Status dot: green pulsing when connected, grey when disconnected

### Stats Row (Dashboard)

```html
<div class="stats-row">
  <div class="stat-card">
    <span class="stat-val">1,234 TND</span>
    <span class="stat-lbl">Today Revenue</span>
  </div>
</div>
```

- Display: flex, gap 14px
- Cards: white bg, radius 12px, padding 16px, min-width 180px
- Value: 22px, weight 600
- Label: 13px, muted

## Slide Over Panel

```html
<app-slide-over [open]="isOpen" title="Details" (close)="close()">
  <!-- content -->
</app-slide-over>
```

- Animates from right edge (translateX 100% → 0)
- Has backdrop overlay
- Width configurable via `width` input (default 480px)
- Close button in header
- Content scrolls if taller than viewport

## Toast Notifications

Custom inline toasts (not SweetAlert2) are used for lightweight feedback:

- Position: fixed, bottom-right (24px from edges)
- Background: `#6B8F71` (success) or `#C0483A` (error)
- Color: white, weight 600
- Border radius: 12px
- Auto-dismiss: 3.5s
- Shadow: `0 8px 24px rgba(0,0,0,0.2)`

## SweetAlert2 Usage

Used for:
- Delete confirmations: `Swal.fire({ title, text, icon: 'warning', showCancelButton: true })`
- Success/error alerts after API calls: `Swal.fire({ icon: 'success', title, timer: 2000 })`
- Input prompts: `Swal.fire({ input: 'text', ... })`

## Global Loading Overlay

- Full-viewport fixed overlay (`rgba(255,255,255,0.8)`)
- Centered spinner (CSS-only, animated border trick)
- Controlled by `loadingService.loading$`
- Disabled during `skipLoading` requests (checked via context token)
