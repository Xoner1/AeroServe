import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Sale, Product, Category, PointDeVente } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { AppIconComponent } from '../../shared/icon/app-icon.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent, AppIconComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="9" />
    } @else {
      <div class="page">
        <!-- ─── SALES LIST VIEW ─── -->
        @if (!isPOSMode) {
          <div class="page-header">
            <div>
              <h2>Journal des Ventes</h2>
              <p class="subtitle">Historique des transactions et encaissements des points de vente</p>
            </div>
            <button class="btn btn-primary" (click)="enterPOSMode()">
              <app-icon name="ShoppingCart" [size]="16"></app-icon> Nouveau POS / Vente
            </button>
          </div>

          <!-- KPI Summary cards -->
          <div class="stats-row">
            <div class="stat-mini">
              <span class="stat-lbl">Chiffre d'Affaires</span>
              <span class="stat-val">{{ totalAmount | number:'1.2-2' }} TND</span>
            </div>
            <div class="stat-mini">
              <span class="stat-lbl">Transactions</span>
              <span class="stat-val">{{ sales.length }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-lbl">Panier Moyen</span>
              <span class="stat-val">{{ (sales.length > 0 ? (totalAmount / sales.length) : 0) | number:'1.2-2' }} TND</span>
            </div>
          </div>

          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Caissier</th>
                  <th>Point de Vente</th>
                  <th>Mode de Paiement</th>
                  <th>Date & Heure</th>
                  <th style="text-align: right;">Total (TND)</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sales; track s.id) {
                  <tr>
                    <td><strong>#{{ s.id }}</strong></td>
                    <td>{{ s.caissier?.first_name }} {{ s.caissier?.last_name }}</td>
                    <td>{{ s.point_de_vente?.name }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="s.payment_method === 'cash'" [class.badge-info]="s.payment_method === 'card'">
                        {{ s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'card' ? 'Carte' : 'Autre' }}
                      </span>
                    </td>
                    <td>{{ s.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="amount" style="text-align: right;">{{ s.total_amount | number:'1.2-2' }}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary" style="height: 28px; padding: 0 12px; font-size: 11px;" (click)="viewSale(s)">
                        Détails
                      </button>
                    </td>
                  </tr>
                }
                @if (sales.length === 0) {
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 48px; color: var(--text-muted);">
                      Aucune transaction disponible pour la journée.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ─── TOUCH POS SCREEN MODE ─── -->
        @if (isPOSMode) {
          <div class="pos-layout">
            <!-- Left sidebar: categories & search -->
            <div class="pos-sidebar">
              <div class="pos-section-header">
                <h3>Catégories</h3>
              </div>
              <div class="pos-categories-list">
                <button class="category-btn" [class.active]="selectedCategoryId === null" (click)="selectCategory(null)">
                  Tous les articles
                </button>
                @for (cat of categories; track cat.id) {
                  @if (cat.type !== 'matiere_premiere') {
                    <button class="category-btn" [class.active]="selectedCategoryId === cat.id" (click)="selectCategory(cat.id)">
                      {{ cat.name }}
                    </button>
                  }
                }
              </div>

              <!-- PDV Configuration -->
              <div class="pdv-setup">
                <label>Point de Vente Actif :</label>
                @if (currentUser?.pdv_id) {
                  <div class="pdv-name-badge">
                    {{ currentUser?.point_de_vente?.name || 'Point de vente assigné' }}
                  </div>
                } @else {
                  <select [(ngModel)]="selectedPdvId" class="pdv-select">
                    <option [ngValue]="null">-- Sélectionner --</option>
                    @for (pdv of pdvs; track pdv.id) {
                      <option [ngValue]="pdv.id">{{ pdv.name }}</option>
                    }
                  </select>
                }
              </div>
            </div>

            <!-- Middle area: product grid & search -->
            <div class="pos-main">
              <div class="pos-topbar">
                <div class="search-box">
                  <input type="text" [(ngModel)]="searchQuery" (input)="filterProducts()" placeholder="Rechercher un produit ou scanner le code..." />
                </div>
                <button class="btn btn-secondary" (click)="exitPOSMode()">
                  Quitter le POS
                </button>
              </div>

              <div class="product-grid">
                @for (p of filteredProducts; track p.id) {
                  <div class="product-card" (click)="addToCart(p)">
                    @if (p.image) {
                      <img [src]="p.image" alt="{{ p.name }}" class="product-img" />
                    } @else {
                      <div class="product-placeholder">
                        <span>{{ p.name.substring(0, 2) | uppercase }}</span>
                      </div>
                    }
                    <div class="product-info">
                      <h4 class="product-name">{{ p.name }}</h4>
                      <span class="product-price">{{ p.price | number:'1.2-2' }} TND</span>
                    </div>
                  </div>
                }
                @if (filteredProducts.length === 0) {
                  <div class="empty-products-state">
                    Aucun produit trouvé dans cette catégorie.
                  </div>
                }
              </div>
            </div>

            <!-- Right area: cart & checkout -->
            <div class="pos-cart">
              <div class="cart-header">
                <h3>Panier Actuel</h3>
                @if (cart.length > 0) {
                  <button class="clear-cart-btn" (click)="clearCart()">Vider</button>
                }
              </div>

              <div class="cart-items">
                @for (item of cart; track item.product_id) {
                  <div class="cart-item">
                    <div class="cart-item-details">
                      <span class="cart-item-name">{{ item.product.name }}</span>
                      <span class="cart-item-price">{{ item.unit_price | number:'1.2-2' }} TND</span>
                    </div>
                    <div class="cart-item-actions">
                      <button class="qty-btn" (click)="changeQty(item, -1)">-</button>
                      <span class="cart-item-qty">{{ item.quantity }}</span>
                      <button class="qty-btn" (click)="changeQty(item, 1)">+</button>
                      <button class="trash-btn" (click)="changeQty(item, -item.quantity)">✕</button>
                    </div>
                  </div>
                }
                @if (cart.length === 0) {
                  <div class="empty-cart-state">
                    <app-icon name="ShoppingCart" [size]="48" className="empty-cart-icon"></app-icon>
                    <p>Le panier est vide</p>
                    <span style="font-size: 11px; color: var(--text-muted);">Touchez des produits pour les ajouter</span>
                  </div>
                }
              </div>

              <!-- Checkout Summary -->
              <div class="cart-summary">
                <div class="summary-line">
                  <span>Sous-total</span>
                  <strong>{{ cartTotal | number:'1.2-2' }} TND</strong>
                </div>

                <div class="payment-method-selector">
                  <label>Paiement :</label>
                  <div class="method-options">
                    <button class="method-btn" [class.active]="posPaymentMethod === 'cash'" (click)="posPaymentMethod = 'cash'">
                      Espèces
                    </button>
                    <button class="method-btn" [class.active]="posPaymentMethod === 'card'" (click)="posPaymentMethod = 'card'">
                      Carte
                    </button>
                  </div>
                </div>

                <button class="checkout-btn" [disabled]="cart.length === 0 || (!currentUser?.pdv_id && !selectedPdvId)" (click)="checkout()">
                  Valider l'encaissement ({{ cartTotal | number:'1.2-2' }} TND)
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ─── SALE DETAIL MODAL ─── -->
        @if (showDetailModal && selectedSale) {
          <div class="modal-overlay" (click)="closeDetailModal()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Détail de la transaction #{{ selectedSale.id }}</h3>
                <button (click)="closeDetailModal()" style="font-size: 16px;">✕</button>
              </div>
              <div class="modal-body">
                <div class="receipt-header">
                  <h4>AeroServe POS</h4>
                  <p>Point de vente : {{ selectedSale.point_de_vente?.name }}</p>
                  <p>Date : {{ selectedSale.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                  <p>Caissier : {{ selectedSale.caissier?.first_name }} {{ selectedSale.caissier?.last_name }}</p>
                </div>
                
                <table class="receipt-table">
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th style="text-align: center;">Qté</th>
                      <th style="text-align: right;">P.U.</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of selectedSale.items; track item.id) {
                      <tr>
                        <td>{{ item.product?.name }}</td>
                        <td style="text-align: center;">{{ item.quantity }}</td>
                        <td style="text-align: right;">{{ item.unit_price | number:'1.2-2' }}</td>
                        <td style="text-align: right;">{{ item.subtotal | number:'1.2-2' }} TND</td>
                      </tr>
                    }
                  </tbody>
                </table>

                <div class="receipt-footer">
                  <div class="footer-line">
                    <span>Mode de paiement:</span>
                    <span>{{ selectedSale.payment_method === 'cash' ? 'Espèces' : 'Carte' }}</span>
                  </div>
                  <div class="footer-line total">
                    <span>Total payé:</span>
                    <span>{{ selectedSale.total_amount | number:'1.2-2' }} TND</span>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" (click)="closeDetailModal()">Fermer</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); }

    .stats-row { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
      gap: 16px; 
    }
    
    .stat-mini { 
      background: var(--surface);
      border-radius: var(--radius-lg); 
      padding: 20px; 
      display: flex; 
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--border);
    }
    
    .stat-val { 
      font-size: 24px; 
      font-weight: 700; 
      color: var(--text-primary);
    }
    
    .stat-lbl { 
      font-size: 11px; 
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    /* ─── POS SPLIT LAYOUT ─── */
    .pos-layout {
      display: grid;
      grid-template-columns: 240px 1fr 340px;
      gap: 16px;
      height: calc(100vh - 140px);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .pos-sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .pos-section-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .pos-categories-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      overflow-y: auto;
    }

    .category-btn {
      text-align: left;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
    }

    .category-btn:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .category-btn.active {
      background: var(--accent);
      color: #fff;
    }

    .pdv-setup {
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pdv-setup label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .pdv-name-badge {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .pdv-select {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 12px;
      background: var(--surface);
    }

    /* POS Main Area */
    .pos-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      overflow-y: auto;
    }

    .pos-topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    .search-box {
      flex: 1;
    }

    .search-box input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 13px;
      background: var(--surface);
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
      flex: 1;
      overflow-y: auto;
    }

    .product-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all var(--transition);
      user-select: none;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
      border-color: var(--accent);
    }

    .product-img {
      width: 100%;
      height: 100px;
      object-fit: cover;
    }

    .product-placeholder {
      width: 100%;
      height: 100px;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 24px;
      font-weight: 700;
    }

    .product-info {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .product-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.3;
      height: 32px;
      overflow: hidden;
    }

    .product-price {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
    }

    .empty-products-state {
      grid-column: 1 / -1;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* POS Cart Area */
    .pos-cart {
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }

    .cart-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cart-header h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }

    .clear-cart-btn {
      font-size: 12px;
      color: var(--color-error);
      font-weight: 500;
      cursor: pointer;
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }

    .cart-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .cart-item-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .cart-item-price {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .cart-item-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .qty-btn:hover {
      background: var(--accent);
      color: #fff;
      border-color: transparent;
    }

    .cart-item-qty {
      font-size: 12.5px;
      font-weight: 700;
      width: 20px;
      text-align: center;
    }

    .trash-btn {
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      margin-left: 4px;
    }

    .trash-btn:hover {
      color: var(--color-error);
    }

    .empty-cart-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
      color: var(--text-muted);
      gap: 8px;
    }

    .empty-cart-icon {
      color: var(--text-muted);
      opacity: 0.4;
    }

    .cart-summary {
      padding: 16px;
      border-top: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-primary);
    }

    .summary-line strong {
      font-size: 16px;
      color: var(--accent);
    }

    .payment-method-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .payment-method-selector label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .method-options {
      display: flex;
      gap: 6px;
    }

    .method-btn {
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .method-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: transparent;
    }

    .checkout-btn {
      width: 100%;
      height: 44px;
      background: var(--accent);
      color: #fff;
      border-radius: var(--radius-md);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checkout-btn:disabled {
      background: var(--text-muted);
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* Receipt detail layout */
    .receipt-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .receipt-header h4 {
      font-size: 18px;
      margin-bottom: 4px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .receipt-header p {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 2px 0;
    }

    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-bottom: 20px;
    }

    .receipt-table th {
      border-bottom: 2px solid var(--border);
      padding: 8px 4px;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .receipt-table td {
      border-bottom: 1px solid var(--border-light);
      padding: 8px 4px;
      color: var(--text-primary);
    }

    .receipt-footer {
      border-top: 2px dashed var(--border);
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .footer-line {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .footer-line.total {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      padding-top: 6px;
      border-top: 1px solid var(--border-light);
    }
  `]
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  products: Product[] = [];
  categories: Category[] = [];
  pdvs: PointDeVente[] = [];
  currentUser: any = null;

  loading = true;
  isPOSMode = false;
  totalAmount = 0;
  showDetailModal = false;
  selectedSale: Sale | null = null;

  // POS State
  selectedCategoryId: number | null = null;
  selectedPdvId: number | null = null;
  searchQuery = '';
  filteredProducts: Product[] = [];
  cart: any[] = [];
  cartTotal = 0;
  posPaymentMethod: 'cash' | 'card' = 'cash';

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    this.load();
    this.loadPOSData();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('sales').subscribe({
      next: res => {
        this.sales = res.data || res;
        this.totalAmount = this.sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadPOSData(): void {
    // Load products
    this.api.get<any>('products').subscribe({
      next: res => {
        this.products = res.data || res;
        this.filterProducts();
      }
    });

    // Load categories
    this.api.get<any>('categories').subscribe({
      next: res => {
        this.categories = res.data || res;
      }
    });

    // Load points de vente (only if the user is SUPER_ADMIN)
    if (!this.currentUser?.pdv_id) {
      this.api.get<any>('points-de-vente').subscribe({
        next: res => {
          this.pdvs = res.data || res;
          if (this.pdvs.length > 0) {
            this.selectedPdvId = this.pdvs[0].id;
          }
        }
      });
    }
  }

  enterPOSMode(): void {
    this.cart = [];
    this.cartTotal = 0;
    this.isPOSMode = true;
  }

  exitPOSMode(): void {
    this.isPOSMode = false;
  }

  selectCategory(catId: number | null): void {
    this.selectedCategoryId = catId;
    this.filterProducts();
  }

  filterProducts(): void {
    let list = this.products.filter(p => p.approval_status === 'approved' && p.is_active);
    
    // Type should not be matiere_premiere
    list = list.filter(p => p.type !== 'matiere_premiere');

    if (this.selectedCategoryId !== null) {
      list = list.filter(p => p.category_id === this.selectedCategoryId);
    }

    if (this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    this.filteredProducts = list;
  }

  addToCart(product: Product): void {
    const existing = this.cart.find(item => item.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        product_id: product.id,
        product: product,
        quantity: 1,
        unit_price: product.price
      });
    }
    this.updateCartTotal();
  }

  changeQty(item: any, delta: number): void {
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(i => i.product_id !== item.product_id);
    }
    this.updateCartTotal();
  }

  clearCart(): void {
    this.cart = [];
    this.updateCartTotal();
  }

  updateCartTotal(): void {
    this.cartTotal = this.cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }

  checkout(): void {
    if (this.cart.length === 0) return;
    const pdvId = this.currentUser?.pdv_id || this.selectedPdvId;
    if (!pdvId) {
      Swal.fire('Erreur', 'Veuillez sélectionner un point de vente.', 'error');
      return;
    }

    const payload = {
      pdv_id: pdvId,
      payment_method: this.posPaymentMethod,
      items: this.cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    };

    this.api.post('sales', payload).subscribe({
      next: () => {
        Swal.fire({
          title: 'Vente Validée !',
          text: 'La vente a été enregistrée avec succès.',
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
        this.clearCart();
        this.isPOSMode = false;
        this.load();
      },
      error: (err) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || "Impossible d'enregistrer la transaction.",
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }

  viewSale(s: Sale): void {
    this.selectedSale = s;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedSale = null;
  }
}
