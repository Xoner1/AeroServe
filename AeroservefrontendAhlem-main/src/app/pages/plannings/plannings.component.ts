import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Planning } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-plannings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
      <div class="page">
        
        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Cashier Shifts & Schedules</h2>
            <p class="subtitle">Assign cashiers to airport terminal points of sale</p>
          </div>
          <button class="btn btn-primary" (click)="openModal()">+ Add Schedule</button>
        </div>

        <!-- ─── FILTER / STATS ─── -->
        <div class="stats-bar card">
          <div class="stat-item">
            <span class="stat-lbl">Active Schedules</span>
            <span class="stat-val">{{ plannings.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Total Cashiers</span>
            <span class="stat-val">{{ cashiers.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Points of Sale</span>
            <span class="stat-val">{{ pdvs.length }}</span>
          </div>
        </div>

        <!-- ─── SCHEDULE TABLE ─── -->
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cashier</th>
                  <th>Point of Sale</th>
                  <th>Terminal Location</th>
                  <th>Scheduled Date</th>
                  <th>Shift Hours / Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (p of plannings; track p.id) {
                  <tr>
                    <td>
                      <div class="cashier-info">
                        <span class="avatar-circle">{{ getInitials(p.caissier) }}</span>
                        <div>
                          <strong>{{ p.caissier?.first_name }} {{ p.caissier?.last_name }}</strong>
                          <small>{{ p.caissier?.email }}</small>
                        </div>
                      </div>
                    </td>
                    <td>🏪 {{ p.point_de_vente?.name || 'Rest Day' }}</td>
                    <td>
                      @if (p.point_de_vente?.location) {
                        <span class="badge-loc" [class.airside]="p.point_de_vente?.location === 'AIRSIDE'">
                          {{ p.point_de_vente?.location }}
                        </span>
                      } @else {
                        <span class="badge-loc off">-</span>
                      }
                    </td>
                    <td>
                      <span class="date-tag">
                        📅 {{ p.date | date:'EEEE, dd MMM yyyy' }}
                      </span>
                    </td>
                    <td>
                      @if (p.is_day_off) {
                        <span class="badge-rest">🏡 Day Off (Repos)</span>
                      } @else {
                        <span class="badge-shift">⏰ {{ formatTime(p.start_time) }} - {{ formatTime(p.end_time) }}</span>
                      }
                    </td>
                    <td class="actions">
                      <button class="btn-icon edit" (click)="editPlanning(p)">✏️</button>
                      <button class="btn-icon danger" (click)="deletePlanning(p.id)">🗑️</button>
                    </td>
                  </tr>
                }
                @if (plannings.length === 0) {
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: #94a3b8;">
                      No shift assignments found. Click "+ Add Schedule" to set up cashier plannings.
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
                <h3>{{ editing ? 'Edit' : 'Create' }} Cashier Assignment</h3>
                <button class="btn-close-x" (click)="closeModal()">✕</button>
              </div>
              
              @if (validationError) {
                <div class="error-banner">⚠️ {{ validationError }}</div>
              }

              <form (ngSubmit)="save()">
                
                <div class="form-group">
                  <label>Select Cashier *</label>
                  <select [(ngModel)]="form.caissier_id" name="caissier_id" required>
                    <option [value]="null" disabled selected>Choose a Cashier...</option>
                    @for (c of cashiers; track c.id) {
                      <option [value]="c.id">
                        {{ c.first_name }} {{ c.last_name }} ({{ c.status }})
                      </option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>Assignment Date *</label>
                  <input type="date" [(ngModel)]="form.date" name="date" required />
                </div>

                <div class="form-group row-checkbox">
                  <label class="chk-label">
                    <input type="checkbox" [(ngModel)]="form.is_day_off" name="is_day_off" />
                    <span>Set as Rest Day / Day Off</span>
                  </label>
                </div>

                @if (!form.is_day_off) {
                  <div class="form-group">
                    <label>Select Point of Sale *</label>
                    <select [(ngModel)]="form.pdv_id" name="pdv_id" required>
                      <option [value]="null" disabled selected>Choose a Point of Sale...</option>
                      @for (pdv of pdvs; track pdv.id) {
                        <option [value]="pdv.id">
                          🏪 {{ pdv.name }} [{{ pdv.location || 'AIRSIDE' }}]
                        </option>
                      }
                    </select>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Shift Start Hour</label>
                      <input type="time" [(ngModel)]="form.start_time" name="start_time" required />
                    </div>
                    <div class="form-group">
                      <label>Shift End Hour</label>
                      <input type="time" [(ngModel)]="form.end_time" name="end_time" required />
                    </div>
                  </div>
                }

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                  <button type="submit" class="btn btn-primary">{{ editing ? 'Save Changes' : 'Confirm Assignment' }}</button>
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
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; }
    .subtitle { margin: 4px 0 0 0; font-size: 14px; color: #64748b; }
    
    .card { background: #ffffff; border-radius: 22px; padding: 24px; box-shadow: 0 12px 28px rgba(15,23,42,.04); border: 1px solid #f1f5f9; }
    
    .stats-bar { display: flex; gap: 48px; padding: 20px 32px; background: #fff; }
    .stat-item { display: flex; flex-direction: column; gap: 4px; }
    .stat-lbl { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-val { font-size: 24px; font-weight: 800; color: #0f172a; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 16px; background: #f8fafc; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
    td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    
    .cashier-info { display: flex; align-items: center; gap: 12px; }
    .avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #2563eb; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px; }
    .cashier-info strong { display: block; color: #0f172a; font-size: 14px; }
    .cashier-info small { color: #64748b; font-size: 12px; }

    .badge-loc { font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; background: #f1f5f9; color: #475569; }
    .badge-loc.airside { background: #fef2f2; color: #dc2626; }
    .badge-loc.off { background: transparent; color: #cbd5e1; }

    .date-tag { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; color: #475569; display: inline-flex; }

    .badge-rest { background: #f0fdf4; color: #16a34a; border: 1.5px solid rgba(22,163,74,.15); padding: 6px 12px; border-radius: 99px; font-size: 12.5px; font-weight: bold; }
    .badge-shift { background: #eff6ff; color: #1d4ed8; border: 1.5px solid rgba(37,99,235,.15); padding: 6px 12px; border-radius: 99px; font-size: 12.5px; font-weight: bold; }

    .actions { display: flex; gap: 8px; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; padding: 6px 8px; border-radius: 8px; transition: all .2s; }
    .btn-icon:hover { background: #f1f5f9; }
    .btn-icon.danger:hover { background: #fee2e2; }

    .btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,.25); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,.35); }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    .btn-secondary:hover { background: #e2e8f0; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.6); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
    .modal { background: #fff; border-radius: 24px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    .btn-close-x { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; font-weight: bold; }
    
    .error-banner { background: #fee2e2; border-left: 4px solid #ef4444; color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }

    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
    .form-group label { font-size: 13.5px; font-weight: 700; color: #475569; }
    .form-group input, .form-group select { padding: 12px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; }
    .form-group input:focus, .form-group select:focus { border-color: #2563eb; }
    
    .row-checkbox { flex-direction: row; align-items: center; gap: 8px; }
    .chk-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 700 !important; color: #0f172a !important; }
    .chk-label input { width: 18px; height: 18px; cursor: pointer; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
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
  
  form: any = { caissier_id: null, pdv_id: null, date: '', is_day_off: false, start_time: '', end_time: '' };
  validationError = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadDropdownData();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('plannings').subscribe({
      next: res => this.plannings = res.data || res,
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  loadDropdownData(): void {
    // Load cashiers
    this.api.get<any[]>('caissier').subscribe({
      next: res => {
        this.cashiers = res.filter(c => c.status === 'active');
      }
    });

    // Load points de vente
    this.api.get<any[]>('points-de-vente').subscribe({
      next: res => {
        this.pdvs = res;
      }
    });
  }

  getInitials(user: any): string {
    if (!user) return '?';
    return (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    // Format HH:MM:SS into HH:MM
    const parts = timeStr.split(':');
    return parts.slice(0, 2).join(':');
  }

  openModal(): void {
    this.form = { caissier_id: null, pdv_id: null, date: '', is_day_off: false, start_time: '', end_time: '' };
    this.editing = false;
    this.validationError = '';
    this.showModal = true;
  }

  editPlanning(p: Planning): void {
    this.form = {
      caissier_id: p.caissier_id,
      pdv_id: p.pdv_id,
      date: p.date,
      is_day_off: !!p.is_day_off,
      start_time: this.formatTime(p.start_time || ''),
      end_time: this.formatTime(p.end_time || '')
    };
    this.editId = p.id;
    this.editing = true;
    this.validationError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  save(): void {
    this.validationError = '';

    if (!this.form.caissier_id || !this.form.date) {
      this.validationError = 'Please select a Cashier and Assignment Date.';
      return;
    }

    if (!this.form.is_day_off && !this.form.pdv_id) {
      this.validationError = 'Please select a Point of Sale or mark this as a Day Off.';
      return;
    }

    if (!this.form.is_day_off && (!this.form.start_time || !this.form.end_time)) {
      this.validationError = 'Please fill shift start and end times.';
      return;
    }

    const selectedCashier = this.cashiers.find(c => c.id == this.form.caissier_id);
    const cashierName = selectedCashier ? `${selectedCashier.first_name} ${selectedCashier.last_name}` : 'This cashier';

    // Verify constraints
    const sameDayPlannings = this.plannings.filter(p => p.caissier_id == this.form.caissier_id && p.date === this.form.date && p.id !== this.editId);
    
    // Check if cashier already has a day off scheduled today
    const hasDayOffToday = sameDayPlannings.some(p => p.is_day_off);
    if (hasDayOffToday && !this.form.is_day_off) {
      this.validationError = `${cashierName} has a scheduled Day Off today. You cannot assign active shifts.`;
      return;
    }

    if (this.form.is_day_off && sameDayPlannings.length > 0) {
      this.validationError = `${cashierName} already has active shifts scheduled today. Remove them first.`;
      return;
    }

    // Check max shifts: limit to a max of 2 POS/shifts per day per cashier
    if (!this.form.is_day_off && sameDayPlannings.length >= 2) {
      this.validationError = `Constraint Violated: ${cashierName} already has 2 scheduled shifts today (Max allowed: 2).`;
      return;
    }

    // Prepare payload
    const payload = {
      ...this.form,
      pdv_id: this.form.is_day_off ? null : this.form.pdv_id,
      start_time: this.form.is_day_off ? null : this.form.start_time,
      end_time: this.form.is_day_off ? null : this.form.end_time
    };

    const req = this.editing
      ? this.api.put(`plannings/${this.editId}`, payload)
      : this.api.post('plannings', payload);

    req.subscribe({
      next: () => {
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.validationError = err.error?.message || 'Error saving assignment. Please try again.';
      }
    });
  }

  deletePlanning(id: number): void {
    if (confirm('Delete this cashier planning schedule assignment?')) {
      this.api.delete(`plannings/${id}`).subscribe(() => this.load());
    }
  }
}
