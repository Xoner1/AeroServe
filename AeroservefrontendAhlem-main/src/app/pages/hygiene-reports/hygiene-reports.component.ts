import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { HygieneReport } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-hygiene-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
    <div class="page">
      <div class="page-header">
        <h2>Rapports d'hygiène</h2>
        <button class="btn btn-primary" (click)="openModal()">+ Nouveau rapport</button>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Inspecteur</th>
                <th>Allergènes</th>
                <th>Expiration</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of reports; track r.id) {
                <tr>
                  <td>{{ r.product?.name }}</td>
                  <td>{{ r.inspector?.first_name }} {{ r.inspector?.last_name }}</td>
                  <td>{{ r.allergens_verified ? '' : '' }}</td>
                  <td>{{ r.expiration_verified ? '' : '' }}</td>
                  <td>
                    <span class="badge" [class]="'status-' + r.status">
                      {{ r.status === 'conforme' ? 'Conforme' : r.status === 'non_conforme' ? 'Non conforme' : 'En cours' }}
                    </span>
                  </td>
                  <td>{{ r.created_at | date:'dd/MM/yyyy' }}</td>
                  <td class="actions">
                    <button class="btn-icon" (click)="editReport(r)"></button>
                    <button class="btn-icon danger" (click)="deleteReport(r.id)"></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editing ? 'Modifier' : 'Nouveau' }} rapport</h3>
            <form (ngSubmit)="save()">
              <div class="form-group">
                <label>Produit (ID)</label>
                <input type="number" [(ngModel)]="form.product_id" name="product_id" required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <input type="checkbox" [(ngModel)]="form.allergens_verified" name="allergens_verified" />
                    Allergènes vérifiés
                  </label>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" [(ngModel)]="form.expiration_verified" name="expiration_verified" />
                    Expiration vérifiée
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Statut</label>
                <select [(ngModel)]="form.status" name="status" required>
                  <option value="conforme">Conforme</option>
                  <option value="non_conforme">Non conforme</option>
                  <option value="en_cours">En cours</option>
                </select>
              </div>
              <div class="form-group">
                <label>Remarques</label>
                <textarea [(ngModel)]="form.remarks" name="remarks" rows="3"></textarea>
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
    .page-header h2 { margin: 0; font-size: 26px; font-weight: 700; color: #1A1D1B; }
    .card { background: #ffffff; border-radius: 22px; padding: 24px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06); border: 1px solid rgba(29, 35, 31, 0.05); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 14px 16px; background: linear-gradient(135deg, #fff8f8 0%, #ffffff 100%); color: #6b7280; font-weight: 700; border-bottom: 2px solid #f1f1f1; text-transform: uppercase; font-size: 12px; letter-spacing: 0.03em; }
    td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; color: #4A4D4B; transition: background 0.2s ease; }
    tr:hover td { background: rgba(29, 35, 31, 0.02); }
    .actions { display: flex; gap: 8px; }
    .badge { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; }
    .status-conforme { background: linear-gradient(135deg, #E8F0EB 0%, #ffffff 100%); color: #6B8F71; border: 1px solid rgba(107,131,116, 0.1); }
    .status-non_conforme { background: linear-gradient(135deg, #F5E4E4 0%, #ffffff 100%); color: #C0483A; border: 1px solid rgba(194,115,115, 0.1); }
    .status-en_cours { background: linear-gradient(135deg, #F5EDE4 0%, #ffffff 100%); color: #D4924A; border: 1px solid rgba(212,163,115, 0.1); }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; padding: 6px 8px; border-radius: 8px; transition: all 0.2s ease; }
    .btn-icon:hover { background: rgba(29, 35, 31, 0.1); transform: scale(1.1); }
    .btn-icon.danger:hover { background: rgba(194,115,115, 0.1); }
    .btn { padding: 10px 22px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s ease; }
    .btn-primary { background: linear-gradient(135deg, #2C3E35 0%, #1A1D1B 100%); color: #fff; box-shadow: 0 8px 16px rgba(29, 35, 31, 0.2); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(29, 35, 31, 0.3); }
    .btn-secondary { background: #f3f4f6; color: #4A4D4B; }
    .btn-secondary:hover { background: #e5e7eb; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
    .modal { background: #ffffff; border-radius: 24px; padding: 32px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); border: 1px solid rgba(29, 35, 31, 0.1); }
    .modal h3 { margin: 0 0 24px; font-size: 22px; font-weight: 700; color: #111827; }
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
    .form-group label { font-size: 14px; font-weight: 700; color: #374151; display: flex; align-items: center; gap: 6px; }
    .form-group label input[type="checkbox"] { cursor: pointer; }
    .form-group input[type="number"], .form-group select, .form-group textarea { padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; outline: none; font-family: inherit; color: #111827; transition: all 0.2s ease; }
    .form-group input::placeholder, .form-group select::placeholder, .form-group textarea::placeholder { color: #9ca3af; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #2C3E35; box-shadow: 0 0 0 3px rgba(29, 35, 31, 0.1); background: #EDE9E2; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; padding-top: 24px; border-top: 1px solid #f3f4f6; }
  `]
})
export class HygieneReportsComponent implements OnInit {
  reports: HygieneReport[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editId = 0;
  form: any = { product_id: null, allergens_verified: false, expiration_verified: false, status: 'en_cours', remarks: '' };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.get<any>('hygiene-reports').subscribe({
      next: res => this.reports = res.data || res,
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  openModal(): void {
    this.form = { product_id: null, allergens_verified: false, expiration_verified: false, status: 'en_cours', remarks: '' };
    this.editing = false;
    this.showModal = true;
  }

  editReport(r: HygieneReport): void {
    this.form = { ...r };
    this.editId = r.id;
    this.editing = true;
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  save(): void {
    const req = this.editing
      ? this.api.put(`hygiene-reports/${this.editId}`, this.form)
      : this.api.post('hygiene-reports', this.form);
    req.subscribe({ next: () => { this.closeModal(); this.load(); } });
  }

  deleteReport(id: number): void {
    if (confirm('Supprimer ce rapport ?')) {
      this.api.delete(`hygiene-reports/${id}`).subscribe(() => this.load());
    }
  }
}
