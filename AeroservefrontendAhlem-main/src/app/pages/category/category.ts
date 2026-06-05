import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class CategoryComponent implements OnInit {

  categories: Category[] = [];

  showModal = false;
  editing = false;
  editId: number | null = null;

  form: any = {
    name: '',
    type: 'commercial',
    code: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  // ================= LOAD =================
  load(): void {
    this.api.get<any>('categories').subscribe({
      next: (res) => {
        this.categories = res.data || res;
      },
      error: () => {
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de charger les catégories.',
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }

  openCreate(): void {
    this.editing = false;
    this.editId = null;
    this.form = { name: '', type: 'commercial', code: '' };
    this.showModal = true;
  }

  edit(cat: Category): void {
    this.editing = true;
    this.editId = cat.id;
    this.form = { name: cat.name, type: cat.type, code: cat.code || '' };
    this.showModal = true;
  }

  save(): void {
    if (!this.form.name) return;

    const payload = { ...this.form };
    if (!payload.code || payload.code.trim() === '') {
      delete payload.code;
    }

    const request = this.editing
      ? this.api.put(`categories/${this.editId}`, payload)
      : this.api.post('categories', payload);

    request.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        Swal.fire({
          title: 'Succès !',
          text: 'Catégorie enregistrée avec succès.',
          icon: 'success',
          confirmButtonColor: '#0D9488'
        });
      },
      error: (err: any) => {
        const messages: string[] = [];
        if (err.error?.errors) {
          for (const field in err.error.errors) {
            messages.push(...err.error.errors[field]);
          }
        }
        const text = messages.length > 0
          ? messages.join('<br>')
          : (err.error?.message || 'Erreur lors de la sauvegarde.');
        Swal.fire({
          title: 'Erreur de validation',
          html: text,
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
      }
    });
  }

  // ================= DELETE =================
  delete(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette catégorie sera supprimée définitivement !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0483A',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`categories/${id}`).subscribe({
          next: () => {
             Swal.fire({
              title: 'Supprimé !',
              text: 'La catégorie a été supprimée.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.load();
          },
          error: (err: any) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Impossible de supprimer cette catégorie.',
              icon: 'error',
              confirmButtonColor: '#0D9488'
            });
          }
        });
      }
    });
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      commercial: 'badge-info',
      matiere_premiere: 'badge-warning',
      food: 'badge-success'
    };
    return map[type] || 'badge-neutral';
  }

  formatType(type: string): string {
    const map: Record<string, string> = {
      commercial: 'Commercial',
      matiere_premiere: 'Matière première',
      food: 'Alimentaire'
    };
    return map[type] || type;
  }

  close(): void {
    this.showModal = false;
  }
}
