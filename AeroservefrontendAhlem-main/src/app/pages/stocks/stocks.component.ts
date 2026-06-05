import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Stock } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { AppIconComponent } from '../../shared/icon/app-icon.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stocks',
  standalone: true,
  styleUrls: ['./stocks.component.css'],
  imports: [CommonModule, FormsModule, PageLoadingComponent, AppIconComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
      <div class="page">
        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Gestion des Stocks (FIFO)</h2>
            <p class="subtitle">Suivi du stock en temps réel et consommation par strate d'entrée First In, First Out</p>
          </div>
        </div>

        <!-- ─── KPI CARDS ─── -->
        <div class="kpi-grid">
          <div class="kpi-card info">
            <div class="kpi-icon">
              <app-icon name="Warehouse" [size]="20" className="teal-icon"></app-icon>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Stock Réel</span>
              <span class="kpi-value">{{ kpis.total_stock | number:'1.0-1' }} items</span>
            </div>
          </div>

          <div class="kpi-card success">
            <div class="kpi-icon">
              <app-icon name="CheckCircle" [size]="20" className="green-icon"></app-icon>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Entrées Jour</span>
              <span class="kpi-value">+{{ kpis.daily_inputs | number:'1.0-1' }}</span>
            </div>
          </div>

          <div class="kpi-card danger">
            <div class="kpi-icon">
              <app-icon name="LogOut" [size]="20" className="red-icon"></app-icon>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Sorties Jour</span>
              <span class="kpi-value">-{{ kpis.daily_outputs | number:'1.0-1' }}</span>
            </div>
          </div>

          <div class="kpi-card warning">
            <div class="kpi-icon">
              <app-icon name="AlertTriangle" [size]="20" className="amber-icon"></app-icon>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Sous Seuil</span>
              <span class="kpi-value">{{ kpis.critical_count }}</span>
            </div>
          </div>
        </div>

        <!-- ─── STOCKS LIST TABLE ─── -->
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Quantité</th>
                <th>Seuil Alerte</th>
                <th>Unité</th>
                <th>Statut</th>
                <th style="text-align: right;">Ajustement</th>
              </tr>
            </thead>
            <tbody>
              @for (s of stocks; track s.id) {
                <tr>
                  <td>
                    <strong style="color: var(--text-primary);">{{ s.product?.name }}</strong>
                  </td>
                  <td>
                    <span class="badge category-badge">{{ s.product?.category?.name || 'Général' }}</span>
                  </td>
                  <td class="quantity" [class.low]="s.quantity <= s.min_threshold">
                    {{ s.quantity | number:'1.0-2' }}
                  </td>
                  <td>{{ s.min_threshold }}</td>
                  <td>{{ s.unit }}</td>
                  <td>
                    @if (s.quantity <= s.min_threshold) {
                      <span class="badge badge-error">Stock bas</span>
                    } @else {
                      <span class="badge badge-success">Suffisant</span>
                    }
                  </td>
                  <td style="text-align: right;">
                    <div class="action-buttons">
                      <button class="action-btn success-btn" (click)="openMovement(s, 'in')">
                        <app-icon name="Check" [size]="12"></app-icon> Entrée
                      </button>
                      <button class="action-btn danger-btn" (click)="openMovement(s, 'out')">
                        <app-icon name="X" [size]="12"></app-icon> Sortie
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (stocks.length === 0) {
                <tr>
                  <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    Aucun article en stock pour le moment.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- ─── PAGINATION ─── -->
        @if (totalPages > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page === 1" (click)="goToPage(page - 1)">
              Précédent
            </button>
            <span class="page-info">Page {{ page }} sur {{ totalPages }}</span>
            <button class="page-btn" [disabled]="page === totalPages" (click)="goToPage(page + 1)">
              Suivant 
            </button>
          </div>
        }

        <!-- ─── MOVEMENT MODAL ─── -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Mouvement FIFO — {{ selectedStock?.product?.name }}</h3>
                <button (click)="closeModal()" style="font-size: 16px;">✕</button>
              </div>
              <form (ngSubmit)="saveMovement()">
                <div class="modal-body">
                  <div class="form-group">
                    <label>Type de Mouvement</label>
                    <select [(ngModel)]="movementForm.type" name="type">
                      <option value="in">Entrée de Stock</option>
                      <option value="out">Sortie de Stock</option>
                      <option value="adjustment">Ajustement direct</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Quantité</label>
                    <input type="number" [(ngModel)]="movementForm.quantity" name="quantity" min="0.01" step="0.01" required (input)="onQuantityChange()" placeholder="0.00" />
                  </div>
                  
                  @if (movementForm.type === 'in') {
                    <div class="form-group">
                      <label>Date d'expiration (DLC)</label>
                      <input type="date" [(ngModel)]="movementForm.expiration_date" name="expiration_date" />
                    </div>
                  }

                  <!-- FIFO Lot Preview for Stock Out -->
                  @if (movementForm.type === 'out' && fifoLots.length > 0) {
                    <div class="fifo-preview">
                      <h4>Ordre de Consommation FIFO</h4>
                      <p class="fifo-hint">Retrait planifié de {{ movementForm.quantity || 0 }} unités :</p>
                      <div class="fifo-lots">
                        @for (lot of fifoLots; track lot.id) {
                          <div class="fifo-lot" [class.consumed]="lot.consumed">
                            <span class="lot-date">Lot #{{ lot.id }} du {{ lot.date }}</span>
                            <span class="lot-qty">{{ lot.used }} / {{ lot.available }} unités</span>
                            @if (lot.expiration) {
                              <span class="lot-exp">DLC: {{ lot.expiration }}</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div class="form-group">
                    <label>Justification du mouvement</label>
                    <input [(ngModel)]="movementForm.reason" name="reason" placeholder="Ex: Livraison fournisseur, Perte, Recette..." />
                  </div>
                </div>

                <div class="modal-footer">
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
  movementForm: any = { type: 'in', quantity: 1, reason: '', expiration_date: '' };
  fifoLots: any[] = [];
  stockMovements: any[] = [];

  // Pagination states
  page = 1;
  totalPages = 1;

  // KPI states
  kpis = {
    total_stock: 0,
    daily_inputs: 0,
    daily_outputs: 0,
    critical_count: 0
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>(`stocks?page=${this.page}`).subscribe({
      next: res => {
        this.stocks = res.data || res;
        this.totalPages = res.last_page || 1;
        if (res.kpis) {
          this.kpis = res.kpis;
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err.error?.message || err.error?.error || err.statusText || 'Impossible de charger la liste des stocks.';
        Swal.fire({
          title: 'Erreur',
          text: msg,
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }

  goToPage(p: number): void {
    this.page = p;
    this.load();
  }

  openMovement(stock: Stock, type: string): void {
    this.selectedStock = stock;
    this.movementForm = { type, quantity: 1, reason: '', expiration_date: '' };
    this.fifoLots = [];
    this.stockMovements = [];
    this.showModal = true;
    if (type === 'out') {
      this.computeFIFO(1);
    }
  }

  onQuantityChange(): void {
    if (this.movementForm.type === 'out') {
      this.computeFIFO(this.movementForm.quantity || 0);
    }
  }

  private computeFIFO(requestedQty: number): void {
    const stock = this.selectedStock;
    if (!stock || !stock.product_id) return;
    this.api.get<any>(`stocks/${stock.id}/movements`).subscribe({
      next: res => {
        const movements = res.data || res;
        const entries = movements
          .filter((m: any) => m.type === 'in')
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        this.stockMovements = entries;
        let remaining = requestedQty;
        this.fifoLots = entries.map((m: any) => {
          const available = Number(m.quantity) || 0;
          const used = Math.min(remaining, available);
          remaining -= used;
          return {
            id: m.id,
            date: new Date(m.created_at).toLocaleDateString('fr-FR'),
            available,
            used: Math.max(0, used),
            expiration: m.expiration_date ? new Date(m.expiration_date).toLocaleDateString('fr-FR') : null,
            consumed: used > 0
          };
        });
      },
      error: () => { this.fifoLots = []; }
    });
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveMovement(): void {
    if (!this.selectedStock) return;
    if (this.movementForm.quantity <= 0) {
      Swal.fire('Erreur', 'La quantité doit être supérieure à 0', 'error');
      return;
    }

    this.api.post(`stocks/${this.selectedStock.id}/movements`, this.movementForm).subscribe({
      next: () => {
        Swal.fire({
          title: 'Enregistré !',
          text: 'Le mouvement de stock a été enregistré avec succès.',
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
        this.closeModal();
        this.load();
      },
      error: (err: any) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Erreur lors de l\'enregistrement.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }
}
