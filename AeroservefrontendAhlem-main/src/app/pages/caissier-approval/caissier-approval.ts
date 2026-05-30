import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { Caissier } from '../../core/models';



@Component({
  selector: 'app-caissier-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './caissier-approval.html',
  styleUrl: './caissier-approval.scss',
})
export class CaissierApprovalComponent implements OnInit {

columns = [
  { title: 'en_attente', tasks: [] as Caissier[] },
  { title: 'active', tasks: [] as Caissier[] },
  { title: 'inactive', tasks: [] as Caissier[] }
];
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.get('caissier').subscribe({
      next: (res: any) => {
        const users = res.data || res;

        this.columns[0].tasks = users.filter((u: Caissier) => u.status === 'en_attente');
        this.columns[1].tasks = users.filter((u: Caissier) => u.status === 'active');
        this.columns[2].tasks = users.filter((u: Caissier) => u.status === 'inactive');
      },
      error: (err) => {
        console.error(err);
        alert('Load failed');
      }
    });
  }

  onDrop(event: CdkDragDrop<Caissier[]>, column: any): void {

    const user = event.item.data;

    if (event.previousContainer === event.container) {
      moveItemInArray(column.tasks, event.previousIndex, event.currentIndex);
      return;
    }

    const newStatus = column.title;

    // Prevent dragging back to en_attente if already active or inactive
    if (newStatus === 'en_attente' && (user.status === 'active' || user.status === 'inactive')) {
      this.showToast('Impossible de remettre un caissier en attente une fois activé ou désactivé.', 'error');
      return;
    }

    // move UI
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const oldStatus = user.status;
    user.status = newStatus;

    this.api.put(`caissiers/${user.id}/status`, {
      status: newStatus
    }).subscribe({
      next: () => {
        this.showToast('Statut mis à jour.', 'success');
      },
      error: (err) => {
        console.error(err);

        // rollback
        user.status = oldStatus;
        this.load();

        this.showToast(err.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    const bg = type === 'success' ? '#6B8F71' : '#C0483A';
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${bg};color:#fff;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3500);
  }
}
