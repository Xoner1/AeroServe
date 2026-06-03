import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Caissier } from '../../core/models';
import Swal from 'sweetalert2';

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

  get activeCount(): number {
    return this.caissiers.filter(c => c.status === 'active').length;
  }

  get inactiveCount(): number {
    return this.caissiers.filter(c => c.status !== 'active').length;
  }

  // ================= MODAL =================
  showModal = false;
  editing = false;
  editId: number | null = null;
  showPassword = false;

  form = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
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
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de charger la liste des caissiers.',
          icon: 'error',
          confirmButtonColor: '#0D9488'
        });
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
      status: c.status || 'active',
      age: c.age ?? null,
      experience: c.experience ?? false,
      bio: c.bio ?? ''
    };

    this.showModal = true;
    this.formError = '';
    this.successMessage = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ================= SAVE =================
  save(): void {
    this.formError = '';
    this.successMessage = '';

    if (!this.form.first_name || !this.form.last_name || !this.form.email) {
      this.formError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.editing) {
      if (!this.form.password) {
        this.formError = 'Le mot de passe est obligatoire';
        return;
      }
      if (this.form.password.length < 8) {
        this.formError = 'Le mot de passe doit contenir au moins 8 caractères';
        return;
      }
    }

    if (this.editing && this.editId) {
      const payload = {
        first_name: this.form.first_name,
        last_name: this.form.last_name,
        email: this.form.email,
        phone: this.form.phone,
        status: this.form.status,
        age: this.form.age,
        experience: this.form.experience,
        bio: this.form.bio
      };

      this.api.put(`users/${this.editId}/caissier`, payload)
        .subscribe({
          next: () => {
            Swal.fire({
              title: 'Mis à jour !',
              text: 'Le caissier a été mis à jour avec succès.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.afterSave('updated');
          },
          error: (err) => this.handleError(err)
        });
    } else {
      const payload = {
        first_name: this.form.first_name,
        last_name: this.form.last_name,
        email: this.form.email,
        phone: this.form.phone,
        password: this.form.password,
        age: this.form.age,
        experience: this.form.experience,
        bio: this.form.bio
      };

      this.api.post('caissiers', payload)
        .subscribe({
          next: () => {
            Swal.fire({
              title: 'Créé !',
              text: 'Le caissier a été créé avec succès.',
              icon: 'success',
              confirmButtonColor: '#0D9488'
            });
            this.afterSave('created');
          },
          error: (err) => this.handleError(err)
        });
    }
  }

  // ================= DELETE =================
  delete(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action supprimera définitivement le caissier !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0483A',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`users/${id}/caissier`)
          .subscribe({
            next: () => {
              Swal.fire({
                title: 'Supprimé !',
                text: 'Le caissier a été supprimé.',
                icon: 'success',
                confirmButtonColor: '#0D9488'
              });
              this.loadCaissiers();
            },
            error: (err) => this.handleError(err)
          });
      }
    });
  }

  // ================= AFTER SAVE =================
  afterSave(action: string): void {
    this.showModal = false;
    this.resetForm();
    this.loadCaissiers();
  }

  // ================= ERROR HANDLER =================
  handleError(err: any): void {
    console.error(err);
    this.formError = err.error?.message || 'Une erreur est survenue';
    Swal.fire({
      title: 'Erreur',
      text: this.formError,
      icon: 'error',
      confirmButtonColor: '#0D9488'
    });
  }

  // ================= RESET FORM =================
  resetForm(): void {
    this.form = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      status: 'active',
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
