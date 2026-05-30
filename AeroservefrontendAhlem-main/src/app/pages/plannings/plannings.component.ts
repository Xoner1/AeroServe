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
            <p class="subtitle">Gérez et affectez les caissiers aux points de vente par shift</p>
          </div>
          
          <div class="week-picker">
            <button class="btn btn-nav" (click)="prevWeek()">Prev</button>
            <span class="week-label"> Semaine: {{ getWeekRangeLabel() }}</span>
            <button class="btn btn-nav" (click)="nextWeek()">Next</button>
          </div>
        </div>

        <!-- ─── STATS BAR ─── -->
        <div class="stats-bar card">
          <div class="stat-item">
            <span class="stat-lbl">Affectations de la Semaine</span>
            <span class="stat-val">{{ plannings.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Caissiers Actifs</span>
            <span class="stat-val">{{ cashiers.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Points de Vente</span>
            <span class="stat-val">{{ pdvs.length }}</span>
          </div>
        </div>

        <!-- ─── WEEKLY GRID TABLE ─── -->
        <div class="card grid-card">
          <div class="table-wrap">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="cashier-col">Caissier</th>
                  @for (day of weekDays; track day) {
                    <th class="day-col">
                      <div class="day-header">
                        <span class="day-name">{{ day | date:'EEEE':'':'fr-FR' }}</span>
                        <span class="day-date">{{ day | date:'dd MMM' }}</span>
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (c of cashiers; track c.id) {
                  <tr>
                    <td class="cashier-col">
                      <div class="cashier-info">
                        <span class="avatar-circle">{{ getInitials(c) }}</span>
                        <div>
                          <strong>{{ c.first_name }} {{ c.last_name }}</strong>
                          <small>{{ c.email }}</small>
                        </div>
                      </div>
                    </td>

                    @for (day of weekDays; track day) {
                      <td class="day-col">
                        <div class="shifts-container">
                          <!-- MATIN -->
                          <div class="shift-pill matin" 
                               [class.assigned]="getShiftPlanning(c.id, day, 'MATIN')"
                               [class.off]="getShiftPlanning(c.id, day, 'MATIN')?.day_status === 'OFF'"
                               [class.conge]="getShiftPlanning(c.id, day, 'MATIN')?.day_status === 'CONGE'"
                               (click)="openShiftModal(c, day, 'MATIN')">
                            <span class="shift-icon"></span>
                            <div class="shift-details">
                              <span class="shift-name">Matin</span>
                              <span class="shift-desc">
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
                            <span class="shift-icon"></span>
                            <div class="shift-details">
                              <span class="shift-name">Après-midi</span>
                              <span class="shift-desc">
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
                            <span class="shift-icon"></span>
                            <div class="shift-details">
                              <span class="shift-name">Soir</span>
                              <span class="shift-desc">
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
                    <td colspan="8" style="text-align: center; padding: 48px; color: #A8C5A0;">
                      Aucun caissier actif trouvé pour créer le planning.
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
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ editing ? 'Modifier' : 'Créer' }} une affectation</h3>
                <button class="btn-close-x" (click)="closeModal()">✕</button>
              </div>
              
              @if (validationError) {
                <div class="error-banner"> {{ validationError }}</div>
              }

              <form (ngSubmit)="save()">
                
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

                <div class="modal-actions">
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
    .page { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', sans-serif; }
    
    .page-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      border-bottom: 1px solid #EDE9E2; 
      padding-bottom: 16px; 
      flex-wrap: wrap; 
      gap: 16px; 
    }
    
    .page-header h2 { margin: 0; font-size: 26px; font-weight: 800; color: #1A1D1B; }
    .subtitle { margin: 4px 0 0 0; font-size: 14px; color: #A8C5A0; }
    
    /* Week Picker */
    .week-picker {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fff;
      border: 1px solid #D8D2C8;
      padding: 6px 12px;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    
    .week-label {
      font-size: 14px;
      font-weight: 700;
      color: #4A4D4B;
    }
    
    .btn-nav {
      background: #EDE9E2;
      border: none;
      border-radius: 8px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-nav:hover {
      background: #2C3E35;
      color: #fff;
    }
    
    .card { background: #ffffff; border-radius: 22px; padding: 24px; box-shadow: 0 12px 28px rgba(15,23,42,.03); border: 1px solid #EDE9E2; }
    
    .stats-bar { display: flex; gap: 48px; padding: 20px 32px; background: #fff; flex-wrap: wrap; }
    .stat-item { display: flex; flex-direction: column; gap: 4px; }
    .stat-lbl { font-size: 11px; color: #A8C5A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-val { font-size: 22px; font-weight: 800; color: #2C3E35; }

    .grid-card {
      padding: 12px;
    }

    .table-wrap { overflow-x: auto; }
    
    .grid-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 4px;
      font-size: 13px;
    }
    
    .grid-table th, .grid-table td {
      padding: 8px;
      border: none;
      vertical-align: top;
    }
    
    .cashier-col {
      width: 220px;
      min-width: 200px;
      background: #EDE9E2;
      border-radius: 12px;
      position: sticky;
      left: 0;
      z-index: 10;
      box-shadow: 4px 0 10px rgba(0,0,0,0.02);
      padding: 12px !important;
    }
    
    .day-col {
      min-width: 150px;
      background: #fafbfc;
      border-radius: 12px;
      border: 1px solid #EDE9E2 !important;
    }
    
    .day-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 6px 0;
    }
    
    .day-name {
      font-weight: 800;
      font-size: 13px;
      color: #4A4D4B;
      text-transform: capitalize;
    }
    
    .day-date {
      font-size: 11px;
      color: #A8C5A0;
      font-weight: 600;
      margin-top: 2px;
    }

    .cashier-info { display: flex; align-items: center; gap: 10px; }
    .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: #EDE9E2; color: #2C3E35; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 1.5px solid rgba(29, 35, 31,0.1); }
    .cashier-info strong { display: block; color: #1A1D1B; font-size: 13px; }
    .cashier-info small { color: #A8C5A0; font-size: 11px; }

    /* Shifts Container */
    .shifts-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .shift-pill {
      background: #ffffff;
      border: 1.5px dashed #D8D2C8;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .shift-pill:hover {
      border-color: #2C3E35;
      background: rgba(29, 35, 31,0.02);
      transform: translateY(-1px);
    }

    .shift-icon {
      font-size: 16px;
    }

    .shift-details {
      display: flex;
      flex-direction: column;
    }

    .shift-name {
      font-weight: 700;
      font-size: 11px;
      color: #A8C5A0;
    }

    .shift-desc {
      font-size: 10.5px;
      color: #A8C5A0;
      font-weight: 600;
    }

    /* Assigned State */
    .shift-pill.assigned {
      background: #F5EDE4;
      border: 1.5px solid #fde68a;
    }
    
    .shift-pill.assigned .shift-name {
      color: #D4924A;
    }
    
    .shift-pill.assigned .shift-desc {
      color: #b45309;
      font-weight: bold;
    }

    /* Active ON State */
    .shift-pill.assigned:not(.off):not(.conge) {
      background: #E8F0EB;
      border: 1.5px solid #bbf7d0;
    }
    
    .shift-pill.assigned:not(.off):not(.conge) .shift-name {
      color: #6B8F71;
    }
    
    .shift-pill.assigned:not(.off):not(.conge) .shift-desc {
      color: #15803d;
    }

    /* Repos OFF State */
    .shift-pill.off {
      background: #EDE9E2;
      border: 1.5px solid #cbd5e1;
    }
    
    .shift-pill.off .shift-name {
      color: #4A4D4B;
    }
    
    .shift-pill.off .shift-desc {
      color: #A8C5A0;
    }

    /* Congé CONGE State */
    .shift-pill.conge {
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
    }
    
    .shift-pill.conge .shift-name {
      color: #6B8F71;
    }
    
    .shift-pill.conge .shift-desc {
      color: #5A7263;
    }

    .btn { padding: 10px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, #2C3E35 0%, #1A1D1B 100%); color: #fff; box-shadow: 0 4px 12px rgba(29, 35, 31,.2); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(29, 35, 31,.3); }
    .btn-secondary { background: #EDE9E2; color: #4A4D4B; }
    .btn-secondary:hover { background: #D8D2C8; }
    .btn-danger { background: #F5E4E4; color: #C0483A; border: 1.5px solid #C0483A; }
    .btn-danger:hover { background: #C0483A; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
    .modal { background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,.15); border: 1px solid rgba(29, 35, 31,0.1); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #1A1D1B; }
    .btn-close-x { background: none; border: none; font-size: 18px; color: #A8C5A0; cursor: pointer; font-weight: bold; }
    
    .error-banner { background: #F5E4E4; border-left: 4px solid #ef4444; color: #b91c1c; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; margin-bottom: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group label { font-size: 13px; font-weight: 700; color: #4A4D4B; }
    .form-group input, .form-group select { padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; }
    .form-group input:focus, .form-group select:focus { border-color: #2C3E35; background: #EDE9E2; }
    
    .disabled-input {
      background: #EDE9E2;
      color: #A8C5A0;
      cursor: not-allowed;
      border-color: #D8D2C8 !important;
      font-weight: 600;
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #EDE9E2; }
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
