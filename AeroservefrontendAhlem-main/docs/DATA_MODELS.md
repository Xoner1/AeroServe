# Data Models

## Interfaces (`core/models/index.ts`)

### User
```ts
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;       // SUPER_ADMIN | RESPONSABLE_FB | CHEF_CUISINE | CHEF_MAGASIN | RESPONSABLE_ACHAT | RESPONSABLE_HYGIENE | CAISSIER
  is_active: boolean;
  avatar?: string;
  phone?: string;
  bio?: string;
  age?: number;
}
```

### Caissier
```ts
interface Caissier {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'en_attente' | 'active' | 'inactive';
  point_de_vente?: PointDeVente;
  hire_date: string;
}
```

### PointDeVente
```ts
interface PointDeVente {
  id: number;
  name: string;
  location: string;
  type: 'airside' | 'landside';
  is_active: boolean;
  code?: string;
}
```

### Product
```ts
interface Product {
  id: number;
  name: string;
  type: 'FOOD' | 'COMMERCIAL' | 'RAW_MATERIAL';
  category?: Category;
  category_id?: number;
  price: number;
  unit: string;
  stock_quantity?: number;
  threshold?: number;
  is_validated: boolean;
  validated_by?: number;
  recipe?: RecipeItem[];
  image?: string;
  description?: string;
}
```

### Category
```ts
interface Category {
  id: number;
  name: string;
  type: 'FOOD' | 'COMMERCIAL' | 'RAW_MATERIAL';
  description?: string;
}
```

### Stock
```ts
interface Stock {
  id: number;
  product: Product;
  quantity: number;
  unit: string;
  threshold: number;
  expiry_date?: string;
  warehouse_entry_date: string;
  remaining?: number;     // for FIFO layer tracking
}
```

### StockMovement
```ts
interface StockMovement {
  id: number;
  stock: number;
  product_name: string;
  quantity: number;
  type: 'entrée' | 'sortie';
  date: string;
  user_name: string;
  note?: string;
}
```

### Sale
```ts
interface Sale {
  id: number;
  caissier: Caissier;
  point_de_vente: PointDeVente;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items: SaleItem[];
}
```

### SaleItem
```ts
interface SaleItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
```

### InternalOrder
```ts
interface InternalOrder {
  id: number;
  order_number: string;
  status: 'brouillon' | 'validé' | 'en_cours' | 'préparé' | 'livré' | 'facturé';
  point_de_vente: PointDeVente;
  created_by: User;
  created_at: string;
  items: OrderItem[];
  comments: OrderComment[];
}
```

### OrderItem
```ts
interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  received_quantity: number;
  unit_price: number;
}
```

### OrderComment
```ts
interface OrderComment {
  id: number;
  user: User;
  content: string;
  created_at: string;
}
```

### Menu (Weekly)
```ts
interface Menu {
  id: number;
  week_start: string;       // ISO date (Monday)
  week_end: string;         // ISO date (Sunday)
  is_published: boolean;
  days: MenuDay[];
}
```

### MenuDay
```ts
interface MenuDay {
  date: string;
  entrée?: Product;
  plat_principal?: Product;
  dessert?: Product;
  accompagnement?: Product;
}
```

### Planning
```ts
interface Planning {
  id: number;
  week_start: string;
  week_end: string;
  shifts: Shift[];
}
```

### Shift
```ts
interface Shift {
  id: number;
  day: string;          // ISO date
  shift_type: 'Matin' | 'Après-midi' | 'Nuit';
  caissier: Caissier;
  start_time: string;
  end_time: string;
}
```

### HygieneReport
```ts
interface HygieneReport {
  id: number;
  title: string;
  product_name?: string;
  report_date: string;
  rating: 'A' | 'B' | 'C' | 'D';
  inspector: User;
  is_published: boolean;
  findings?: string;
  corrective_actions?: string;
  image?: string;
}
```

### Notification
```ts
interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  created_at: string;
}
```

### DashboardKpi
```ts
interface DashboardKpi {
  total_sales?: number;
  total_orders?: number;
  low_stock_count?: number;
  pending_approvals?: number;
  open_reports?: number;
  active_caissiers?: number;
  today_revenue?: number;
  // role-specific fields
}
```

### StockPrediction
```ts
interface StockPrediction {
  id: number;
  product: Product;
  predicted_consumption: number;
  confidence: number;
  forecast_date: string;
  recommended_order: number;
}
```
