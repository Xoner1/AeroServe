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
            <h2>Internal Commands</h2>
            <p class="subtitle">Manage and track point-of-sale supply requests</p>
          </div>
          @if (userRole === 'RESPONSABLE_FB') {
            <button class="btn btn-primary" (click)="openCreateModal()">+ New Order</button>
          }
        </div>

        <!-- ─── F&B MANAGER: LIST VIEW ─── -->
        @if (userRole === 'RESPONSABLE_FB' || userRole === 'SUPER_ADMIN') {
          <div class="card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created by</th>
                    <th>POS</th>
                    <th>Delivery Date</th>
                    <th>Date Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (o of orders; track o.id) {
                    <tr>
                      <td>#{{ o.id }}</td>
                      <td><span class="badge type">{{ o.type | uppercase }}</span></td>
                      <td>
                        <span class="badge" [class]="'status-' + o.status.toLowerCase()">
                          {{ formatStatus(o.status) }}
                        </span>
                      </td>
                      <td>{{ o.creator?.first_name }} {{ o.creator?.last_name }}</td>
                      <td>{{ o.point_de_vente?.name || '-' }}</td>
                      <td>
                        <span class="delivery-date-tag">
                           {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'Not specified' }}
                        </span>
                      </td>
                      <td>{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="actions">
                        <button class="btn-sm" (click)="viewOrder(o)">View Details</button>
                        @if (userRole === 'SUPER_ADMIN') {
                          <button class="btn-icon danger" (click)="deleteOrder(o.id)"></button>
                        }
                      </td>
                    </tr>
                  }
                  @if (orders.length === 0) {
                    <tr>
                      <td colspan="8" style="text-align: center; padding: 32px; color: #9ca3af;">
                        No orders recorded yet. Click "+ New Order" to start.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ─── KITCHEN / WAREHOUSE: KANBAN BOARD ─── -->
        @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
          <div cdkDropListGroup class="kanban-board">
            
            <!-- Column 1: Pending -->
            <div class="kanban-col">
              <div class="col-header pending">
                <span>Pending</span>
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
                      <span class="badge type-sm">{{ o.type }}</span>
                    </div>
                    <p class="card-pos"> {{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator"> F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date"> {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'No Date' }}</span>
                      <button class="btn-card-action">Manage</button>
                    </div>
                  </div>
                }
                @if (pendingOrders.length === 0) {
                  <div class="empty-col">No pending orders</div>
                }
              </div>
            </div>

            <!-- Column 2: Partially Available -->
            <div class="kanban-col">
              <div class="col-header partial">
                <span>Partially Ready</span>
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
                      <span class="badge type-sm">{{ o.type }}</span>
                    </div>
                    <p class="card-pos"> {{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator"> F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date"> {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'No Date' }}</span>
                      <button class="btn-card-action">Manage</button>
                    </div>
                  </div>
                }
                @if (partialOrders.length === 0) {
                  <div class="empty-col">No partial orders</div>
                }
              </div>
            </div>

            <!-- Column 3: Available / Flipped to Ready -->
            <div class="kanban-col">
              <div class="col-header available">
                <span>Ready / Available</span>
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
                      <span class="badge type-sm">{{ o.type }}</span>
                    </div>
                    <p class="card-pos"> {{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator"> F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date"> {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'No Date' }}</span>
                      <button class="btn-card-action">Manage</button>
                    </div>
                  </div>
                }
                @if (availableOrders.length === 0) {
                  <div class="empty-col">No ready orders</div>
                }
              </div>
            </div>

            <!-- Column 4: Unavailable -->
            <div class="kanban-col">
              <div class="col-header unavailable">
                <span>Unavailable</span>
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
                      <span class="badge type-sm">{{ o.type }}</span>
                    </div>
                    <p class="card-pos"> {{ o.point_de_vente?.name || 'General' }}</p>
                    <p class="card-creator"> F&B: {{ o.creator?.first_name }} {{ o.creator?.last_name }}</p>
                    <div class="card-bottom">
                      <span class="card-date"> {{ o.delivery_date ? (o.delivery_date | date:'dd/MM/yyyy') : 'No Date' }}</span>
                      <button class="btn-card-action">Manage</button>
                    </div>
                  </div>
                }
                @if (unavailableOrders.length === 0) {
                  <div class="empty-col">No unavailable orders</div>
                }
              </div>
            </div>

          </div>
        }

        <!-- ─── DETAILS & FULFILLMENT MODAL ─── -->
        @if (showViewModal && selectedOrder) {
          <div class="modal-overlay" (click)="closeModals()">
            <div class="modal modal-wide" (click)="$event.stopPropagation()">
              <div class="modal-header-nav">
                <h3>Order #{{ selectedOrder.id }} Details</h3>
                <button class="btn-close-x" (click)="closeModals()">✕</button>
              </div>

              <div class="order-detail-grid">
                <div class="detail-panel card">
                  <div class="status-summary">
                    <span class="badge" [class]="'status-' + selectedOrder.status.toLowerCase()">
                      {{ formatStatus(selectedOrder.status) }}
                    </span>
                    <span class="badge type">{{ selectedOrder.type | uppercase }}</span>
                  </div>
                  
                  <div class="meta-info">
                    <p><strong>Created By:</strong> {{ selectedOrder.creator?.first_name }} {{ selectedOrder.creator?.last_name }} ({{ selectedOrder.creator?.email }})</p>
                    <p><strong>Point of Sale:</strong> {{ selectedOrder.point_de_vente?.name || '-' }}</p>
                    <p><strong>Requested Delivery Date:</strong> 
                      <span class="delivery-date-tag">
                         {{ selectedOrder.delivery_date ? (selectedOrder.delivery_date | date:'dd/MM/yyyy') : 'Not specified' }}
                      </span>
                    </p>
                    <p><strong>Notes / Special Instructions:</strong></p>
                    <div class="notes-box">{{ selectedOrder.notes || 'No notes provided.' }}</div>
                  </div>

                  <!-- FULFILLMENT FORM -->
                  <h4>Order Items Fulfillment</h4>
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Requested</th>
                        <th>Fulfilled</th>
                        @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                          <th>Fulfill Control</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of selectedOrder.items; track item.id) {
                        <tr>
                          <td>
                            <div class="prod-cell">
                              @if (item.product?.image) {
                                <img [src]="getImgUrl(item.product?.image)" class="prod-thumb" />
                              }
                              <span>{{ item.product?.name }}</span>
                            </div>
                          </td>
                          <td><strong>{{ item.quantity_requested }}</strong></td>
                          <td>
                            <span class="badge" [class]="item.quantity_fulfilled >= item.quantity_requested ? 'status-disponible' : 'status-en_attente'">
                              {{ item.quantity_fulfilled }}
                            </span>
                          </td>
                          @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                            <td>
                              <div class="fulfill-input-control">
                                <input type="number" [(ngModel)]="item.quantity_fulfilled" min="0" [max]="item.quantity_requested" class="qty-input-sm" />
                                <button class="btn-fulfill-save" (click)="saveFulfillment(selectedOrder.id, item)">Save</button>
                              </div>
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- COMMENTS BOX — Facebook-style with ownership -->
                <div class="comments-panel card">
                  <h4> Comments &amp; Chat Logs</h4>
                  <div class="comments-list">
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
                                <button class="btn btn-primary btn-xs" (click)="saveEditComment(c.id)">Save</button>
                                <button class="btn btn-xs" (click)="cancelEditComment()">Cancel</button>
                              </div>
                            </div>
                          } @else {
                            <p class="fb-comment-text">{{ c.body }}</p>
                          }
                          @if (c.user_id === currentUser.id && editingCommentId !== c.id) {
                            <div class="fb-comment-actions">
                              <button class="fb-action-btn" (click)="startEditComment(c)">Edit</button>
                              <button class="fb-action-btn danger" (click)="deleteComment(c.id, selectedOrder.id)">Delete</button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    @if (comments.length === 0) {
                      <div class="empty-comments">No comments posted yet. Leave a note below.</div>
                    }
                  </div>
                  
                  @if (userRole !== 'RESPONSABLE_FB') {
                    <div class="comment-input-area">
                      <textarea [(ngModel)]="newComment" placeholder="Write a comment..." rows="2"></textarea>
                      <button class="btn btn-primary" (click)="addComment(selectedOrder.id)">Send Comment</button>
                    </div>
                  }
                </div>

              </div>

              <div class="modal-actions">
                @if (userRole === 'CHEF_CUISINE' || userRole === 'CHEF_MAGASIN') {
                  <div class="transition-controls">
                    <span>Update Status: </span>
                    <select class="status-select" (change)="onStatusChange($event)">
                      <option value="" disabled [selected]="true">— Select Status —</option>
                      <option value="DISPONIBLE">Disponible</option>
                      <option value="NON_DISPONIBLE">Non Disponible</option>
                      <option value="PARTIELLEMENT_DISPONIBLE">Partiellement Disponible</option>
                    </select>
                  </div>
                }
                <button class="btn btn-secondary" (click)="closeModals()">Close</button>
              </div>
            </div>
          </div>
        }

        <!-- ─── CREATE ORDER WIZARD ─── -->
        @if (showCreateModal) {
          <div class="modal-overlay" (click)="closeModals()">
            <div class="modal modal-wide" (click)="$event.stopPropagation()">

              <!-- Step indicator -->
              <div class="steps">
                @for (s of steps; track s.n) {
                  <div class="step" [class.active]="wizardStep === s.n" [class.done]="wizardStep > s.n">
                    <div class="step-circle">{{ s.n }}</div>
                    <span>{{ s.label }}</span>
                  </div>
                  @if (s.n < steps.length) { <div class="step-line" [class.done]="wizardStep > s.n"></div> }
                }
              </div>

              <!-- ── Step 1: Choose Type ── -->
              @if (wizardStep === 1) {
                <h3>Select Supply Order Type</h3>
                <div class="type-cards">
                  <div class="type-card" [class.selected]="form.type === 'food'" (click)="selectType('food')">
                    <div class="type-icon"></div>
                    <strong>FOOD</strong>
                    <small>Fresh ingredients & food preparations</small>
                  </div>
                  <div class="type-card" [class.selected]="form.type === 'commercial'" (click)="selectType('commercial')">
                    <div class="type-icon"></div>
                    <strong>COMMERCIAL</strong>
                    <small>Retail goods & raw materials</small>
                  </div>
                </div>
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="closeModals()">Cancel</button>
                  <button class="btn btn-primary" [disabled]="!form.type" (click)="onGoToStep2()">Next</button>
                </div>
              }

              <!-- ── Step 2: Choose Categories ── -->
              @if (wizardStep === 2) {
                <h3>Select Categories to Filter Products</h3>
                @if (loadingCategories) { <p class="loading-label">Loading categories...</p> }
                <div class="categories-grid">
                  @for (cat of filteredCategories; track cat.id) {
                    <div class="category-chip"
                         [class.selected]="isCategorySelected(cat.id)"
                         (click)="toggleCategory(cat)">
                      {{ cat.name }}
                      @if (cat.code) { <small>({{ cat.code }})</small> }
                    </div>
                  }
                </div>
                @if (filteredCategories.length === 0 && !loadingCategories) {
                  <p class="empty-hint">No categories available for this type.</p>
                }
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="goStep(1)">Back</button>
                  <button class="btn btn-primary" [disabled]="selectedCategories.length === 0" (click)="loadProductsByCategories()">Next</button>
                </div>
              }

              <!-- ── Step 3: Products Grid ── -->
              @if (wizardStep === 3) {
                <h3>Select Products to Add</h3>
                @if (loadingProducts) { <p class="loading-label">Fetching catalog...</p> }
                <div class="products-grid">
                  @for (prod of availableProducts; track prod.id) {
                    <div class="product-card" [class.in-cart]="isInCart(prod.id)">
                      @if (prod.image) {
                        <img [src]="getImgUrl(prod.image)" [alt]="prod.name" class="product-img" />
                      } @else {
                        <div class="product-img placeholder"></div>
                      }
                      <div class="product-info">
                        <strong>{{ prod.name }}</strong>
                        <small class="cat-label">{{ prod.category?.name }}</small>
                      </div>
                      <button class="btn-add" (click)="addToCart(prod)" [disabled]="isInCart(prod.id)">
                        {{ isInCart(prod.id) ? '✓ Added' : '+ Add to Order' }}
                      </button>
                    </div>
                  }
                </div>
                @if (availableProducts.length === 0 && !loadingProducts) {
                  <p class="empty-hint">No approved products found in these categories.</p>
                }
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="goStep(2)">Back</button>
                  <button class="btn btn-primary" [disabled]="cart.length === 0" (click)="goStep(4)">View Cart ({{ cart.length }})</button>
                </div>
              }

              <!-- ── Step 4: Cart ── -->
              @if (wizardStep === 4) {
                <h3>Adjust Order Quantities</h3>
                <div class="cart-list">
                  @for (item of cart; track item.product.id) {
                    <div class="cart-item">
                      <span class="cart-name">{{ item.product.name }}</span>
                      <div class="qty-control">
                        <button (click)="decreaseQty(item)">−</button>
                        <input type="number" [(ngModel)]="item.quantity" [name]="'q'+item.product.id" min="1" class="qty-input" />
                        <button (click)="increaseQty(item)">+</button>
                      </div>
                      <button class="btn-icon danger" (click)="removeFromCart(item.product.id)">✕</button>
                    </div>
                  }
                </div>
                @if (cart.length === 0) {
                  <p class="empty-hint">Your cart is empty.</p>
                }
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="goStep(3)">Back</button>
                  <button class="btn btn-primary" [disabled]="cart.length === 0" (click)="goStep(5)">Next</button>
                </div>
              }

              <!-- ── Step 5: Delivery Date & Notes + Submit ── -->
              @if (wizardStep === 5) {
                <h3>Delivery Scheduling & Summary</h3>
                
                <div class="scheduling-block">
                  <div class="form-group">
                    <label> Requested Delivery Date *</label>
                    <input type="date" [(ngModel)]="form.delivery_date" name="delivery_date" class="date-input" required />
                  </div>

                  <div class="form-group">
                    <label> Special instructions / Notes</label>
                    <textarea [(ngModel)]="form.notes" name="notes" rows="3" placeholder="Enter custom notes or delivery instructions here..."></textarea>
                  </div>
                </div>

                <div class="order-summary">
                  <h4>Order Summary</h4>
                  <p><strong>Type:</strong> {{ form.type | uppercase }}</p>
                  <p><strong>Scheduled Delivery:</strong> {{ form.delivery_date ? (form.delivery_date | date:'dd/MM/yyyy') : 'NOT SPECIFIED (Please fill)' }}</p>
                  <p><strong>Products to Order:</strong> {{ cart.length }} items</p>
                  <ul>
                    @for (item of cart; track item.product.id) {
                      <li>{{ item.product.name }} × {{ item.quantity }}</li>
                    }
                  </ul>
                </div>
                @if (saveError) {
                  <div class="error-msg">{{ saveError }}</div>
                }
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="goStep(4)">Back</button>
                  <button class="btn btn-primary" (click)="submitOrder()" [disabled]="saving || !form.delivery_date">
                    {{ saving ? 'Submitting Order...' : 'Confirm & Place Order' }}
                  </button>
                </div>
              }

            </div>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #D8D2C8; padding-bottom: 16px; }
    .page-header h2 { margin: 0; font-size: 28px; font-weight: 800; color: #1A1D1B; }
    .subtitle { margin: 4px 0 0 0; font-size: 14px; color: #A8C5A0; }
    .card { background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(26,29,27,.04); border: 1px solid #D8D2C8; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 16px; background: #EDE9E2; color: #A8C5A0; font-weight: 700; border-bottom: 2px solid #D8D2C8; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
    td { padding: 16px; border-bottom: 1px solid #EEEEE9; color: #4A4D4B; }
    .actions { display: flex; gap: 8px; }
    .badge { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; text-transform: capitalize; }
    .badge.type { background: #E8F0EB; color: #6B8F71; border: 1px solid rgba(107,131,116,.15); }
    .badge.type-sm { font-size: 10px; padding: 2px 8px; background: #E8F0EB; color: #6B8F71; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
    
    .status-en_attente { background: #F5EDE4; color: #D4924A; border: 1px solid rgba(212,163,115,.15); }
    .status-disponible { background: #E8F0EB; color: #6B8F71; border: 1px solid rgba(107,131,116,.15); }
    .status-partiellement_disponible { background: #F5EDE4; color: #D4924A; border: 1px solid rgba(212,163,115,.15); }
    .status-non_disponible { background: #F5E4E4; color: #C0483A; border: 1px solid rgba(194,115,115,.15); }
    
    .delivery-date-tag { background: #EDE9E2; color: #4A4D4B; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    
    .btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .15s ease; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: #6B8F71; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #5A7263; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: #EDE9E2; color: #4A4D4B; }
    .btn-secondary:hover { background: #D8D2C8; }
    
    .btn-sm { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; background: #EDE9E2; color: #4A4D4B; transition: all .15s; }
    .btn-sm:hover { background: #D8D2C8; color: #1A1D1B; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; padding: 6px 8px; border-radius: 8px; transition: all .15s ease; }
    .btn-icon.danger:hover { background: #F5E4E4; }
    
    /* Kanban Styles */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: flex-start; margin-top: 10px; }
    .kanban-col { background: #EDE9E2; border-radius: 16px; padding: 16px; border: 1px solid #D8D2C8; max-height: 80vh; display: flex; flex-direction: column; }
    .col-header { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px solid; }
    .col-header.pending { color: #D4924A; border-color: #F5EDE4; }
    .col-header.partial { color: #D4924A; border-color: #F5EDE4; }
    .col-header.available { color: #6B8F71; border-color: #E8F0EB; }
    .col-header.unavailable { color: #C0483A; border-color: #F5E4E4; }
    
    .col-count { background: rgba(26,29,27,.05); padding: 2px 8px; border-radius: 99px; font-size: 11px; }
    .col-cards { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; padding: 2px; min-height: 50px; }
    .kanban-card { background: #FFFFFF; border-radius: 14px; padding: 16px; border: 1.5px solid #D8D2C8; cursor: pointer; transition: all .15s; box-shadow: 0 4px 6px rgba(26,29,27,.02); }
    .kanban-card:hover { transform: translateY(-2px); border-color: #6B8F71; box-shadow: 0 8px 16px rgba(26,29,27,.06); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .card-id { font-weight: 700; color: #4A4D4B; font-size: 13px; }
    .card-pos { font-weight: 700; color: #1A1D1B; margin: 0 0 6px 0; font-size: 14px; }
    .card-creator { font-size: 12px; color: #A8C5A0; margin: 0 0 12px 0; }
    .card-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding-top: 8px; border-top: 1px solid #EEEEE9; }
    .card-date { color: #A8C5A0; font-weight: 600; }
    .btn-card-action { border: none; background: #E8F0EB; color: #6B8F71; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
    .empty-col { text-align: center; color: #A8C5A0; font-size: 13px; padding: 24px; border: 2px dashed #D8D2C8; border-radius: 12px; background: #FFFFFF; }
    
    /* Drag & Drop CDK Styles */
    .cdk-drag-preview {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(26,29,27,.1);
      border: 1.5px solid #6B8F71;
      opacity: 0.95;
      transform: rotate(2deg);
      z-index: 9999;
    }
    .cdk-drag-placeholder {
      opacity: 0.4;
      background: #EDE9E2;
      border: 2px dashed #D8D2C8;
      border-radius: 14px;
    }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .col-cards.cdk-drop-list-dragging .kanban-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    
    /* Modal Overlay & Details */
    .modal-overlay { position: fixed; inset: 0; background: rgba(29,35,31,.6); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
    .modal { background: #FFFFFF; border-radius: 20px; padding: 28px; width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto; box-shadow: 0 4px 24px rgba(26,29,27,.08); }
    .modal-wide { max-width: 980px; }
    .modal-header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .modal-header-nav h3 { margin: 0; font-size: 22px; font-weight: 800; color: #1A1D1B; }
    .btn-close-x { background: none; border: none; font-size: 18px; color: #A8C5A0; cursor: pointer; font-weight: bold; }
    
    .order-detail-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
    .detail-panel { padding: 20px; }
    .status-summary { display: flex; gap: 10px; margin-bottom: 16px; }
    .meta-info p { margin: 8px 0; font-size: 13.5px; color: #4A4D4B; }
    .notes-box { background: #EDE9E2; border: 1.5px solid #D8D2C8; border-radius: 10px; padding: 12px; font-size: 13px; color: #4A4D4B; margin-top: 6px; min-height: 50px; }
    
    .prod-cell { display: flex; align-items: center; gap: 8px; }
    .prod-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }
    .qty-input-sm { width: 60px; padding: 6px; border: 1.5px solid #D8D2C8; border-radius: 8px; text-align: center; font-weight: bold; }
    .fulfill-input-control { display: flex; gap: 6px; align-items: center; }
    .btn-fulfill-save { border: none; background: #6B8F71; color: #fff; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer; }
    .btn-fulfill-save:hover { background: #5A7263; }

    /* Comments Section — Facebook-style */
    .comments-panel { display: flex; flex-direction: column; height: 100%; max-height: 480px; padding: 20px; }
    .comments-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding-right: 6px; margin-bottom: 16px; min-height: 200px; }
    .fb-comment { display: flex; gap: 10px; align-items: flex-start; }
    .fb-comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: #2C3E35; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .fb-comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .fb-avatar-fallback { color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .fb-comment-body { flex: 1; background: #EDE9E2; border-radius: 12px; padding: 10px 14px; }
    .fb-comment-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .fb-comment-author { font-size: 12px; color: #1A1D1B; }
    .fb-comment-time { font-size: 10px; color: #A8C5A0; }
    .fb-comment-text { margin: 0; font-size: 13px; color: #4A4D4B; line-height: 1.45; word-break: break-word; white-space: pre-wrap; }
    .fb-comment-actions { display: flex; gap: 12px; margin-top: 6px; }
    .fb-action-btn { background: none; border: none; padding: 0; font-size: 11px; font-weight: 600; color: #A8C5A0; cursor: pointer; }
    .fb-action-btn:hover { color: #6B8F71; }
    .fb-action-btn.danger { color: #C0483A; }
    .fb-action-btn.danger:hover { color: #A85555; }
    .fb-comment-edit { display: flex; flex-direction: column; gap: 6px; }
    .fb-edit-input { width: 100%; padding: 8px 10px; border: 1.5px solid #6B8F71; border-radius: 8px; font-size: 13px; resize: none; outline: none; }
    .fb-edit-actions { display: flex; gap: 6px; }
    .btn-xs { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid #D8D2C8; background: #FFFFFF; color: #4A4D4B; }
    .btn-xs:hover { background: #EDE9E2; }
    .empty-comments { text-align: center; color: #A8C5A0; font-size: 12px; padding: 32px; }
    
    .comment-input-area { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #EEEEE9; padding-top: 14px; }
    .comment-input-area textarea { padding: 10px 12px; border: 1.5px solid #D8D2C8; border-radius: 10px; font-size: 13px; resize: none; outline: none; }
    .comment-input-area textarea:focus { border-color: #6B8F71; }

    /* Create Order Wizard */
    .steps { display: flex; align-items: center; margin-bottom: 28px; justify-content: center; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .step-circle { width: 36px; height: 36px; border-radius: 50%; background: #D8D2C8; color: #A8C5A0; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .step.active .step-circle { background: #6B8F71; color: #fff; box-shadow: 0 0 0 4px rgba(107,131,116,.15); }
    .step.done .step-circle { background: #6B8F71; color: #fff; }
    .step span { font-size: 10px; color: #A8C5A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .step.active span { color: #6B8F71; }
    .step.done span { color: #6B8F71; }
    .step-line { flex: 1; height: 3px; background: #D8D2C8; margin: 0 12px 18px; transition: background .15s; }
    .step-line.done { background: #6B8F71; }

    .type-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 12px; }
    .type-card { border: 2px solid #D8D2C8; border-radius: 16px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all .15s; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .type-card:hover { border-color: #6B8F71; background: #EDE9E2; }
    .type-card.selected { border-color: #6B8F71; background: #E8F0EB; box-shadow: 0 0 0 4px rgba(107,131,116,.1); }
    .type-icon { font-size: 48px; }
    .type-card strong { font-size: 18px; font-weight: 800; color: #1A1D1B; }
    .type-card small { font-size: 12px; color: #A8C5A0; }

    .categories-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .category-chip { padding: 10px 20px; border: 2px solid #D8D2C8; border-radius: 99px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .15s; color: #4A4D4B; background: #FFFFFF; }
    .category-chip:hover { border-color: #6B8F71; color: #6B8F71; }
    .category-chip.selected { background: #6B8F71; color: #fff; border-color: #6B8F71; }
    
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; margin-bottom: 12px; }
    .product-card { border: 2px solid #D8D2C8; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: all .15s; background: #FFFFFF; }
    .product-card.in-cart { border-color: #6B8F71; background: #E8F0EB; }
    .product-img { width: 100%; height: 110px; object-fit: cover; }
    .product-img.placeholder { display: flex; align-items: center; justify-content: center; font-size: 42px; background: #EDE9E2; height: 110px; }
    .product-info { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .product-info strong { font-size: 13.5px; color: #1A1D1B; }
    .btn-add { margin: 8px 12px 12px; padding: 8px 12px; border-radius: 8px; border: none; font-size: 12px; font-weight: bold; cursor: pointer; background: #6B8F71; color: #fff; transition: all .15s; }
    .btn-add:hover { background: #5A7263; }
    .btn-add:disabled { background: #6B8F71; cursor: not-allowed; opacity: .6; }

    .cart-list { display: flex; flex-direction: column; gap: 12px; }
    .cart-item { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border: 1.5px solid #D8D2C8; border-radius: 14px; background: #FFFFFF; }
    .cart-name { flex: 1; font-size: 14.5px; font-weight: 600; color: #1A1D1B; }
    .qty-control { display: flex; align-items: center; gap: 8px; }
    .qty-control button { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #D8D2C8; background: #FFFFFF; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .qty-input { width: 64px; text-align: center; padding: 6px; border: 1.5px solid #D8D2C8; border-radius: 8px; font-size: 14px; font-weight: bold; }

    .scheduling-block { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .date-input { width: 100%; max-width: 300px; padding: 10px 14px; border: 1.5px solid #D8D2C8; border-radius: 8px; font-size: 14px; outline: none; }
    .date-input:focus { border-color: #6B8F71; }

    .transition-controls { display: flex; gap: 8px; align-items: center; flex: 1; font-size: 12px; font-weight: bold; color: #A8C5A0; }
    .status-select { padding: 8px 12px; border: 1.5px solid #D8D2C8; border-radius: 8px; font-size: 13px; font-weight: 600; color: #4A4D4B; background: #FFFFFF; outline: none; cursor: pointer; }
    .status-select:focus { border-color: #6B8F71; box-shadow: 0 0 0 3px rgba(107, 131, 116, 0.12); }

    .order-summary { background: #EDE9E2; border-radius: 14px; padding: 18px; border: 1px dashed #D8D2C8; }
    .order-summary ul { margin: 10px 0 0 20px; padding: 0; font-size: 13.5px; color: #4A4D4B; }
    .empty-hint { color: #A8C5A0; font-size: 14px; text-align: center; padding: 32px; }
    .loading-label { color: #A8C5A0; font-size: 13px; margin: 8px 0; }
    .error-msg { background: #F5E4E4; color: #C0483A; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; margin-top: 12px; font-weight: 600; }
  `]
})
export class InternalOrdersComponent implements OnInit {

  orders: InternalOrder[] = [];
  loading = true;

  showViewModal = false;
  showCreateModal = false;
  selectedOrder: InternalOrder | null = null;

  wizardStep = 1;
  steps = [
    { n: 1, label: 'Type' },
    { n: 2, label: 'Categories' },
    { n: 3, label: 'Products' },
    { n: 4, label: 'Cart' },
    { n: 5, label: 'Confirm' },
  ];

  form: any = { type: '', notes: '', delivery_date: '' };

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

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    this.userRole = this.currentUser?.role?.name || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('internal-orders').subscribe({
      next: res => this.orders = res.data || res,
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  // Kanban getters
  get pendingOrders() { return this.orders.filter(o => o.status === 'EN_ATTENTE'); }
  get partialOrders() { return this.orders.filter(o => o.status === 'PARTIELLEMENT_DISPONIBLE'); }
  get availableOrders() { return this.orders.filter(o => o.status === 'DISPONIBLE'); }
  get unavailableOrders() { return this.orders.filter(o => o.status === 'NON_DISPONIBLE'); }

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
    this.wizardStep = 1;
    this.form = { type: '', notes: '', delivery_date: '' };
    this.selectedCategories = [];
    this.availableProducts = [];
    this.cart = [];
    this.saveError = '';
    this.showCreateModal = true;
  }

  goStep(n: number): void {
    this.wizardStep = n;
  }

  selectType(type: string): void {
    this.form.type = type;
  }

  // ─── Step 2: Categories ───────────────────────────────────────────────────

  loadFilteredCategories(): void {
    this.loadingCategories = true;
    this.api.get<Category[]>('categories').subscribe({
      next: cats => {
        const typeMap: Record<string, string[]> = {
          food: ['food'],
          commercial: ['commercial'],
        };
        const allowed = typeMap[this.form.type] || [];
        this.filteredCategories = cats.filter(c => allowed.includes(c.type));
        this.loadingCategories = false;
      },
      error: () => { this.loadingCategories = false; }
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

  // ─── Step 3: Products ─────────────────────────────────────────────────────

  loadProductsByCategories(): void {
    this.goStep(3);
    this.loadingProducts = true;
    const ids = this.selectedCategories.map(c => c.id);
    this.api.post<any>('products/by-categories', { category_ids: ids }).subscribe({
      next: (prods: any) => {
        this.availableProducts = prods.data || prods;
        this.loadingProducts = false;
      },
      error: () => { this.loadingProducts = false; }
    });
  }

  addToCart(product: Product): void {
    if (!this.isInCart(product.id)) {
      this.cart.push({ product, quantity: 1 });
    }
  }

  isInCart(id: number): boolean {
    return this.cart.some(i => i.product.id === id);
  }

  // ─── Step 4: Cart ─────────────────────────────────────────────────────────

  increaseQty(item: CartItem): void { item.quantity++; }
  decreaseQty(item: CartItem): void { if (item.quantity > 1) item.quantity--; }
  removeFromCart(id: number): void { this.cart = this.cart.filter(i => i.product.id !== id); }

  // ─── Submit ───────────────────────────────────────────────────────────────

  submitOrder(): void {
    if (!this.form.delivery_date) {
      this.saveError = 'Please select a delivery date.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload = {
      type: this.form.type,
      notes: this.form.notes,
      delivery_date: this.form.delivery_date,
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
    this.loadFilteredCategories();
    this.goStep(2);
  }
}
