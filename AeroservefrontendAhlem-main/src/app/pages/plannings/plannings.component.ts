import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Planning, PointDeVente } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-plannings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading && plannings.length === 0) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
      <div class="page">
        
        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Planning Hebdomadaire des Caissiers</h2>
            <p class="subtitle">Gérez et affectez les caissiers aux points de vente par shifts horaires de travail</p>
          </div>
          
          <div class="week-picker">
            <button class="week-nav-btn" (click)="prevWeek()">Précédent</button>
            <span class="week-label">Semaine: {{ getWeekRangeLabel() }}</span>
            <button class="week-nav-btn" (click)="nextWeek()">Suivant</button>
          </div>
        </div>

        <!-- ─── STATS BAR ─── -->
        <div class="stat-summary-bar">
          <div class="stat-card">
            <span class="stat-label">Affectations Semaine</span>
            <span class="stat-value">{{ plannings.length }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Caissiers Actifs</span>
            <span class="stat-value">{{ cashiers.length }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Points de Vente</span>
            <span class="stat-value">{{ pdvs.length }}</span>
          </div>
        </div>

        <!-- ─── WEEKLY GRID TABLE ─── -->
        <div class="table-container" style="padding: 16px;">
          <div class="table-wrap">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="cashier-col-header">Caissier</th>
                  @for (day of weekDays; track day) {
                    <th class="day-col-header">
                      <div class="day-header-cell">
                        <span class="day-name-cell">{{ day | date:'EEEE':'':'fr-FR' }}</span>
                        <span class="day-date-cell">{{ day | date:'dd MMM' }}</span>
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (c of cashiers; track c.id) {
                  <tr>
                    <td class="cashier-cell-sticky">
                      <div class="cashier-info-block">
                        <span class="avatar-circle-pos">{{ getInitials(c) }}</span>
                        <div>
                          <strong class="cashier-name-strong">{{ c.first_name }} {{ c.last_name }}</strong>
                          <span class="cashier-email-span">{{ c.email }}</span>
                        </div>
                      </div>
                    </td>

                    @for (day of weekDays; track day) {
                      <td class="day-cell-grid">
                        <div class="shifts-container-grid">
                          <!-- MATIN -->
                          <div class="shift-pill matin" 
                               [class.assigned]="getShiftPlanning(c.id, day, 'MATIN')"
                               [class.off]="getShiftPlanning(c.id, day, 'MATIN')?.day_status === 'OFF'"
                               [class.conge]="getShiftPlanning(c.id, day, 'MATIN')?.day_status === 'CONGE'"
                               (click)="openShiftModal(c, day, 'MATIN')">
                            <span class="shift-dot"></span>
                            <div class="shift-details">
                              <span class="shift-title-text">Matin</span>
                              <span class="shift-desc-text">
                                {{ getShiftLabel(c.id, day, 'MATIN') }}
                              </span>
                            </div>
                          </div>

                          <!-- APRES-MIDI -->
                          <div class="shift-pill apres-midi" 
                               [class.assigned]="getShiftPlanning(c.id, day, 'APRES_MIDI')"
                               [class.off]="getShiftPlanning(c.id, day, 'APRES_MIDI')?.day_status === 'OFF'"
                               [class.conge]="getShiftPlanning(c.id, day, 'APRES_MIDI')?.day_status === 'CONGE'"
                               (click)="openShiftModal(c, day, 'APRES_MIDI')">
                            <span class="shift-dot"></span>
                            <div class="shift-details">
                              <span class="shift-title-text">Après-midi</span>
                              <span class="shift-desc-text">
                                {{ getShiftLabel(c.id, day, 'APRES_MIDI') }}
                              </span>
                            </div>
                          </div>

                          <!-- SOIR -->
                          <div class="shift-pill soir" 
                               [class.assigned]="getShiftPlanning(c.id, day, 'SOIR')"
                               [class.off]="getShiftPlanning(c.id, day, 'SOIR')?.day_status === 'OFF'"
                               [class.conge]="getShiftPlanning(c.id, day, 'SOIR')?.day_status === 'CONGE'"
                               (click)="openShiftModal(c, day, 'SOIR')">
                            <span class="shift-dot"></span>
                            <div class="shift-details">
                              <span class="shift-title-text">Soir</span>
                              <span class="shift-desc-text">
                                {{ getShiftLabel(c.id, day, 'SOIR') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    }
                  </tr>
                }
                @if (cashiers.length === 0) {
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 48px; color: var(--text-muted);">
                      Aucun caissier actif trouvé pour créer le planning hebdomadaire.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- ─── ADD / EDIT SCHEDULE MODAL ─── -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ editing ? 'Modifier' : 'Créer' }} une affectation</h3>
                <button (click)="closeModal()" style="font-size: 16px;">✕</button>
              </div>
              
              <form (ngSubmit)="save()">
                <div class="modal-body">
                  @if (validationError) {
                    <div class="error-banner"> {{ validationError }}</div>
                  }

                  <div class="form-group">
                    <label>Caissier</label>
                    <input type="text" [value]="selectedCashierName" disabled class="disabled-input" />
                  </div>

                  <div class="form-group">
                    <label>Date & Shift</label>
                    <input type="text" [value]="formattedDateAndShift" disabled class="disabled-input" />
                  </div>

                  <div class="form-group">
                    <label>Statut de la journée *</label>
                    <select [(ngModel)]="form.day_status" name="day_status" required (change)="onStatusChange()">
                      <option value="ON">Actif (En service)</option>
                      <option value="OFF">Repos (Day Off)</option>
                      <option value="CONGE">Congé annuel</option>
                    </select>
                  </div>

                  @if (form.day_status === 'ON') {
                    <div class="form-group">
                      <label>Point de Vente *</label>
                      <select [(ngModel)]="form.pdv_id" name="pdv_id" required>
                        <option [value]="null" disabled selected>Choisir un Point de Vente...</option>
                        @for (pdv of pdvs; track pdv.id) {
                          <option [value]="pdv.id">
                             {{ pdv.name }} [{{ pdv.location || 'AIRSIDE' }}]
                          </option>
                        }
                      </select>
                    </div>

                    <div class="form-row">
                      <div class="form-group">
                        <label>Heure de début</label>
                        <input type="time" [(ngModel)]="form.start_time" name="start_time" required />
                      </div>
                      <div class="form-group">
                        <label>Heure de fin</label>
                        <input type="time" [(ngModel)]="form.end_time" name="end_time" required />
                      </div>
                    </div>
                  }
                </div>

                <div class="modal-footer">
                  @if (editing) {
                    <button type="button" class="btn btn-danger" (click)="deleteCurrentPlanning()" style="margin-right: auto;">
                      Supprimer
                    </button>
                  }
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">Valider</button>
                </div>
              </form>
            </div>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; flex-wrap: wrap; gap: 16px; }
    .page-header h2 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); }
    
    /* Week Picker */
    .week-picker {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: var(--radius-md);
    }
    
    .week-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .week-nav-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition);
    }
    
    .week-nav-btn:hover {
      background: var(--accent);
      color: #fff;
      border-color: transparent;
    }
    
    .table-wrap { overflow-x: auto; }
    
    .grid-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 6px;
      font-size: 12.5px;
    }
    
    .grid-table th, .grid-table td {
      padding: 6px;
      border: none;
      vertical-align: top;
    }
    
    .cashier-col-header {
      width: 200px;
      min-width: 180px;
      text-align: left;
      color: var(--text-secondary);
      font-weight: 600;
      padding-left: 8px !important;
    }

    .day-col-header {
      min-width: 140px;
      text-align: center;
    }
    
    .day-header-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0;
    }
    
    .day-name-cell {
      font-weight: 600;
      font-size: 12.5px;
      color: var(--text-primary);
      text-transform: capitalize;
    }
    
    .day-date-cell {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .cashier-cell-sticky {
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      position: sticky;
      left: 0;
      z-index: 10;
      padding: 10px !important;
      border: 1px solid var(--border) !important;
    }

    .day-cell-grid {
      background: var(--surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border) !important;
    }

    .cashier-info-block { display: flex; align-items: center; gap: 8px; }
    .avatar-circle-pos { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center; font-size: 11px; }
    .cashier-name-strong { display: block; color: var(--text-primary); font-size: 12.5px; }
    .cashier-email-span { color: var(--text-muted); font-size: 11px; display: block; }

    /* Shifts Container */
    .shifts-container-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .shift-pill {
      background: var(--surface);
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 6px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all var(--transition);
    }

    .shift-pill:hover {
      border-color: var(--accent);
      background: var(--bg-secondary);
      transform: translateY(-1px);
    }

    .shift-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--border);
      flex-shrink: 0;
    }

    .shift-details {
      display: flex;
      flex-direction: column;
    }

    .shift-title-text {
      font-weight: 600;
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .shift-desc-text {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Assigned State */
    .shift-pill.assigned {
      background: #FFFBEB;
      border: 1.5px solid #FCD34D;
      
      .shift-dot { background: var(--color-warning); }
      .shift-title-text { color: #B45309; }
      .shift-desc-text { color: #B45309; font-weight: 600; }
    }

    /* Active ON State */
    .shift-pill.assigned:not(.off):not(.conge) {
      background: #F0FDF4;
      border: 1.5px solid var(--color-success);
      
      .shift-dot { background: var(--color-success); }
      .shift-title-text { color: #15803D; }
      .shift-desc-text { color: #15803D; font-weight: 600; }
    }

    /* Repos OFF State */
    .shift-pill.off {
      background: var(--bg-secondary);
      border: 1.5px solid var(--border);
      
      .shift-dot { background: var(--text-muted); }
      .shift-title-text { color: var(--text-secondary); }
      .shift-desc-text { color: var(--text-muted); }
    }

    /* Congé CONGE State */
    .shift-pill.conge {
      background: #EFF6FF;
      border: 1.5px solid #93C5FD;
      
      .shift-dot { background: var(--color-info); }
      .shift-title-text { color: #1D4ED8; }
      .shift-desc-text { color: #1D4ED8; }
    }
    
    .error-banner { background: #FEE2E2; border-left: 4px solid var(--color-error); color: #B91C1C; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    
    .disabled-input {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: not-allowed;
      border-color: var(--border) !important;
      font-weight: 500;
    }
  `]
})
export class PlanningsComponent implements OnInit {
  plannings: any[] = [];
  cashiers: any[] = [];
  pdvs: any[] = [];
  
  loading = true;
  showModal = false;
  editing = false;
  editId = 0;
  
  currentDate = new Date();
  weekDays: Date[] = [];

  form: any = { 
    caissier_id: null, 
    pdv_id: null, 
    date: '', 
    day_status: 'ON',
    shift: 'MATIN', 
    start_time: '', 
    end_time: '' 
  };
  validationError = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.calculateWeekDays();
    this.load();
    this.loadDropdownData();
  }

  calculateWeekDays(): void {
    const tempDate = new Date(this.currentDate);
    const day = tempDate.getDay();
    // Adjust: Monday is start of week
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(tempDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      this.weekDays.push(d);
    }
  }

  prevWeek(): void {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.calculateWeekDays();
    this.load();
  }

  nextWeek(): void {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.calculateWeekDays();
    this.load();
  }

  getWeekRangeLabel(): string {
    if (this.weekDays.length === 0) return '';
    const start = this.weekDays[0];
    const end = this.weekDays[6];
    
    const formatDayMonth = (d: Date) => {
      const days = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
      const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    return `${formatDayMonth(start)} - ${formatDayMonth(end)} ${start.getFullYear()}`;
  }

  formatDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  load(): void {
    this.loading = true;
    const dateFrom = this.formatDateString(this.weekDays[0]);
    const dateTo = this.formatDateString(this.weekDays[6]);

    this.api.get<any>('plannings', { date_from: dateFrom, date_to: dateTo }).subscribe({
      next: res => {
        this.plannings = res.data || res;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadDropdownData(): void {
    this.api.get<any>('caissier').subscribe({
      next: res => {
        const list = res.data || res;
        if (Array.isArray(list)) {
          this.cashiers = list.filter(c => c.status === 'active');
        }
      }
    });

    this.api.get<any>('points-de-vente').subscribe({
      next: res => {
        if (Array.isArray(res)) {
          this.pdvs = res;
        } else if (res.data && Array.isArray(res.data)) {
          this.pdvs = res.data;
        } else if (res.points_de_vente && Array.isArray(res.points_de_vente)) {
          this.pdvs = res.points_de_vente;
        } else {
          this.pdvs = [];
        }
      },
      error: (err) => {
        this.pdvs = [];
      }
    });
  }

  getShiftPlanning(cashierId: number, day: Date, shift: string): any {
    const dayStr = this.formatDateString(day);
    return this.plannings.find(p => {
      const pDate = new Date(p.date);
      return p.caissier_id === cashierId && 
             this.formatDateString(pDate) === dayStr && 
             p.shift === shift;
    });
  }

  getShiftLabel(cashierId: number, day: Date, shift: string): string {
    const plan = this.getShiftPlanning(cashierId, day, shift);
    if (!plan) return '+ Affecter';
    if (plan.day_status === 'OFF') return ' Repos';
    if (plan.day_status === 'CONGE') return ' Congé';
    return plan.point_de_vente?.name || ' Non spécifié';
  }

  getInitials(user: any): string {
    if (!user) return '?';
    return (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return parts.slice(0, 2).join(':');
  }

  get selectedCashierName(): string {
    const cashier = this.cashiers.find(c => c.id == this.form.caissier_id);
    return cashier ? `${cashier.first_name} ${cashier.last_name}` : 'Caissier';
  }

  get formattedDateAndShift(): string {
    if (!this.form.date) return '';
    const d = new Date(this.form.date);
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const shiftLabel = this.form.shift === 'MATIN' ? 'Matin ' : this.form.shift === 'APRES_MIDI' ? 'Après-midi ' : 'Soir ';
    return `${formattedDate} (${shiftLabel})`;
  }

  openShiftModal(cashier: any, day: Date, shift: string): void {
    const existing = this.getShiftPlanning(cashier.id, day, shift);
    const dateStr = this.formatDateString(day);

    if (existing) {
      this.form = {
        caissier_id: existing.caissier_id,
        pdv_id: existing.pdv_id,
        date: dateStr,
        day_status: existing.day_status || 'ON',
        shift: existing.shift || shift,
        start_time: this.formatTime(existing.start_time || ''),
        end_time: this.formatTime(existing.end_time || '')
      };
      this.editId = existing.id;
      this.editing = true;
    } else {
      // Default shift hours
      let start = '08:00';
      let end = '16:00';
      if (shift === 'APRES_MIDI') {
        start = '16:00';
        end = '00:00';
      } else if (shift === 'SOIR') {
        start = '00:00';
        end = '08:00';
      }

      this.form = {
        caissier_id: cashier.id,
        pdv_id: null,
        date: dateStr,
        day_status: 'ON',
        shift: shift,
        start_time: start,
        end_time: end
      };
      this.editId = 0;
      this.editing = false;
    }
    
    this.validationError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onStatusChange(): void {
    if (this.form.day_status !== 'ON') {
      this.form.pdv_id = null;
      this.form.start_time = '';
      this.form.end_time = '';
    } else {
      // Restore default times
      if (this.form.shift === 'MATIN') {
        this.form.start_time = '08:00';
        this.form.end_time = '16:00';
      } else if (this.form.shift === 'APRES_MIDI') {
        this.form.start_time = '16:00';
        this.form.end_time = '00:00';
      } else {
        this.form.start_time = '00:00';
        this.form.end_time = '08:00';
      }
    }
  }

  private getWeekBounds(dateStr: string): { start: Date; end: Date } {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  private hasOverlappingWeek(cashierId: number, dateStr: string): boolean {
    const { start, end } = this.getWeekBounds(dateStr);
    return this.plannings.some(p => {
      if (p.caissier_id !== cashierId) return false;
      if (this.editing && p.id === this.editId) return false;
      const pDate = new Date(p.date);
      return pDate >= start && pDate <= end;
    });
  }

  save(): void {
    this.validationError = '';

    if (this.form.day_status === 'ON') {
      if (!this.form.pdv_id) {
        this.validationError = 'Veuillez sélectionner un Point de Vente.';
        return;
      }
      if (!this.form.start_time || !this.form.end_time) {
        this.validationError = 'Veuillez renseigner les horaires de début et de fin.';
        return;
      }
    }

    // Block overlapping week planning
    if (this.form.date && this.hasOverlappingWeek(this.form.caissier_id, this.form.date)) {
      const { start, end } = this.getWeekBounds(this.form.date);
      const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      this.validationError = `Ce caissier a déjà un planning pour la semaine du ${fmt(start)} au ${fmt(end)}. Veuillez supprimer l'ancien planning avant d'en créer un nouveau.`;
      return;
    }

    const payload = {
      ...this.form,
      is_day_off: this.form.day_status !== 'ON',
      pdv_id: this.form.day_status === 'ON' ? this.form.pdv_id : null,
      start_time: this.form.day_status === 'ON' ? this.form.start_time : null,
      end_time: this.form.day_status === 'ON' ? this.form.end_time : null
    };

    const req = this.editing
      ? this.api.put(`plannings/${this.editId}`, payload)
      : this.api.post('plannings', payload);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès',
          text: 'Affectation enregistrée avec succès.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.validationError = err.error?.message || 'Erreur lors de l’enregistrement. Veuillez vérifier les contraintes.';
      }
    });
  }

  deleteCurrentPlanning(): void {
    if (!this.editId) return;

    Swal.fire({
      title: 'Supprimer ?',
      text: 'Voulez-vous vraiment supprimer cette affectation ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0483A',
      cancelButtonColor: '#A8C5A0',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.api.delete(`plannings/${this.editId}`).subscribe({
          next: () => {
            Swal.fire('Supprimé', 'Affectation supprimée.', 'success');
            this.closeModal();
            this.load();
          },
          error: (err) => {
            Swal.fire('Erreur', err.error?.message || 'Impossible de supprimer.', 'error');
          }
        });
      }
    });
  }
}
