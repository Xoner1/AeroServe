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

 @if (message) {
  <div class="alert" [ngClass]="messageType">
    {{ message }}
  </div>
}
  <!-- HEADER -->
  <div class="page-header">
    <h2>Points of Sale</h2>
    <button class="btn btn-primary" (click)="openModal()">+ Add</button>
  </div>
@for (group of groupedByAirport | keyvalue; track group.key) {

  <h2 class="airport-title">
  {{ group.key }}
  </h2>

  <div class="cards-grid">

    @for (pdv of group.value; track pdv.id) {

      <div class="pdv-card">

        <div class="pdv-header">
         <span [ngClass]="pdv.is_active ? 'status active' : 'status inactive'">
  {{ pdv.is_active ? 'Active' : 'Inactive' }}
</span>
        </div>

<h3>{{ pdv.name }}</h3>

@if (pdv._message) {
  <div class="card-message success">
    {{ pdv._message }}
  </div>
}
<p [ngClass]="pdv.responsableFb ? 'responsable' : 'responsable empty'">
   {{ getResponsableName(pdv) }}
</p>
<div class="pdv-actions">
  <button class="btn-edit" (click)="editPdv(pdv)">Edit</button>
  <button class="btn-delete" (click)="deletePdv(pdv.id)">Delete</button>
</div>

      </div>

    } <!-- INNER FOR CLOSED -->

  </div>

}

  <!-- MODAL -->
  @if (showModal) {
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">

        <h3>{{ editing ? 'Edit Point of Sale' : 'Add Point of Sale' }}</h3>

        <form (ngSubmit)="save()">

          <div class="form-group">
            <label>Name</label>
            <input [(ngModel)]="form.name" name="name" required />
          </div>

          <div class="form-group">
            <label>Airport</label>
            <select [(ngModel)]="form.airport_id" name="airport_id" required>
              @for (a of airports; track a.id) {
                <option [ngValue]="a.id">
                  {{ a.name }} ({{ a.code }})
                </option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="form.is_active" name="is_active" />
              Active
            </label>
          </div>

          <div class="form-group">
            <label>Location</label>
            <select [(ngModel)]="form.location" name="location">
              <option [ngValue]="null">-- Choisir --</option>
              <option value="AIRSIDE">AIRSIDE</option>
              <option value="LANDSIDE">LANDSIDE</option>
            </select>
          </div>

          <div class="form-group">
            <label>Responsible FB</label>

            <select [(ngModel)]="form.responsable_fb_id" name="responsable_fb_id">
              <option [ngValue]="null">-- None --</option>

              @for (u of fbUsers; track u.id) {
                <option [ngValue]="u.id">
                  {{ u.first_name }} {{ u.last_name }}
                </option>
              }
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">
              Cancel
            </button>

            <button type="submit" class="btn btn-primary">
              {{ editing ? 'Update' : 'Create' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; }
    
    .page-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 0;
    }
    
    .page-header h2 { 
      margin: 0; 
      font-size: 26px; 
      font-weight: 700; 
      color: #0f172a; 
    }
    
    .alert {
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 600;
      animation: fadeIn 0.3s ease;
    }
    
    .alert.success {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      color: #16a34a;
      border: 1px solid rgba(22, 163, 74, 0.1);
    }
    
    .alert.error {
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.1);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .airport-title {
      margin: 28px 0 16px;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .pdv-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid transparent;
      transition: all 0.3s ease;
    }
    
    .pdv-card:hover {
      transform: translateY(-6px);
      border-color: #b22222;
      box-shadow: 0 20px 40px rgba(178, 34, 34, 0.15);
    }
    
    .pdv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .status {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 999px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    
    .status.active {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      color: #16a34a;
      border: 1px solid rgba(22, 163, 74, 0.1);
    }
    
    .status.inactive {
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.1);
    }
    
    .pdv-card h3 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px;
    }
    
    .responsable {
      font-size: 13px;
      font-weight: 600;
      color: #b22222;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .responsable.empty {
      color: #9ca3af;
      font-style: italic;
    }
    
    .card-message {
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      color: #16a34a;
      border: 1px solid rgba(22, 163, 74, 0.1);
    }
    
    .pdv-actions {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    
    .btn-edit {
      flex: 1;
      padding: 8px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-edit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(178, 34, 34, 0.2);
    }
    
    .btn-delete {
      flex: 1;
      padding: 8px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-delete:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(220, 38, 38, 0.2);
    }
    
    .btn-primary {
      padding: 10px 22px;
      border-radius: 12px;
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 16px rgba(178, 34, 34, 0.2);
      transition: all 0.2s ease;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(178, 34, 34, 0.3);
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
      padding: 32px;
      border-radius: 24px;
      width: 100%;
      max-width: 520px;
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
    
    .form-group label input[type=\"checkbox\"] {
      cursor: pointer;
    }
    
    input, select {
      padding: 12px 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      color: #111827;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    
    input::placeholder, select::placeholder {
      color: #9ca3af;
    }
    
    input:focus, select:focus {
      border-color: #b22222;
      box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
      background: #fff9f9;
      outline: none;
    }
    
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 28px;
      padding-top: 24px;
      border-top: 1px solid #f3f4f6;
    }
    
    .btn-secondary {
      padding: 10px 22px;
      border: none;
      background: #f3f4f6;
      color: #334155;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-secondary:hover {
      background: #e5e7eb;
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
          <button id="_cancel" style="padding:10px 24px;border:2px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Annuler</button>
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
