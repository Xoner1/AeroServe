import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, Category } from '../../core/models';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';
import { AppIconComponent } from '../../shared/icon/app-icon.component';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent, AppIconComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="table" [rows]="10" />
    } @else {
      <div class="page">
        <div class="page-header">
          <h2>{{ validationMode ? 'Validation des Produits' : 'Catalogue Produits' }}</h2>

          <div class="header-actions">
            @if (userRole !== 'CHEF_CUISINE' && userRole !== 'CHEF_MAGASIN' && userRole !== 'RESPONSABLE_ACHAT') {
              <select [(ngModel)]="filterType" (ngModelChange)="applyFilter()" class="filter-select">
                <option value="">Tous les types</option>
                <option value="commercial">Commercial</option>
                <option value="matiere_premiere">Matière première</option>
                <option value="food">Food</option>
                <option value="plat">Plat</option>
              </select>
            } @else if (userRole === 'CHEF_CUISINE') {
              <select [(ngModel)]="filterType" (ngModelChange)="applyFilter()" class="filter-select">
                <option value="">Tous</option>
                <option value="food">Food</option>
                <option value="plat">Plat</option>
              </select>
            } @else if (userRole === 'CHEF_MAGASIN') {
              <span class="filter-badge">Type: Réserve</span>
            } @else if (userRole === 'RESPONSABLE_ACHAT') {
              <span class="filter-badge">Type: Commercial + Matière première</span>
            }

            @if (userRole === 'RESPONSABLE_ACHAT' && !validationMode) {
              <select [(ngModel)]="filterApprovalStatus" (ngModelChange)="applyFilter()" class="filter-select">
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Refusé</option>
              </select>
            }

            @if (!validationMode) {
              <button class="btn btn-primary" (click)="openModal()">
                <app-icon name="Package" [size]="14"></app-icon> Nouveau Produit
              </button>
            }
          </div>
        </div>

        <!-- Tabular List -->
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Nom</th>
                <th>Type</th>
                <th>Catégorie</th>
                @if (userRole !== 'CHEF_CUISINE') { <th>Validation</th> }
                <th>Service</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>

            <tbody>
              @for (p of filteredProducts; track p.id) {
                <tr>
                  <td>
                    @if (p.image) {
                      <img [src]="getImageUrl(p.image)" alt="Product" class="table-product-img" />
                    } @else {
                      <div class="product-icon-fallback">
                        <app-icon name="Package" [size]="16"></app-icon>
                      </div>
                    }
                  </td>
                  <td>
                    <div class="product-name-wrapper">
                      <span class="product-title">{{ p.name }}</span>
                      @if (p.description) {
                        <span class="product-subtitle">{{ p.description }}</span>
                      }
                    </div>
                  </td>

                  <td>
                    <span class="badge badge-neutral">{{ p.type }}</span>
                  </td>

                  <td>
                    {{ p.category?.name || '-' }}
                  </td>

                  @if (userRole !== 'CHEF_CUISINE') {
                    <td>
                      <span class="badge" [class.badge-success]="p.approval_status === 'approved'" [class.badge-warning]="p.approval_status === 'pending'" [class.badge-error]="p.approval_status === 'rejected'">
                        {{ p.approval_status === 'approved'
                          ? 'Approuvé'
                          : p.approval_status === 'pending'
                          ? 'En attente'
                          : 'Rejeté' }}
                      </span>
                    </td>
                  }

                  <td>
                    @if (p.approval_status === 'approved') {
                      <span class="badge" [class.badge-success]="p.is_active" [class.badge-error]="!p.is_active">
                        {{ p.is_active ? 'Actif' : 'Inactif' }}
                      </span>
                    } @else {
                      -
                    }
                  </td>

                  <td style="text-align: right;">
                    <div class="action-buttons">
                      @if (!validationMode && (p.type === 'food' || p.type === 'plat')) {
                        <button class="action-btn info-btn" (click)="openChatbot(p)" title="Copilote Nutritionnel IA">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                      }
                      @if (validationMode && p.approval_status === 'pending') {
                        <button class="approve-btn" (click)="updateApprovalStatus(p, 'approved')" title="Approuver">
                          <app-icon name="Check" [size]="14"></app-icon>
                        </button>
                        <button class="reject-btn" (click)="updateApprovalStatus(p, 'rejected')" title="Rejeter">
                          <app-icon name="X" [size]="14"></app-icon>
                        </button>
                      } @else {
                        <button class="action-btn" (click)="editProduct(p)" title="Modifier">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </button>
                        <button class="action-btn danger-btn" (click)="deleteProduct(p.id)" title="Supprimer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @if (filteredProducts.length === 0) {
                <tr>
                  <td colspan="7" class="empty-state">
                    Aucun produit trouvé dans cette catégorie.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- CREATE/EDIT MODAL -->
        @if (showModal) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 600px;">
              <div class="modal-header">
                <h3>{{ editing ? 'Modifier' : 'Ajouter' }} un produit</h3>
                <button (click)="closeModal()" style="font-size:16px;">✕</button>
              </div>

              <form (ngSubmit)="save()">
                <div class="modal-body" style="max-height: 68vh;">
                  <!-- NAME -->
                  <div class="form-group">
                    <label>Nom du Produit</label>
                    <input [(ngModel)]="form.name" name="name" required [disabled]="isLockedField('name')" placeholder="Saisissez le nom" />
                  </div>

                  <div class="form-row">
                    <!-- TYPE -->
                    <div class="form-group">
                      <label>Type</label>
                      @if (isChefCuisine) {
                        <select [(ngModel)]="form.type" name="type" required [disabled]="isLockedField('type')">
                          <option value="food">Food</option>
                          <option value="plat">Plat</option>
                        </select>
                      } @else if (isChefMagasin || isResponsableAchat) {
                        <select [(ngModel)]="form.type" name="type" required [disabled]="isLockedField('type')">
                          <option value="commercial">Commercial</option>
                          <option value="matiere_premiere">Matière première</option>
                        </select>
                      } @else {
                        <select [(ngModel)]="form.type" name="type" required [disabled]="isLockedField('type')">
                          <option value="commercial">Commercial</option>
                          <option value="matiere_premiere">Matière première</option>
                          <option value="food">Food</option>
                        </select>
                      }
                    </div>

                    <!-- PRICE (hidden for restricted roles) -->
                    @if (!isRestrictedRole) {
                      <div class="form-group">
                        <label>Prix de vente (TND)</label>
                        <input type="number" step="0.01" [(ngModel)]="form.price" name="price" required [disabled]="isLockedField('price')" placeholder="0.00" />
                      </div>
                    }
                  </div>

                  <!-- CATEGORY -->
                  @if (form.type !== 'food' && form.type !== 'plat') {
                    <div class="form-group">
                      <label>Catégorie de Réserve</label>
                      <select [(ngModel)]="form.category_id" name="category_id" required [disabled]="isLockedField('category_id')">
                        <option value="">-- choisir une catégorie --</option>
                        @for (c of formCategories; track c.id) {
                          <option [value]="c.id">
                            {{ c.name }}
                          </option>
                        }
                      </select>
                    </div>
                  }

                  <!-- DESCRIPTION -->
                  <div class="form-group">
                    <label>Description & Notes</label>
                    <textarea [(ngModel)]="form.description" name="description" rows="3" placeholder="Notes complémentaires..."></textarea>
                  </div>

                  <!-- ALLERGENS (hidden for restricted roles or non-food products or Responsable Achat) -->
                  @if ((form.type === 'food' || form.type === 'plat') && !isRestrictedRole && !isResponsableAchat) {
                    <div class="form-group">
                      <label>Allergènes (séparés par des virgules)</label>
                      <input [(ngModel)]="form.allergens_text" name="allergens" [disabled]="isLockedField('allergens')" placeholder="Ex: gluten, lactose, fruits à coque" />
                    </div>
                  }

                  <!-- EXPIRATION (hidden for restricted roles or non-food products or Responsable Achat) -->
                  @if ((form.type === 'food' || form.type === 'plat') && !isRestrictedRole && !isResponsableAchat) {
                    <div class="form-group">
                      <label>Date limite de consommation (DLC)</label>
                      <input type="date" [(ngModel)]="form.expiration_date" name="expiration_date" [disabled]="isLockedField('expiration_date')" />
                    </div>
                  }

                  <!-- USAGE STATUS -->
                  @if (editing && selectedProductApprovalStatus === 'approved') {
                    <div class="form-group">
                      <label>Statut en service</label>
                      <select [(ngModel)]="form.usage_status" name="usage_status">
                        <option value="IN_USE">En service (IN_USE)</option>
                        <option value="NOT_IN_USE">Hors service (NOT_IN_USE)</option>
                        <option value="OUT_OF_STOCK">Rupture de stock (OUT_OF_STOCK)</option>
                      </select>
                    </div>
                  }

                  <!-- IMAGE UPLOAD -->
                  <div class="form-group">
                    <label>Image de l'article</label>
                    <input type="file" (change)="onFileSelected($event)" accept="image/*" class="file-input" [disabled]="isLockedField('image')" />
                    @if (imagePreview) {
                      <img [src]="imagePreview" class="preview-image" alt="Aperçu" />
                    }
                  </div>

                  <!-- RECIPE BUILDER -->
                  @if (form.type === 'food' || form.type === 'plat') {
                    <div class="form-group">
                      <label>Quantité par lot (ex: ce batch produit X sandwiches)</label>
                      <input type="number" [(ngModel)]="form.quantity_per_batch" name="quantity_per_batch" min="1" required />
                    </div>

                    <div class="recipe-section">
                      <div class="recipe-header">
                        <h4>Fiche Recette (Matières Premières)</h4>
                        <button type="button" class="btn btn-secondary btn-sm" (click)="addRecipeIngredient()" [disabled]="isLockedField('recipe')">
                          + Ajouter Ingrédient
                        </button>
                      </div>

                      @if (recipeIngredients.length === 0) {
                        <p class="recipe-empty">Aucun ingrédient associé à cette recette.</p>
                      } @else {
                        @for (ing of recipeIngredients; track $index; let idx = $index) {
                          <div class="ingredient-row">
                            <select [(ngModel)]="ing.product_id" name="ing_id_{{idx}}" required [disabled]="isLockedField('recipe')">
                              <option value="0">-- Choisir --</option>
                              @for (avail of availableIngredients; track avail.id) {
                                <option [value]="avail.id">{{ avail.name }}</option>
                              }
                            </select>

                            <input type="number" step="0.01" [(ngModel)]="ing.quantity" name="ing_qty_{{idx}}" placeholder="Qté" required [disabled]="isLockedField('recipe')" />

                            <select [(ngModel)]="ing.unit" name="ing_unit_{{idx}}" required [disabled]="isLockedField('recipe')">
                              <option value="piece">Pièce</option>
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="liter">Litre</option>
                              <option value="ml">ml</option>
                            </select>

                            <button type="button" class="btn-remove" (click)="removeRecipeIngredient(idx)" [disabled]="isLockedField('recipe')">
                              ✕
                            </button>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary">
                    {{ editing ? 'Enregistrer' : 'Créer le Produit' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- IA NUTRITIONAL DRAWER -->
        @if (showChatbot && chatbotProduct) {
          <div class="chat-overlay" (click)="closeChatbot()">
            <div class="chat-drawer" (click)="$event.stopPropagation()">
              <div class="chat-header">
                <div class="chat-title">
                  <span class="chat-avatar-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" stroke-width="2">
                      <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </span>
                  <div>
                    <h4>Copilote Nutritionnel IA</h4>
                    <span>{{ chatbotProduct.name }}</span>
                  </div>
                </div>
                <button class="chat-close" (click)="closeChatbot()">✕</button>
              </div>

              <div class="chat-body">
                <div class="chat-messages">
                  @for (msg of chatbotMessages; track $index) {
                    <div class="chat-bubble" [class.self]="msg.sender === 'user'">
                      <div class="bubble-content">
                        <p>{{ msg.text }}</p>
                      </div>
                    </div>
                  }
                  @if (chatbotLoading) {
                    <div class="chat-bubble">
                      <div class="bubble-content loading-bubble">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="chat-chips">
                <button (click)="askQuickQuestion('Quels sont les allergènes présents ?')">Allergènes ?</button>
                <button (click)="askQuickQuestion('Quels sont les ingrédients ?')">Ingrédients ?</button>
                <button (click)="askQuickQuestion('Est-ce adapté pour un régime sans gluten ?')">Sans Gluten ?</button>
              </div>

              <div class="chat-footer">
                <input type="text" [(ngModel)]="chatbotInput" (keyup.enter)="sendChatbotMessage()" placeholder="Posez une question sur le produit..." [disabled]="chatbotLoading" />
                <button class="chat-send" (click)="sendChatbotMessage()" [disabled]="chatbotLoading">➤</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 0;
    }

    .page-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .filter-badge {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
    }

    .form-input-locked {
      padding: 8px 12px;
      border: 1px solid #E2E8F0;
      border-radius: var(--radius-md);
      font-size: 13px;
      background: #F1F5F9;
      color: var(--text-secondary);
      width: 100%;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #E2E8F0;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      outline: none;
      background: var(--surface);
      cursor: pointer;
      transition: border-color var(--transition);

      &:focus { border-color: var(--accent); }
    }

    .product-name-wrapper {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .product-title { font-weight: 600; color: var(--text-primary); }
    .product-subtitle { font-size: 11px; color: var(--text-muted); }

    .table-product-img {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid #E2E8F0;
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 6px;
      border-radius: var(--radius-sm);
      transition: all var(--transition);
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:hover { background: #F1F5F9; color: var(--text-primary); }
      &.danger-btn:hover { background: #FEE2E2; color: #B91C1C; }
      &.info-btn:hover { background: #E0F2FE; color: #0369A1; }
    }

    .preview-image {
      max-height: 100px;
      object-fit: contain;
      border-radius: var(--radius-md);
      margin-top: 8px;
      border: 1px solid #E2E8F0;
      align-self: flex-start;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .recipe-section {
      margin-top: 16px;
      border-top: 1px solid #F1F5F9;
      padding-top: 16px;
    }

    .recipe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        margin: 0;
        font-size: 13px;
        color: var(--text-primary);
        font-weight: 600;
      }
    }

    .recipe-empty {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
    }

    .ingredient-row {
      display: grid;
      grid-template-columns: 2.2fr 1fr 1.2fr auto;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }

    .ingredient-row select, .ingredient-row input {
      padding: 6px 10px !important;
      font-size: 12.5px !important;
      height: 34px;
    }

    .btn-remove {
      background: #FEE2E2;
      color: #B91C1C;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition);

      &:hover { background: #FCA5A5; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .product-icon-fallback {
      width: 32px;
      height: 32px;
      background: #F1F5F9;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #E2E8F0;
    }

    .approve-btn {
      color: #15803D;
      background: #DCFCE7;
      padding: 6px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition);

      &:hover { background: #BBF7D0; }
    }

    .reject-btn {
      color: #B91C1C;
      background: #FEE2E2;
      padding: 6px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition);

      &:hover { background: #FCA5A5; }
    }

    /* ─── Intelligent Assistant (Chatbot) ─── */
    .chat-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 300;
      display: flex;
      justify-content: flex-end;
    }

    .chat-drawer {
      width: 100%;
      max-width: 400px;
      height: 100%;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      border-left: 1px solid #E2E8F0;
      animation: slideLeft 0.2s ease-out;
    }

    @keyframes slideLeft {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .chat-header {
      padding: 16px;
      background: var(--bg-sidebar);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chat-title {
      display: flex;
      align-items: center;
      gap: 10px;

      h4 { font-size: 13px; font-weight: 600; color: #FFFFFF; margin: 0; }
      span { font-size: 10px; color: #94A3B8; display: block; }
    }

    .chat-avatar-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chat-close {
      color: #94A3B8;
      font-size: 16px;
      cursor: pointer;
      background: none;
      border: none;

      &:hover { color: #FFFFFF; }
    }

    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #F8FAFC;
    }

    .chat-messages { display: flex; flex-direction: column; gap: 12px; }

    .chat-bubble {
      display: flex;
      justify-content: flex-start;

      &.self {
        justify-content: flex-end;

        .bubble-content {
          background: var(--accent);
          color: var(--text-inverse);
          border: none;
          border-radius: 12px 12px 2px 12px;
        }
      }
    }

    .bubble-content {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px 12px 12px 2px;
      background: var(--surface);
      border: 1px solid #E2E8F0;
      color: var(--text-primary);
      font-size: 12.5px;
      line-height: 1.4;

      p { margin: 0; }
    }

    .loading-bubble { display: flex; gap: 4px; padding: 10px 16px; align-items: center; }
    .loading-bubble .dot {
      width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%;
      animation: chatBounce 1.4s infinite ease-in-out both;
    }
    .loading-bubble .dot:nth-child(1) { animation-delay: -0.32s; }
    .loading-bubble .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes chatBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }

    .chat-chips {
      padding: 8px 12px;
      background: var(--surface);
      display: flex;
      gap: 6px;
      overflow-x: auto;
      border-top: 1px solid #F1F5F9;

      &::-webkit-scrollbar { display: none; }

      button {
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: all var(--transition);

        &:hover { background: #E2E8F0; color: var(--text-primary); }
      }
    }

    .chat-footer {
      padding: 12px;
      background: var(--surface);
      border-top: 1px solid #F1F5F9;
      display: flex;
      gap: 8px;

      input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #E2E8F0;
        border-radius: var(--radius-md);
        font-size: 13px;
        background: #F8FAFC;
        outline: none;

        &:focus { border-color: var(--accent); background: var(--surface); }
      }
    }

    .chat-send {
      background: var(--accent);
      color: #FFFFFF;
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all var(--transition);

      &:hover { background: #0F766E; }
    }
  `]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  filteredProducts: Product[] = [];

  filterType = '';
  filterApprovalStatus = '';
  loading = true;
  validationMode = false;

  // ================= CHATBOT PROPERTIES =================
  showChatbot = false;
  chatbotProduct: Product | null = null;
  chatbotMessages: { sender: 'user' | 'bot'; text: string }[] = [];
  chatbotInput = '';
  chatbotLoading = false;

  openChatbot(p: Product): void {
    this.chatbotProduct = p;
    this.chatbotMessages = [
      { sender: 'bot', text: `Bonjour ! Je suis l'assistant nutritionnel d'AeroServe. Posez-moi vos questions concernant la composition, les ingrédients et les allergènes pour le produit **${p.name}**.` }
    ];
    this.showChatbot = true;
  }

  closeChatbot(): void {
    this.showChatbot = false;
    this.chatbotProduct = null;
  }

  sendChatbotMessage(): void {
    if (!this.chatbotInput.trim() || !this.chatbotProduct || this.chatbotLoading) return;

    const userMsg = this.chatbotInput.trim();
    this.chatbotMessages.push({ sender: 'user', text: userMsg });
    this.chatbotInput = '';
    this.chatbotLoading = true;

    this.api.post<any>('chatbot/ask', {
      product_id: this.chatbotProduct.id,
      message: userMsg
    }).subscribe({
      next: (res) => {
        this.chatbotMessages.push({ sender: 'bot', text: res.response });
        this.chatbotLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.chatbotMessages.push({ sender: 'bot', text: "Désolé, je rencontre des difficultés pour me connecter au service d'intelligence artificielle pour le moment." });
        this.chatbotLoading = false;
      }
    });
  }

  askQuickQuestion(question: string): void {
    this.chatbotInput = question;
    this.sendChatbotMessage();
  }

  showModal = false;
  editing = false;
  editId: number | null = null;

  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  selectedProductApprovalStatus: 'pending' | 'approved' | 'rejected' = 'pending';

  recipeIngredients: { product_id: number; quantity: number; unit: string }[] = [];

  get userRole(): string {
    return this.auth.getUserRole() || '';
  }

  get isChefCuisine(): boolean {
    return this.userRole === 'CHEF_CUISINE';
  }

  get isChefMagasin(): boolean {
    return this.userRole === 'CHEF_MAGASIN';
  }

  get isResponsableAchat(): boolean {
    return this.userRole === 'RESPONSABLE_ACHAT';
  }

  get isRestrictedRole(): boolean {
    return this.isChefCuisine || this.isChefMagasin;
  }

  form: any = {
    name: '',
    type: 'commercial',
    category_id: '',
    price: 0,
    description: '',
    allergens_text: '',
    expiration_date: '',
    usage_status: 'IN_USE',
    quantity_per_batch: 1
  };

  constructor(private api: ApiService, private auth: AuthService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.validationMode = this.route.snapshot.data['validationMode'] === true;
    
    // Role-based default type filter
    if (this.userRole === 'CHEF_CUISINE') {
      this.filterType = '';
    } else if (this.userRole === 'CHEF_MAGASIN') {
      this.filterType = 'reserve';
    }
    
    // Default filter pending for validationMode
    if (this.validationMode) {
      this.filterApprovalStatus = 'pending';
    }
    this.load();
    this.loadCategories();
  }

  // ================= PRODUCTS =================
  load(): void {
    this.loading = true;
    const params: any = { no_paginate: true };
    // CHEF_CUISINE gets food/plat only from backend by default
    // all_types=true only when recipe builder needs it (handled elsewhere)
    this.api.get<any>('products', params).subscribe({
      next: res => {
        this.products = res.data || res;
        this.applyFilter();
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  // ================= CATEGORIES =================
  loadCategories(): void {
    this.api.get<any>('categories').subscribe(res => {
      this.categories = res.data || res;
    });
  }

  get formCategories(): Category[] {
    const selectedType = this.form?.type;
    let base = this.categories;

    if (this.isChefCuisine) {
      base = base.filter(c => c.type === 'food' || c.type === 'plat');
    } else if (this.isChefMagasin) {
      base = base.filter(c => c.type === 'commercial' || c.type === 'matiere_premiere');
    }

    // Filter by selected product type
    if (selectedType) {
      base = base.filter(c => c.type === selectedType);
    }

    return base;
  }

  get availableIngredients(): Product[] {
    return this.products.filter(p =>
      p.type === 'matiere_premiere' &&
      p.approval_status === 'approved'
    );
  }

  getImageUrl(path: string): string {
    const apiHost = environment.apiUrl.replace('/api', '');
    return `${apiHost}/storage/${path}`;
  }

  // ================= FILTER =================
  applyFilter(): void {
    let filtered = [...this.products];
    if (this.filterType === 'reserve') {
      filtered = filtered.filter(p => p.type === 'commercial' || p.type === 'matiere_premiere');
    } else if (this.filterType) {
      filtered = filtered.filter(p => p.type === this.filterType);
    }
    if (this.filterApprovalStatus) {
      filtered = filtered.filter(p => p.approval_status === this.filterApprovalStatus);
    }
    this.filteredProducts = filtered;
  }

  // ================= MODAL =================
  openModal(): void {
    this.resetForm();
    this.editing = false;
    this.showModal = true;
  }

  editProduct(p: Product): void {
    this.loading = true;
    this.api.get<any>(`products/${p.id}`).subscribe({
      next: res => {
        const fullProduct = res.data || res;
        this.form = {
          name: fullProduct.name,
          type: fullProduct.type,
          category_id: fullProduct.category_id,
          price: fullProduct.price,
          description: fullProduct.description || '',
          allergens_text: fullProduct.allergens?.join(', ') || '',
          expiration_date: fullProduct.expiration_date || '',
          usage_status: fullProduct.usage_status || 'IN_USE',
          quantity_per_batch: fullProduct.quantity_per_batch || 1
        };

        this.selectedProductApprovalStatus = fullProduct.approval_status;
        this.imagePreview = fullProduct.image ? this.getImageUrl(fullProduct.image) : null;
        this.selectedImageFile = null;

        this.recipeIngredients = (fullProduct.ingredients || []).map((ing: any) => ({
          product_id: ing.id,
          quantity: ing.pivot?.quantity || 1,
          unit: ing.pivot?.unit || 'piece'
        }));

        this.editId = fullProduct.id;
        this.editing = true;
        this.showModal = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de charger les détails du produit.',
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetForm(): void {
    this.form = {
      name: '',
      type: this.isChefCuisine ? (this.form.type || 'food') : 'commercial',
      category_id: '',
      price: 0,
      description: '',
      allergens_text: '',
      expiration_date: '',
      usage_status: 'IN_USE',
      quantity_per_batch: 1
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.recipeIngredients = [];
    this.selectedProductApprovalStatus = 'pending';
    this.editId = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  isLockedField(fieldName: string): boolean {
    if (!this.editing) return false;
    if (this.isChefCuisine) return false;
    if (this.selectedProductApprovalStatus === 'approved') {
      const editableFields = ['description', 'usage_status', 'image', 'allergens'];
      return !editableFields.includes(fieldName);
    }
    return false;
  }

  // ================= RECIPE MANAGEMENT =================
  addRecipeIngredient(): void {
    this.recipeIngredients.push({ product_id: 0, quantity: 1, unit: 'piece' });
  }

  removeRecipeIngredient(index: number): void {
    this.recipeIngredients.splice(index, 1);
  }

  save(): void {
    if (!this.form.name || !this.form.type || ((this.form.type !== 'food' && this.form.type !== 'plat') && !this.form.category_id)) {
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir tous les champs obligatoires.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    if ((this.form.type === 'food' || this.form.type === 'plat') && this.recipeIngredients.length === 0) {
      Swal.fire({
        title: 'Recette manquante',
        text: 'Un produit Food doit contenir au moins un ingrédient dans sa recette.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    if ((this.form.type === 'food' || this.form.type === 'plat') && this.recipeIngredients.some(ing => ing.product_id === 0)) {
      Swal.fire({
        title: 'Recette incomplète',
        text: 'Veuillez sélectionner un produit valide pour chaque ingrédient.',
        icon: 'warning',
        confirmButtonColor: '#0D9488'
      });
      return;
    }

    // Stock validation for FOOD products
    if (this.form.type === 'food' || this.form.type === 'plat') {
      const batchSize = this.form.quantity_per_batch || 1;
      const stockErrors: string[] = [];
      for (const ing of this.recipeIngredients) {
        const prod = this.products.find(p => p.id === ing.product_id);
        const availableQty = prod?.stock?.quantity ?? 0;
        const requiredQty = ing.quantity * batchSize;
        if (requiredQty > availableQty) {
          stockErrors.push(`"${prod?.name || 'Produit'}" : besoin de ${requiredQty} ${ing.unit}, disponible ${availableQty} ${ing.unit}`);
        }
      }
      if (stockErrors.length > 0) {
        Swal.fire({
          title: 'Stock insuffisant',
          html: `Les ingrédients suivants n'ont pas assez de stock (batch: ${batchSize}):<br><br>${stockErrors.join('<br>')}`,
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', this.form.name);
    formData.append('type', this.form.type);
    formData.append('category_id', String(this.form.category_id));
    formData.append('description', this.form.description || '');

    if (this.form.type === 'food' || this.form.type === 'plat') {
      formData.append('quantity_per_batch', String(this.form.quantity_per_batch || 1));
    }

    if (!this.isRestrictedRole) {
      formData.append('price', String(this.form.price || 0));
      if (!this.isResponsableAchat) {
        formData.append('expiration_date', this.form.expiration_date || '');
        if (this.form.allergens_text) {
          const allergens = this.form.allergens_text.split(',').map((a: string) => a.trim()).filter(Boolean);
          allergens.forEach((a: string) => formData.append('allergens[]', a));
        }
      }
    }

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }

    // In approved mode, the restricted roles might change usage_status
    if (this.editing && this.selectedProductApprovalStatus === 'approved') {
      formData.append('usage_status', this.form.usage_status || 'IN_USE');
    }

    if (this.form.type === 'food' || this.form.type === 'plat') {
      this.recipeIngredients.forEach((ing, index) => {
        formData.append(`ingredients[${index}][product_id]`, String(ing.product_id));
        formData.append(`ingredients[${index}][quantity]`, String(ing.quantity));
        formData.append(`ingredients[${index}][unit]`, ing.unit || 'piece');
      });
    }

    const req = this.editing && this.editId
      ? this.api.put(`products/${this.editId}`, formData)
      : this.api.post('products', formData);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès !',
          text: this.editing ? 'Le produit a été modifié.' : 'Le produit a été créé.',
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
        this.closeModal();
        this.load();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue lors de la sauvegarde.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  }

  // ================= APPROVAL STATUS =================
  updateApprovalStatus(product: Product, status: 'approved' | 'rejected'): void {
    Swal.fire({
      title: status === 'approved' ? 'Approuver le produit ?' : 'Rejeter le produit ?',
      text: `Voulez-vous ${status === 'approved' ? 'approuver' : 'rejeter'} le produit "${product.name}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'approved' ? '#0D9488' : '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: status === 'approved' ? 'Oui, approuver' : 'Oui, rejeter',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.put(`products/${product.id}/approve`, { approval_status: status }).subscribe({
          next: () => {
            Swal.fire({
              title: 'Succès !',
              text: `Le produit a été ${status === 'approved' ? 'approuvé' : 'rejeté'}.`,
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Une erreur est survenue lors de la validation.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        });
      }
    });
  }

  // ================= DELETE =================
  deleteProduct(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`products/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'Le produit a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.load();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Erreur lors de la suppression.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        });
      }
    });
  }
}
