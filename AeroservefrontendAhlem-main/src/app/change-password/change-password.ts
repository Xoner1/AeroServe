import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.scss'], // ✅ FIXED
})
export class ChangePasswordComponent implements OnInit {

  changePasswordForm!: FormGroup;

  errors: string | null = null;
  success: string | null = null;
  loading = false;

  token: string = '';
  email: string = '';

  // 👁️ toggle
  showPassword = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    // ✅ GET params
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';

    // ✅ FORM with MATCH VALIDATOR
    this.changePasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // ✅ CUSTOM VALIDATOR
  passwordMatchValidator(form: AbstractControl) {
    const password = form.get('password')?.value;
    const confirm = form.get('password_confirmation')?.value;

    return password === confirm ? null : { mismatch: true };
  }

  onSubmit() {

  if (this.changePasswordForm.invalid) {
    this.changePasswordForm.markAllAsTouched();
    return;
  }

  this.loading = true;
  this.errors = null;
  this.success = null;

  const { password, password_confirmation } = this.changePasswordForm.value;

  this.authService.resetPasswordWithToken({
    email: this.email,
    token: this.token,
    password: password,
    password_confirmation: password_confirmation
  }).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.success = res.message || 'Password changed successfully';
      this.changePasswordForm.reset();
    },
    error: (err) => {
      this.loading = false;
      console.log(err.error); // 🔥 debug important
      this.errors = err.error?.message || 'Erreur serveur';
    }
  });
}}
