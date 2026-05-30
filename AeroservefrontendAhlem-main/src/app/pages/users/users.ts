import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Role, User, USER_STATUS } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {

  users: User[] = [];
  roles: Role[] = [];

  formError: string = '';
  successMessage: string = '';

  showModal = false;
  editing = false;
  editId = 0;

  searchTerm = '';

  form!: FormGroup;
  step: number = 1;

  emailChecking = false;
  emailExists: boolean = false;
  avatarPreview: string | null = null;
  currentUser: any;

  //  PAGINATION
  page = 1;
  pageSize = 5;

  constructor(
    private api: ApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    this.initForm();
    this.loadUsers();
    this.loadRoles();
    this.watchEmail();
  }

  // ================= FORM =================
  initForm(): void {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role_id: [null, Validators.required],
      status: [USER_STATUS.ACTIVE, Validators.required],
      phone: ['', Validators.required],
      avatar: [null] //  ADD AVATAR FIELD
    });
  }

  watchEmail(): void {
    this.form?.get('email')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(email => {
      if (!email || this.editing) {
        this.emailExists = false;
        this.emailChecking = false;
        return;
      }
      this.emailChecking = true;
      this.checkEmail(email);
    });
  }

  checkEmail(email: string): void {
    this.api.get<any>(`users/check-email?email=${email}`)
      .subscribe({
        next: (res) => { this.emailExists = res.exists; this.emailChecking = false; },
        error: () => { this.emailExists = false; this.emailChecking = false; }
      });
  }

  // ================= LOAD =================
  loadUsers(): void {
    this.api.get<any>('users').subscribe(res => {
      this.users = res.data || res;
    });
  }

  loadRoles(): void {
    this.api.get<Role[]>('roles').subscribe(r => {
      this.roles = r.filter(role =>
        role.name.toUpperCase() !== 'CAISSIER'
        &&
      role.name.toUpperCase() !== 'SUPER_ADMIN'
      );
    });
  }

  // ================= FILTER =================
  get filteredUsers(): User[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.users;
    return this.users.filter(u =>
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role?.display_name || '').toLowerCase().includes(term)
    );
  }

  // ================= PAGINATION =================
  get paginatedUsers(): User[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.page = 1;
  }

  // ================= MODAL =================
  openModal(): void {
    this.editing = false;
    this.showModal = true;
    this.step = 1;

    this.emailExists = false;
    this.avatarPreview = null;
    this.page = 1;
    console.log('OPEN MODAL CLICKED');

    this.form.get('role_id')?.enable();
    this.form.reset({
      status: USER_STATUS.ACTIVE
    });
  }

  trackById(index: number, user: any): number {
    return user.id;
  }

  showPassword = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  editUser(user: User): void {
    this.editing = true;
    this.editId = user.id;
    this.emailExists = false;
    this.avatarPreview = user.avatar_url || null;
    this.step = 1;

    this.form.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role_id: user.role_id,
      status: user.status ?? USER_STATUS.ACTIVE,
      phone: user.phone,
      password: '',
      avatar: null
    });

    // Role is not modifiable after creation
    this.form.get('role_id')?.disable();

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.step = 1;
  }

  // ================= DELETE =================
  deleteUser(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0483A',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(`users/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé !',
              text: 'L\'utilisateur a été supprimé.',
              icon: 'success',
              confirmButtonColor: '#6B8F71'
            });
            this.loadUsers();
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: err.error?.message || 'Erreur lors de la suppression.',
              icon: 'error',
              confirmButtonColor: '#6B8F71'
            });
          }
        });
      }
    });
  }

  // ================= SAVE =================
  saveUser(): void {

    this.formError = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Please fill all required fields';
      return;
    }

    if (this.emailExists) {
      this.formError = 'Email already exists';
      return;
    }

    if (!this.editing && !this.form.value.password) {
      this.formError = 'Password is required';
      return;
    }

    const formData = new FormData();

    Object.keys(this.form.value).forEach(key => {
      const value = this.form.value[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    const request = this.editing
      ? this.api.put(`users/${this.editId}`, formData)
      : this.api.post('users', formData);

    request.subscribe({
      next: () => {
        this.loadUsers();
        this.closeModal();
        this.page = 1;

        if (this.editing) {
          this.successMessage = ` User "${this.form.value.first_name} ${this.form.value.last_name}" updated successfully.`;
        } else {
          this.successMessage = ` User "${this.form.value.first_name} ${this.form.value.last_name}" created successfully.`;
        }

        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Something went wrong';
      }
    });
  }

  saveUserStatus(user: User) {
    this.api.put(`users/${user.id}`, { status: user.status }).subscribe();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.form.get('avatar')?.setValue(file);

    if (this.avatarPreview) {
      URL.revokeObjectURL(this.avatarPreview);
    }
    this.avatarPreview = URL.createObjectURL(file);
  }

  getAvatar(user: any): string {
    // if backend already returns full URL
    if (user.avatar_url) {
      return user.avatar_url;
    }

    // if backend returns avatar path
    if (user.avatar) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}/storage/${user.avatar}`;
    }

    // fallback image
    return 'assets/default-avatar.png';
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-avatar.png';
  }

  get activeUsersCount(): number {
    return this.users.filter(u => u.status === 'active').length;
  }

  get pendingUsersCount(): number {
    return this.users.filter(u => u.status === 'inactive').length;
  }
}
