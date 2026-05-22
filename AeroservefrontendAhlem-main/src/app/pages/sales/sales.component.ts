import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Sale } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="9" />
    } @else {
    <div class="page">
      <div class="page-header">
        <h2>Ventes</h2>
        <button class="btn btn-primary" (click)="openModal()">+ Nouvelle vente</button>
      </div>

      <div class="stats-row">
        <div class="stat-mini">
          <span class="stat-val">{{ totalAmount | number:'1.2-2' }} TND</span>
          <span class="stat-lbl">Total</span>
        </div>
        <div class="stat-mini">
          <span class="stat-val">{{ sales.length }}</span>
          <span class="stat-lbl">Transactions</span>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Caissier</th>
                <th>PDV</th>
                <th>Total (TND)</th>
                <th>Paiement</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of sales; track s.id) {
                <tr>
                  <td>#{{ s.id }}</td>
                  <td>{{ s.caissier?.first_name }} {{ s.caissier?.last_name }}</td>
                  <td>{{ s.point_de_vente?.name }}</td>
                  <td class="amount">{{ s.total_amount | number:'1.2-2' }}</td>
                  <td><span class="badge payment">{{ s.payment_method }}</span></td>
                  <td>{{ s.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="actions">
                    <button class="btn-sm" (click)="viewSale(s)">Détails</button>
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
            @if (viewing && selectedSale) {
              <h3>Vente #{{ selectedSale.id }}</h3>
              <table class="detail-table">
                <thead><tr><th>Produit</th><th>Qté</th><th>Prix U.</th><th>Sous-total</th></tr></thead>
                <tbody>
                  @for (item of selectedSale.items; track item.id) {
                    <tr>
                      <td>{{ item.product?.name }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.unit_price | number:'1.2-2' }}</td>
                      <td>{{ item.subtotal | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="total-row">Total: {{ selectedSale.total_amount | number:'1.2-2' }} TND</div>
              <div class="modal-actions">
                <button class="btn btn-secondary" (click)="closeModal()">Fermer</button>
              </div>
            } @else {
              <h3>Nouvelle vente</h3>
              <form (ngSubmit)="save()">
                <div class="form-group">
                  <label>Point de vente (ID)</label>
                  <input type="number" [(ngModel)]="form.pdv_id" name="pdv_id" />
                </div>
                <div class="form-group">
                  <label>Mode de paiement</label>
                  <select [(ngModel)]="form.payment_method" name="payment_method" required>
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <h4>Articles</h4>
                @for (item of form.items; track $index) {
                  <div class="item-row">
                    <input type="number" [(ngModel)]="item.product_id" [name]="'pid'+$index" placeholder="ID Produit" required />
                    <input type="number" [(ngModel)]="item.quantity" [name]="'qty'+$index" placeholder="Qté" min="1" required />
                    <button type="button" class="btn-icon danger" (click)="removeItem($index)">✕</button>
                  </div>
                }
                <button type="button" class="btn-sm" (click)="addItem()">+ Article</button>
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                  <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
              </form>
            }
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
    
    .stats-row { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    
    .stat-mini { 
      background: linear-gradient(135deg, #fff2f2 0%, #ffffff 100%);
      border-radius: 18px; 
      padding: 20px 24px; 
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      display: flex; 
      flex-direction: column;
      border: 1px solid rgba(178, 34, 34, 0.08);
    }
    
    .stat-val { 
      font-size: 24px; 
      font-weight: 700; 
      color: #b22222;
      margin-bottom: 4px;
    }
    
    .stat-lbl { 
      font-size: 13px; 
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    
    .card { 
      background: #ffffff; 
      border-radius: 22px; 
      padding: 24px; 
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(178, 34, 34, 0.05);
    }
    
    .table-wrap { overflow-x: auto; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 14px; 
    }
    
    th { 
      text-align: left; 
      padding: 14px 16px; 
      background: linear-gradient(135deg, #fff8f8 0%, #ffffff 100%);
      color: #6b7280; 
      font-weight: 700;
      border-bottom: 2px solid #f1f1f1;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.03em;
    }
    
    td { 
      padding: 14px 16px; 
      border-bottom: 1px solid #f3f4f6; 
      color: #334155;
      transition: background 0.2s ease;
    }
    
    tr:hover td { background: rgba(178, 34, 34, 0.02); }
    
    .amount { 
      font-weight: 700; 
      color: #b22222;
    }
    
    .actions { 
      display: flex; 
      gap: 8px; 
    }
    
    .badge.payment { 
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
      color: #b22222;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid rgba(178, 34, 34, 0.1);
    }
    
    .btn-sm { 
      padding: 8px 14px; 
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
    
    .btn-icon { 
      background: none; 
      border: none; 
      cursor: pointer; 
      font-size: 16px; 
      padding: 6px 8px; 
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .btn-icon.danger:hover { 
      background: rgba(220, 38, 38, 0.1); 
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
      max-width: 580px; 
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
    
    .modal h4 { 
      margin: 20px 0 14px; 
      font-size: 15px; 
      font-weight: 700;
      color: #374151;
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
    }
    
    .form-group input, 
    .form-group select { 
      padding: 12px 14px; 
      border: 1.5px solid #e5e7eb; 
      border-radius: 10px; 
      font-size: 14px; 
      outline: none;
      color: #111827;
      font-family: inherit;
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
    
    .item-row { 
      display: grid; 
      grid-template-columns: 1fr 1fr auto; 
      gap: 10px; 
      align-items: center; 
      margin-bottom: 12px; 
    }
    
    .item-row input { 
      padding: 12px 14px; 
      border: 1.5px solid #e5e7eb; 
      border-radius: 10px; 
      font-size: 14px; 
      outline: none;
      color: #111827;
      transition: all 0.2s ease;
    }
    
    .item-row input:focus {
      border-color: #b22222;
      box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
    }
    
    .total-row { 
      text-align: right; 
      font-size: 18px; 
      font-weight: 700; 
      color: #b22222;
      margin-top: 16px; 
      padding-top: 14px; 
      border-top: 2px solid #f3f4f6; 
    }
    
    .detail-table { 
      margin-top: 16px;
      width: 100%;
    }
    
    .detail-table th,
    .detail-table td {
      padding: 12px 14px;
      text-align: left;
    }
    
    .detail-table th {
      background: linear-gradient(135deg, #fff8f8 0%, #ffffff 100%);
      border-bottom: 2px solid #f1f1f1;
      font-weight: 700;
    }
    
    .detail-table td {
      border-bottom: 1px solid #f3f4f6;
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
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  loading = true;
  totalAmount = 0;
  showModal = false;
  viewing = false;
  selectedSale: Sale | null = null;
  form: any = { pdv_id: null, payment_method: 'cash', items: [{ product_id: null, quantity: 1 }] };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.get<any>('sales').subscribe({
      next: res => {
        this.sales = res.data || res;
        this.totalAmount = this.sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  openModal(): void {
    this.form = { pdv_id: null, payment_method: 'cash', items: [{ product_id: null, quantity: 1 }] };
    this.viewing = false;
    this.showModal = true;
  }

  viewSale(s: Sale): void {
    this.selectedSale = s;
    this.viewing = true;
    this.showModal = true;
  }

  addItem(): void { this.form.items.push({ product_id: null, quantity: 1 }); }
  removeItem(i: number): void { this.form.items.splice(i, 1); }

  closeModal(): void { this.showModal = false; }

  save(): void {
    this.api.post('sales', this.form).subscribe({
      next: () => { this.closeModal(); this.load(); }
    });
  }
}
