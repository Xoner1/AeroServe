import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageLoadingComponent],
  template: `
    @if (loading) {
      <app-page-loading variant="cards" />
    } @else {
    <div class="dashboard">
      <section class="hero-banner">
        <div class="hero-copy">
          <span class="hero-pill">Operations overview</span>
          <h1>Welcome back, {{ userName }}.</h1>
          <p>
            Keep an eye on revenue, low stock pressure, point-of-sale performance,
            and daily throughput from one operational command view.
          </p>

          <div class="hero-tags">
            <span>Live sales visibility</span>
            <span>Stock alerts</span>
            <span>PDV comparison</span>
          </div>
        </div>

        <div class="hero-summary">
          <div>
            <label>Average ticket</label>
            <strong>{{ averageTicket | number:'1.2-2' }} TND</strong>
          </div>
          <div>
            <label>Top PDV contribution</label>
            <strong>{{ topPdvLabel }}</strong>
          </div>
          <div>
            <label>Operational pressure</label>
            <strong>{{ stockPressureLabel }}</strong>
          </div>
        </div>
      </section>

      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <span class="stat-value">{{ data?.total_sales | number:'1.2-2' }} TND</span>
            <span class="stat-label">Ventes totales</span>
          </div>
        </div>
        <div class="stat-card soft">
          <div class="stat-icon">🧾</div>
          <div class="stat-info">
            <span class="stat-value">{{ data?.sales_count || 0 }}</span>
            <span class="stat-label">Transactions</span>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <span class="stat-value">{{ data?.low_stock_count || 0 }}</span>
            <span class="stat-label">Stock bas</span>
          </div>
        </div>
        <div class="stat-card muted">
          <div class="stat-icon">🚫</div>
          <div class="stat-info">
            <span class="stat-value">{{ data?.expired_products_count || 0 }}</span>
            <span class="stat-label">Produits expirés</span>
          </div>
        </div>
      </div>

      <div class="grid-2 analytics-grid">
        <div class="card">
          <div class="card-head">
            <h3>Popular Products</h3>
            <span>Top selling items in the current range</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Produit</th><th>Quantité vendue</th></tr>
              </thead>
              <tbody>
                @for (p of data?.popular_products || []; track p.product_id) {
                  <tr><td>{{ p.product?.name || '-' }}</td><td>{{ p.total_sold || 0 }}</td></tr>
                }
                @if (!data?.popular_products?.length) {
                  <tr><td colspan="2" class="empty">Aucune donnée</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card emphasis-card">
          <div class="card-head light">
            <h3>Sales by Point of Sale</h3>
            <span>Relative contribution across active locations</span>
          </div>

          <div class="pdv-breakdown">
            @for (s of data?.sales_by_pdv || []; track s.pdv_id) {
              <div class="pdv-row">
                <div class="pdv-meta">
                  <strong>{{ s.point_de_vente?.name || '-' }}</strong>
                  <span>{{ getPdvShare(s.total) | number:'1.0-0' }}% of total sales</span>
                </div>

                <div class="pdv-bar-shell">
                  <div class="pdv-bar" [style.width.%]="getPdvShare(s.total)"></div>
                </div>

                <strong class="pdv-total">{{ s.total | number:'1.2-2' }} TND</strong>
              </div>
            }

            @if (!data?.sales_by_pdv?.length) {
              <div class="empty-card">No point-of-sale data available.</div>
            }
          </div>
        </div>
      </div>

      <div class="grid-2 lower-grid">
        <div class="card chart-card">
          <div class="card-head">
            <h3>Daily Sales Trend</h3>
            <span>Visual rhythm of the last available entries</span>
          </div>

          <div class="chart-bars">
            @for (d of data?.daily_sales || []; track d.date) {
              <div class="bar-group">
                <div class="bar" [style.height.%]="getBarHeight(d.total)">
                  <span class="bar-val">{{ d.total | number:'1.0-0' }}</span>
                </div>
                <span class="bar-label">{{ d.date | date:'EEE' }}</span>
              </div>
            }

            @if (!data?.daily_sales?.length) {
              <div class="empty-card wide">No daily sales data available.</div>
            }
          </div>
        </div>

        <div class="card side-insights">
          <div class="card-head">
            <h3>Quick Insights</h3>
            <span>Fast operational reading for the current dataset</span>
          </div>

          <div class="insight-list">
            <div class="insight-item">
              <label>Best selling product</label>
              <strong>{{ topProductLabel }}</strong>
            </div>
            <div class="insight-item">
              <label>Transaction volume</label>
              <strong>{{ data?.sales_count || 0 }} recorded sales</strong>
            </div>
            <div class="insight-item">
              <label>Stock risk</label>
              <strong>{{ stockPressureLabel }}</strong>
            </div>
            <div class="insight-item">
              <label>Expired products</label>
              <strong>{{ data?.expired_products_count || 0 }} flagged items</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 24px; }

    .hero-banner {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
      gap: 20px;
      padding: 28px;
      border-radius: 26px;
      background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 22%),
        linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      box-shadow: 0 24px 48px rgba(127, 42, 42, 0.16);
      color: #fff9f9;
    }

    .hero-copy {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .hero-pill {
      display: inline-flex;
      width: fit-content;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .hero-copy h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 44px);
      line-height: 1.02;
    }

    .hero-copy p {
      margin: 0;
      max-width: 60ch;
      color: rgba(255, 249, 249, 0.82);
      font-size: 15px;
    }

    .hero-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }

    .hero-tags span {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      color: #fff9f9;
      font-size: 12px;
      font-weight: 600;
    }

    .hero-summary {
      display: grid;
      gap: 12px;
      padding: 18px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.09);
      border: 1px solid rgba(255, 255, 255, 0.14);
      align-content: center;
    }

    .hero-summary div {
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .hero-summary div:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    .hero-summary label {
      display: block;
      color: rgba(255, 249, 249, 0.7);
      font-size: 12px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hero-summary strong {
      font-size: 21px;
      line-height: 1.15;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .stat-card {
      border-radius: 20px;
      padding: 22px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(178, 34, 34, 0.06);
    }

    .stat-card.primary {
      background: linear-gradient(135deg, #fff2f2 0%, #ffffff 100%);
    }

    .stat-card.soft {
      background: linear-gradient(135deg, #fff8f1 0%, #ffffff 100%);
    }

    .stat-card.warning {
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
    }

    .stat-card.muted {
      background: linear-gradient(135deg, #f9f3f3 0%, #ffffff 100%);
    }

    .stat-icon { font-size: 32px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 13px; color: #64748b; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card {
      background: #fff;
      border-radius: 22px;
      padding: 22px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(178, 34, 34, 0.05);
    }

    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .card-head h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .card-head span {
      color: #64748b;
      font-size: 12px;
      max-width: 28ch;
      text-align: right;
    }

    .card-head.light h3,
    .card-head.light span {
      color: #fffafa;
    }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .empty { text-align: center; color: #94a3b8; padding: 20px; }

    .emphasis-card {
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #fff8f8;
    }

    .pdv-breakdown {
      display: grid;
      gap: 14px;
    }

    .pdv-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(120px, 1.1fr) auto;
      align-items: center;
      gap: 12px;
    }

    .pdv-meta strong,
    .pdv-total {
      color: #fffdfd;
    }

    .pdv-meta span {
      display: block;
      margin-top: 4px;
      color: rgba(255, 248, 248, 0.72);
      font-size: 12px;
    }

    .pdv-bar-shell {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      overflow: hidden;
    }

    .pdv-bar {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #ffd7d7 0%, #ffffff 100%);
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      height: 200px;
      padding-top: 20px;
    }

    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
      justify-content: flex-end;
    }
    .bar {
      width: 100%;
      max-width: 48px;
      background: linear-gradient(180deg, #d14e4e 0%, #b22222 100%);
      border-radius: 6px 6px 0 0;
      position: relative;
      min-height: 4px;
      transition: height 0.3s;
    }
    .bar-val {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      font-weight: 600;
      color: #9f1d1d;
      white-space: nowrap;
    }
    .bar-label { font-size: 12px; color: #64748b; }

    .side-insights {
      display: flex;
      flex-direction: column;
    }

    .insight-list {
      display: grid;
      gap: 12px;
      margin-top: 2px;
    }

    .insight-item {
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, #fff8f8 0%, #ffffff 100%);
      border: 1px solid rgba(178, 34, 34, 0.06);
    }

    .insight-item label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .insight-item strong {
      color: #111827;
      font-size: 16px;
    }

    .empty-card {
      padding: 18px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 248, 248, 0.72);
      text-align: center;
      font-size: 14px;
    }

    .empty-card.wide {
      width: 100%;
      background: #fff8f8;
      color: #6b7280;
      border: 1px dashed rgba(178, 34, 34, 0.16);
    }

    @media (max-width: 768px) {
      .grid-2,
      .hero-banner {
        grid-template-columns: 1fr;
      }

      .card-head,
      .pdv-row {
        grid-template-columns: 1fr;
      }

      .card-head span {
        text-align: left;
      }

      .chart-bars {
        overflow-x: auto;
        padding-bottom: 6px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  data: any = null;
  userName = '';
  private maxSale = 1;
  loading = true;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userName = user ? `${user.first_name} ${user.last_name}` : '';
    this.loading = true;
    this.api.get<any>('dashboard').subscribe({
      next: (d) => {
        this.data = d;
        if (d.daily_sales?.length) {
          this.maxSale = Math.max(...d.daily_sales.map((s: any) => s.total), 1);
        }
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  getBarHeight(total: number): number {
    return Math.max((total / this.maxSale) * 100, 3);
  }

  get averageTicket(): number {
    const salesCount = Number(this.data?.sales_count || 0);
    const totalSales = Number(this.data?.total_sales || 0);
    return salesCount > 0 ? totalSales / salesCount : 0;
  }

  get topProductLabel(): string {
    const product = this.data?.popular_products?.[0];
    return product?.product?.name || 'No data yet';
  }

  get topPdvLabel(): string {
    const pdv = this.data?.sales_by_pdv?.reduce((best: any, current: any) => {
      if (!best || Number(current.total) > Number(best.total)) {
        return current;
      }
      return best;
    }, null);

    return pdv?.point_de_vente?.name || 'No data yet';
  }

  get stockPressureLabel(): string {
    const low = Number(this.data?.low_stock_count || 0);
    const expired = Number(this.data?.expired_products_count || 0);

    if (low + expired >= 8) {
      return 'High attention required';
    }

    if (low + expired >= 3) {
      return 'Moderate operational risk';
    }

    return 'Stable';
  }

  getPdvShare(total: number): number {
    const grandTotal = Number(this.data?.total_sales || 0);
    if (!grandTotal) {
      return 0;
    }

    return Math.max((Number(total) / grandTotal) * 100, 2);
  }
}
