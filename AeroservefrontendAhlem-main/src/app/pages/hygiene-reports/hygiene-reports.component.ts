import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { HygieneReport, Product } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { AppIconComponent } from '../../shared/icon/app-icon.component';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-hygiene-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent, AppIconComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
      <div class="page">
        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Rapports de Contrôle d'Hygiène</h2>
            <p class="subtitle">Enregistrement et suivi de la conformité sanitaire des produits et préparations</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" (click)="downloadReports()">
              <app-icon name="Download" [size]="16"></app-icon> Télécharger CSV
            </button>
            <button class="btn btn-primary" (click)="openModal()">
              <app-icon name="ShieldCheck" [size]="16"></app-icon> Nouveau Rapport
            </button>
          </div>
        </div>

        <!-- ─── REPORTS TABLE ─── -->
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Inspecteur</th>
                <th>Vérifications</th>
                <th>Statut</th>
                <th>Date d'inspection</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of reports; track r.id) {
                <tr>
                  <td>
                    <strong style="color: var(--text-primary);">{{ r.product?.name || 'Produit inconnu' }}</strong>
                  </td>
                  <td>{{ r.inspector?.first_name }} {{ r.inspector?.last_name }}</td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <span class="badge" [class.badge-success]="r.allergens_verified" [class.badge-neutral]="!r.allergens_verified">
                        {{ r.allergens_verified ? 'Allergènes ✓' : 'Allergènes ✗' }}
                      </span>
                      <span class="badge" [class.badge-success]="r.expiration_verified" [class.badge-neutral]="!r.expiration_verified">
                        {{ r.expiration_verified ? 'DLC ✓' : 'DLC ✗' }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" 
                          [class.badge-success]="r.status === 'conforme'" 
                          [class.badge-error]="r.status === 'non_conforme'"
                          [class.badge-warning]="r.status === 'en_cours'">
                      {{ r.status === 'conforme' ? 'Conforme' : r.status === 'non_conforme' ? 'Non conforme' : 'En cours' }}
                    </span>
                  </td>
                  <td>{{ r.created_at | date:'dd/MM/yyyy' }}</td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                      <button class="btn btn-secondary" style="height: 28px; padding: 0 10px; font-size: 11px;" (click)="editReport(r)">
                        Modifier
                      </button>
                      <button class="btn btn-danger" style="height: 28px; padding: 0 10px; font-size: 11px;" (click)="deleteReport(r.id)">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (reports.length === 0) {
                <tr>
                  <td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">
                    Aucun rapport d'hygiène enregistré.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- ─── ADD / EDIT REPORT MODAL ─── -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ editing ? 'Modifier' : 'Nouveau' }} Rapport d'Hygiène</h3>
                <button (click)="closeModal()" style="font-size: 16px;">✕</button>
              </div>

              <form (ngSubmit)="save()">
                <div class="modal-body">
                  <div class="form-group">
                    <label>Produit à Inspecter *</label>
                    <select [(ngModel)]="form.product_id" name="product_id" required class="pd-select">
                      <option [ngValue]="null" disabled>-- Choisir un produit alimentaire --</option>
                      @for (p of foodProducts; track p.id) {
                        <option [ngValue]="p.id">{{ p.name }} ({{ p.type === 'food' ? 'Aliment' : 'Boisson' }})</option>
                      }
                    </select>
                  </div>

                  <div class="form-row" style="margin-top: 12px; margin-bottom: 12px;">
                    <div class="form-group-checkbox">
                      <input type="checkbox" id="allergens_verified" [(ngModel)]="form.allergens_verified" name="allergens_verified" />
                      <label for="allergens_verified" class="chk-label">Allergènes vérifiés</label>
                    </div>
                    <div class="form-group-checkbox">
                      <input type="checkbox" id="expiration_verified" [(ngModel)]="form.expiration_verified" name="expiration_verified" />
                      <label for="expiration_verified" class="chk-label">Expiration vérifiée</label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Statut de Conformité *</label>
                    <select [(ngModel)]="form.status" name="status" required>
                      <option value="conforme">Conforme</option>
                      <option value="non_conforme">Non conforme</option>
                      <option value="en_cours">En cours de vérification</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Remarques & Observations</label>
                    <textarea [(ngModel)]="form.remarks" name="remarks" rows="3" placeholder="Saisissez vos observations..."></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">{{ editing ? 'Modifier' : 'Enregistrer' }}</button>
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
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); }

    .form-group-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group-checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .chk-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
    }

    .pd-select {
      width: 100%;
    }
  `]
})
export class HygieneReportsComponent implements OnInit {
  reports: HygieneReport[] = [];
  foodProducts: Product[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editId = 0;
  form: any = { product_id: null, allergens_verified: false, expiration_verified: false, status: 'en_cours', remarks: '' };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadProducts();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('hygiene-reports').subscribe({
      next: res => {
        this.reports = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    this.api.get<any>('products').subscribe({
      next: res => {
        const list = res.data || res;
        this.foodProducts = list.filter((p: Product) => p.approval_status === 'approved' && p.type !== 'matiere_premiere');
      }
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

  closeModal(): void {
    this.showModal = false;
  }

  save(): void {
    if (!this.form.product_id) {
      Swal.fire('Erreur', 'Veuillez sélectionner un produit.', 'warning');
      return;
    }

    const req = this.editing
      ? this.api.put(`hygiene-reports/${this.editId}`, this.form)
      : this.api.post('hygiene-reports', this.form);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès !',
          text: this.editing ? 'Rapport mis à jour avec succès.' : 'Nouveau rapport d\'hygiène enregistré.',
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Impossible d\'enregistrer le rapport.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }

  downloadReports(): void {
    this.api.getBlob('hygiene-reports/export').subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hygiene-reports-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de télécharger le rapport.',
          icon: 'error',
          confirmButtonColor: '#EF4444',
        });
      }
    });
  }

  deleteReport(id: number): void {
    Swal.fire({
      title: 'Supprimer ce rapport ?',
      text: 'Cette action effacera définitivement le rapport d’hygiène.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`hygiene-reports/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'Le rapport a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Impossible d’effacer le rapport.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        });
      }
    });
  }
}
