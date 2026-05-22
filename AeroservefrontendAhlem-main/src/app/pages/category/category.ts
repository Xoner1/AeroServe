import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models';



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
        alert('Failed to load categories');
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

    const request = this.editing
      ? this.api.put(`categories/${this.editId}`, this.form)
      : this.api.post('categories', this.form);

    request.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
        alert('Operation completed successfully');
      },
      error: () => {
        alert('Operation failed');
      }
    });
  }

  // ================= DELETE =================
  delete(id: number): void {
    const shouldDelete = confirm('Delete this category?');
    if (!shouldDelete) {
      return;
    }

    this.api.delete(`categories/${id}`).subscribe({
      next: () => this.load(),
      error: () => alert('Delete failed')
    });
  }

  close(): void {
    this.showModal = false;
  }
}
