import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { InternalOrder, Category, Product } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-internal-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPlaceholder],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="8" />
    } @else {
      <div class="page">

        <!-- ─── HEADER ─── -->
        <div class="page-header">
          <div>
            <h2>Commandes Internes de Ravitaillement</h2>
            <p class="subtitle">Gerez et suivez les demandes d'approvisionnement des points de vente</p>
          </div>
          @if (userRole === 'RESPONSABLE_FB' || userRole === 'CHEF_CUISINE') {
            <button class="btn btn-primary" (click)="openCreateModal()">+ Nouvelle Commande</button>
          }
        </div>

        <!-- ─── TABS FOR CHEF CUISINE ─── -->
        @if (userRole === 'CHEF_CUISINE') {
          <div class="tabs-navigation">
            <button type="button" class="tab-btn" [class.active]="activeTab === 'incoming'" (click)="activeTab = 'incoming'">
              📥 Plats a preparer (Entrants)
            </button>
            <button type="button" class="tab-btn" [class.active]="activeTab === 'outgoing'" (click)="activeTab = 'outgoing'">
              📤 Demandes de matieres premieres (Sortantes)
            </button>
          </div>
        }

        <!-- ─── F&B MANAGER / SUPER ADMIN / PURCHASING MANAGER: LIST VIEW ─── -->
        @if (userRole === 'RESPONSABLE_FB' || userRole === 'SUPER_ADMIN' || userRole === 'RESPONSABLE_ACHAT') {
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Cree par</th>
                  <th>Point de Vente</th>
                  <th>Date de Livraison Prevue</th>
                  <th>Date de Creation</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (o of orders; track o.id) {
                  <tr>
                    <td><strong>#{{ o.id }}</strong></td>
                    <td>
                      <span class="badge" [class.badge-success]="o.type === 'food'" [class.badge-info]="o.type === 'commercial'">
                        {{ o.type === 'food' ? 'Alimentaire' : 'Commercial' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" 
                            [class.badge-warning]="o.status === 'EN_ATTENTE'" 
                            [class.badge-info]="o.status === 'PARTIELLEMENT_DISPONIBLE'"
                            [class.badge-success]="o.status === 'DISPONIBLE'"
                            [class.badge-error]="o.status === 'NON_DISPONIBLE'">
                        {{ formatStatus(o.status) }}
                      </span>
                    </td>
                    <td>{{ o.creator?.first_name }} {{ o.creator?.last_name }}</td>
                    <td>{{ o.point_de_vente?.name || '-' }}</td>
                    <td>
                      <span class="delivery-date-tag">
                        {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Non specifiee' }}
                      </span>
                    </td>
                    <td>{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary" style="height: 30px; padding: 0 12px; font-size: 12px;" (click)="viewOrder(o)">
                        Details
                      </button>
                    </td>
                  </tr>
                }
                @if (orders.length === 0) {
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 48px; color: var(--text-muted);">
                      Aucune commande enregistree. Cliquez sur "+ Nouvelle Commande" pour commencer.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ─── CHEF CUISINE OUTGOING ORDERS: LIST VIEW ─── -->
        @if (userRole === 'CHEF_CUISINE' && activeTab === 'outgoing') {
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Statut</th>
                  <th>Point de Vente</th>
                  <th>Date de Livraison Prevue</th>
                  <th>Date de Creation</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (o of outgoingOrders; track o.id) {
                  <tr>
                    <td><strong>#{{ o.id }}</strong></td>
                    <td>
                      <span class="badge" 
                            [class.badge-warning]="o.status === 'EN_ATTENTE'" 
                            [class.badge-info]="o.status === 'PARTIELLEMENT_DISPONIBLE'"
                            [class.badge-success]="o.status === 'DISPONIBLE'"
                            [class.badge-error]="o.status === 'NON_DISPONIBLE'">
                        {{ formatStatus(o.status) }}
                      </span>
                    </td>
                    <td>{{ o.point_de_vente?.name || '-' }}</td>
                    <td>
                      <span class="delivery-date-tag">
                        {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Non specifiee' }}
                      </span>
                    </td>
                    <td>{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary" style="height: 30px; padding: 0 12px; font-size: 12px;" (click)="viewOrder(o)">
                        Details
                      </button>
                    </td>
                  </tr>
                }
                @if (outgoingOrders.length === 0) {
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">
                      Aucune demande de ravitaillement enregistree. Cliquez sur "+ Nouvelle Commande" pour commencer.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ─── KITCHEN / WAREHOUSE: KANBAN BOARD ─── -->
        @if (userRole === 'CHEF_MAGASIN' || (userRole === 'CHEF_CUISINE' && activeTab === 'incoming')) {
          <div cdkDropListGroup class="kanban-board">
            
            <!-- Column 1: Pending -->
            <div class="kanban-col">
              <div class="col-header pending">
                <span>En attente</span>
                <span class="col-count">{{ pendingOrders.length }}</span>
              </div>
              <div
                cdkDropList
                [cdkDropListData]="pendingOrders"
                id="pending"
                class="col-cards"
                (cdkDropListDropped)="drop($event)"
              >
                @for (o of pendingOrders; track o.id) {
                  <div cdkDrag [cdkDragData]="o" class="kanban-card" (click)="viewOrder(o)">
                    <div class="card-top">
                      <span class="card-id">#{{ o.id }}</span>
                      <span class="badge badge-warning" style="font-size: 9px; padding: 1px 6px;">{{ o.type }}</span>
                    </div>
                    <p class="card-pos">{{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator">F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date">{{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Sans Date' }}</span>
                      <button class="btn-card-action">Gerer</button>
                    </div>
                  </div>
                }
                @if (pendingOrders.length === 0) {
                  <div class="empty-col">Aucune commande</div>
                }
              </div>
            </div>

            <!-- Column 2: Partially Available -->
            <div class="kanban-col">
              <div class="col-header partial">
                <span>Partiel</span>
                <span class="col-count">{{ partialOrders.length }}</span>
              </div>
              <div
                cdkDropList
                [cdkDropListData]="partialOrders"
                id="partial"
                class="col-cards"
                (cdkDropListDropped)="drop($event)"
              >
                @for (o of partialOrders; track o.id) {
                  <div cdkDrag [cdkDragData]="o" class="kanban-card" (click)="viewOrder(o)">
                    <div class="card-top">
                      <span class="card-id">#{{ o.id }}</span>
                      <span class="badge badge-info" style="font-size: 9px; padding: 1px 6px;">{{ o.type }}</span>
                    </div>
                    <p class="card-pos">{{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator">F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date">{{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Sans Date' }}</span>
                      <button class="btn-card-action">Gerer</button>
                    </div>
                  </div>
                }
                @if (partialOrders.length === 0) {
                  <div class="empty-col">Aucune commande</div>
                }
              </div>
            </div>

            <!-- Column 3: Available / Ready -->
            <div class="kanban-col">
              <div class="col-header available">
                <span>Disponible / Pret</span>
                <span class="col-count">{{ availableOrders.length }}</span>
              </div>
              <div
                cdkDropList
                [cdkDropListData]="availableOrders"
                id="available"
                class="col-cards"
                (cdkDropListDropped)="drop($event)"
              >
                @for (o of availableOrders; track o.id) {
                  <div cdkDrag [cdkDragData]="o" class="kanban-card" (click)="viewOrder(o)">
                    <div class="card-top">
                      <span class="card-id">#{{ o.id }}</span>
                      <span class="badge badge-success" style="font-size: 9px; padding: 1px 6px;">{{ o.type }}</span>
                    </div>
                    <p class="card-pos">{{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator">F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date">{{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Sans Date' }}</span>
                      <button class="btn-card-action">Gerer</button>
                    </div>
                  </div>
                }
                @if (availableOrders.length === 0) {
                  <div class="empty-col">Aucune commande</div>
                }
              </div>
            </div>

            <!-- Column 4: Unavailable -->
            <div class="kanban-col">
              <div class="col-header unavailable">
                <span>Indisponible</span>
                <span class="col-count">{{ unavailableOrders.length }}</span>
              </div>
              <div
                cdkDropList
                [cdkDropListData]="unavailableOrders"
                id="unavailable"
                class="col-cards"
                (cdkDropListDropped)="drop($event)"
              >
                @for (o of unavailableOrders; track o.id) {
                  <div cdkDrag [cdkDragData]="o" class="kanban-card" (click)="viewOrder(o)">
                    <div class="card-top">
                      <span class="card-id">#{{ o.id }}</span>
                      <span class="badge badge-error" style="font-size: 9px; padding: 1px 6px;">{{ o.type }}</span>
                    </div>
                    <p class="card-pos">{{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator">F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date">{{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Sans Date' }}</span>
                      <button class="btn-card-action">Gerer</button>
                    </div>
                  </div>
                }
                @if (unavailableOrders.length === 0) {
                  <div class="empty-col">Aucune commande</div>
                }
              </div>
            </div>

          </div>
        }

        <!-- ─── DETAILS & FULFILLMENT MODAL ─── -->
        @if (showViewModal && selectedOrder) {
          <div class="modal-overlay" (click)="closeModals()">
            <div class="modal-card modal-medium" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Commande #{{ selectedOrder.id }} - Détails</h3>
                <button (click)="closeModals()" style="font-size: 16px;">✕</button>
              </div>

              <div class="modal-body">
                <div class="order-detail-vertical">
                  <div class="detail-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                      <div class="status-summary" style="display: flex; gap: 8px;">
                        <span class="badge" 
                              [class.badge-warning]="selectedOrder.status === 'EN_ATTENTE'" 
                              [class.badge-info]="selectedOrder.status === 'PARTIELLEMENT_DISPONIBLE'"
                              [class.badge-success]="selectedOrder.status === 'DISPONIBLE'"
                              [class.badge-error]="selectedOrder.status === 'NON_DISPONIBLE'">
                          {{ formatStatus(selectedOrder.status) }}
                        </span>
                        <span class="badge badge-neutral">{{ selectedOrder.type | uppercase }}</span>
                      </div>
                    </div>
                    
                    <div class="meta-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; background: var(--bg-secondary); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                      <p style="margin: 0;"><strong>Créé par:</strong> {{ selectedOrder.creator?.first_name }} {{ selectedOrder.creator?.last_name }}</p>
                      <p style="margin: 0;"><strong>Point de Vente:</strong> {{ selectedOrder.point_de_vente?.name || '-' }}</p>
                      <p style="margin: 0;"><strong>Livraison Prévue:</strong> 
                        <span class="delivery-date-tag">
                          {{ selectedOrder.delivery_date ? (selectedOrder.delivery_date | date:'dd/MM/yyyy') : 'Non spécifiée' }}
                        </span>
                      </p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <p style="margin-bottom: 6px;"><strong>Instructions spéciales:</strong></p>
                      <div class="notes-box" style="margin: 0;">{{ selectedOrder.notes || 'Aucune consigne spécifique.' }}</div>
                    </div>

                    <!-- FULFILLMENT FORM -->
                    <h4 style="font-size: 14px; font-weight:600; margin-bottom: 12px;">Articles Commandés</h4>
                    <table class="premium-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Demandé</th>
                          <th>Livré</th>
                          @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                            <th>Fulfill Control</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of selectedOrder.items; track item.id) {
                          <tr>
                            <td><strong>{{ item.product?.name }}</strong></td>
                            <td>{{ item.quantity_requested }}</td>
                            <td>
                              <span class="badge" [class.badge-success]="item.quantity_fulfilled >= item.quantity_requested" [class.badge-warning]="item.quantity_fulfilled < item.quantity_requested">
                                {{ item.quantity_fulfilled }}
                              </span>
                            </td>
                            @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                              <td>
                                <div class="fulfill-input-control">
                                  <input type="number" [(ngModel)]="item.quantity_fulfilled" min="0" [max]="item.quantity_requested" class="qty-input-sm" />
                                  <button class="btn-fulfill-save" (click)="saveFulfillment(selectedOrder.id, item)">Enregistrer</button>
                                </div>
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- COMMENTS BOX -->
                  @if (comments.length > 0 || userRole !== 'RESPONSABLE_FB') {
                    <div class="comments-panel" style="border-top: 1px solid var(--border-light); padding-top: 20px; margin-top: 10px;">
                      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Suivi &amp; Commentaires ({{ comments.length }})</h4>
                      
                      @if (comments.length > 0) {
                        <div class="comments-list" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 6px; margin-bottom: 12px;">
                          @for (c of comments; track c.id) {
                            <div class="fb-comment">
                              <div class="fb-comment-avatar">
                                @if (c.user?.avatar_url || c.user?.avatar) {
                                  <img [src]="getImgUrl(c.user?.avatar_url || c.user?.avatar)" alt="" />
                                } @else {
                                  <span class="fb-avatar-fallback">{{ (c.user?.first_name?.[0] || '') + (c.user?.last_name?.[0] || '') }}</span>
                                }
                              </div>
                              <div class="fb-comment-body">
                                <div class="fb-comment-header">
                                  <strong class="fb-comment-author">{{ c.user?.first_name }} {{ c.user?.last_name }}</strong>
                                  <span class="fb-comment-time">{{ c.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                                </div>
                                @if (editingCommentId === c.id) {
                                  <div class="fb-comment-edit">
                                    <textarea [(ngModel)]="editCommentText" rows="2" class="fb-edit-input"></textarea>
                                    <div class="fb-edit-actions">
                                      <button class="btn btn-primary btn-xs" (click)="saveEditComment(c.id)">Enregistrer</button>
                                      <button class="btn btn-xs" (click)="cancelEditComment()">Annuler</button>
                                    </div>
                                  </div>
                                } @else {
                                  <p class="fb-comment-text">{{ c.body }}</p>
                                }
                                @if (c.user_id === currentUser.id && editingCommentId !== c.id) {
                                  <div class="fb-comment-actions">
                                    <button class="fb-action-btn" (click)="startEditComment(c)">Modifier</button>
                                    <button class="fb-action-btn danger" (click)="deleteComment(c.id, selectedOrder.id)">Supprimer</button>
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                      
                      @if (userRole !== 'RESPONSABLE_FB') {
                        <div class="comment-input-area">
                          <textarea [(ngModel)]="newComment" placeholder="Ajouter une note de suivi..." rows="2"></textarea>
                          <button class="btn btn-primary" (click)="addComment(selectedOrder.id)">Envoyer</button>
                        </div>
                      }
                    </div>
                  }

                </div>
              </div>

              <div class="modal-footer">
                @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                  <div class="transition-controls">
                    <span>Statut Global:</span>
                    <select class="status-select" (change)="onStatusChange($event)">
                      <option value="" disabled [selected]="true">— Mettre à jour —</option>
                      <option value="DISPONIBLE">Prête / Disponible</option>
                      <option value="NON_DISPONIBLE">Rupture totale / Indisponible</option>
                      <option value="PARTIELLEMENT_DISPONIBLE">Partiellement disponible</option>
                    </select>
                  </div>
                }
                <button class="btn btn-secondary" (click)="closeModals()">Fermer</button>
              </div>
            </div>
          </div>
        }

        <!-- ─── CREATE ORDER WIZARD ─── -->
        @if (showCreateModal) {
          <div class="modal-overlay" (click)="closeModals()">
            <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ userRole === 'CHEF_CUISINE' ? "Nouvelle Demande de Matières Premières" : "Nouvelle Commande d'Approvisionnement" }}</h3>
                <button (click)="closeModals()" style="font-size: 16px;">✕</button>
              </div>

              <div class="modal-body">
                <!-- Step indicator (hide for chef — they skip step 1) -->
                @if (userRole !== 'CHEF_CUISINE') {
                  <div class="steps">
                    @for (s of steps; track s.n) {
                      <div class="step" [class.active]="wizardStep === s.n" [class.done]="wizardStep > s.n">
                        <div class="step-circle">{{ s.n }}</div>
                        <span>{{ s.label }}</span>
                      </div>
                      @if (s.n < steps.length) { <div class="step-line" [class.done]="wizardStep > s.n"></div> }
                    }
                  </div>
                }

                <!-- ── Step 1: Choose Type (hidden for chef) ── -->
                @if (wizardStep === 1 && userRole !== 'CHEF_CUISINE') {
                  <h3 style="font-size: 16px; margin-bottom: 16px;">Choisissez le type d'approvisionnement</h3>
                  <div class="type-cards">
                    <div class="type-card" [class.selected]="form.type === 'food'" (click)="selectType('food')">
                      <div class="type-icon">🍲</div>
                      <strong>ALIMENTAIRE</strong>
                      <small>Produits frais et ingrédients de cuisine</small>
                    </div>
                    <div class="type-card" [class.selected]="form.type === 'commercial'" (click)="selectType('commercial')">
                      <div class="type-icon">📦</div>
                      <strong>COMMERCIAL</strong>
                      <small>Boissons, snacks et packagings</small>
                    </div>
                  </div>
                }

                <!-- ── Step 2: Combined Selection & Quantities ── -->
                @if (wizardStep === 2) {
                  <div class="wizard-split-layout">
                    <!-- Left: Products catalog -->
                    <div class="catalog-panel">
                      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Sélectionnez les articles</h3>
                      
                      @if (loadingCategories || loadingProducts) {
                        <p class="loading-label">Chargement des catégories et produits...</p>
                      } @else {
                        <!-- Category chips -->
                        <div class="categories-grid" style="margin-bottom: 16px;">
                          @for (cat of filteredCategories; track cat.id) {
                            <div class="category-chip"
                                 [class.selected]="isCategorySelected(cat.id)"
                                 (click)="toggleCategory(cat)">
                              {{ cat.name }}
                            </div>
                          }
                        </div>

                        <!-- Products listing -->
                        <div class="products-grid" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                          @for (prod of displayProducts; track prod.id) {
                            <div class="product-card" [class.in-cart]="isInCart(prod.id)">
                              @if (prod.image) {
                                <img [src]="getImgUrl(prod.image)" [alt]="prod.name" class="product-img" />
                              } @else {
                                <div class="product-placeholder">
                                  <span>{{ prod.name.substring(0, 2) | uppercase }}</span>
                                </div>
                              }
                              <div class="product-info">
                                <strong>{{ prod.name }}</strong>
                                <span style="font-size: 11px; color: var(--text-muted);">{{ prod.category?.name }}</span>
                              </div>
                              
                              <div style="padding: 0 8px 8px; display: flex; flex-direction: column;">
                                @if (!isInCart(prod.id)) {
                                  <button class="btn-add" style="margin: 0;" (click)="addToCart(prod)">
                                    + Ajouter
                                  </button>
                                } @else {
                                  <div class="qty-control" style="justify-content: center; width: 100%;">
                                    <button type="button" style="width: 24px; height: 24px; font-size: 14px;" (click)="decreaseQty(getCartItem(prod.id)!)">−</button>
                                    <input type="number" [ngModel]="getCartItem(prod.id)!.quantity" (ngModelChange)="updateCartItemQty(prod.id, $event)" min="1" class="qty-input" style="width: 40px; height: 24px; font-size: 11px; padding: 2px;" />
                                    <button type="button" style="width: 24px; height: 24px; font-size: 14px;" (click)="increaseQty(getCartItem(prod.id)!)">+</button>
                                  </div>
                                }
                              </div>
                            </div>
                          }
                          @if (displayProducts.length === 0) {
                            <p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px;">Aucun produit trouvé.</p>
                          }
                        </div>
                      }
                    </div>

                    <!-- Right: Cart Overview -->
                    <div class="cart-panel">
                      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Panier ({{ cart.length }})</h3>
                      <div class="cart-list" style="max-height: 420px; overflow-y: auto; padding-right: 4px;">
                        @for (item of cart; track item.product.id) {
                          <div class="cart-item" style="padding: 8px 12px; gap: 8px; border-radius: 8px; margin-bottom: 8px;">
                            <span class="cart-name" style="font-size: 12px;">{{ item.product.name }}</span>
                            <div class="qty-control">
                              <button type="button" style="width: 22px; height: 22px; font-size: 12px;" (click)="decreaseQty(item)">−</button>
                              <input type="number" [(ngModel)]="item.quantity" [name]="'cart_q'+item.product.id" min="1" class="qty-input" style="width: 36px; height: 22px; font-size: 11px; padding: 2px;" />
                              <button type="button" style="width: 22px; height: 22px; font-size: 12px;" (click)="increaseQty(item)">+</button>
                            </div>
                            <button type="button" class="trash-btn" style="border:none; padding: 0 4px;" (click)="removeFromCart(item.product.id)">✕</button>
                          </div>
                        }
                        @if (cart.length === 0) {
                          <div class="empty-hint" style="font-size: 12px; padding: 48px 16px; color: var(--text-muted);">
                            Votre panier est vide.<br>Ajoutez des articles à gauche.
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }

                <!-- ── Step 3: Delivery Date & Notes + Recap ── -->
                @if (wizardStep === 3) {
                  <h3 style="font-size: 16px; margin-bottom: 16px;">Planification de la Livraison</h3>
                  
                  <div class="scheduling-block">
                    @if (userRole === 'RESPONSABLE_FB' || userRole === 'SUPER_ADMIN') {
                      <div class="form-group" style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Point de Vente *</label>
                        <select [(ngModel)]="form.pdv_id" name="pdv_id" class="date-input" required style="width: 100%; max-width: 260px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); color: var(--text-primary); outline: none;">
                          <option value="" disabled selected>— Sélectionner un PDV —</option>
                          @for (p of pdvs; track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>
                    }

                    <div class="form-group">
                      <label>Date de livraison souhaitée *</label>
                      <input type="date" [(ngModel)]="form.delivery_date" name="delivery_date" class="date-input" required />
                    </div>

                    <div class="form-group">
                      <label>Remarques / Consignes de livraison</label>
                      <textarea [(ngModel)]="form.notes" name="notes" rows="3" placeholder="Saisissez vos instructions..."></textarea>
                    </div>
                  </div>

                  <div class="order-summary" style="margin-top: 16px;">
                    <h4 style="font-size: 13px; font-weight:600; margin-bottom: 8px;">Récapitulatif de la Demande</h4>
                    <p><strong>Type:</strong> {{ userRole === 'CHEF_CUISINE' ? 'Matières Premières' : (form.type === 'food' ? 'Alimentaire' : 'Commercial') }}</p>
                    @if (form.pdv_id) {
                      <p><strong>Point de Vente:</strong> {{ getPdvName(form.pdv_id) }}</p>
                    }
                    <p><strong>Date de Livraison:</strong> {{ form.delivery_date ? (form.delivery_date | date:'dd/MM/yyyy') : 'Non renseignée' }}</p>
                    <p><strong>Articles demandés:</strong> {{ cart.length }} référence(s)</p>
                    <ul style="margin-top: 8px;">
                      @for (item of cart; track item.product.id) {
                        <li>{{ item.product.name }} × {{ item.quantity }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>

              <div class="modal-footer">
                @if (wizardStep > 1 && (userRole !== 'CHEF_CUISINE' || wizardStep > 2)) {
                  <button type="button" class="btn btn-secondary" (click)="goStep(wizardStep - 1)">Retour</button>
                } @else {
                  <button type="button" class="btn btn-secondary" (click)="closeModals()">Annuler</button>
                }

                @if (wizardStep < 3) {
                  <button type="button" class="btn btn-primary" [disabled]="(wizardStep === 2 && cart.length === 0)" (click)="goStep(wizardStep + 1)">Suivant</button>
                } @else {
                  <button type="button" class="btn btn-primary" (click)="submitOrder()" [disabled]="saving || !form.delivery_date || ((userRole === 'RESPONSABLE_FB' || userRole === 'SUPER_ADMIN') && !form.pdv_id)">
                    {{ saving ? 'Transmission...' : 'Confirmer & Commander' }}
                  </button>
                }
              </div>
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
    
    .delivery-date-tag { background: var(--bg-secondary); color: var(--text-primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    
    /* Kanban Styles */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: flex-start; }
    .kanban-col { background: var(--bg-secondary); border-radius: var(--radius-lg); padding: 16px; border: 1px solid var(--border); max-height: 80vh; display: flex; flex-direction: column; }
    .col-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 10px; margin-bottom: 12px; border-bottom: 2px solid; }
    
    .col-header.pending { color: var(--color-warning); border-color: var(--color-warning); }
    .col-header.partial { color: var(--color-info); border-color: var(--color-info); }
    .col-header.available { color: var(--color-success); border-color: var(--color-success); }
    .col-header.unavailable { color: var(--color-error); border-color: var(--color-error); }
    
    .col-count { background: rgba(15, 23, 42, 0.05); padding: 2px 8px; border-radius: 99px; font-size: 11px; color: var(--text-primary); }
    .col-cards { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; padding: 2px; min-height: 100px; }
    
    .kanban-card { background: var(--surface); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border); cursor: pointer; transition: all var(--transition); }
    .kanban-card:hover { transform: translateY(-2px); border-color: var(--accent); box-shadow: var(--shadow-sm); }
    
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-id { font-weight: 700; color: var(--text-primary); font-size: 13px; }
    .card-pos { font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0; font-size: 13.5px; }
    .card-creator { font-size: 11.5px; color: var(--text-secondary); margin: 0 0 10px 0; }
    .card-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding-top: 8px; border-top: 1px solid var(--border-light); }
    .card-date { color: var(--text-muted); font-weight: 500; }
    
    .btn-card-action { border: none; background: #E6F4EA; color: #137333; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; }
    .empty-col { text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px; border: 1px dashed var(--border); border-radius: var(--radius-md); background: var(--surface); }
    
    /* Drag & Drop CDK Styles */
    .cdk-drag-preview {
      background: var(--surface);
      border-radius: var(--radius-md);
      padding: 16px;
      box-shadow: var(--shadow-lg);
      border: 1.5px solid var(--accent);
      opacity: 0.95;
      z-index: 9999;
    }
    .cdk-drag-placeholder {
      opacity: 0.4;
      background: var(--bg-secondary);
      border: 2px dashed var(--border);
      border-radius: var(--radius-md);
    }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .col-cards.cdk-drop-list-dragging .kanban-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    
    /* Modal Details Grid */
    .order-detail-vertical { display: flex; flex-direction: column; gap: 20px; }
    .modal-medium { max-width: 700px !important; width: 90%; }
    .detail-panel { display: flex; flex-direction: column; }
    .notes-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; font-size: 12.5px; color: var(--text-secondary); margin-top: 6px; min-height: 50px; }
    
    .qty-input-sm { width: 60px; padding: 6px; border: 1px solid var(--border); border-radius: var(--radius-md); text-align: center; font-weight: bold; font-size: 12px; }
    .fulfill-input-control { display: flex; gap: 6px; align-items: center; }
    
    .btn-fulfill-save { border: none; background: var(--accent); color: #fff; padding: 6px 12px; border-radius: var(--radius-md); font-weight: 600; font-size: 11px; cursor: pointer; }
    .btn-fulfill-save:hover { background: #0F766E; }

    /* Comments Section — Facebook-style */
    .comments-panel { display: flex; flex-direction: column; gap: 12px; }
    .comments-list { overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 6px; margin-bottom: 12px; max-height: 250px; }
    .fb-comment { display: flex; gap: 10px; align-items: flex-start; }
    .fb-comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-sidebar); flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .fb-comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .fb-avatar-fallback { color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .fb-comment-body { flex: 1; background: var(--bg-secondary); border-radius: var(--radius-md); padding: 10px 14px; }
    .fb-comment-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .fb-comment-author { font-size: 12.5px; color: var(--text-primary); font-weight: 600; }
    .fb-comment-time { font-size: 10px; color: var(--text-muted); }
    .fb-comment-text { margin: 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.45; word-break: break-word; white-space: pre-wrap; }
    
    .fb-comment-actions { display: flex; gap: 12px; margin-top: 6px; }
    .fb-action-btn { background: none; border: none; padding: 0; font-size: 11px; font-weight: 500; color: var(--text-muted); cursor: pointer; }
    .fb-action-btn:hover { color: var(--accent); }
    .fb-action-btn.danger { color: var(--color-error); }
    
    .fb-comment-edit { display: flex; flex-direction: column; gap: 6px; }
    .fb-edit-input { width: 100%; padding: 8px 10px; border: 1px solid var(--accent); border-radius: var(--radius-md); font-size: 12.5px; resize: none; outline: none; }
    .fb-edit-actions { display: flex; gap: 6px; }
    .btn-xs { padding: 4px 10px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); }
    
    .empty-comments { text-align: center; color: var(--text-muted); font-size: 12px; padding: 32px; }
    
    .comment-input-area { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 12px; }
    .comment-input-area textarea { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 12.5px; resize: none; outline: none; background: var(--surface); color: var(--text-primary); }
    .comment-input-area textarea:focus { border-color: var(--accent); }

    /* Create Order Wizard */
    .steps { display: flex; align-items: center; margin-bottom: 24px; justify-content: center; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .step-circle { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); color: var(--text-muted); font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all var(--transition); }
    .step.active .step-circle { background: var(--accent); color: #fff; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15); }
    .step.done .step-circle { background: var(--accent); color: #fff; }
    .step span { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .step.active span { color: var(--accent); }
    .step.done span { color: var(--accent); }
    .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 12px 14px; transition: background var(--transition); }
    .step-line.done { background: var(--accent); }

    .type-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .type-card { border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px 16px; text-align: center; cursor: pointer; transition: all var(--transition); display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--surface); }
    .type-card:hover { border-color: var(--accent); background: var(--bg-secondary); }
    .type-card.selected { border-color: var(--accent); background: #F0FDF4; }
    .type-icon { font-size: 32px; }
    .type-card strong { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .type-card small { font-size: 12px; color: var(--text-secondary); }

    .categories-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .category-chip { padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition); color: var(--text-secondary); background: var(--surface); }
    .category-chip:hover { border-color: var(--accent); color: var(--accent); }
    .category-chip.selected { background: var(--accent); color: #fff; border-color: transparent; }
    
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .product-card { border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; transition: all var(--transition); background: var(--surface); }
    .product-card.in-cart { border-color: var(--accent); background: #F0FDF4; }
    .product-img { width: 100%; height: 90px; object-fit: cover; }
    .product-placeholder { display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; background: var(--bg-secondary); height: 90px; color: var(--text-muted); }
    .product-info { padding: 10px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .product-info strong { font-size: 12.5px; color: var(--text-primary); }
    
    .btn-add { margin: 8px; padding: 6px 12px; border-radius: var(--radius-sm); border: none; font-size: 11px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; transition: all var(--transition); }
    .btn-add:hover { background: #0F766E; }
    .btn-add:disabled { background: var(--accent); cursor: not-allowed; opacity: 0.6; }

    .cart-list { display: flex; flex-direction: column; gap: 10px; }
    .cart-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); }
    .cart-name { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
    .qty-control { display: flex; align-items: center; gap: 6px; }
    .qty-control button { width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .qty-input { width: 50px; text-align: center; padding: 4px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-weight: bold; }
    .trash-btn { color: var(--text-muted); cursor: pointer; font-size: 13px; }
    .trash-btn:hover { color: var(--color-error); }

    .scheduling-block { display: flex; flex-direction: column; gap: 12px; }
    .date-input { width: 100%; max-width: 260px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 13px; outline: none; }
    .date-input:focus { border-color: var(--accent); }

    .transition-controls { display: flex; gap: 8px; align-items: center; flex: 1; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .status-select { padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 12px; font-weight: 500; color: var(--text-primary); background: var(--surface); outline: none; cursor: pointer; }

    .order-summary { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 16px; border: 1px dashed var(--border); }
    .order-summary ul { margin: 8px 0 0 16px; padding: 0; font-size: 12.5px; color: var(--text-secondary); }
    .empty-hint { color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px; }
    .loading-label { color: var(--text-muted); font-size: 12px; margin: 4px 0; }
    .modal-wide { max-width: 900px !important; width: 90%; }
    .wizard-split-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: stretch; min-height: 400px; }
    .catalog-panel { border-right: 1px solid var(--border-light); padding-right: 16px; display: flex; flex-direction: column; }
    .cart-panel { padding-left: 8px; display: flex; flex-direction: column; }
    
    .tabs-navigation { display: flex; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 0px; margin-bottom: 16px; }
    .tab-btn { background: none; border: none; padding: 8px 16px; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition); border-bottom: 2px solid transparent; }
    .tab-btn:hover { color: var(--accent); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
  `]
})
export class InternalOrdersComponent implements OnInit {

  orders: InternalOrder[] = [];
  loading = true;
  activeTab: 'incoming' | 'outgoing' = 'incoming';

  showViewModal = false;
  showCreateModal = false;
  selectedOrder: InternalOrder | null = null;

  wizardStep = 1;
  steps = [
    { n: 1, label: 'Type' },
    { n: 2, label: 'Sélection & Quantités' },
    { n: 3, label: 'Date & Notes' },
  ];

  form: any = { type: '', notes: '', delivery_date: '', pdv_id: '' };

  categories: Category[] = [];
  filteredCategories: Category[] = [];
  selectedCategories: Category[] = [];
  loadingCategories = false;

  availableProducts: Product[] = [];
  loadingProducts = false;

  cart: CartItem[] = [];
  saving = false;
  saveError = '';

  comments: any[] = [];
  newComment = '';
  loadingComments = false;
  editingCommentId: number | null = null;
  editCommentText = '';

  currentUser: any;
  userRole = '';
  pdvs: any[] = [];

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    this.userRole = this.currentUser?.role?.name || '';
    this.load();
    if (this.userRole === 'RESPONSABLE_FB' || this.userRole === 'SUPER_ADMIN') {
      this.loadPdvs();
    }
  }

  loadPdvs(): void {
    this.api.get<any>('points-de-vente').subscribe({
      next: res => this.pdvs = res.data || res,
      error: err => console.error('Error loading PDVs', err)
    });
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('internal-orders').subscribe({
      next: res => this.orders = res.data || res,
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  // FIX 5: Client-side type guard — secondary safety layer on top of the API filter.
  // CHEF_CUISINE sees only 'food' orders; CHEF_MAGASIN sees only 'commercial' orders.
  private get kanbanOrders(): InternalOrder[] {
    if (this.userRole === 'CHEF_CUISINE') {
      return this.orders.filter(o => o.type === 'food');
    }
    if (this.userRole === 'CHEF_MAGASIN') {
      return this.orders.filter(o => o.type === 'commercial');
    }
    return this.orders;
  }

  get outgoingOrders(): InternalOrder[] {
    return this.orders.filter(o => o.created_by === this.currentUser?.id);
  }

  // Kanban getters
  get pendingOrders()     { return this.kanbanOrders.filter(o => o.status === 'EN_ATTENTE'); }
  get partialOrders()     { return this.kanbanOrders.filter(o => o.status === 'PARTIELLEMENT_DISPONIBLE'); }
  get availableOrders()   { return this.kanbanOrders.filter(o => o.status === 'DISPONIBLE'); }
  get unavailableOrders() { return this.kanbanOrders.filter(o => o.status === 'NON_DISPONIBLE'); }

  formatStatus(s: string): string {
    const map: Record<string, string> = {
      'EN_ATTENTE': 'Pending',
      'DISPONIBLE': 'Available',
      'PARTIELLEMENT_DISPONIBLE': 'Partially Ready',
      'NON_DISPONIBLE': 'Not Available'
    };
    return map[s] || s;
  }

  getImgUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/storage/${path}`;
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.wizardStep = this.userRole === 'CHEF_CUISINE' ? 2 : 1;
    this.form = { type: this.userRole === 'CHEF_CUISINE' ? 'commercial' : '', notes: '', delivery_date: '', pdv_id: '' };
    this.selectedCategories = [];
    this.availableProducts = [];
    this.cart = [];
    this.saveError = '';
    this.showCreateModal = true;
    if (this.userRole === 'CHEF_CUISINE') {
      this.loadFilteredCategoriesAndProducts();
    }
  }

  getPdvName(id: any): string {
    const pdv = this.pdvs.find(p => p.id == id);
    return pdv ? pdv.name : '-';
  }

  goStep(n: number): void {
    this.wizardStep = n;
    if (n === 2) {
      this.selectedCategories = [];
      this.filteredCategories = [];
      this.loadFilteredCategoriesAndProducts();
    }
  }

  selectType(type: string): void {
    this.form.type = type;
  }

  // Helper getters for step 2
  get displayProducts(): Product[] {
    if (this.selectedCategories.length === 0) {
      return this.availableProducts;
    }
    const selectedIds = this.selectedCategories.map(c => c.id);
    return this.availableProducts.filter(p => p.category_id !== undefined && selectedIds.includes(p.category_id));
  }

  getCartItem(productId: number): CartItem | undefined {
    return this.cart.find(i => i.product.id === productId);
  }

  updateCartItemQty(productId: number, val: number): void {
    const item = this.getCartItem(productId);
    if (item) {
      if (val >= 1) {
        item.quantity = val;
      } else {
        this.removeFromCart(productId);
      }
    }
  }

  // ─── Step 2: Categories & Products ────────────────────────────────────────

  loadFilteredCategoriesAndProducts(): void {
    this.loadingCategories = true;
    this.loadingProducts = true;
    this.api.get<Category[]>('categories').subscribe({
      next: cats => {
        const typeMap: Record<string, string[]> = {
          food: ['food'],
          commercial: ['commercial'],
        };
        const allowed = this.userRole === 'CHEF_CUISINE'
          ? ['matiere_premiere']
          : (typeMap[this.form.type] || []);
        this.filteredCategories = cats.filter(c => allowed.includes(c.type));
        this.loadingCategories = false;

        if (this.filteredCategories.length > 0) {
          const ids = this.filteredCategories.map(c => c.id);
          this.api.post<any>('products/by-categories', { category_ids: ids }).subscribe({
            next: (prods: any) => {
              this.availableProducts = prods.data || prods;
              this.loadingProducts = false;
            },
            error: () => {
              this.availableProducts = [];
              this.loadingProducts = false;
            }
          });
        } else {
          this.availableProducts = [];
          this.loadingProducts = false;
        }
      },
      error: () => {
        this.loadingCategories = false;
        this.loadingProducts = false;
      }
    });
  }

  toggleCategory(cat: Category): void {
    const idx = this.selectedCategories.findIndex(c => c.id === cat.id);
    if (idx >= 0) {
      this.selectedCategories.splice(idx, 1);
    } else {
      this.selectedCategories.push(cat);
    }
  }

  isCategorySelected(id: number): boolean {
    return this.selectedCategories.some(c => c.id === id);
  }

  addToCart(product: Product): void {
    if (!this.isInCart(product.id)) {
      this.cart.push({ product, quantity: 1 });
    }
  }

  isInCart(id: number): boolean {
    return this.cart.some(i => i.product.id === id);
  }

  increaseQty(item: CartItem): void { item.quantity++; }
  decreaseQty(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.removeFromCart(item.product.id);
    }
  }
  removeFromCart(id: number): void { this.cart = this.cart.filter(i => i.product.id !== id); }

  // ─── Submit ───────────────────────────────────────────────────────────────

  submitOrder(): void {
    if (!this.form.delivery_date) {
      this.saveError = 'Please select a delivery date.';
      return;
    }
    if ((this.userRole === 'RESPONSABLE_FB' || this.userRole === 'SUPER_ADMIN') && !this.form.pdv_id) {
      this.saveError = 'Please select a Point de Vente.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload = {
      type: this.form.type,
      notes: this.form.notes,
      delivery_date: this.form.delivery_date,
      pdv_id: this.form.pdv_id ? Number(this.form.pdv_id) : null,
      items: this.cart.map(i => ({
        product_id: i.product.id,
        quantity_requested: i.quantity
      }))
    };

    this.api.post('internal-orders', payload).subscribe({
      next: () => {
        this.saving = false;
        this.closeModals();
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        this.saveError = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }

  // ─── View / Delete / Fulfill ───────────────────────────────────────────────

  viewOrder(o: InternalOrder): void {
    this.selectedOrder = o;
    this.showViewModal = true;
    this.loadComments(o.id);
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showViewModal = false;
    this.selectedOrder = null;
    this.comments = [];
  }

  deleteOrder(id: number): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">
        <div style="font-size:48px;margin-bottom:12px"></div>
        <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">Delete supply order?</h3>
        <p style="margin:0 0 24px;color:#666;font-size:14px">This action cannot be undone.</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="_cancel" style="padding:10px 24px;border:2px solid #D8D2C8;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Cancel</button>
          <button id="_confirm" style="padding:10px 24px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;font-size:14px">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_cancel')!.addEventListener('click', () => document.body.removeChild(overlay));
    overlay.querySelector('#_confirm')!.addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.api.delete(`internal-orders/${id}`).subscribe(() => this.load());
    });
  }

  saveFulfillment(orderId: number, item: any): void {
    this.api.put(`internal-orders/${orderId}/items/${item.id}/fulfill`, {
      quantity_fulfilled: item.quantity_fulfilled
    }).subscribe({
      next: () => {
        this.load();
        this.api.get<InternalOrder>(`internal-orders/${orderId}`).subscribe(res => {
          this.selectedOrder = res;
        });
      }
    });
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (target && this.selectedOrder) {
      this.updateOrderStatus(this.selectedOrder, target.value);
    }
  }

  updateOrderStatus(order: InternalOrder, status: string): void {
    this.api.put<any>(`internal-orders/${order.id}/status`, { status }).subscribe(() => {
      this.load();
      if (this.selectedOrder && this.selectedOrder.id === order.id) {
        this.selectedOrder.status = status as any;
      }
    });
  }

  // Drag & Drop handler
  drop(event: CdkDragDrop<InternalOrder[]>): void {
    if (event.previousContainer !== event.container) {
      const order = event.item.data as InternalOrder;
      if (event.container.id === 'pending') {
        this.updateOrderStatus(order, 'EN_ATTENTE');
      } else if (event.container.id === 'partial') {
        this.updateOrderStatus(order, 'PARTIELLEMENT_DISPONIBLE');
      } else if (event.container.id === 'available') {
        this.updateOrderStatus(order, 'DISPONIBLE');
      } else if (event.container.id === 'unavailable') {
        this.updateOrderStatus(order, 'NON_DISPONIBLE');
      }
    }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  loadComments(orderId: number): void {
    this.loadingComments = true;
    this.api.get<any[]>(`comments?commentable_type=internal_order&commentable_id=${orderId}`).subscribe({
      next: res => {
        this.comments = res;
        this.loadingComments = false;
      },
      error: () => this.loadingComments = false
    });
  }

  addComment(orderId: number): void {
    if (!this.newComment.trim()) return;
    this.api.post<any>('comments', {
      commentable_type: 'internal_order',
      commentable_id: orderId,
      body: this.newComment
    }).subscribe(() => {
      this.newComment = '';
      this.loadComments(orderId);
    });
  }

  startEditComment(c: any): void {
    this.editingCommentId = c.id;
    this.editCommentText = c.body;
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editCommentText = '';
  }

  saveEditComment(commentId: number): void {
    if (!this.editCommentText.trim()) return;
    this.api.put<any>(`comments/${commentId}`, { body: this.editCommentText }).subscribe(() => {
      this.editingCommentId = null;
      this.editCommentText = '';
      if (this.selectedOrder) this.loadComments(this.selectedOrder.id);
    });
  }

  deleteComment(commentId: number, orderId: number): void {
    this.api.delete(`comments/${commentId}`).subscribe(() => {
      this.loadComments(orderId);
    });
  }

  // Trigger category load when going to step 2
  onGoToStep2(): void {
    this.selectedCategories = [];
    this.filteredCategories = [];
    this.loadFilteredCategoriesAndProducts();
    this.goStep(2);
  }
}
