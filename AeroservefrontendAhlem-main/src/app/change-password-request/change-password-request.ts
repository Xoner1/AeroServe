import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-change-password-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], //  AJOUT ICI
  templateUrl: './change-password-request.html',
styleUrls: ['./change-password-request.scss']})
export class ChangePasswordRequest implements OnInit {

resetForm: FormGroup;
  errors: string | null = null;
  successMsg: string | null = null;
  loading = false;

  constructor(
    public fb: FormBuilder,
    public authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.errors = null;
    this.successMsg = null;

    //  Correction ici
    const email = this.resetForm.value.email;

    this.authService.forgotPassword(email).subscribe({
    next: (result: any) => {
  this.loading = false;
  this.successMsg = result.message || 'Lien envoyé avec succès';

  this.resetForm.reset(); //  ajout
},
      error: (error) => {
        this.loading = false;
        this.errors = error.error?.message || 'Erreur serveur';
      }
    });
  }
}
