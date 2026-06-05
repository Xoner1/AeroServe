import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';
import { QrScannerComponent } from '../../shared/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, QrScannerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  data: any = null;
  userName = '';
  userRole = '';
  maxSale = 1;
  maxWaste = 1;
  loading = true;
  salesPeriod: 'day' | 'week' | 'month' = 'day';

  activeTab = 'monday';
  daysList = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  // IA Forecast attributes
  forecasts: any[] = [];
  anomalies: any[] = [];
  recommendations: any[] = [];
  aiReportText: string = '';
  loadingIA = false;
  showScanner = false;

  // F&B specific attributes
  recentOrders: any[] = [];
  lowStockItems: any[] = [];

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userName = user ? `${user.first_name} ${user.last_name}` : '';
    this.userRole = user?.role?.name || '';
    this.loading = true;
    
    this.loadDashboard();
  }

  loadDashboard(): void {
    const { dateFrom, dateTo } = this.getDateRange();
    this.api.get<any>('dashboard', { date_from: dateFrom, date_to: dateTo }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.data = d;
        if (d.daily_sales?.length) {
          this.maxSale = Math.max(...d.daily_sales.map((s: any) => Number(s.total)), 1);
        }
        if (d.waste_trend?.length) {
          this.maxWaste = Math.max(...d.waste_trend.map((w: any) => Number(w.total)), 1);
        }
        
        // Load IA Stock prediction data if Super Admin or Achat role
        if (this.userRole === 'RESPONSABLE_ACHAT' || this.userRole === 'SUPER_ADMIN') {
          this.loadIAData();
        }

        // Load F&B specific lists if F&B Manager
        if (this.userRole === 'RESPONSABLE_FB') {
          this.loadFBData();
        }
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  getDateRange(): { dateFrom: string; dateTo: string } {
    const today = new Date();
    const toStr = (d: Date) => d.toISOString().split('T')[0];
    switch (this.salesPeriod) {
      case 'day': {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        return { dateFrom: toStr(start), dateTo: toStr(today) };
      }
      case 'week': {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { dateFrom: toStr(start), dateTo: toStr(today) };
      }
      case 'month':
      default: {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { dateFrom: toStr(start), dateTo: toStr(today) };
      }
    }
  }

  loadIAData(): void {
    this.loadingIA = true;
    this.api.get<any[]>('stock-forecast').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.forecasts = res
    });
    this.api.get<any[]>('stock-anomalies').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.anomalies = res
    });
    this.api.get<any[]>('stock-recommendations').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.recommendations = res;
        this.loadingIA = false;
      },
      error: () => { this.loadingIA = false; }
    });
    this.api.get<any>('stock-ai-report').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.aiReportText = res.report || ''
    });
  }

  loadFBData(): void {
    // Fetch recent internal orders
    this.api.get<any>('internal-orders').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        const list = res.data || res;
        if (Array.isArray(list)) {
          this.recentOrders = list.slice(0, 5);
        }
      }
    });

    // Fetch low stock items
    this.api.get<any[]>('stocks/alerts/low').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.lowStockItems = res || [];
      }
    });
  }



  // ─── WASTE TREND SVG PATH GENERATOR ───
  getWasteLinePath(): string {
    const trend = this.data?.waste_trend || [];
    if (trend.length < 2) return '';
    const N = trend.length;
    return trend.map((w: any, i: number) => {
      const x = (i / (N - 1)) * 430 + 40;
      const y = 150 - (Number(w.total) / this.maxWaste) * 110;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  getWasteAreaPath(): string {
    const trend = this.data?.waste_trend || [];
    if (trend.length < 2) return '';
    const N = trend.length;
    const points = trend.map((w: any, i: number) => {
      const x = (i / (N - 1)) * 430 + 40;
      const y = 150 - (Number(w.total) / this.maxWaste) * 110;
      return `${x},${y}`;
    });
    const startX = 40;
    const endX = 470;
    return `M ${startX} 150 L ${points.join(' L ')} L ${endX} 150 Z`;
  }

  getWasteX(i: number): number {
    const trend = this.data?.waste_trend || [];
    if (trend.length < 2) return 40;
    return (i / (trend.length - 1)) * 430 + 40;
  }

  getWasteY(total: number): number {
    return 150 - (Number(total) / this.maxWaste) * 110;
  }



  getKitchenLoadShare(): number {
    const totalLoad = Number(this.data?.kitchen_load || 0) + Number(this.data?.warehouse_load || 0);
    return totalLoad > 0 ? (Number(this.data?.kitchen_load || 0) / totalLoad) * 100 : 50;
  }

  getWarehouseLoadShare(): number {
    const totalLoad = Number(this.data?.kitchen_load || 0) + Number(this.data?.warehouse_load || 0);
    return totalLoad > 0 ? (Number(this.data?.warehouse_load || 0) / totalLoad) * 100 : 50;
  }

  // ─── CHEF CUISINE HELPERS (Feature 4) ───
  getGaugeColor(rate: number): string {
    if (rate >= 80) return '#15803D';
    if (rate >= 50) return '#D97706';
    return '#DC2626';
  }

  getGaugeDashArray(rate: number): string {
    const circumference = 2 * Math.PI * 52;
    const filled = (rate / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  }

  getDayLabelFrench(key: string): string {
    const found = this.daysList.find(d => d.key === key);
    return found ? found.label : key;
  }

  getMenuDishName(dayKey: string, mealType: string): string {
    const menu = this.data?.role_specific?.active_menu;
    if (!menu || !menu.items) return '-';
    const found = menu.items.find((item: any) => item.day_of_week === dayKey && item.meal_type === mealType);
    return found?.product?.name || '-';
  }



  placeAIOrder(r: any): void {
    Swal.fire({
      title: 'Approvisionnement IA',
      text: `Voulez-vous générer une demande de commande interne de +${r.recommended_qty} ${r.unit} pour le produit "${r.name}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, Commander',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0D9488',
      cancelButtonColor: '#EF4444',
      background: '#FFFFFF',
      color: '#1E293B'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Traitement...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const orderData = {
          type: r.type === 'food' ? 'food' : 'commercial',
          notes: `Commande de réapprovisionnement automatique générée par l'Assistant IA (épuisement prévu: ${r.days_left} jours).`,
          delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [
            {
              product_id: r.product_id,
              quantity_requested: r.recommended_qty
            }
          ]
        };

        this.api.post('internal-orders', orderData).subscribe({
          next: () => {
            Swal.fire({
              title: 'Commande validée !',
              text: `La commande a été transmise avec succès au responsable concerné.`,
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.loadIAData();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Impossible de créer la commande.',
              icon: 'error',
              confirmButtonColor: '#0D9488'
            });
          }
        });
      }
    });
  }

  closeScanner(): void {
    this.showScanner = false;
  }

  openHygieneChatbotDemo(): void {
    Swal.fire({
      title: 'Assistant IA Qualité AeroServe',
      input: 'text',
      inputPlaceholder: 'Ex: Est-ce que le produit X contient du gluten ?',
      showCancelButton: true,
      confirmButtonText: 'Analyser',
      cancelButtonText: 'Fermer',
      confirmButtonColor: '#0D9488',
      cancelButtonColor: '#EF4444',
      background: '#FFFFFF',
      color: '#1E293B',
      preConfirm: (value) => {
        if (!value) {
          Swal.showValidationMessage('Veuillez saisir votre question.');
        }
        return value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Analyse en cours...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        setTimeout(() => {
          Swal.fire({
            title: 'Rapport de Conformité IA',
            html: `
              <div style="text-align: left; font-size: 14px; direction: ltr;">
                <p><strong>Question :</strong> "${result.value}"</p>
                <p><strong>Statut :</strong> <span style="color: #0D9488; font-weight: bold;">CONFORME </span></p>
                <p><strong>Analyse :</strong> Le produit analysé ne contient aucun allergène critique majeur non déclaré. Les fiches de traçabilité HACCP sont validées pour ce lot.</p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#0D9488',
            background: '#FFFFFF',
            color: '#1E293B'
          });
        }, 1500);
      }
    });
  }

  simulateQRScanner(): void {
    this.showScanner = true;
  }

  onScannerResult(code: string): void {
    this.showScanner = false;
    Swal.fire({
      title: 'Scan en cours...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.api.post<any>('products/qr-lookup', { code }).subscribe({
      next: (res) => {
        const p = res.data || res;
        Swal.fire({
          title: p.name || 'Produit scanné',
          html: `
            <div style="text-align:left;font-size:14px;line-height:1.6">
              ${p.description ? `<p><strong>Description :</strong> ${p.description}</p>` : ''}
              ${p.allergens?.length ? `<p><strong>Allergènes :</strong> ${p.allergens.join(', ')}</p>` : ''}
              ${p.expiration_date ? `<p><strong>DLC :</strong> ${p.expiration_date}</p>` : ''}
              ${p.ingredients?.length ? `<p><strong>Ingrédients :</strong> ${p.ingredients.map((i: any) => i.name).join(', ')}</p>` : ''}
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
      },
      error: () => {
        Swal.fire({
          title: 'Code scanné',
          text: code,
          icon: 'info',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }
}
