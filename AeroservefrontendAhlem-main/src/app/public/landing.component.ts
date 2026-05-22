import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-shell">
      <header class="landing-header">
        <a class="brand" routerLink="/">
          <img src="assets/logo.png" alt="AeroServe" />
          <div>
            <strong>AeroServe</strong>
            <span>Airport F&B Operations Platform</span>
          </div>
        </a>

        <nav class="landing-nav">
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
          <a href="#workflow">Workflow</a>
          <a class="nav-cta" routerLink="/login">Login</a>
        </nav>
      </header>

      <main class="landing-main">
        <section class="hero-panel">
          <div class="hero-copy">
            <span class="eyebrow">Aviation retail and catering control</span>
            <h1>One operational cockpit for stock, kitchen, hygiene, sales, and planning.</h1>
            <p>
              AeroServe centralizes point-of-sale activity, internal orders, weekly menus, hygiene reporting,
              and cashier scheduling in one red-thread workflow built for airport teams.
            </p>

            <div class="hero-actions">
              <a class="primary-btn" routerLink="/login">Open Platform</a>
              <a class="secondary-btn" href="#features">Explore Modules</a>
            </div>

            <div class="hero-metrics">
              <div class="metric-card">
                <strong>7</strong>
                <span>Operational roles covered</span>
              </div>
              <div class="metric-card">
                <strong>FIFO</strong>
                <span>Stock discipline and movement history</span>
              </div>
              <div class="metric-card">
                <strong>Live</strong>
                <span>Notifications, alerts, and approvals</span>
              </div>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-card command-card">
              <span class="card-tag">Today</span>
              <h3>Operations Pulse</h3>
              <div class="pulse-list">
                <div>
                  <label>Internal orders</label>
                  <strong>12 pending</strong>
                </div>
                <div>
                  <label>Kitchen load</label>
                  <strong>68%</strong>
                </div>
                <div>
                  <label>Low stock alerts</label>
                  <strong>4 items</strong>
                </div>
              </div>
            </div>

            <div class="visual-card route-card">
              <img src="assets/loginui.png" alt="AeroServe interface" />
            </div>
          </div>
        </section>

        <section class="feature-grid" id="features">
          <article class="feature-card accent">
            <span>Inventory</span>
            <h3>Store, kitchen, and procurement stay aligned.</h3>
            <p>Track product categories, FIFO stock, low-stock alerts, and recipe-linked ingredients without losing operational visibility.</p>
          </article>

          <article class="feature-card">
            <span>Planning</span>
            <h3>Cashier allocation stays visible by point of sale.</h3>
            <p>Coordinate OFF/ON schedules, shifts, and point-of-sale assignments from one planning flow.</p>
          </article>

          <article class="feature-card">
            <span>Kitchen</span>
            <h3>Weekly menus and recipes connect directly to production demand.</h3>
            <p>Prepared food items, ingredient usage, and internal food orders stay part of the same operational loop.</p>
          </article>
        </section>

        <section class="roles-section" id="roles">
          <div class="section-heading">
            <span>Role-based workspace</span>
            <h2>Each team sees the tools that match its responsibility.</h2>
          </div>

          <div class="roles-grid">
            <div class="role-card"><strong>Super Admin</strong><span>Global KPIs, PDV comparison, user activity</span></div>
            <div class="role-card"><strong>Responsable F&B</strong><span>Internal orders, planning, operational dashboard</span></div>
            <div class="role-card"><strong>Chef Cuisine</strong><span>Food products, menus, recipes, order fulfillment</span></div>
            <div class="role-card"><strong>Chef Magasin</strong><span>Commercial and raw material stock control</span></div>
            <div class="role-card"><strong>Responsable Hygiène</strong><span>Compliance checks, allergens, expiration tracking</span></div>
            <div class="role-card"><strong>Caissier</strong><span>Sales capture, payments, assigned point of sale</span></div>
          </div>
        </section>

        <section class="workflow-band" id="workflow">
          <div>
            <span class="band-label">Workflow</span>
            <h2>From stock approval to sale, every step stays connected.</h2>
          </div>

          <div class="workflow-steps">
            <div><strong>01</strong><span>Procurement and stock intake</span></div>
            <div><strong>02</strong><span>Recipe and menu preparation</span></div>
            <div><strong>03</strong><span>Internal order execution</span></div>
            <div><strong>04</strong><span>Cashier sales and reporting</span></div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(209, 78, 78, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(178, 34, 34, 0.12), transparent 30%),
        linear-gradient(180deg, #fff8f8 0%, #f7f3f2 100%);
    }

    .landing-shell {
      max-width: 1240px;
      margin: 0 auto;
      padding: 24px;
    }

    .landing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 10px 0 26px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #1f2937;
    }

    .brand img {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 12px 25px rgba(178, 34, 34, 0.08);
      padding: 8px;
    }

    .brand strong {
      display: block;
      font-size: 18px;
      letter-spacing: 0.02em;
    }

    .brand span {
      display: block;
      color: #6b7280;
      font-size: 12px;
    }

    .landing-nav {
      display: flex;
      align-items: center;
      gap: 18px;
      color: #4b5563;
      font-size: 14px;
    }

    .nav-cta {
      padding: 10px 16px;
      border-radius: 999px;
      background: #b22222;
      color: #ffffff;
      box-shadow: 0 10px 20px rgba(178, 34, 34, 0.18);
    }

    .landing-main {
      display: flex;
      flex-direction: column;
      gap: 26px;
    }

    .hero-panel {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
      gap: 24px;
      align-items: stretch;
    }

    .hero-copy,
    .hero-visual,
    .feature-card,
    .roles-section,
    .workflow-band {
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(178, 34, 34, 0.08);
      box-shadow: 0 18px 45px rgba(102, 34, 34, 0.08);
      backdrop-filter: blur(12px);
    }

    .hero-copy {
      border-radius: 30px;
      padding: 42px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 22px;
    }

    .eyebrow,
    .section-heading span,
    .band-label,
    .feature-card span,
    .card-tag {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(209, 78, 78, 0.12);
      color: #9f1d1d;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .hero-copy h1 {
      margin: 0;
      font-size: clamp(38px, 4vw, 62px);
      line-height: 1.02;
      color: #111827;
      max-width: 10ch;
    }

    .hero-copy p {
      margin: 0;
      color: #4b5563;
      font-size: 16px;
      max-width: 60ch;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }

    .primary-btn,
    .secondary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 20px;
      border-radius: 14px;
      font-weight: 700;
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }

    .primary-btn {
      background: linear-gradient(135deg, #d14e4e 0%, #b22222 100%);
      color: #ffffff;
      box-shadow: 0 14px 24px rgba(178, 34, 34, 0.24);
    }

    .secondary-btn {
      background: #ffffff;
      color: #7f2a2a;
      border: 1px solid rgba(178, 34, 34, 0.16);
    }

    .primary-btn:hover,
    .secondary-btn:hover {
      transform: translateY(-2px);
    }

    .hero-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .metric-card {
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250, 233, 233, 0.85));
      border: 1px solid rgba(178, 34, 34, 0.08);
    }

    .metric-card strong {
      display: block;
      font-size: 28px;
      color: #7f2a2a;
      margin-bottom: 4px;
    }

    .metric-card span {
      display: block;
      font-size: 13px;
      color: #6b7280;
    }

    .hero-visual {
      border-radius: 30px;
      padding: 22px;
      display: grid;
      gap: 18px;
      background: linear-gradient(180deg, rgba(127, 42, 42, 0.98), rgba(178, 34, 34, 0.92));
      color: #fff7f7;
    }

    .visual-card {
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }

    .command-card {
      padding: 22px;
    }

    .command-card h3 {
      margin: 14px 0 18px;
      font-size: 24px;
    }

    .pulse-list {
      display: grid;
      gap: 12px;
    }

    .pulse-list div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .pulse-list div:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .pulse-list label {
      color: rgba(255, 255, 255, 0.72);
      font-size: 13px;
    }

    .pulse-list strong {
      font-size: 18px;
    }

    .route-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
    }

    .route-card img {
      width: min(100%, 320px);
      object-fit: contain;
      filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.22));
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .feature-card,
    .roles-section,
    .workflow-band {
      border-radius: 24px;
      padding: 26px;
    }

    .feature-card h3,
    .section-heading h2,
    .workflow-band h2 {
      margin: 14px 0 10px;
      color: #111827;
      font-size: 24px;
      line-height: 1.15;
    }

    .feature-card p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }

    .feature-card.accent {
      background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255, 236, 236, 0.94));
    }

    .roles-section {
      display: grid;
      gap: 20px;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .role-card {
      padding: 18px;
      border-radius: 18px;
      background: #fffafa;
      border: 1px solid rgba(178, 34, 34, 0.08);
    }

    .role-card strong {
      display: block;
      color: #7f2a2a;
      margin-bottom: 6px;
      font-size: 15px;
    }

    .role-card span {
      color: #6b7280;
      font-size: 13px;
    }

    .workflow-band {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 20px;
      align-items: center;
      margin-bottom: 28px;
      background: linear-gradient(135deg, #b22222 0%, #7f2a2a 100%);
      color: #ffffff;
    }

    .workflow-band .band-label {
      background: rgba(255,255,255,0.14);
      color: #fff6f6;
    }

    .workflow-band h2 {
      color: #fffdfd;
      max-width: 18ch;
    }

    .workflow-steps {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .workflow-steps div {
      padding: 18px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255,255,255,0.12);
    }

    .workflow-steps strong {
      display: block;
      font-size: 26px;
      margin-bottom: 10px;
    }

    .workflow-steps span {
      color: rgba(255,255,255,0.82);
      font-size: 14px;
    }

    @media (max-width: 1040px) {
      .hero-panel,
      .workflow-band,
      .feature-grid,
      .roles-grid,
      .hero-metrics {
        grid-template-columns: 1fr;
      }

      .landing-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .landing-nav {
        flex-wrap: wrap;
      }

      .hero-copy h1 {
        max-width: none;
      }
    }

    @media (max-width: 640px) {
      .landing-shell {
        padding: 16px;
      }

      .hero-copy,
      .hero-visual,
      .feature-card,
      .roles-section,
      .workflow-band {
        padding: 20px;
        border-radius: 22px;
      }

      .landing-nav {
        gap: 10px;
        font-size: 13px;
      }
    }
  `]
})
export class LandingComponent {}