import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createIcons, icons } from 'lucide';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `<span #iconContainer [class]="className"></span>`,
  styles: [`:host { display: inline-flex; align-items: center; }`]
})
export class AppIconComponent implements AfterViewInit, OnChanges {
  @Input() name = '';
  @Input() size = 18;
  @Input() className = '';

  @ViewChild('iconContainer', { static: true }) iconContainer!: ElementRef;

  ngAfterViewInit(): void {
    this.renderIcon();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['name'] && !changes['name'].firstChange) {
      this.renderIcon();
    }
  }

  private renderIcon(): void {
    if (!this.iconContainer || !this.name) return;
    const el = this.iconContainer.nativeElement;
    el.innerHTML = '';
    const svg = (icons as any)[this.name];
    if (svg) {
      const span = document.createElement('span');
      span.innerHTML = svg;
      const svgEl = span.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', String(this.size));
        svgEl.setAttribute('height', String(this.size));
        svgEl.setAttribute('stroke-width', '1.75');
        el.appendChild(svgEl);
      }
    }
  }
}
