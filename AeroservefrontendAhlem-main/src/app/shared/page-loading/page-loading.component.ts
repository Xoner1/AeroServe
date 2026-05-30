import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-shell">
      <div class="skeleton-row header"></div>

      @if (variant === 'cards') {
        <div class="cards-grid">
          @for (_ of cardPlaceholders; track $index) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else {
        <div class="table-shell">
          <div class="skeleton-row" *ngFor="let _ of rowPlaceholders"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loading-shell {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .table-shell,
    .cards-grid {
      background: #fff;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }

    .skeleton-card {
      height: 118px;
      border-radius: 12px;
      background: linear-gradient(90deg, #EDE9E2 25%, #D8D2C8 37%, #EDE9E2 63%);
      background-size: 400% 100%;
      animation: shimmer 1.2s ease infinite;
    }

    .skeleton-row {
      height: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      background: linear-gradient(90deg, #EDE9E2 25%, #D8D2C8 37%, #EDE9E2 63%);
      background-size: 400% 100%;
      animation: shimmer 1.2s ease infinite;
    }

    .skeleton-row:last-child {
      margin-bottom: 0;
    }

    .skeleton-row.header {
      height: 28px;
      width: 260px;
      margin-bottom: 6px;
    }

    @keyframes shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: 0 0;
      }
    }
  `]
})
export class PageLoadingComponent {
  @Input() variant: 'table' | 'cards' = 'table';
  @Input() rows = 8;

  get rowPlaceholders(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get cardPlaceholders(): number[] {
    return Array.from({ length: 6 }, (_, i) => i);
  }
}
