import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PageLoadingComponent } from '../../shared/page-loading/page-loading.component';

@Component({
  selector: 'app-purchase-needs',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLoadingComponent],
  templateUrl: './purchase-needs.component.html',
  styles: [`
    .form-select {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text-primary);
      outline: none;
      font-size: 14px;
    }
  `]
})
export class PurchaseNeedsComponent implements OnInit {
  purchaseNeeds: any[] = [];
  selectedNeedId: number | null = null;
  selectedNeed: any = null;
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<any>('purchase-needs').subscribe({
      next: res => {
        this.purchaseNeeds = res.data || res;
        if (this.purchaseNeeds.length > 0) {
          this.selectedNeedId = this.purchaseNeeds[0].id;
          this.selectedNeed = this.purchaseNeeds[0];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNeedSelect(): void {
    this.selectedNeed = this.purchaseNeeds.find(n => n.id === Number(this.selectedNeedId)) || null;
  }
}
