import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {

  user: User | null = null;

  previewAvatar: string | null = null;
  avatarUrl = 'assets/default-avatar.jpg';
  darkMode = false;

  loading = false;
  error = '';
  success = '';
  editMode = false;

  form: any = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    avatar: null as File | null,
    bio: '',
    age: null,
    experience: false
  };

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // =========================
  // LOAD PROFILE
  // =========================
  loadProfile(): void {
    this.auth.getProfile().subscribe({
      next: (res: any) => {
        const user: User = res.user ?? res;
        this.user = user;
        this.auth.setCurrentUser(user);
        this.fillForm(user);
        this.refreshAvatarUrl();
      },
      error: () => {
        this.error = 'Échec du chargement du profil';
      }
    });
  }

  // =========================
  // FILL FORM
  // =========================
  fillForm(user: User): void {
    this.form = {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      bio: user.bio || '',
      age: user.age || null,
      experience: user.experience ?? false,
      avatar: null
    };

    this.previewAvatar = null;
  }

  private refreshAvatarUrl(): void {
    if (this.previewAvatar) {
      this.avatarUrl = this.previewAvatar;
    } else if (this.user?.avatar_url) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      const url = this.user.avatar_url.startsWith('http')
        ? this.user.avatar_url
        : `${baseUrl}/${this.user.avatar_url.replace(/^\//, '')}`;
      this.avatarUrl = `${url}?v=${Date.now()}`;
    } else {
      this.avatarUrl = 'assets/default-avatar.jpg';
    }
  }

  // =========================
  // EDIT MODE
  // =========================
  enableEdit(): void {
    this.editMode = true;
    this.error = '';
    this.success = '';
  }

  cancelEdit(): void {
    this.editMode = false;

    if (this.user) {
      this.fillForm(this.user);
    }

    this.previewAvatar = null;
    this.refreshAvatarUrl();
  }

  // =========================
  // FILE UPLOAD
  // =========================
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const file = input.files[0];

    if (!file.type.startsWith('image/')) return;

    this.form.avatar = file;

    if (this.previewAvatar) {
      URL.revokeObjectURL(this.previewAvatar);
    }

    this.previewAvatar = URL.createObjectURL(file);
    this.avatarUrl = this.previewAvatar;

    input.value = '';
  }

  // =========================
  // SAVE PROFILE
  // =========================
  saveProfile(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = new FormData();

    formData.append('first_name', this.form.first_name || '');
    formData.append('last_name', this.form.last_name || '');
    formData.append('phone', this.form.phone || '');
    formData.append('bio', this.form.bio || '');

    if (this.form.age !== null && this.form.age !== undefined) {
      formData.append('age', String(this.form.age));
    }

    if (this.form.avatar) {
      formData.append('avatar', this.form.avatar);
    }

    this.auth.updateProfile(formData).subscribe({
      next: (res: any) => {
        const updated: User = res.user ?? res;

        this.success = res.message || 'Profile updated';
        this.user = updated;
        this.auth.setCurrentUser(updated);

        this.previewAvatar = null;
        this.editMode = false;
        this.loading = false;
        this.refreshAvatarUrl();
      },

      error: (err) => {
        this.error = err.error?.message || 'Échec de la mise à jour';
        this.loading = false;
      }
    });
  }

  // =========================
  // ROLE DISPLAY
  // =========================
  getRoleDisplay(): string {
    return this.user?.role?.display_name
      || this.user?.role?.name
      || 'User';
  }

  // =========================
  // NAVIGATION
  // =========================
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    if (this.previewAvatar) {
      URL.revokeObjectURL(this.previewAvatar);
    }
  }
}
