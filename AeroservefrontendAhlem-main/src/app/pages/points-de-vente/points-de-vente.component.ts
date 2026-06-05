import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PointDeVente, Airport } from '../../core/models';

@Component({
  selector: 'app-points-de-vente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page">
  <!-- ─── HEADER ─── -->
  <div class="page-header">
    <div>
      <h2>Points de Vente</h2>
      <p class="subtitle">Administrez et configurez les différents terminaux de vente et attribuez les responsables F&B</p>
    </div>
    <button class="btn btn-primary" (click)="openModal()">
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      Ajouter un Point de Vente
    </button>
  </div>

  @if (message) {
    <div class="alert" [ngClass]="messageType === 'success' ? 'alert-success' : 'alert-error'">
      {{ message }}
    </div>
  }

  <!-- ─── AIRPORT GROUPS ─── -->
  @for (group of groupedByAirport | keyvalue; track group.key) {
    <div class="airport-group" style="margin-bottom: 24px;">
      <h3 class="airport-title">
        <svg class="airport-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5z"/>
        </svg>
        {{ group.key }}
      </h3>

      <div class="cards-grid">
        @for (pdv of group.value; track pdv.id) {
          <div class="pdv-card" [class.inactive-card]="!pdv.is_active">
            <div class="pdv-card-header">
              <span class="badge" [class.badge-success]="pdv.is_active" [class.badge-error]="!pdv.is_active">
                {{ pdv.is_active ? 'Actif' : 'Inactif' }}
              </span>
              @if (pdv.location) {
                <span class="badge badge-neutral font-mono uppercase text-xs">{{ pdv.location }}</span>
              }
            </div>

            <h4 class="pdv-name">{{ pdv.name }}</h4>

            @if (pdv._message) {
              <div class="card-message success">
                {{ pdv._message }}
              </div>
            }

            <div class="pdv-responsable">
              <span class="label">Responsable F&B</span>
              <div class="value" [class.empty]="!pdv.responsableFb">
                <svg class="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{{ getResponsableName(pdv) }}</span>
              </div>
            </div>

            <div class="pdv-actions">
              <button class="btn btn-secondary btn-sm" (click)="editPdv(pdv)">
                <svg class="btn-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 4px;">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Modifier
              </button>
              <button class="btn btn-danger btn-sm" (click)="deletePdv(pdv.id)">
                <svg class="btn-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 4px;">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Supprimer
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  }

  <!-- ─── MODAL ADD/EDIT ─── -->
  @if (showModal) {
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editing ? 'Modifier le Point de Vente' : 'Ajouter un Point de Vente' }}</h3>
          <button class="close-btn" (click)="closeModal()" style="font-size: 18px; color: var(--text-muted); cursor: pointer;">✕</button>
        </div>

        <form (ngSubmit)="save()">
          <div class="modal-body">
            <div class="form-group">
              <label>Nom du Point de Vente *</label>
              <input [(ngModel)]="form.name" name="name" placeholder="Ex: Prime Burger Terminal 2" required />
            </div>

            <div class="form-group">
              <label>Aéroport Rattaché *</label>
              <select [(ngModel)]="form.airport_id" name="airport_id" required>
                <option [ngValue]="null" disabled>-- Choisir un aéroport --</option>
                @for (a of airports; track a.id) {
                  <option [ngValue]="a.id">
                    {{ a.name }} ({{ a.code }})
                  </option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Zone / Emplacement</label>
              <select [(ngModel)]="form.location" name="location">
                <option [ngValue]="null">-- Non spécifié --</option>
                <option value="AIRSIDE">AIRSIDE (Zone sous douane)</option>
                <option value="LANDSIDE">LANDSIDE (Zone publique)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Responsable F&B Affecté</label>
              <select [(ngModel)]="form.responsable_fb_id" name="responsable_fb_id">
                <option [ngValue]="null">-- Aucun responsable --</option>
                @for (u of fbUsers; track u.id) {
                  <option [ngValue]="u.id">
                    {{ u.first_name }} {{ u.last_name }}
                  </option>
                }
              </select>
            </div>

            <div class="form-group-checkbox" style="margin-top: 16px;">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="form.is_active" name="is_active" />
                <span class="checkmark"></span>
                <span class="checkbox-label" style="margin-left: 8px;">Point de vente actif</span>
              </label>
            </div>
          </div>

          <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; background: #F8FAFC;">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editing ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    
    .subtitle {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .alert {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
    }
    
    .alert-success {
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid rgba(21, 128, 61, 0.1);
    }
    
    .alert-error {
      background: #FEE2E2;
      color: #B91C1C;
      border: 1px solid rgba(185, 28, 28, 0.1);
    }

    .btn-icon-sm {
      width: 14px;
      height: 14px;
    }

    .btn-sm {
      height: 30px;
      padding: 0 12px;
      font-size: 12px;
      border-radius: var(--radius-md);
    }
    
    .airport-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .airport-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .airport-icon {
      width: 18px;
      height: 18px;
      color: var(--accent);
    }
    
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .pdv-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .pdv-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--accent);
    }

    .pdv-card.inactive-card {
      opacity: 0.8;
      background: var(--bg-secondary);
    }
    
    .pdv-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .pdv-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    
    .pdv-responsable {
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pdv-responsable .label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }

    .pdv-responsable .value {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .pdv-responsable .value.empty {
      color: var(--text-muted);
      font-style: italic;
    }

    .user-icon {
      width: 14px;
      height: 14px;
      color: var(--text-secondary);
    }

    .pdv-responsable .value.empty .user-icon {
      color: var(--text-muted);
    }
    
    .card-message {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 12px;
      font-weight: 500;
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid rgba(21, 128, 61, 0.1);
    }
    
    .pdv-actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }

    .pdv-actions button {
      flex: 1;
    }

    .close-btn {
      font-size: 18px;
      color: var(--text-muted);
      transition: color var(--transition);
      background: none;
      border: none;
    }

    .close-btn:hover {
      color: var(--text-primary);
    }

    /* Checkbox Styling */
    .form-group-checkbox {
      margin-top: 8px;
      margin-bottom: 8px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 28px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      user-select: none;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 0;
      height: 18px;
      width: 18px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      transition: all var(--transition);
    }

    .checkbox-container:hover input ~ .checkmark {
      background-color: var(--border);
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: var(--accent);
      border-color: var(--accent);
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 6px;
      top: 2px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .checkbox-label {
      line-height: 18px;
    }
  `]
})
export class PointsDeVenteComponent implements OnInit {

  pdvs: PointDeVente[] = [];
  airports: Airport[] = [];
  fbUsers: any[] = [];
message = '';
messageType: 'success' | 'error' | '' = '';
  showModal = false;
  editing = false;
  editId: number | null = null;

  form: any = {
    name: '',
    airport_id: null,
    is_active: true,
    location: null,
    responsable_fb_id: null
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadFbUsers();
    this.api.get<Airport[]>('airports').subscribe(a => this.airports = a);
  }

load(): void {
  this.api.get<any>('points-de-vente')
    .subscribe({
      next: res => {
   this.pdvs = (res.data || res).map((pdv: any) => ({
  ...pdv,
  responsableFb: pdv.responsable_fb || null,
  _message: ''
}));
      },
      error: err => console.error(err)
    });
}

  loadFbUsers(): void {
    this.api.get<any>('users?role=RESPONSABLE_FB')
      .subscribe({
        next: res => this.fbUsers = res.data || res,
        error: err => console.error(err)
      });
  }
get groupedByAirport(): Record<string, PointDeVente[]> {
  const groups: Record<string, PointDeVente[]> = {};

  this.pdvs.forEach(pdv => {
    const key = pdv.airport?.name || 'Unknown';

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(pdv);
  });

  return groups;
}
  openModal(): void {
    this.editing = false;
    this.editId = null;

    this.form = {
      name: '',
      airport_id: null,
      is_active: true,
      location: null,
      responsable_fb_id: null
    };

    this.showModal = true;
  }

  editPdv(pdv: PointDeVente): void {
  this.editing = true;
  this.editId = pdv.id;

  this.form = {
    name: pdv.name,
    airport_id: pdv.airport_id,
    is_active: pdv.is_active,
    location: pdv.location ?? null,
    responsable_fb_id: pdv.responsableFb?.id ?? null
  };

  this.showModal = true;
}
  closeModal(): void {
    this.showModal = false;
  }save(): void {
  const request = this.editing && this.editId
    ? this.api.put(`points-de-vente/${this.editId}`, this.form)
    : this.api.post('points-de-vente', this.form);

  request.subscribe({
   next: (res: any) => {
  this.closeModal();
  this.load();
  this.showMessage('Point de vente sauvegardé avec succès.', 'success');
    },
    error: (err: any) => {
      this.message = err.error?.message || err.error?.errors
        ? Object.values(err.error?.errors ?? {}).flat().join(' ') || err.error?.message
        : 'Une erreur est survenue.';
      this.messageType = 'error';
      setTimeout(() => { this.message = ''; this.messageType = ''; }, 5000);
    }
  });
}
getResponsableName(pdv: PointDeVente): string {
  return pdv.responsableFb
    ? `${pdv.responsableFb.first_name} ${pdv.responsableFb.last_name}`
    : 'Unassigned';
}
  deletePdv(id: number): void {
    this.confirmDelete(() => {
      this.api.delete(`points-de-vente/${id}`).subscribe({
        next: () => {
          this.load();
          this.showMessage('Point de vente supprimé.', 'success');
        },
        error: (err: any) => {
          this.showMessage(err.error?.message || 'Erreur lors de la suppression.', 'error');
        }
      });
    });
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => { this.message = ''; this.messageType = ''; }, 4000);
  }

  private confirmDelete(onConfirm: () => void): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">
        <div style="font-size:48px;margin-bottom:12px">&#9888;&#65039;</div>
        <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">Supprimer le point de vente ?</h3>
        <p style="margin:0 0 24px;color:#666;font-size:14px">Cette action est irr&eacute;versible.</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="_cancel" style="padding:10px 24px;border:2px solid #D8D2C8;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Annuler</button>
          <button id="_confirm" style="padding:10px 24px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;font-size:14px">Supprimer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_cancel')!.addEventListener('click', () => document.body.removeChild(overlay));
    overlay.querySelector('#_confirm')!.addEventListener('click', () => {
      document.body.removeChild(overlay);
      onConfirm();
    });
  }
}
