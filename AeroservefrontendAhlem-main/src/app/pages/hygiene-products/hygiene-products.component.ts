import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';
import { AppIconComponent } from '../../shared/icon/app-icon.component';

@Component({
  selector: 'app-hygiene-products',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent, AppIconComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Surveillance des Produits Alimentaires</h2>
          <p class="subtitle">Consultez et mettez à jour les allergènes et les dates de péremption des produits FOOD</p>
        </div>
      </div>

      @if (loading) {
        <app-page-loading variant="table" [rows]="8" />
      } @else {
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Allergènes</th>
                <th>Date de Péremption</th>
                <th>Stock</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of products; track p.id) {
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      @if (p.image) {
                        <img [src]="getImageUrl(p.image)" [alt]="p.name" class="product-img" />
                      }
                      <strong style="color: var(--text-primary);">{{ p.name }}</strong>
                    </div>
                  </td>
                  <td>{{ p.category?.name || '-' }}</td>
                  <td>
                    @if (editingId === p.id) {
                      <input
                        type="text"
                        [(ngModel)]="editAllergensText"
                        name="allergens_{{p.id}}"
                        placeholder="Ex: gluten, lactose"
                        class="inline-input"
                      />
                    } @else {
                      <div class="allergen-tags">
                        @for (a of getAllergens(p); track a) {
                          <span class="allergen-tag">{{ a }}</span>
                        } @empty {
                          <span style="color: var(--text-muted); font-size: 12px;">Aucun</span>
                        }
                      </div>
                    }
                  </td>
                  <td>
                    @if (editingId === p.id) {
                      <input
                        type="date"
                        [(ngModel)]="editExpiration"
                        name="expiration_{{p.id}}"
                        class="inline-input"
                      />
                    } @else {
                      <span class="badge" [class.badge-error]="isExpired(p.expiration_date)" [class.badge-warning]="isExpiringSoon(p.expiration_date)" [class.badge-success]="!p.expiration_date || (!isExpired(p.expiration_date) && !isExpiringSoon(p.expiration_date))">
                        {{ p.expiration_date ? (p.expiration_date | date:'dd/MM/yyyy') : 'Non définie' }}
                      </span>
                    }
                  </td>
                  <td>{{ p.stock?.quantity || 0 }} {{ p.stock?.unit || 'pcs' }}</td>
                  <td style="text-align: right;">
                    @if (editingId === p.id) {
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-primary btn-xs" (click)="saveHygiene(p)">Sauvegarder</button>
                        <button class="btn btn-secondary btn-xs" (click)="cancelEdit()">Annuler</button>
                      </div>
                    } @else {
                      <button class="btn btn-secondary btn-xs" (click)="startEdit(p)">
                        <app-icon name="Pencil" [size]="14"></app-icon> Modifier
                      </button>
                    }
                  </td>
                </tr>
              }
              @if (products.length === 0) {
                <tr>
                  <td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">
                    Aucun produit alimentaire trouvé.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); }

    .product-img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }

    .inline-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--accent);
      border-radius: var(--radius-md);
      font-size: 12px;
      outline: none;
      background: var(--surface);
      color: var(--text-primary);
    }

    .allergen-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .allergen-tag {
      background: #FEF3C7;
      color: #92400E;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .btn-xs { padding: 4px 10px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 4px; }
  `]
})
export class HygieneProductsComponent implements OnInit {
  products: any[] = [];
  loading = true;
  editingId: number | null = null;
  editAllergensText = '';
  editExpiration = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('products', { no_paginate: true, type: 'food' }).subscribe({
      next: res => {
        this.products = res.data || res;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getAllergens(p: any): string[] {
    if (!p.allergens) return [];
    if (Array.isArray(p.allergens)) return p.allergens;
    try {
      return JSON.parse(p.allergens);
    } catch {
      return [];
    }
  }

  startEdit(p: any): void {
    this.editingId = p.id;
    this.editAllergensText = this.getAllergens(p).join(', ');
    this.editExpiration = p.expiration_date || '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editAllergensText = '';
    this.editExpiration = '';
  }

  saveHygiene(p: any): void {
    const payload: any = {};
    const allergens = this.editAllergensText
      .split(',')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);

    payload.allergens = allergens;
    payload.expiration_date = this.editExpiration || null;

    this.api.put(`products/${p.id}/hygiene`, payload).subscribe({
      next: () => {
        p.allergens = allergens;
        p.expiration_date = this.editExpiration || null;
        this.cancelEdit();
        Swal.fire({
          title: 'Mis à jour',
          text: 'Allergènes et date de péremption mis à jour.',
          icon: 'success',
          confirmButtonColor: '#0D9488',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err: any) => {
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Impossible de mettre à jour.',
          icon: 'error',
          confirmButtonColor: '#EF4444',
        });
      }
    });
  }

  isExpired(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    return new Date(date) <= in7Days && new Date(date) >= new Date();
  }

  getImageUrl(path: string): string {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/storage/${path}`;
  }
}
