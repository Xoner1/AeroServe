import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Menu, Product, Category } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import Swal from 'sweetalert2';

interface DayMenu {
  breakfast: number; // Soupe
  snack: number;     // Salade
  lunch: number;     // Plat principal
  dinner: number;    // Dessert
}

interface WeekPlan {
  [key: string]: DayMenu;
  monday: DayMenu;
  tuesday: DayMenu;
  wednesday: DayMenu;
  thursday: DayMenu;
  friday: DayMenu;
  saturday: DayMenu;
  sunday: DayMenu;
}

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="cards" />
    } @else {
      <div class="page">
        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Menus Hebdomadaires</h2>
            <p class="subtitle">Planifiez les repas de la semaine selon le format réglementaire</p>
          </div>
          <button class="btn btn-primary" (click)="openModal()">+ Nouveau Menu</button>
        </div>

        <!-- ─── LIST VIEW ─── -->
        <div class="cards-grid">
          @for (menu of menus; track menu.id) {
            <div class="menu-card" [class.active]="menu.is_active">
              <div class="menu-header">
                <span class="menu-icon"></span>
                <span class="menu-status" [class.active]="menu.is_active">
                  {{ menu.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
              <h3>{{ menu.name }}</h3>
              <p class="menu-dates"> {{ menu.week_start | date:'dd/MM' }} au {{ menu.week_end | date:'dd/MM/yyyy' }}</p>
              
              <div class="menu-preview-courses">
                <span class="course-pill"> Soupes: {{ getCourseCount(menu, 'breakfast') }}</span>
                <span class="course-pill"> Salades: {{ getCourseCount(menu, 'snack') }}</span>
                <span class="course-pill"> Plats: {{ getCourseCount(menu, 'lunch') }}</span>
                <span class="course-pill"> Desserts: {{ getCourseCount(menu, 'dinner') }}</span>
              </div>

              <div class="menu-actions">
                <button class="btn-sm" (click)="editMenu(menu)">Modifier</button>
                <button class="btn-sm danger" (click)="deleteMenu(menu.id)">Supprimer</button>
              </div>
            </div>
          }
          @if (menus.length === 0) {
            <div class="card" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #A8C5A0;">
              Aucun menu hebdomadaire enregistré. Cliquez sur "+ Nouveau Menu" pour commencer.
            </div>
          }
        </div>

        <!-- ─── ADD / EDIT MODAL ─── -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal modal-wide" (click)="$event.stopPropagation()">
              
              <div class="modal-header">
                <h3>{{ editing ? 'Modifier le Menu Hebdomadaire' : 'Nouveau Menu Hebdomadaire' }}</h3>
                <button class="btn-close-x" (click)="closeModal()">✕</button>
              </div>

              <form (ngSubmit)="save()">
                <div class="form-section">
                  <h4> Informations Générales</h4>
                  <div class="form-group">
                    <label>Nom du Menu *</label>
                    <input [(ngModel)]="form.name" name="name" placeholder="Ex: Menu Hiver - Semaine 45" required />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Début de la semaine *</label>
                      <input type="date" [(ngModel)]="form.week_start" name="week_start" required />
                    </div>
                    <div class="form-group">
                      <label>Fin de la semaine *</label>
                      <input type="date" [(ngModel)]="form.week_end" name="week_end" required />
                    </div>
                  </div>
                  <div class="form-group row-checkbox">
                    <label class="chk-label">
                      <input type="checkbox" [(ngModel)]="form.is_active" name="is_active" />
                      <span>Définir comme menu actif de la semaine</span>
                    </label>
                  </div>
                </div>

                <!-- 7-DAY REDESIGNED course SLOT GRID -->
                <div class="form-section">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4> Planificateur Hebdomadaire Obligatoire</h4>
                    <button type="button" class="btn-check-stock" (click)="checkStockUI()">
                       Vérifier les stocks
                    </button>
                  </div>
                  
                  <div class="days-tabs">
                    @for (day of daysList; track day.key) {
                      <button type="button" class="day-tab-btn" [class.active]="activeTab === day.key" (click)="activeTab = day.key">
                        {{ day.label }}
                      </button>
                    }
                  </div>

                  <div class="day-slot-card">
                    <p style="font-size:12.5px; color:#A8C5A0; margin-top:0; margin-bottom:14px; font-weight:600;">
                      Saisissez les plats obligatoires pour le <strong>{{ getDayLabel(activeTab) }}</strong> :
                    </p>

                    <div class="course-slot">
                      <div class="slot-label"> Soupe (Breakfast) *</div>
                      <select [(ngModel)]="weekPlan[activeTab].breakfast" name="breakfast_{{activeTab}}" (ngModelChange)="onDishSelected(weekPlan[activeTab].breakfast)" required>
                        <option [value]="0">-- Sélectionner une Soupe --</option>
                        @for (p of foodProducts; track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                    </div>

                    <div class="course-slot">
                      <div class="slot-label"> Salade (Snack) *</div>
                      <select [(ngModel)]="weekPlan[activeTab].snack" name="snack_{{activeTab}}" (ngModelChange)="onDishSelected(weekPlan[activeTab].snack)" required>
                        <option [value]="0">-- Sélectionner une Salade --</option>
                        @for (p of foodProducts; track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                    </div>

                    <div class="course-slot">
                      <div class="slot-label"> Plat Principal (Lunch) *</div>
                      <select [(ngModel)]="weekPlan[activeTab].lunch" name="lunch_{{activeTab}}" (ngModelChange)="onDishSelected(weekPlan[activeTab].lunch)" required>
                        <option [value]="0">-- Sélectionner un Plat Principal --</option>
                        @for (p of foodProducts; track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                    </div>

                    <div class="course-slot">
                      <div class="slot-label"> Dessert (Dinner) *</div>
                      <select [(ngModel)]="weekPlan[activeTab].dinner" name="dinner_{{activeTab}}" (ngModelChange)="onDishSelected(weekPlan[activeTab].dinner)" required>
                        <option [value]="0">-- Sélectionner un Dessert --</option>
                        @for (p of foodProducts; track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">{{ editing ? 'Sauvegarder' : 'Créer le Menu' }}</button>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EDE9E2; padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 28px; font-weight: 800; color: #1A1D1B; }
    .subtitle { margin: 4px 0 0 0; font-size: 14px; color: #A8C5A0; }
    
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    
    .menu-card { 
      background: #ffffff; 
      border-radius: 20px; 
      padding: 24px; 
      box-shadow: 0 10px 25px rgba(15,23,42,.03);
      border: 2px solid transparent;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
    }
    
    .menu-card:hover {
      transform: translateY(-4px);
      border-color: #2C3E35;
      box-shadow: 0 20px 40px rgba(29, 35, 31,.12);
    }
    
    .menu-card.active { 
      border-color: #2C3E35;
      background: linear-gradient(135deg, #fffcfc 0%, #ffffff 100%);
    }
    
    .menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .menu-icon { font-size: 28px; }
    .menu-status { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 99px; background: #D8D2C8; color: #4A4D4B; text-transform: uppercase; letter-spacing: 0.05em; }
    .menu-status.active { background: #E8F0EB; color: #15803d; }
    
    .menu-card h3 { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #1A1D1B; }
    .menu-dates { font-size: 13.5px; color: #4A4D4B; margin: 4px 0; font-weight: 600; }
    
    .menu-preview-courses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0 20px;
      background: #EDE9E2;
      padding: 12px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 700;
      color: #4A4D4B;
    }
    .course-pill { display: flex; align-items: center; gap: 4px; }
    
    .menu-actions { display: flex; gap: 8px; margin-top: auto; }
    .btn-sm { flex: 1; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; background: #EDE9E2; color: #4A4D4B; transition: all .2s; }
    .btn-sm:hover { background: #D8D2C8; }
    .btn-sm.danger { background: #F5E4E4; color: #b91c1c; }
    .btn-sm.danger:hover { background: #fecdd3; }

    /* Button styles */
    .btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, #2C3E35, #1A1D1B); color: #fff; box-shadow: 0 4px 14px rgba(29, 35, 31,.25); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29, 35, 31,.35); }
    .btn-secondary { background: #EDE9E2; color: #4A4D4B; }
    .btn-secondary:hover { background: #D8D2C8; }
    
    .btn-check-stock { border: none; background: #eff6ff; color: #6B8F71; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 12.5px; transition: all .2s; }
    .btn-check-stock:hover { background: #dbeafe; }

    /* Modal Grid Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.6); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
    .modal { background: #fff; border-radius: 24px; padding: 28px; width: 100%; max-width: 680px; max-height: 88vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,.25); }
    .modal-wide { max-width: 780px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #1A1D1B; }
    .btn-close-x { background: none; border: none; font-size: 18px; color: #A8C5A0; cursor: pointer; font-weight: bold; }

    .form-section { padding: 18px; background: #fffcfc; border-radius: 16px; border: 1.5px solid #F5E4E4; margin-bottom: 20px; }
    .form-section h4 { margin: 0 0 14px 0; font-size: 14.5px; font-weight: 800; color: #1A1D1B; display: flex; align-items: center; gap: 6px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 13px; font-weight: 700; color: #4A4D4B; }
    .form-group input, .form-group select { padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; }
    .form-group input:focus, .form-group select:focus { border-color: #2C3E35; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .row-checkbox { flex-direction: row; align-items: center; gap: 8px; }
    .chk-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700 !important; color: #1A1D1B !important; }
    .chk-label input { width: 18px; height: 18px; cursor: pointer; }

    /* Redesigned 7-Day Tabs */
    .days-tabs { display: flex; overflow-x: auto; gap: 6px; margin-bottom: 16px; padding-bottom: 4px; border-bottom: 2px solid #EDE9E2; }
    .day-tab-btn { border: none; background: #EDE9E2; color: #A8C5A0; font-weight: 700; font-size: 12px; padding: 8px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; transition: all .2s; }
    .day-tab-btn:hover { background: #EDE9E2; color: #1A1D1B; }
    .day-tab-btn.active { background: #2C3E35; color: #fff; }

    .day-slot-card { background: #fcfcfc; border: 1.5px dashed #D8D2C8; border-radius: 14px; padding: 16px; }
    .course-slot { display: grid; grid-template-columns: 1.5fr 3fr; gap: 14px; align-items: center; margin-bottom: 12px; }
    .slot-label { font-size: 12.5px; font-weight: 750; color: #4A4D4B; }
    .course-slot select { width: 100%; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #EDE9E2; }
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
  form: any = { name: '', week_start: '', week_end: '', is_active: true };

  activeTab = 'monday';
  daysList = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  weekPlan: WeekPlan = this.createEmptyWeekPlan();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadAllProducts();
  }

  createEmptyWeekPlan(): WeekPlan {
    return {
      monday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      tuesday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      wednesday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      thursday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      friday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      saturday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 },
      sunday: { breakfast: 0, snack: 0, lunch: 0, dinner: 0 }
    };
  }

  getDayLabel(key: string): string {
    const found = this.daysList.find(d => d.key === key);
    return found ? found.label : key;
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
      this.foodProducts = this.allProducts.filter(p => p.type === 'food' && p.approval_status === 'approved');
      
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
    this.form = { name: '', week_start: '', week_end: '', is_active: true };
    this.weekPlan = this.createEmptyWeekPlan();
    this.editing = false;
    this.activeTab = 'monday';
    this.showModal = true;
  }

  editMenu(m: Menu): void {
    this.form = {
      name: m.name,
      week_start: m.week_start,
      week_end: m.week_end,
      is_active: m.is_active
    };
    this.editId = m.id;
    this.editing = true;
    this.activeTab = 'monday';

    // Populate weekPlan from database items
    this.weekPlan = this.createEmptyWeekPlan();
    if (m.items) {
      m.items.forEach((item: any) => {
        const day = item.day_of_week as keyof WeekPlan;
        const type = item.meal_type as keyof DayMenu;
        if (this.weekPlan[day] && type in this.weekPlan[day]) {
          this.weekPlan[day][type] = item.product_id;
        }
      });
    }

    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onDishSelected(productId: any): void {
    const id = Number(productId);
    if (id && !this.recipeMap[id]) {
      this.api.get<any>(`products/${id}`).subscribe(res => {
        const detailed = res.data || res;
        this.recipeMap[id] = detailed.ingredients || [];
      });
    }
  }

  // ================= CONVERT WEEKPLAN MAP TO ARRAY FOR SAVE =================
  getFlatItems(): any[] {
    const items: any[] = [];
    const days: (keyof WeekPlan)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const courses: (keyof DayMenu)[] = ['breakfast', 'snack', 'lunch', 'dinner'];

    for (const d of days) {
      for (const c of courses) {
        const val = Number(this.weekPlan[d][c]);
        if (val > 0) {
          items.push({
            product_id: val,
            day_of_week: d,
            meal_type: c
          });
        }
      }
    }
    return items;
  }

  // ================= STOCK VALIDATION =================
  validateStockSufficiency(): { sufficient: boolean; details: string[]; insufficientItems: any[] } {
    const selectedItems = this.getFlatItems();
    if (selectedItems.length === 0) {
      return { sufficient: true, details: [], insufficientItems: [] };
    }

    const PORTION_MULTIPLIER = 50; // Target portion sizing
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
          `${req.name} : Requis ${req.required.toFixed(1)} ${rawProd?.stock?.unit || 'pc'}, En stock ${currentStock.toFixed(1)} ${rawProd?.stock?.unit || 'pc'}`
        );
      }
    }

    return { sufficient, details, insufficientItems };
  }

  checkStockUI(): void {
    const stockCheck = this.validateStockSufficiency();
    if (stockCheck.sufficient) {
      Swal.fire({
        title: 'Stock Suffisant !',
        text: 'Tous les ingrédients requis pour assurer 50 portions de chaque plat sont disponibles en réserve.',
        icon: 'success',
        confirmButtonColor: '#6B8F71'
      });
    } else {
      const missingText = stockCheck.details.join('<br>');
      Swal.fire({
        title: 'Alerte : Rupture de Stock',
        html: `<p style="font-size: 13.5px; color: #4b5563; text-align: left; margin-bottom: 12px;">Des ingrédients manquent pour assurer 50 portions :</p>
               <div style="text-align: left; background: #EDE9E2; border: 1.5px solid #feb2b2; padding: 12px; border-radius: 10px; font-size: 12px; color: #c53030; font-family: monospace; max-height: 180px; overflow-y: auto;">
                 ${missingText}
               </div>`,
        icon: 'warning',
        confirmButtonColor: '#6B8F71'
      });
    }
  }

  // ================= SAVE =================
  save(): void {
    if (!this.form.name || !this.form.week_start || !this.form.week_end) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez renseigner le nom et les dates du menu.',
        icon: 'warning',
        confirmButtonColor: '#6B8F71'
      });
      return;
    }

    const flatItems = this.getFlatItems();
    if (flatItems.length === 0) {
      Swal.fire({
        title: 'Planification vide',
        text: 'Veuillez choisir au moins un plat dans votre menu hebdomadaire.',
        icon: 'warning',
        confirmButtonColor: '#6B8F71'
      });
      return;
    }

    // 1. Run Stock Sufficiency Validation
    const stockCheck = this.validateStockSufficiency();

    if (!stockCheck.sufficient) {
      const missingText = stockCheck.details.join('<br>');
      Swal.fire({
        title: 'Planification bloquée : Stock Insuffisant',
        html: `<p style="font-size: 14px; color: #4A4D4B;">Le stock disponible est insuffisant pour planifier ce menu (cible 50 portions) :</p>
               <div style="text-align: left; background: #fff1f2; border: 1.5px solid #fda4af; padding: 12px; border-radius: 10px; margin-top: 12px; font-size: 12px; color: #9f1239; font-family: monospace; max-height: 180px; overflow-y: auto;">
                 ${missingText}
               </div>
               <p style="font-size: 13px; color: #2C3E35; margin-top: 14px; font-weight: bold;">Une notification de rupture a été envoyée automatiquement au Chef Magasin.</p>`,
        icon: 'error',
        confirmButtonColor: '#6B8F71',
        confirmButtonText: 'Fermer'
      });

      // 2. Alert Chef Magasin via automatic comments on missing ingredient products
      stockCheck.insufficientItems.forEach(item => {
        const commentBody = ` [ALERTE RUPTURE INGRÉDIENT] L'ingrédient "${item.name}" est insuffisant pour le menu hebdomadaire "${this.form.name}". Requis: ${item.required.toFixed(1)} ${item.unit}, Disponible: ${item.available.toFixed(1)} ${item.unit}. Veuillez commander en urgence !`;
        this.api.post('comments', {
          commentable_type: 'product',
          commentable_id: item.id,
          body: commentBody
        }).subscribe();
      });

      return;
    }

    // If stock is sufficient, save the menu
    const payload = {
      name: this.form.name,
      week_start: this.form.week_start,
      week_end: this.form.week_end,
      is_active: this.form.is_active,
      items: flatItems
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
          confirmButtonColor: '#6B8F71'
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue lors de la sauvegarde.',
          icon: 'error',
          confirmButtonColor: '#6B8F71'
        });
      }
    });
  }

  // ================= DELETE =================
  deleteMenu(id: number): void {
    Swal.fire({
      title: 'Supprimer ce menu ?',
      text: 'Cette action supprimera définitivement le menu et ses plats.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0483A',
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
              confirmButtonColor: '#6B8F71'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Impossible de supprimer ce menu.',
              icon: 'error',
              confirmButtonColor: '#6B8F71'
            });
          }
        });
      }
    });
  }
}
