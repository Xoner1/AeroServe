import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  createIcons,
  LayoutDashboard,
  Users,
  UserCheck,
  UserCog,
  Store,
  Package,
  CheckCircle,
  Warehouse,
  ShoppingCart,
  UtensilsCrossed,
  Calendar,
  ShieldCheck,
  Tag,
  Receipt,
  User,
  PanelLeftOpen,
  PanelLeftClose,
  LogOut,
  Menu,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Check,
  X
} from 'lucide';

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
    
    // Create element with data-lucide attribute to let createIcons render it
    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', this.name);
    iconEl.style.width = `${this.size}px`;
    iconEl.style.height = `${this.size}px`;
    iconEl.style.display = 'inline-block';
    
    el.appendChild(iconEl);

    // Render icon dynamically using Lucide createIcons targeting only this element
    createIcons({
      nameAttr: 'data-lucide',
      icons: {
        LayoutDashboard,
        Users,
        UserCheck,
        UserCog,
        Store,
        Package,
        CheckCircle,
        Warehouse,
        ShoppingCart,
        UtensilsCrossed,
        Calendar,
        ShieldCheck,
        Tag,
        Receipt,
        User,
        PanelLeftOpen,
        PanelLeftClose,
        LogOut,
        Menu,
        AlertTriangle,
        AlertCircle,
        Info,
        ChevronDown,
        Check,
        X
      },
      attrs: {
        'stroke-width': '1.75',
        width: String(this.size),
        height: String(this.size)
      }
    });
  }
}
