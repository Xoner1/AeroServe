import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {  Caissier } from '../../core/models';


@Component({
  selector: 'app-caissier',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caissier.html',
  styleUrl: './caissier.scss'
})
export class CaissierComponent implements OnInit {

  // ================= DATA =================
  caissiers: Caissier[] = [];
  searchTerm: string = '';

  // ================= MODAL =================
  showModal = false;
  editing = false;
  editId: number | null = null;

form = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',

  // ✅ NEW
  age: null as number | null,
  experience: false,
  bio: ''
};

  formError: string = '';
  successMessage: string = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCaissiers();
  }

  // ================= LOAD =================
  loadCaissiers(): void {
 this.api.get('caissier').subscribe({

      next: (res: any) => {
        this.caissiers = res.data ?? res;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to load caissiers');
      }
    });
  }

  // ================= SEARCH =================
  filteredCaissiers(): Caissier[] {
    if (!this.searchTerm) return this.caissiers;

    const term = this.searchTerm.toLowerCase();

    return this.caissiers.filter(c =>
      (c.first_name + ' ' + c.last_name).toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  }

  // ================= OPEN CREATE =================
  openCreate(): void {
    this.editing = false;
    this.editId = null;
    this.resetForm();
    this.showModal = true;
    this.formError = '';
    this.successMessage = '';
  }

  openEdit(c: Caissier): void {
  this.editing = true;
  this.editId = c.id;

  this.form = {
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone || '',
    password: '',

    // ✅ NEW
    age: c.age ?? null,
    experience: c.experience ?? false,
    bio: c.bio ?? ''
  };

  this.showModal = true;
  this.formError = '';
  this.successMessage = '';
}

  // ================= SAVE =================
  save(): void {

    this.formError = '';
    this.successMessage = '';

    // VALIDATION SIMPLE
    if (!this.form.first_name || !this.form.last_name || !this.form.email) {
      this.formError = 'Please fill all required fields';
      return;
    }

  if (this.editing && this.editId) {

  const payload = {
    first_name: this.form.first_name,
    last_name: this.form.last_name,
    email: this.form.email,
    phone: this.form.phone,

    // ✅ NEW
    age: this.form.age,
    experience: this.form.experience,
    bio: this.form.bio
  };

  this.api.put(`users/${this.editId}/caissier`, payload)
    .subscribe({
      next: () => this.afterSave('updated'),
      error: (err) => this.handleError(err)
    });
}
else {

  if (!this.form.password) {
    this.formError = 'Password is required';
    return;
  }

  const payload = {
    first_name: this.form.first_name,
    last_name: this.form.last_name,
    email: this.form.email,
    phone: this.form.phone,
    password: this.form.password,

    // ✅ NEW
    age: this.form.age,
    experience: this.form.experience,
    bio: this.form.bio
  };

  this.api.post('caissiers', payload)
    .subscribe({
      next: () => this.afterSave('created'),
      error: (err) => this.handleError(err)
    });
}
  }

  // ================= DELETE =================
  delete(id: number): void {
    const shouldDelete = confirm('Delete caissier? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    this.api.delete(`users/${id}/caissier`)
      .subscribe({
        next: () => {
          alert('Deleted successfully');
          this.loadCaissiers();
        },
        error: (err) => this.handleError(err)
      });
  }

  // ================= AFTER SAVE =================
  afterSave(action: string): void {
    this.showModal = false;
    this.resetForm();
    this.loadCaissiers();

    this.successMessage = `Caissier ${action} successfully`;

    setTimeout(() => {
      this.successMessage = '';
    }, 2000);
  }

  // ================= ERROR HANDLER =================
  handleError(err: any): void {
    console.error(err);

    this.formError = err.error?.message || 'Something went wrong';
  }

  // ================= RESET FORM =================
  resetForm(): void {
    this.form = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',

  // ✅ NEW
  age: null as number | null,
  experience: false,
  bio: ''
};
  }

  // ================= CLOSE MODAL =================
  closeModal(): void {
    this.showModal = false;
  }
}
