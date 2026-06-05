import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Menu, Product } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import Swal from 'sweetalert2';

interface DayMenu {
  breakfast: number;
  snack: number;
  lunch: number;
  dinner: number;
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
      <app-page-loading variant="table" [rows]="10" />
    } @else {
      <div class="page">
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h2>Menus Hebdomadaires</h2>
            <p class="subtitle">Planifiez les repas de la semaine et suivez l'etat des stocks</p>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" (click)="openCloneModal()">📋 Cloner une semaine</button>
            <button class="btn btn-primary" (click)="openModal()">+ Nouveau Menu</button>
          </div>
        </div>

        <div class="menus-workspace">
          <!-- SIDEBAR LIST (Left) -->
          <div class="menus-sidebar">
            <h3 class="sidebar-title">Calendrier des Menus</h3>
            <div class="menu-list">
              @for (menu of menus; track menu.id) {
                <div class="menu-list-item" [class.active]="selectedMenu?.id === menu.id" (click)="selectMenu(menu)">
                  <div class="item-header">
                    <span class="item-icon">📅</span>
                    <span class="badge"
                          [class.badge-neutral]="menu.status === 'BROUILLON'"
                          [class.badge-success]="menu.status === 'VALIDE'"
                          [class.badge-error]="menu.status === 'REFUSE'">
                      {{ menu.status === 'BROUILLON' ? 'Brouillon' : menu.status === 'VALIDE' ? 'Valide' : 'Refuse' }}
                    </span>
                  </div>
                  <h4 class="item-name">{{ menu.name }}</h4>
                  <span class="item-dates">Du {{ menu.start_date | date:'dd/MM' }} au {{ menu.end_date | date:'dd/MM' }}</span>
                </div>
              }
              @if (menus.length === 0) {
                <div class="empty-sidebar">Aucun menu</div>
              }
            </div>
          </div>

          <!-- DETAILED PREVIEW (Right) -->
          <div class="menu-preview-panel">
            @if (selectedMenu) {
              <div class="preview-header">
                <div class="preview-title-block">
                  <span class="preview-icon">📅</span>
                  <div>
                    <h3>{{ selectedMenu.name }}</h3>
                    <p class="preview-dates">Semaine du {{ selectedMenu.start_date | date:'dd/MM/yyyy' }} au {{ selectedMenu.end_date | date:'dd/MM/yyyy' }}</p>
                  </div>
                </div>
                
                <div class="preview-actions">
                  @if (selectedMenu.status === 'BROUILLON') {
                    <button class="btn btn-secondary" (click)="editMenu(selectedMenu)">Modifier</button>
                    <button class="btn btn-primary" style="background:var(--accent);" (click)="submitMenu(selectedMenu)">Soumettre</button>
                  }
                  <button class="btn btn-danger" style="padding:0 12px;" (click)="deleteMenu(selectedMenu.id)">Supprimer</button>
                </div>
              </div>

              <!-- KPIs -->
              <div class="preview-kpis">
                <div class="kpi-box">
                  <span class="kpi-label">👥 Staff Planifie</span>
                  <span class="kpi-value">{{ selectedMenu.staff_count || 0 }} pers.</span>
                </div>
                <div class="kpi-box">
                  <span class="kpi-label">🍲 Total Plats</span>
                  <span class="kpi-value">{{ (selectedMenu.items || []).length }} plats</span>
                </div>
                <div class="kpi-box">
                  <span class="kpi-label">🏷️ Statut</span>
                  <span class="badge"
                        [class.badge-neutral]="selectedMenu.status === 'BROUILLON'"
                        [class.badge-success]="selectedMenu.status === 'VALIDE'"
                        [class.badge-error]="selectedMenu.status === 'REFUSE'">
                    {{ selectedMenu.status === 'BROUILLON' ? 'Brouillon' : selectedMenu.status === 'VALIDE' ? 'Valide' : 'Refuse' }}
                  </span>
                </div>
              </div>

              @if (selectedMenu.comment) {
                <div class="preview-comment-box">
                  <strong>⚠️ Note/Motif de rejet :</strong>
                  <p>{{ selectedMenu.comment }}</p>
                </div>
              }

              <!-- WEEKLY DISHES GRID -->
              <div class="weekly-schedule-grid">
                <h4 class="section-title">Fiche de Planification des Plats</h4>
                <div class="grid-table-container">
                  <table class="grid-table">
                    <thead>
                      <tr>
                        <th>Repas</th>
                        @for (day of daysList; track day.key) {
                          <th>{{ day.label }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="meal-header-cell">🍲 Soupe</td>
                        @for (day of daysList; track day.key) {
                          <td class="dish-cell">{{ getDishName(selectedMenu, day.key, 'breakfast') }}</td>
                        }
                      </tr>
                      <tr>
                        <td class="meal-header-cell">🥗 Salade</td>
                        @for (day of daysList; track day.key) {
                          <td class="dish-cell">{{ getDishName(selectedMenu, day.key, 'snack') }}</td>
                        }
                      </tr>
                      <tr>
                        <td class="meal-header-cell">🍽️ Plat Principal</td>
                        @for (day of daysList; track day.key) {
                          <td class="dish-cell">{{ getDishName(selectedMenu, day.key, 'lunch') }}</td>
                        }
                      </tr>
                      <tr>
                        <td class="meal-header-cell">🍰 Dessert</td>
                        @for (day of daysList; track day.key) {
                          <td class="dish-cell">{{ getDishName(selectedMenu, day.key, 'dinner') }}</td>
                        }
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <div class="empty-preview-state">
                <div class="empty-icon">📂</div>
                <h3>Selectionnez un menu</h3>
                <p>Choisissez un menu hebdomadaire dans la liste de gauche pour afficher les details de sa planification.</p>
              </div>
            }
          </div>
        </div>

        <!-- CREATE/EDIT MODAL -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal-card modal-wide" (click)="$event.stopPropagation()">

              <div class="modal-header">
                <h3>{{ editing ? 'Modifier le Menu' : 'Nouveau Menu Hebdomadaire' }}</h3>
                <button (click)="closeModal()" style="font-size:16px;">✕</button>
              </div>

              <form (ngSubmit)="save()">
                <div class="modal-body">
                  <div class="form-section">
                    <h4>Informations Generales</h4>
                    <div class="form-group">
                      <label>Nom du Menu *</label>
                      <input [(ngModel)]="form.name" name="name" placeholder="Ex: Menu Hiver - Semaine 45" required />
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Debut de la semaine *</label>
                        <input type="date" [(ngModel)]="form.start_date" name="start_date" required />
                      </div>
                      <div class="form-group">
                        <label>Fin de la semaine *</label>
                        <input type="date" [(ngModel)]="form.end_date" name="end_date" required />
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Nombre de personnes (staff) *</label>
                      <input type="number" [(ngModel)]="form.staff_count" name="staff_count" min="1" placeholder="Ex: 50" required />
                    </div>
                  </div>

                  <div class="form-section" style="margin-top:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                      <h4>Planificateur Hebdomadaire</h4>
                    </div>

                    <div class="days-tabs">
                      @for (day of daysList; track day.key) {
                        <button type="button" class="day-tab-btn" [class.active]="activeTab === day.key" (click)="activeTab = day.key">
                          {{ day.label }}
                        </button>
                      }
                    </div>

                    <div class="day-slot-card">
                      <p class="day-hint">
                        Saisissez les plats pour le <strong>{{ getDayLabel(activeTab) }}</strong> :
                      </p>

                      <div class="course-slot">
                        <div class="slot-label">Soupe *</div>
                        <select [(ngModel)]="weekPlan[activeTab].breakfast" name="breakfast_{{activeTab}}" required>
                          <option [value]="0">-- Selectionner --</option>
                          @for (p of foodProducts; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>

                      <div class="course-slot">
                        <div class="slot-label">Salade *</div>
                        <select [(ngModel)]="weekPlan[activeTab].snack" name="snack_{{activeTab}}" required>
                          <option [value]="0">-- Selectionner --</option>
                          @for (p of foodProducts; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>

                      <div class="course-slot">
                        <div class="slot-label">Plat Principal *</div>
                        <select [(ngModel)]="weekPlan[activeTab].lunch" name="lunch_{{activeTab}}" required>
                          <option [value]="0">-- Selectionner --</option>
                          @for (p of foodProducts; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>

                      <div class="course-slot">
                        <div class="slot-label">Dessert *</div>
                        <select [(ngModel)]="weekPlan[activeTab].dinner" name="dinner_{{activeTab}}" required>
                          <option [value]="0">-- Selectionner --</option>
                          @for (p of foodProducts; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">
                    {{ editing ? 'Sauvegarder le brouillon' : 'Creer le brouillon' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- CLONE MODAL -->
        @if (showCloneModal) {
          <div class="modal-overlay" (click)="closeCloneModal()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Cloner une Semaine</h3>
                <button (click)="closeCloneModal()" style="font-size:16px;">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-section">
                  <h4>Menu source</h4>
                  <div class="form-group">
                    <label>Selectionner un menu existant *</label>
                    <select [(ngModel)]="cloneForm.source_menu_id" name="clone_source" required>
                      <option [value]="0">-- Choisir --</option>
                      @for (m of menus; track m.id) {
                        <option [value]="m.id">{{ m.name }} ({{ m.start_date | date:'dd/MM/yyyy' }} — {{ m.end_date | date:'dd/MM/yyyy' }})</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-section" style="margin-top:12px;">
                  <h4>Semaine cible</h4>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Debut *</label>
                      <input type="date" [(ngModel)]="cloneForm.target_week_start" name="clone_start" required />
                    </div>
                    <div class="form-group">
                      <label>Fin *</label>
                      <input type="date" [(ngModel)]="cloneForm.target_week_end" name="clone_end" required />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Nombre de personnes (staff)</label>
                    <input type="number" [(ngModel)]="cloneForm.staff_count" name="clone_staff" min="1" placeholder="Conserver celui du menu source" />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" (click)="closeCloneModal()">Annuler</button>
                <button class="btn btn-primary" (click)="cloneMenu()" [disabled]="cloning">
                  {{ cloning ? 'Clonage en cours...' : 'Cloner & Valider' }}
                </button>
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

    .menus-workspace {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
      min-height: calc(100vh - 200px);
      align-items: stretch;
    }
    
    .menus-sidebar {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 16px;
    }
    .sidebar-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .menu-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .menu-list-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .menu-list-item:hover {
      border-color: var(--accent);
      background: var(--surface);
      transform: translateX(2px);
    }
    .menu-list-item.active {
      border-color: var(--accent);
      background: #F0FDF4;
      box-shadow: var(--shadow-sm);
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-icon {
      font-size: 16px;
    }
    .item-name {
      margin: 4px 0 0 0;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .item-dates {
      font-size: 11.5px;
      color: var(--text-secondary);
    }
    .empty-sidebar {
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .menu-preview-panel {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 16px;
    }
    .preview-title-block {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .preview-icon {
      font-size: 28px;
    }
    .preview-title-block h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .preview-dates {
      margin: 2px 0 0 0;
      font-size: 12.5px;
      color: var(--text-secondary);
    }
    .preview-actions {
      display: flex;
      gap: 8px;
    }

    .preview-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .kpi-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-label {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .preview-comment-box {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: 12.5px;
      color: #991B1B;
    }
    .preview-comment-box p {
      margin: 4px 0 0 0;
    }

    .weekly-schedule-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .grid-table-container {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .grid-table th {
      background: #F8FAFC;
      color: var(--text-secondary);
      font-weight: 600;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border-light);
    }
    .grid-table th:last-child {
      border-right: none;
    }
    .grid-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-light);
      border-right: 1px solid var(--border-light);
      color: var(--text-secondary);
    }
    .grid-table td:last-child {
      border-right: none;
    }
    .grid-table tr:last-child td {
      border-bottom: none;
    }
    .meal-header-cell {
      font-weight: 700;
      background: #F8FAFC;
      color: var(--text-primary) !important;
      width: 120px;
    }
    .dish-cell {
      min-width: 100px;
      font-weight: 500;
    }

    .empty-preview-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 80px 24px;
      text-align: center;
      flex: 1;
    }
    .empty-icon {
      font-size: 40px;
    }
    .empty-preview-state h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .empty-preview-state p {
      margin: 0;
      font-size: 12.5px;
      color: var(--text-secondary);
      max-width: 300px;
    }

    .modal-wide { max-width: 680px; }

    .form-section {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }
    .form-section h4 { margin: 0 0 12px 0; font-size: 13.5px; font-weight: 600; color: var(--text-primary); }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .days-tabs {
      display: flex;
      overflow-x: auto;
      gap: 6px;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
    }
    .day-tab-btn {
      border: none;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition);
    }
    .day-tab-btn:hover { background: var(--border); color: var(--text-primary); }
    .day-tab-btn.active { background: var(--accent); color: #fff; }

    .day-slot-card {
      background: var(--surface);
      border: 1px dashed var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
    }
    .day-hint { font-size: 12px; color: var(--text-secondary); margin: 0 0 12px 0; }
    .course-slot {
      display: grid;
      grid-template-columns: 1.5fr 3fr;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .course-slot:last-child { margin-bottom: 0; }
    .slot-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
    .course-slot select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 13px; outline: none; }
    .course-slot select:focus { border-color: var(--accent); }
  `]
})
export class MenusComponent implements OnInit {
  menus: Menu[] = [];
  allProducts: Product[] = [];
  foodProducts: Product[] = [];

  loading = true;
  showModal = false;
  showDetailModal = false;
  showCloneModal = false;
  selectedMenu: Menu | null = null;
  editing = false;
  editId = 0;
  form: any = { name: '', start_date: '', end_date: '', staff_count: 50 };
  cloneForm: any = { source_menu_id: 0, target_week_start: '', target_week_end: '', staff_count: null };
  cloning = false;

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

  selectMenu(menu: Menu): void {
    this.selectedMenu = menu;
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('menus').subscribe({
      next: res => {
        this.menus = res.data || res;
        this.loading = false;
        
        // Auto-select first menu
        if (this.menus.length > 0) {
          if (this.editId) {
            const updated = this.menus.find(m => m.id === this.editId);
            if (updated) this.selectedMenu = updated;
          } else if (this.selectedMenu) {
            const current = this.menus.find(m => m.id === this.selectedMenu!.id);
            this.selectedMenu = current || this.menus[0];
          } else {
            this.selectedMenu = this.menus[0];
          }
        } else {
          this.selectedMenu = null;
        }
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  loadAllProducts(): void {
    this.api.get<any>('products', { no_paginate: true }).subscribe(res => {
      this.allProducts = res.data || res;
      this.foodProducts = this.allProducts.filter(p => p.type === 'food' && p.approval_status === 'approved');
    });
  }

  getCourseCount(menu: Menu, courseType: 'breakfast' | 'snack' | 'lunch' | 'dinner'): number {
    return (menu.items || []).filter(item => item.meal_type === courseType).length;
  }

  getDishName(menu: Menu, dayKey: string, mealType: string): string {
    if (!menu.items) return '-';
    const found = menu.items.find((i: any) => i.day_of_week === dayKey && i.meal_type === mealType);
    return found?.product?.name || '-';
  }

  openModal(): void {
    this.form = { name: '', start_date: '', end_date: '', staff_count: 50 };
    this.weekPlan = this.createEmptyWeekPlan();
    this.editing = false;
    this.activeTab = 'monday';
    this.showModal = true;
  }

  openCloneModal(): void {
    this.cloneForm = { source_menu_id: 0, target_week_start: '', target_week_end: '', staff_count: null };
    this.showCloneModal = true;
  }

  closeCloneModal(): void {
    this.showCloneModal = false;
    this.cloning = false;
  }

  cloneMenu(): void {
    if (!this.cloneForm.source_menu_id || !this.cloneForm.target_week_start || !this.cloneForm.target_week_end) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez sélectionner un menu source et une semaine cible.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    this.cloning = true;
    const payload: any = {
      target_week_start: this.cloneForm.target_week_start,
      target_week_end: this.cloneForm.target_week_end,
    };
    if (this.cloneForm.staff_count) {
      payload.staff_count = this.cloneForm.staff_count;
    }

    this.api.post(`menus/${this.cloneForm.source_menu_id}/clone`, payload).subscribe({
      next: (res: any) => {
        this.cloning = false;
        this.closeCloneModal();
        if (res.valid) {
          Swal.fire({
            title: 'Menu cloné avec succès !',
            html: `
              <p style="color: #15803D; font-weight: 600;">Tous les ingrédients sont en stock suffisant.</p>
              <p style="font-size:12px; color: #475569; margin-top: 8px;">Le nouveau menu est en statut BROUILLON, prêt à être modifié ou soumis.</p>
            `,
            icon: 'success',
            confirmButtonColor: '#0D9488'
          });
        } else {
          const items = res.insufficient_items || [];
          const details = items.map((i: any) =>
            `<div style="padding:6px 0; border-bottom:1px solid #FEE2E2;">
              <strong>${i.product}</strong><br>
              <span style="color:#991B1B;">Requis: ${i.required} ${i.unit} — Disponible: ${i.available} ${i.unit}</span>
            </div>`
          ).join('');

          Swal.fire({
            title: 'Menu cloné — Attention',
            html: `
              <p style="margin-bottom: 12px;">Le menu a été cloné mais certains ingrédients sont insuffisants :</p>
              <div style="text-align:left; background:#FEF2F2; border:1px solid #FECACA; padding:12px; border-radius:8px; max-height:200px; overflow-y:auto;">
                ${details || '<p style="color:#991B1B;">Impossible de vérifier les stocks.</p>'}
              </div>
              <p style="margin-top:12px; font-size:12px; color:#475569;">
                Vous pouvez modifier le menu avant de le soumettre.
              </p>
            `,
            icon: 'warning',
            confirmButtonColor: '#F59E0B'
          });
        }
        this.load();
      },
      error: (err: any) => {
        this.cloning = false;
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Impossible de cloner le menu.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }

  editMenu(m: Menu): void {
    this.form = {
      name: m.name,
      start_date: m.start_date,
      end_date:   m.end_date,
      staff_count: m.staff_count || 50
    };
    this.editId = m.id;
    this.editing = true;
    this.activeTab = 'monday';

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

  viewMenu(m: Menu): void {
    this.selectedMenu = m;
    this.showDetailModal = true;
  }

  closeModal(): void { this.showModal = false; }
  closeDetailModal(): void { this.showDetailModal = false; this.selectedMenu = null; }

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

  save(): void {
    if (!this.form.name || !this.form.start_date || !this.form.end_date || !this.form.staff_count) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez renseigner le nom, les dates et le nombre de personnes.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    const flatItems = this.getFlatItems();
    if (flatItems.length === 0) {
      Swal.fire({
        title: 'Planification vide',
        text: 'Veuillez choisir au moins un plat dans votre menu.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    const payload = {
      name: this.form.name,
      start_date: this.form.start_date,
      end_date:   this.form.end_date,
      staff_count: this.form.staff_count,
      items: flatItems
    };

    const req = this.editing
      ? this.api.put(`menus/${this.editId}`, payload)
      : this.api.post('menus', payload);

    req.subscribe({
      next: (res: any) => {
        const need = res?.purchase_need;
        const restockMsg = need?.items_requiring_restock > 0
          ? `<br><span style="font-size:12px;color:#B45309;">${need.items_requiring_restock} ingrédients nécessitent un réapprovisionnement — liste envoyée au Chef Magasin.</span>`
          : '';
        Swal.fire({
          title: 'Brouillon sauvegardé !',
          html: (this.editing ? 'Le menu a été mis à jour.' : 'Le menu a été créé. Vous pouvez maintenant le soumettre pour validation.') + restockMsg,
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
        this.closeModal();
        this.load();
      },
      error: (err: any) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }

  submitMenu(menu: Menu): void {
    Swal.fire({
      title: 'Soumettre le menu ?',
      text: `Le menu "${menu.name}" sera vérifié contre le stock disponible pour ${menu.staff_count || 50} personnes.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0D9488',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Oui, soumettre',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.post(`menus/${menu.id}/submit`, {}).subscribe({
          next: (res: any) => {
            const updatedMenu = res.menu as Menu;
            const need = res?.purchase_need;
            const restockMsg = need?.items_requiring_restock > 0
              ? `<p style="margin-top:8px; font-size:12px; color:#B45309;">${need.items_requiring_restock} ingrédients nécessitent un réapprovisionnement — liste envoyée au Chef Magasin.</p>`
              : '';
            if (updatedMenu.status === 'VALIDE') {
              Swal.fire({
                title: 'Menu Validé !',
                html: `<p style="color: #15803D; font-weight: 600;">Tous les ingrédients sont en stock suffisant. Le menu a été validé et les stocks déduits (FIFO).</p>${restockMsg}`,
                icon: 'success',
                confirmButtonColor: '#0D9488'
              });
            } else {
              Swal.fire({
                title: 'Menu traité',
                html: `<p style="color: #475569;">Le menu a été soumis.</p>${restockMsg}`,
                icon: 'info',
                confirmButtonColor: '#0D9488'
              });
            }
            this.load();
          },
          error: (err: any) => {
            const errorData = err.error;
            if (errorData?.menu?.status === 'REFUSE') {
              const items = errorData.insufficient_items || [];
              const details = items.map((i: any) =>
                `<div style="padding:6px 0; border-bottom:1px solid #FEE2E2;">
                  <strong>${i.product}</strong><br>
                  <span style="color:#991B1B;">Requis: ${i.required} ${i.unit} — Disponible: ${i.available} ${i.unit}</span>
                </div>`
              ).join('');

              Swal.fire({
                title: 'Menu Refusé — Stock Insuffisant',
                html: `
                  <p style="color: #991B1B; margin-bottom: 12px;">Les ingrédients suivants sont insuffisants :</p>
                  <div style="text-align:left; background:#FEF2F2; border:1px solid #FECACA; padding:12px; border-radius:8px; max-height:200px; overflow-y:auto;">
                    ${details}
                  </div>
                  <p style="margin-top:12px; font-size:12px; color:#475569;">
                    Une notification a été envoyée au Chef Magasin et au Responsable F&B.
                  </p>
                  <p style="margin-top:4px; font-size:12px; color:#B45309;">
                    ${errorData?.purchase_need?.items_requiring_restock || 0} ingrédients nécessitent un réapprovisionnement.
                  </p>
                `,
                icon: 'error',
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Compris'
              });
            } else {
              Swal.fire({
                title: 'Erreur',
                text: errorData?.message || 'Impossible de soumettre le menu.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
              });
            }
            this.load();
          }
        });
      }
    });
  }

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
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.api.delete(`menus/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'Le menu a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            if (this.selectedMenu?.id === id) {
              this.selectedMenu = null;
            }
            this.load();
          },
          error: (err: any) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Impossible de supprimer ce menu.',
              icon: 'error',
              confirmButtonColor: '#0D9488'
            });
          }
        });
      }
    });
  }
}
