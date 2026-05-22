import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Stock, StockMovement } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-stocks',
  standalone: true,
  styleUrls: ['./stocks.component.css'],
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
    <div class="page">
      <div class="page-header">
        <h2>Gestion des stocks</h2>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Seuil min</th>
                <th>Unité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of stocks; track s.id) {
                <tr>
                  <td>{{ s.product?.name }}</td>
                  <td class="quantity" [class.low]="s.quantity <= s.min_threshold">{{ s.quantity }}</td>
                  <td>{{ s.min_threshold }}</td>
                  <td>{{ s.unit }}</td>
                  <td>
                    @if (s.quantity <= s.min_threshold) {
                      <span class="badge danger">Stock bas</span>
                    } @else {
                      <span class="badge ok">OK</span>
                    }
                  </td>
                  <td class="actions">
                    <button class="btn-sm" (click)="openMovement(s, 'in')">+ Entrée</button>
                    <button class="btn-sm" (click)="openMovement(s, 'out')">- Sortie</button>
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
            <h3>Mouvement de stock - {{ selectedStock?.product?.name }}</h3>
            <form (ngSubmit)="saveMovement()">
              <div class="form-group">
                <label>Type</label>
                <select [(ngModel)]="movementForm.type" name="type">
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                  <option value="adjustment">Ajustement</option>
                </select>
              </div>
              <div class="form-group">
                <label>Quantité</label>
                <input type="number" [(ngModel)]="movementForm.quantity" name="quantity" min="1" required />
              </div>
              <div class="form-group">
                <label>Raison</label>
                <input [(ngModel)]="movementForm.reason" name="reason" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
    }
  `,

})
export class StocksComponent implements OnInit {
  stocks: Stock[] = [];
  loading = true;
  showModal = false;
  selectedStock: Stock | null = null;
  movementForm: any = { type: 'in', quantity: 1, reason: '' };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.get<any>('stocks').subscribe({
      next: res => this.stocks = res.data || res,
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  openMovement(stock: Stock, type: string): void {
    this.selectedStock = stock;
    this.movementForm = { type, quantity: 1, reason: '' };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  saveMovement(): void {
    if (!this.selectedStock) return;
    this.api.post(`stocks/${this.selectedStock.id}/movements`, this.movementForm).subscribe({
      next: () => { this.closeModal(); this.load(); }
    });
  }
}
