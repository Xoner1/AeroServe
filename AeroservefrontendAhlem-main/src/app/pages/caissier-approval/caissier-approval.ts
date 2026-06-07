import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { Caissier } from '../../core/models';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-caissier-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './caissier-approval.html',
  styleUrl: './caissier-approval.scss',
})
export class CaissierApprovalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

columns = [
  { title: 'En attente', status: 'en_attente', tasks: [] as Caissier[] },
  { title: 'Actifs', status: 'active', tasks: [] as Caissier[] },
  { title: 'Inactifs', status: 'inactive', tasks: [] as Caissier[] }
];
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.get('caissier').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const users = res.data || res;

        this.columns[0].tasks = users.filter((u: Caissier) => u.status === 'en_attente');
        this.columns[1].tasks = users.filter((u: Caissier) => u.status === 'active');
        this.columns[2].tasks = users.filter((u: Caissier) => u.status === 'inactive');
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de charger la liste des caissiers.',
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }

  onDrop(event: CdkDragDrop<Caissier[]>, column: any): void {

    const user = event.item.data;

    if (event.previousContainer === event.container) {
      moveItemInArray(column.tasks, event.previousIndex, event.currentIndex);
      return;
    }

    const newStatus = column.status;

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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    Swal.fire({
      title: type === 'success' ? 'Succès !' : 'Erreur',
      text: message,
      icon: type,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true
    });
  }
}
