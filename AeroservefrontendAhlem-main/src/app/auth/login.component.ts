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
    <!-- Left: Terminal / Aviation Showcase -->
    <section class="login-showcase">
      <div class="showcase-bg">
        <div class="bg-grid"></div>
        <div class="bg-orb top-left"></div>
        <div class="bg-orb bottom-right"></div>
      </div>

      <div class="showcase-content">
        <div class="brand-badge">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" stroke-width="1.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          <span>AeroServe</span>
        </div>

        <div class="showcase-copy">
          <div class="sc-terminal-line">
            <span class="sc-prompt">></span>
            <span class="sc-command">system.initialize --env=production</span>
          </div>
          <h1 class="sc-heading">Terminal<br/>Operations</h1>
          <p class="sc-sub">Plateforme de gestion aéroportuaire — Contrôle des ventes, stocks, hygiène et planification en un seul espace de travail.</p>
        </div>

        <div class="showcase-metrics">
          <div class="sc-metric">
            <span class="sc-m-value">8</span>
            <span class="sc-m-label">Rôles</span>
          </div>
          <div class="sc-metric">
            <span class="sc-m-value">4</span>
            <span class="sc-m-label">Aéroports</span>
          </div>
          <div class="sc-metric">
            <span class="sc-m-value">IA</span>
            <span class="sc-m-label">Prédictif</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Right: Login Form -->
    <section class="login-panel">
      <div class="login-card">
        <div class="panel-header">
          <div class="panel-badge">
            <span class="badge-dot"></span>
            Accès sécurisé
          </div>
          <h2>Authentification</h2>
          <p>Connectez-vous avec votre compte AeroServe.</p>
        </div>

        <form (ngSubmit)="onLogin()" class="auth-form">
          <div class="field-group">
            <label for="email">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6B89" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email
            </label>
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

          <div class="field-group">
            <label for="password">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6B89" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Mot de passe
            </label>
            <div class="password-shell">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Saisissez votre mot de passe"
                autocomplete="current-password"
                required
              />
              <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                {{ showPassword ? 'Masquer' : 'Afficher' }}
              </button>
            </div>
          </div>

          <div class="form-meta">
            <span>Accès basé sur les rôles</span>
            <a (click)="goToForgotPassword()">Mot de passe oublié ?</a>
          </div>

          @if (error) {
            <div class="error-msg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3D00" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ error }}
            </div>
          }

          <button type="submit" [disabled]="loading" class="btn-auth">
            @if (loading) {
              <span class="btn-loader"></span>
              Connexion...
            } @else {
              Accéder au tableau de bord
            }
          </button>

          <div class="sample-box">
            <span class="sb-label">Compte de démonstration</span>
            <strong class="sb-email">admin@aeroserve.com</strong>
            <span class="sb-pass">Mot de passe : <span>password</span></span>
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
