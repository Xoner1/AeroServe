import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  styleUrl: './login.component.scss',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="login-shell">
    <section class="login-showcase">
      <div class="showcase-overlay"></div>

      <div class="brand-row">
        <img src="assets/logo.png" alt="AeroServe" />
        <div>
          <strong>AeroServe</strong>
          <span>Airport operations control center</span>
        </div>
      </div>

      <div class="showcase-copy">
        <span class="showcase-pill">Operational visibility</span>
        <h1>Control sales, stock, hygiene, and planning from one workspace.</h1>
        <p>
          Log in to continue managing internal orders, cashier assignments, recipe-linked stock,
          and compliance activity across your points of sale.
        </p>
      </div>

      <div class="showcase-grid">
        <article>
          <strong>Internal Orders</strong>
          <span>Track pending kitchen and store requests in real time.</span>
        </article>
        <article>
          <strong>Planning</strong>
          <span>Keep cashier shifts and OFF days visible by PDV.</span>
        </article>
        <article>
          <strong>Stock Alerts</strong>
          <span>Monitor low stock and expiring items without switching tools.</span>
        </article>
      </div>

      <img src="assets/loginui.png" alt="AeroServe login illustration" class="showcase-image" />
    </section>

    <section class="login-panel">
      <div class="login-card">
        <div class="panel-header">
          <span class="panel-badge">Secure access</span>
          <h2>Welcome back</h2>
          <p>Use your AeroServe account to access the operational dashboard.</p>
        </div>

        <form (ngSubmit)="onLogin()" class="auth-form">
          <div class="field-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="admin@aeroserve.com"
              autocomplete="username"
              required
            />
          </div>

          <div class="field-group password-group">
            <label for="password">Password</label>
            <div class="password-shell">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />

              <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="form-meta">
            <span>Access is role-based and approval-aware.</span>
            <a (click)="goToForgotPassword()">Forgot password?</a>
          </div>

          <div *ngIf="error" class="error-msg">
            {{ error }}
          </div>

          <button type="submit" [disabled]="loading" class="btn-auth">
            {{ loading ? 'Signing in...' : 'Enter Dashboard' }}
          </button>

          <div class="sample-box">
            <span>Sample admin account</span>
            <strong>admin@aeroserve.com</strong>
            <small>Password: password</small>
          </div>
        </form>
      </div>
    </section>
  </div>
  `,

})
export class LoginComponent {

  email = '';
  password = '';
  error = '';
  loading = false;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin(): void {
    this.loading = true;
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Identifiants incorrects';
      }
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
