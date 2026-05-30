import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-slide-over',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="slide-over-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
        <div class="slide-over-panel" [class.wide]="wide" (click)="$event.stopPropagation()">
          <div class="slide-over-header">
            <h3>{{ title }}</h3>
            <button class="slide-over-close" (click)="close.emit()">✕</button>
          </div>
          <div class="slide-over-body">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .slide-over-backdrop {
      position: fixed; inset: 0; background: rgba(44,62,53,0.4);
      backdrop-filter: blur(4px); display: flex; justify-content: flex-end;
      z-index: 300; animation: fadeIn 0.2s ease;
    }
    .slide-over-panel {
      width: 100%; max-width: 520px; height: 100%; background: #F5F2ED;
      box-shadow: -8px 0 40px rgba(26,31,28,0.12);
      display: flex; flex-direction: column; animation: slideIn 0.3s ease;
      border-left: 1px solid #EDE9E2;
    }
    .slide-over-panel.wide { max-width: 680px; }
    .slide-over-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #EDE9E2;
      background: #FFFFFF;
    }
    .slide-over-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #2C3E35; }
    .slide-over-close {
      background: none; border: none; font-size: 20px; color: #A8C5A0;
      cursor: pointer; width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .slide-over-close:hover { background: #EDE9E2; color: #2C3E35; }
    .slide-over-body {
      flex: 1; overflow-y: auto; padding: 24px;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class SlideOverComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() wide = false;
  @Output() close = new EventEmitter<void>();
}
