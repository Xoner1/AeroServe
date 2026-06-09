export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;

  role_id: number;
  pdv_id?: number;

  status: 'active' | 'en_attente' | 'inactive';

  avatar?: string;
  avatar_url?: string;
  age?: number | null;
  experience?: boolean;
  bio?: string | null;

  created_at: string;
  updated_at: string;

  role?: Role;
  point_de_vente?: PointDeVente;
}
export interface Role {
  id: number;
  name: string;
  display_name: string;
}

export interface Airport {
  id: number;
  name: string;
  code: string;
  points_de_vente?: PointDeVente[];
}

export interface PointDeVente {
  id: number;
  name: string;
  airport_id: number;
  is_active: boolean;
  location?: 'AIRSIDE' | 'LANDSIDE';

  responsable_fb_id: number | null;

  _message?: string;
  responsableFb?: User;

  airport?: Airport;
}
export interface Category {
  id: number;
  name: string;
  type: 'commercial' | 'matiere_premiere' | 'food' | 'plat';
  code?: string;
}
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'en_attente'
} as const;

export interface Product {
  id: number;
  name: string;
  description?: string;
  type: 'commercial' | 'matiere_premiere' | 'food' | 'plat';
  category_id?: number;
  price: number;
  image?: string;
  is_active: boolean;
  allergens?: string[];
  expiration_date?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_by?: number;
  quantity_per_batch?: number;
  category?: Category;
  creator?: User;
  stock?: Stock;
  ingredients?: Product[];
}

export interface Stock {
  id: number;
  product_id: number;
  quantity: number;
  min_threshold: number;
  unit: string;
  product?: Product;
}

export interface StockMovement {
  id: number;
  stock_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  expiration_date?: string;
  user_id?: number;
  user?: User;
  created_at: string;
}

export interface InternalOrder {
  id: number;
  type: 'food' | 'commercial';
  status: 'EN_ATTENTE' | 'DISPONIBLE' | 'PARTIELLEMENT_DISPONIBLE' | 'NON_DISPONIBLE';
  created_by: number;
  assigned_to?: number;
  pdv_id?: number;
  notes?: string;
  delivery_date?: string;
  creator?: User;
  assignee?: User;
  point_de_vente?: PointDeVente;
  items?: InternalOrderItem[];
  comments?: Comment[];
  created_at: string;
}

export interface InternalOrderItem {
  id: number;
  internal_order_id: number;
  product_id: number;
  quantity_requested: number;
  quantity_fulfilled: number;
  product?: Product;
}

export interface Menu {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_by: number;
  is_active: boolean;
  status: 'BROUILLON' | 'VALIDE' | 'REFUSE';
  staff_count?: number;
  comment?: string;
  creator?: User;
  items?: MenuItem[];
}

export interface MenuItem {
  id: number;
  menu_id: number;
  product_id: number;
  day_of_week: string;
  meal_type: string;
  product?: Product;
}

export interface Planning {
  id: number;
  caissier_id: number;
  pdv_id: number;
  date: string;
  is_day_off: boolean;
  start_time?: string;
  end_time?: string;
  shift?: 'MATIN' | 'APRES_MIDI' | 'SOIR';
  day_status?: 'ON' | 'OFF' | 'CONGE';
  created_by?: number;
  caissier?: User;
  point_de_vente?: PointDeVente;
}

export interface Comment {
  id: number;
  user_id: number;
  commentable_type: string;
  commentable_id: number;
  body: string;
  user?: User;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

export interface HygieneReport {
  id: number;
  product_id: number;
  inspected_by: number;
  allergens_verified: boolean;
  expiration_verified: boolean;
  status: 'conforme' | 'non_conforme' | 'en_cours';
  remarks?: string;
  product?: Product;
  inspector?: User;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DashboardData {
  total_sales: number;
  sales_count: number;
  popular_products: any[];
  low_stock_count: number;
  expired_products_count: number;
  sales_by_pdv: any[];
  daily_sales: { date: string; total: number }[];
  active_users?: number;
  pending_orders?: number;
  processed_today?: number;
  delayed_orders?: number;
  kitchen_load?: number;
  warehouse_load?: number;
  total_waste?: number;
  waste_trend?: { date: string; total: number }[];
  role_specific?: any;
}
