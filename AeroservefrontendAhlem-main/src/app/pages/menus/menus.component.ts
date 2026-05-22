import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Menu, Product, Category } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="cards" />
    } @else {
      <div class="page">
        <div class="page-header">
          <h2>Menus hebdomadaires</h2>
          <button class="btn btn-primary" (click)="openModal()">+ Nouveau menu</button>
        </div>

        <div class="cards-grid">
          @for (menu of menus; track menu.id) {
            <div class="menu-card" [class.active]="menu.is_active">
              <div class="menu-header">
                <span class="menu-icon">🍽️</span>
                <span class="menu-status" [class.active]="menu.is_active">{{ menu.is_active ? 'Actif' : 'Inactif' }}</span>
              </div>
              <h3>{{ menu.name }}</h3>
              <p class="menu-dates">{{ menu.week_start | date:'dd/MM' }} - {{ menu.week_end | date:'dd/MM/yyyy' }}</p>
              <p class="menu-items">{{ menu.items?.length || 0 }} plats planifiés</p>

              <!-- shop-style courses summary -->
              <div class="menu-preview-courses">
                <span class="course-pill">🍲 Soupes: {{ getCourseCount(menu, 'breakfast') }}</span>
                <span class="course-pill">🥗 Salades: {{ getCourseCount(menu, 'snack') }}</span>
                <span class="course-pill">🥩 Plats: {{ getCourseCount(menu, 'lunch') }}</span>
                <span class="course-pill">🍰 Desserts: {{ getCourseCount(menu, 'dinner') }}</span>
              </div>

              <div class="menu-actions">
                <button class="btn-sm" (click)="editMenu(menu)">Modifier</button>
                <button class="btn-sm danger" (click)="deleteMenu(menu.id)">Supprimer</button>
              </div>
            </div>
          }
        </div>

        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal" (click)="$event.stopPropagation()">
              <h3>{{ editing ? 'Modifier' : 'Nouveau' }} menu</h3>
              <form (ngSubmit)="save()">
                <div class="form-group">
                  <label>Nom du menu</label>
                  <input [(ngModel)]="form.name" name="name" placeholder="Ex: Menu d'été Semaine 21" required />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Début semaine</label>
                    <input type="date" [(ngModel)]="form.week_start" name="week_start" required />
                  </div>
                  <div class="form-group">
                    <label>Fin semaine</label>
                    <input type="date" [(ngModel)]="form.week_end" name="week_end" required />
                  </div>
                </div>
                <div class="form-group">
                  <label><input type="checkbox" [(ngModel)]="form.is_active" name="is_active" /> Actif</label>
                </div>

                <!-- WEEKLY PLANNER BUILDER (Dishes by Day/Course) -->
                <div class="dishes-section">
                  <div class="dishes-header">
                    <h4>Plats du menu hebdomadaire</h4>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="addMenuItem()">
                      + Ajouter un plat
                    </button>
                  </div>

                  @if (!form.items || form.items.length === 0) {
                    <p class="dishes-empty">Aucun plat planifié pour ce menu.</p>
                  } @else {
                    @for (item of form.items; track $index; let idx = $index) {
                      <div class="dish-row">
                        <!-- Food Product Select -->
                        <select [(ngModel)]="item.product_id" name="item_prod_{{idx}}" (ngModelChange)="onDishSelected(item.product_id)" required>
                          <option value="0">-- Choisir un plat --</option>
                          @for (p of foodProducts; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>

                        <!-- Day Select -->
                        <select [(ngModel)]="item.day_of_week" name="item_day_{{idx}}" required>
                          <option value="monday">Lundi</option>
                          <option value="tuesday">Mardi</option>
                          <option value="wednesday">Mercredi</option>
                          <option value="thursday">Jeudi</option>
                          <option value="friday">Vendredi</option>
                          <option value="saturday">Samedi</option>
                          <option value="sunday">Dimanche</option>
                        </select>

                        <!-- Meal Type (Mapped to shop-style courses) -->
                        <select [(ngModel)]="item.meal_type" name="item_type_{{idx}}" required>
                          <option value="breakfast">🍲 Soupe (Breakfast)</option>
                          <option value="snack">🥗 Salade (Snack)</option>
                          <option value="lunch">🥩 Plat Principal (Lunch)</option>
                          <option value="dinner">🍰 Dessert (Dinner)</option>
                        </select>

                        <button type="button" class="btn-remove" (click)="removeMenuItem(idx)">
                          ❌
                        </button>
                      </div>
                    }
                  }
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">{{ editing ? 'Modifier' : 'Créer' }}</button>
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
    .page-header { display: flex; justify-content: space-between; align-items: center; padding: 0; }
    .page-header h2 { margin: 0; font-size: 26px; font-weight: 700; color: #0f172a; }
    
    .cards-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
      gap: 20px; 
    }
    
    .menu-card { 
      background: #ffffff; 
      border-radius: 20px; 
      padding: 22px; 
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 2px solid transparent;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    .menu-card:hover {
      transform: translateY(-4px);
      border-color: #b22222;
      box-shadow: 0 20px 40px rgba(178, 34, 34, 0.15);
    }
    
    .menu-card.active { 
      border-color: #b22222;
      background: linear-gradient(135deg, #fff9f9 0%, #ffffff 100%);
    }
    
    .menu-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 12px; 
    }
    
    .menu-icon { 
      font-size: 28px; 
    }
    
    .menu-status { 
      font-size: 11px; 
      font-weight: 700; 
      padding: 5px 10px; 
      border-radius: 999px; 
      background: #f3f4f6; 
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    
    .menu-status.active { 
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      color: #16a34a;
      border: 1px solid rgba(22, 163, 74, 0.1);
    }
    
    .menu-card h3 { 
      margin: 0 0 8px; 
      font-size: 18px; 
      font-weight: 700;
      color: #111827;
    }
    
    .menu-dates { 
      font-size: 13px; 
      color: #6b7280; 
      margin: 4px 0;
      font-weight: 500;
    }
    
    .menu-items { 
      font-size: 12px; 
      color: #9ca3af; 
      margin: 2px 0 12px;
    }

    .menu-preview-courses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 18px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }

    .course-pill {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .menu-actions { 
      display: flex; 
      gap: 8px; 
      margin-top: auto;
    }
    
    .btn-sm { 
      flex: 1;
      padding: 10px 14px; 
      border-radius: 10px; 
      font-size: 13px; 
      font-weight: 700; 
      cursor: pointer; 
      border: none;
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #fff;
      transition: all 0.2s ease;
    }
    
    .btn-sm:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(178, 34, 34, 0.2);
    }
    
    .btn-sm.danger { 
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
      max-width: 650px;
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
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .form-group label input[type="checkbox"] {
      cursor: pointer;
    }
    
    .form-group input, 
    .form-group select { 
      padding: 12px 14px; 
      border: 1.5px solid #e5e7eb; 
      border-radius: 10px; 
      font-size: 14px; 
      outline: none;
      font-family: inherit;
      color: #111827;
      transition: all 0.2s ease;
    }
    
    .form-group input::placeholder,
    .form-group select::placeholder {
      color: #9ca3af;
    }
    
    .form-group input:focus, 
    .form-group select:focus { 
      border-color: #b22222;
      box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
      background: #fff9f9;
    }
    
    .form-row { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 14px; 
    }

    .dishes-section {
      margin-top: 20px;
      border-top: 1.5px solid #f3f4f6;
      padding-top: 20px;
    }

    .dishes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .dishes-header h4 {
      margin: 0;
      font-size: 16px;
      color: #1f2937;
      font-weight: 700;
    }

    .dishes-empty {
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
    }

    .dish-row {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1.5fr auto;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
    }

    .dish-row select {
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
export class MenusComponent implements OnInit {
  menus: Menu[] = [];
  allProducts: Product[] = [];
  foodProducts: Product[] = [];
  recipeMap: { [productId: number]: any[] } = {};

  loading = true;
  showModal = false;
  editing = false;
  editId = 0;
  form: any = { name: '', week_start: '', week_end: '', is_active: true, items: [] };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadAllProducts();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('menus').subscribe({
      next: res => {
        this.menus = res.data || res;
        this.loading = false;
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  loadAllProducts(): void {
    this.api.get<any>('products').subscribe(res => {
      this.allProducts = res.data || res;
      // Approved food products for menu options
      this.foodProducts = this.allProducts.filter(p => p.type === 'food' && p.approval_status === 'approved');
      
      // Load detailed ingredients lists for recipe map
      this.foodProducts.forEach(fp => {
        this.recipeMap[fp.id] = fp.ingredients || [];
        if (!fp.ingredients) {
          this.api.get<any>(`products/${fp.id}`).subscribe(subRes => {
            const detailed = subRes.data || subRes;
            this.recipeMap[fp.id] = detailed.ingredients || [];
          });
        }
      });
    });
  }

  getCourseCount(menu: Menu, courseType: 'breakfast' | 'snack' | 'lunch' | 'dinner'): number {
    return (menu.items || []).filter(item => item.meal_type === courseType).length;
  }

  openModal(): void {
    this.form = { name: '', week_start: '', week_end: '', is_active: true, items: [] };
    this.editing = false;
    this.showModal = true;
  }

  editMenu(m: Menu): void {
    this.form = {
      name: m.name,
      week_start: m.week_start,
      week_end: m.week_end,
      is_active: m.is_active,
      items: (m.items || []).map((item: any) => ({
        product_id: item.product_id,
        day_of_week: item.day_of_week,
        meal_type: item.meal_type || 'lunch'
      }))
    };
    this.editId = m.id;
    this.editing = true;
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  // ================= PLANNER BUILDER =================
  addMenuItem(): void {
    if (!this.form.items) {
      this.form.items = [];
    }
    this.form.items.push({ product_id: 0, day_of_week: 'monday', meal_type: 'lunch' });
  }

  removeMenuItem(index: number): void {
    this.form.items.splice(index, 1);
  }

  onDishSelected(productId: any): void {
    const id = Number(productId);
    if (id && !this.recipeMap[id]) {
      this.api.get<any>(`products/${id}`).subscribe(res => {
        const detailed = res.data || res;
        this.recipeMap[id] = detailed.ingredients || [];
      });
    }
  }

  // ================= STOCK VALIDATION =================
  validateStockSufficiency(): { sufficient: boolean; details: string[]; insufficientItems: any[] } {
    const selectedItems = this.form.items || [];
    if (selectedItems.length === 0) {
      return { sufficient: true, details: [], insufficientItems: [] };
    }

    // Default portion target (50 portions target for airport scale catering)
    const PORTION_MULTIPLIER = 50;
    const aggregatedIngredients: { [ingredientId: number]: { required: number; name: string } } = {};

    for (const item of selectedItems) {
      const prodId = Number(item.product_id);
      if (!prodId) continue;
      const recipe = this.recipeMap[prodId] || [];
      for (const ing of recipe) {
        const ingId = Number(ing.id);
        const qtyPerPortion = Number(ing.pivot?.quantity || ing.quantity || 0);
        const totalNeeded = qtyPerPortion * PORTION_MULTIPLIER;

        if (!aggregatedIngredients[ingId]) {
          aggregatedIngredients[ingId] = {
            required: 0,
            name: ing.name || `Ingrédient #${ingId}`
          };
        }
        aggregatedIngredients[ingId].required += totalNeeded;
      }
    }

    const details: string[] = [];
    const insufficientItems: any[] = [];
    let sufficient = true;

    for (const ingIdStr of Object.keys(aggregatedIngredients)) {
      const ingId = Number(ingIdStr);
      const req = aggregatedIngredients[ingId];
      
      const rawProd = this.allProducts.find(p => p.id === ingId);
      const currentStock = Number(rawProd?.stock?.quantity || 0);

      if (currentStock < req.required) {
        sufficient = false;
        insufficientItems.push({
          id: ingId,
          name: req.name,
          required: req.required,
          available: currentStock,
          unit: rawProd?.stock?.unit || 'pc'
        });
        details.push(
          `${req.name} : Requis ${req.required.toFixed(2)} ${rawProd?.stock?.unit || 'pc'}, En stock ${currentStock.toFixed(2)} ${rawProd?.stock?.unit || 'pc'}`
        );
      }
    }

    return { sufficient, details, insufficientItems };
  }

  // ================= SAVE =================
  save(): void {
    if (!this.form.name || !this.form.week_start || !this.form.week_end) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez renseigner le nom et les dates de validité du menu.',
        icon: 'warning',
        confirmButtonColor: '#b22222'
      });
      return;
    }

    // 1. Run Stock Sufficiency Validation
    const stockCheck = this.validateStockSufficiency();

    if (!stockCheck.sufficient) {
      const missingText = stockCheck.details.join('<br>');
      Swal.fire({
        title: 'Planification Bloquée : Stock Insuffisant',
        html: `<p style="font-size: 14px; color: #4b5563;">La planification de ce menu hebdomadaire nécessite des ingrédients manquants en réserve pour assurer 50 portions :</p>
               <div style="text-align: left; background: #fff1f2; border: 1px solid #fda4af; padding: 12px; border-radius: 10px; margin-top: 12px; font-size: 13px; color: #9f1239; font-family: monospace; max-height: 180px; overflow-y: auto;">
                 ${missingText}
               </div>
               <p style="font-size: 13px; color: #b22222; margin-top: 12px; font-weight: bold;">Une alerte de réapprovisionnement automatique a été envoyée au Chef Magasin.</p>`,
        icon: 'error',
        confirmButtonColor: '#b22222',
        confirmButtonText: 'Fermer'
      });

      // 2. Auto-generate alert comments to Chef Magasin on insufficient ingredients
      stockCheck.insufficientItems.forEach(item => {
        const commentBody = `⚠️ [ALERTE RUPTURE D'INGRÉDIENT] L'ingrédient "${item.name}" est insuffisant pour planifier le menu "${this.form.name}". Requis: ${item.required.toFixed(2)} ${item.unit}, En stock: ${item.available.toFixed(2)} ${item.unit}. Veuillez initier un réapprovisionnement immédiat !`;
        
        this.api.post('comments', {
          commentable_type: 'product',
          commentable_id: item.id,
          body: commentBody
        }).subscribe({
          next: () => console.log(`Posted automatic stock insufficiency warning comment for product #${item.id}`),
          error: (e) => console.error(`Error posting automatic stock warning:`, e)
        });
      });

      return; // Force prevent the save action!
    }

    // If stock is sufficient, save the menu
    const payload = {
      name: this.form.name,
      week_start: this.form.week_start,
      week_end: this.form.week_end,
      is_active: this.form.is_active,
      items: (this.form.items || []).filter((item: any) => Number(item.product_id) > 0)
    };

    const req = this.editing
      ? this.api.put(`menus/${this.editId}`, payload)
      : this.api.post('menus', payload);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Menu Sauvegardé !',
          text: this.editing ? 'Le menu a été mis à jour avec succès.' : 'Le menu a été créé avec succès.',
          icon: 'success',
          confirmButtonColor: '#b22222'
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue lors de l\'enregistrement du menu.',
          icon: 'error',
          confirmButtonColor: '#b22222'
        });
      }
    });
  }

  // ================= DELETE =================
  deleteMenu(id: number): void {
    Swal.fire({
      title: 'Supprimer ce menu ?',
      text: 'Tous les plats planifiés y seront définitivement retirés !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`menus/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'Le menu a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#b22222'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Erreur lors de la suppression du menu.',
              icon: 'error',
              confirmButtonColor: '#b22222'
            });
          }
        });
      }
    });
  }
}
