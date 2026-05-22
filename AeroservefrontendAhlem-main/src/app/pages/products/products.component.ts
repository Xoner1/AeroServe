import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, Category } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="10" />
    } @else {
      <div class="page">
        <div class="page-header">
          <h2>Produits</h2>

          <div class="header-actions">
            <select [(ngModel)]="filterType" (ngModelChange)="applyFilter()" class="filter-select">
              <option value="">Tous les types</option>
              <option value="commercial">Commercial</option>
              <option value="matiere_premiere">Matière première</option>
              <option value="food">Food</option>
            </select>

            <button class="btn btn-primary" (click)="openModal()">+ Ajouter</button>
          </div>
        </div>

        <!-- TABLE -->
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Catégorie</th>
                  <th>Statut</th>
                  <th>Utilisation</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                @for (p of filteredProducts; track p.id) {
                  <tr>
                    <td>
                      @if (p.image) {
                        <img [src]="getImageUrl(p.image)" alt="Product" class="table-product-img" />
                      } @else {
                        <span class="product-icon">📦</span>
                      }
                    </td>
                    <td>
                      <div class="product-name">
                        {{ p.name }}
                      </div>
                    </td>

                    <td>
                      <span class="badge type">{{ p.type }}</span>
                    </td>

                    <td>
                      {{ p.category?.name || '-' }}
                    </td>

                    <td>
                      <span class="badge" [class]="'approval-' + p.approval_status">
                        {{ p.approval_status === 'approved'
                          ? 'Approuvé'
                          : p.approval_status === 'pending'
                          ? 'En attente'
                          : 'Rejeté' }}
                      </span>
                    </td>

                    <td>
                      @if (p.approval_status === 'approved') {
                        <span class="badge status-badge" [class]="p.is_active ? 'active' : 'inactive'">
                          {{ p.is_active ? 'Actif' : 'Inactif' }}
                        </span>
                      } @else {
                        -
                      }
                    </td>

                    <td class="actions">
                      <button class="btn-icon" (click)="editProduct(p)">✏️</button>
                      <button class="btn-icon danger" (click)="deleteProduct(p.id)">🗑️</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- MODAL -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal" (click)="$event.stopPropagation()">

              <h3>{{ editing ? 'Modifier' : 'Ajouter' }} un produit</h3>

              <form (ngSubmit)="save()">

                <!-- NAME -->
                <div class="form-group">
                  <label>Nom</label>
                  <input [(ngModel)]="form.name" name="name" required [disabled]="isLockedField('name')" />
                </div>

                <div class="form-row">
                  <!-- TYPE -->
                  <div class="form-group">
                    <label>Type</label>
                    <select [(ngModel)]="form.type" name="type" required [disabled]="isLockedField('type') || isChefCuisine || isChefMagasin">
                      <option value="commercial">Commercial</option>
                      <option value="matiere_premiere">Matière première</option>
                      <option value="food">Food</option>
                    </select>
                  </div>

                  <!-- PRICE (hidden for Chef Magasin & Chef Cuisine) -->
                  @if (!isRestrictedRole) {
                    <div class="form-group">
                      <label>Prix (TND)</label>
                      <input type="number" step="0.01" [(ngModel)]="form.price" name="price" required [disabled]="isLockedField('price')" />
                    </div>
                  }
                </div>

                <!-- CATEGORY -->
                <div class="form-group">
                  <label>Catégorie</label>
                  <select [(ngModel)]="form.category_id" name="category_id" required [disabled]="isLockedField('category_id')">
                    <option value="">-- choisir une catégorie --</option>
                    @for (c of formCategories; track c.id) {
                      <option [value]="c.id">
                        {{ c.name }}
                      </option>
                    }
                  </select>
                </div>

                <!-- DESCRIPTION (Always editable) -->
                <div class="form-group">
                  <label>Description (Note)</label>
                  <textarea [(ngModel)]="form.description" name="description" rows="3"></textarea>
                </div>

                <!-- ALLERGENS (hidden for Chef Magasin & Chef Cuisine) -->
                @if (!isRestrictedRole) {
                  <div class="form-group">
                    <label>Allergènes (séparés par des virgules)</label>
                    <input [(ngModel)]="form.allergens_text" name="allergens" [disabled]="isLockedField('allergens')" />
                  </div>
                }

                <!-- EXPIRATION (hidden for Chef Magasin & Chef Cuisine) -->
                @if (!isRestrictedRole) {
                  <div class="form-group">
                    <label>Date d'expiration</label>
                    <input type="date" [(ngModel)]="form.expiration_date" name="expiration_date" [disabled]="isLockedField('expiration_date')" />
                  </div>
                }

                <!-- USAGE STATUS (Visible when editing approved products) -->
                @if (editing && selectedProductApprovalStatus === 'approved') {
                  <div class="form-group">
                    <label>Statut d'utilisation</label>
                    <select [(ngModel)]="form.usage_status" name="usage_status">
                      <option value="IN_USE">En service (IN_USE)</option>
                      <option value="NOT_IN_USE">Hors service (NOT_IN_USE)</option>
                      <option value="OUT_OF_STOCK">Rupture de stock (OUT_OF_STOCK)</option>
                    </select>
                  </div>
                }

                <!-- IMAGE UPLOAD -->
                <div class="form-group">
                  <label>Image du produit</label>
                  <input type="file" (change)="onFileSelected($event)" accept="image/*" class="file-input" [disabled]="isLockedField('image')" />
                  @if (imagePreview) {
                    <img [src]="imagePreview" class="preview-image" alt="Aperçu" />
                  }
                </div>

                <!-- RECIPE BUILDER (For FOOD type products) -->
                @if (form.type === 'food') {
                  <div class="recipe-section">
                    <div class="recipe-header">
                      <h4>Recette (Ingrédients)</h4>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="addRecipeIngredient()" [disabled]="isLockedField('recipe')">
                        + Ajouter ingrédient
                      </button>
                    </div>

                    @if (recipeIngredients.length === 0) {
                      <p class="recipe-empty">Aucun ingrédient ajouté à la recette.</p>
                    } @else {
                      @for (ing of recipeIngredients; track $index; let idx = $index) {
                        <div class="ingredient-row">
                          <select [(ngModel)]="ing.product_id" name="ing_id_{{idx}}" required [disabled]="isLockedField('recipe')">
                            <option value="0">-- Choisir --</option>
                            @for (avail of availableIngredients; track avail.id) {
                              <option [value]="avail.id">{{ avail.name }}</option>
                            }
                          </select>

                          <input type="number" step="0.01" [(ngModel)]="ing.quantity" name="ing_qty_{{idx}}" placeholder="Qté" required [disabled]="isLockedField('recipe')" />

                          <select [(ngModel)]="ing.unit" name="ing_unit_{{idx}}" required [disabled]="isLockedField('recipe')">
                            <option value="piece">Pièce</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="liter">Litre</option>
                            <option value="ml">ml</option>
                          </select>

                          <button type="button" class="btn-remove" (click)="removeRecipeIngredient(idx)" [disabled]="isLockedField('recipe')">
                            ❌
                          </button>
                        </div>
                      }
                    }
                  </div>
                }

                <!-- ACTIONS -->
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">
                    Annuler
                  </button>

                  <button type="submit" class="btn btn-primary">
                    {{ editing ? 'Modifier' : 'Créer' }}
                  </button>
                </div>

              </form>

            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 0;
    }

    .page-header h2 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .filter-select {
      padding: 10px 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      color: #334155;
      outline: none;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-select:hover { border-color: #b22222; }
    .filter-select:focus { border-color: #b22222; box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1); }

    .card {
      background: #ffffff;
      border-radius: 22px;
      padding: 24px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(178, 34, 34, 0.05);
    }

    .table-wrap { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      text-align: left;
      padding: 14px 16px;
      background: linear-gradient(135deg, #fff8f8 0%, #ffffff 100%);
      color: #6b7280;
      font-weight: 700;
      border-bottom: 2px solid #f1f1f1;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.03em;
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      color: #334155;
      transition: background 0.2s ease;
    }

    tr:hover td { background: rgba(178, 34, 34, 0.02); }

    .product-name {
      font-weight: 600;
      color: #111827;
    }

    .product-icon {
      font-size: 20px;
    }

    .table-product-img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 6px 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .btn-icon:hover {
      background: rgba(178, 34, 34, 0.1);
      transform: scale(1.1);
    }

    .btn-icon.danger:hover {
      background: rgba(220, 38, 38, 0.1);
    }

    .badge {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
    }

    .badge.type {
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
      color: #b22222;
      border: 1px solid rgba(178, 34, 34, 0.1);
    }

    .status-badge.active {
      background: #e6f4ea;
      color: #137333;
    }

    .status-badge.inactive {
      background: #fce8e6;
      color: #c5221f;
    }

    .approval-approved {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      color: #16a34a;
      border: 1px solid rgba(22, 163, 74, 0.1);
    }

    .approval-pending {
      background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
      color: #d97706;
      border: 1px solid rgba(217, 119, 6, 0.1);
    }

    .approval-rejected {
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.1);
    }

    .btn {
      padding: 10px 22px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #fff;
      box-shadow: 0 8px 16px rgba(178, 34, 34, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(178, 34, 34, 0.3);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #334155;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 8px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: #ffffff;
      border-radius: 24px;
      padding: 32px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(178, 34, 34, 0.1);
    }

    .modal h3 {
      margin: 0 0 24px;
      font-size: 22px;
      font-weight: 700;
      color: #111827;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 18px;
    }

    .form-group label {
      font-size: 14px;
      font-weight: 700;
      color: #374151;
      text-transform: capitalize;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 12px 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      color: #111827;
      transition: all 0.2s ease;
    }

    .form-group input:disabled,
    .form-group select:disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .form-group input::placeholder,
    .form-group textarea::placeholder {
      color: #9ca3af;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #b22222;
      box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
      background: #fff9f9;
    }

    .file-input {
      padding: 8px 10px !important;
    }

    .preview-image {
      max-height: 120px;
      object-fit: contain;
      border-radius: 8px;
      margin-top: 8px;
      border: 1px solid #e5e7eb;
      align-self: flex-start;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .recipe-section {
      margin-top: 20px;
      border-top: 1.5px solid #f3f4f6;
      padding-top: 20px;
    }

    .recipe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .recipe-header h4 {
      margin: 0;
      font-size: 16px;
      color: #1f2937;
      font-weight: 700;
    }

    .recipe-empty {
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
    }

    .ingredient-row {
      display: grid;
      grid-template-columns: 2.5fr 1fr 1.5fr auto;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
    }

    .ingredient-row select, .ingredient-row input {
      padding: 10px !important;
      font-size: 13px !important;
    }

    .btn-remove {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      cursor: pointer;
      padding: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-remove:hover {
      background: #fee2e2;
      transform: scale(1.05);
    }

    .btn-remove:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 28px;
      padding-top: 24px;
      border-top: 1px solid #f3f4f6;
    }
  `]
})

export class ProductsComponent implements OnInit {

  products: Product[] = [];
  categories: Category[] = [];
  filteredProducts: Product[] = [];

  filterType = '';
  loading = true;

  showModal = false;
  editing = false;
  editId: number | null = null;

  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  selectedProductApprovalStatus: 'pending' | 'approved' | 'rejected' = 'pending';

  recipeIngredients: { product_id: number; quantity: number; unit: string }[] = [];

  get userRole(): string {
    return this.auth.getUserRole() || '';
  }

  get isChefCuisine(): boolean {
    return this.userRole === 'CHEF_CUISINE';
  }

  get isChefMagasin(): boolean {
    return this.userRole === 'CHEF_MAGASIN';
  }

  get isRestrictedRole(): boolean {
    return this.isChefCuisine || this.isChefMagasin;
  }

  form: any = {
    name: '',
    type: 'commercial',
    category_id: '',
    price: 0,
    description: '',
    allergens_text: '',
    expiration_date: '',
    usage_status: 'IN_USE'
  };

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.load();
    this.loadCategories();
  }

  // ================= PRODUCTS =================
  load(): void {
    this.loading = true;
    this.api.get<any>('products').subscribe({
      next: res => {
        this.products = res.data || res;
        this.applyFilter();
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  // ================= CATEGORIES =================
  loadCategories(): void {
    this.api.get<any>('categories').subscribe(res => {
      this.categories = res.data || res;
    });
  }

  get formCategories(): Category[] {
    if (this.isChefCuisine) {
      return this.categories.filter(c => c.type === 'food');
    }
    if (this.isChefMagasin) {
      return this.categories.filter(c => c.type === 'commercial' || c.type === 'matiere_premiere');
    }
    return this.categories;
  }

  get availableIngredients(): Product[] {
    return this.products.filter(p => p.type === 'commercial' || p.type === 'matiere_premiere');
  }

  getImageUrl(path: string): string {
    const apiHost = environment.apiUrl.replace('/api', '');
    return `${apiHost}/storage/${path}`;
  }

  // ================= FILTER =================
  applyFilter(): void {
    this.filteredProducts = this.filterType
      ? this.products.filter(p => p.type === this.filterType)
      : [...this.products];
  }

  // ================= MODAL =================
  openModal(): void {
    this.resetForm();
    this.editing = false;
    this.showModal = true;
  }

  editProduct(p: Product): void {
    this.loading = true;
    this.api.get<any>(`products/${p.id}`).subscribe({
      next: res => {
        const fullProduct = res.data || res;
        this.form = {
          name: fullProduct.name,
          type: fullProduct.type,
          category_id: fullProduct.category_id,
          price: fullProduct.price,
          description: fullProduct.description || '',
          allergens_text: fullProduct.allergens?.join(', ') || '',
          expiration_date: fullProduct.expiration_date || '',
          usage_status: fullProduct.is_active ? 'IN_USE' : 'NOT_IN_USE'
        };

        this.selectedProductApprovalStatus = fullProduct.approval_status;
        this.imagePreview = fullProduct.image ? this.getImageUrl(fullProduct.image) : null;
        this.selectedImageFile = null;

        this.recipeIngredients = (fullProduct.ingredients || []).map((ing: any) => ({
          product_id: ing.id,
          quantity: ing.pivot?.quantity || 1,
          unit: ing.pivot?.unit || 'piece'
        }));

        this.editId = fullProduct.id;
        this.editing = true;
        this.showModal = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de charger les détails du produit.',
          icon: 'error',
          confirmButtonColor: '#b22222'
        });
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetForm(): void {
    this.form = {
      name: '',
      type: this.isChefCuisine ? 'food' : 'commercial',
      category_id: '',
      price: 0,
      description: '',
      allergens_text: '',
      expiration_date: '',
      usage_status: 'IN_USE'
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.recipeIngredients = [];
    this.selectedProductApprovalStatus = 'pending';
    this.editId = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  isLockedField(fieldName: string): boolean {
    if (!this.editing) return false;
    // If the product is approved, lock all fields except description and usage_status for restricted roles
    if (this.selectedProductApprovalStatus === 'approved') {
      if (this.isRestrictedRole) {
        return fieldName !== 'description' && fieldName !== 'usage_status' && fieldName !== 'image';
      }
    }
    return false;
  }

  // ================= RECIPE MANAGEMENT =================
  addRecipeIngredient(): void {
    this.recipeIngredients.push({ product_id: 0, quantity: 1, unit: 'piece' });
  }

  removeRecipeIngredient(index: number): void {
    this.recipeIngredients.splice(index, 1);
  }

  // ================= SAVE =================
  save(): void {
    if (!this.form.name || !this.form.type || !this.form.category_id) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir tous les champs obligatoires.',
        icon: 'warning',
        confirmButtonColor: '#b22222'
      });
      return;
    }

    if (this.form.type === 'food' && this.recipeIngredients.length === 0) {
      Swal.fire({
        title: 'Recette manquante',
        text: 'Un produit Food doit contenir au moins un ingrédient dans sa recette.',
        icon: 'warning',
        confirmButtonColor: '#b22222'
      });
      return;
    }

    if (this.form.type === 'food' && this.recipeIngredients.some(ing => ing.product_id === 0)) {
      Swal.fire({
        title: 'Recette incomplète',
        text: 'Veuillez sélectionner un produit valide pour chaque ingrédient.',
        icon: 'warning',
        confirmButtonColor: '#b22222'
      });
      return;
    }

    const formData = new FormData();
    formData.append('name', this.form.name);
    formData.append('type', this.form.type);
    formData.append('category_id', String(this.form.category_id));
    formData.append('description', this.form.description || '');

    if (!this.isRestrictedRole) {
      formData.append('price', String(this.form.price || 0));
      formData.append('expiration_date', this.form.expiration_date || '');
      if (this.form.allergens_text) {
        const allergens = this.form.allergens_text.split(',').map((a: string) => a.trim()).filter(Boolean);
        allergens.forEach((a: string) => formData.append('allergens[]', a));
      }
    }

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }

    // In approved mode, the restricted roles might change usage_status
    if (this.editing && this.selectedProductApprovalStatus === 'approved') {
      formData.append('usage_status', this.form.usage_status || 'IN_USE');
    }

    if (this.form.type === 'food') {
      this.recipeIngredients.forEach((ing, index) => {
        formData.append(`ingredients[${index}][product_id]`, String(ing.product_id));
        formData.append(`ingredients[${index}][quantity]`, String(ing.quantity));
        formData.append(`ingredients[${index}][unit]`, ing.unit || 'piece');
      });
    }

    const req = this.editing && this.editId
      ? this.api.put(`products/${this.editId}`, formData)
      : this.api.post('products', formData);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès !',
          text: this.editing ? 'Le produit a été modifié.' : 'Le produit a été créé.',
          icon: 'success',
          confirmButtonColor: '#b22222'
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue lors de la sauvegarde.',
          icon: 'error',
          confirmButtonColor: '#b22222'
        });
      }
    });
  }

  // ================= DELETE =================
  deleteProduct(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`products/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'Le produit a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#b22222'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Erreur lors de la suppression.',
              icon: 'error',
              confirmButtonColor: '#b22222'
            });
          }
        });
      }
    });
  }
}
