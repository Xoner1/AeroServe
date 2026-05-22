import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { User } from '../core/models';
import { environment } from '../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  styleUrls: ['./layout.component.scss'],
  templateUrl: './layout.component.html',

  imports: [CommonModule, RouterModule],

})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = false;
  showNotifications = false;
  showUserMenu = false;
  user: User | null = null;
  unreadCount = 0;

  navItems: NavItem[] = [

  /* =========================
     SUPER ADMIN
  ========================= */
  {
    label: 'Dashboard',
    icon: '📊',
    route: '/dashboard',
    roles: ['SUPER_ADMIN']
  },
  {
    label: 'Users',
    icon: '👥',
    route: '/users',
    roles: ['SUPER_ADMIN']
  },
  {
    label: 'Caissier Approval',
    icon: '',
    route: '/caissiers-approval',
    roles: ['SUPER_ADMIN']
  },
  {
    label: 'Points of Sales',
    icon: '🏪',
    route: '/points-de-vente',
    roles: ['SUPER_ADMIN']
  },
  {
    label: 'Profile',
    icon: '👤',
    route: '/profile',
    roles: ['SUPER_ADMIN']
  },

  /* =========================
     RESPONSABLE FB
  ========================= */
  {
    label: 'Dashboard',
    icon: '📊',
    route: '/dashboard',
    roles: ['RESPONSABLE_FB']
  },
  {
    label: 'Caissier',
    icon: '💳',
    route: '/caissier',
    roles: ['RESPONSABLE_FB']
  },
  {
    label: 'Internal Commands',
    icon: '📝',
    route: '/internal-orders',
    roles: ['RESPONSABLE_FB']
  },
  {
    label: 'Planning',
    icon: '📅',
    route: '/plannings',
    roles: ['RESPONSABLE_FB']
  },

  /* =========================
     CHEF CUISINE
  ========================= */
  {
    label: 'Menus',
    icon: '🍽️',
    route: '/menus',
    roles: ['CHEF_CUISINE']
  },
  {
    label: 'Products',
    icon: '📦',
    route: '/products',
    roles: ['CHEF_CUISINE']
  },
  {
    label: 'Dashboard',
    icon: '📊',
    route: '/dashboard',
    roles: ['CHEF_CUISINE']
  },
  {
    label: 'Internal Commands',
    icon: '📝',
    route: '/internal-orders',
    roles: ['CHEF_CUISINE']
  },

  /* =========================
     CHEF MAGASIN
  ========================= */
  {
    label: 'Products',
    icon: '📦',
    route: '/products',
    roles: ['CHEF_MAGASIN']
  },
  {
    label: 'Stocks',
    icon: '📋',
    route: '/stocks',
    roles: ['CHEF_MAGASIN']
  },
  {
    label: 'Internal Commands',
    icon: '📝',
    route: '/internal-orders',
    roles: ['CHEF_MAGASIN']
  },
  {
    label: 'Dashboard',
    icon: '📊',
    route: '/dashboard',
    roles: ['CHEF_MAGASIN']
  },

  /* =========================
     RESPONSABLE ACHAT
  ========================= */
  {
    label: 'Dashboard',
    icon: '📊',
    route: '/dashboard',
    roles: ['RESPONSABLE_ACHAT']
  },
  {
    label: 'Category',
    icon: '📂',
    route: '/category',
    roles: ['RESPONSABLE_ACHAT']
  },
  {
    label: 'Products Validation',
    icon: '✔️',
    route: '/products-validation',
    roles: ['RESPONSABLE_ACHAT']
  },
  {
    label: 'Products',
    icon: '📦',
    route: '/products',
    roles: ['RESPONSABLE_ACHAT']
  },
  {
    label: 'Reports',
    icon: '📑',
    route: '/reports',
    roles: ['RESPONSABLE_ACHAT']
  }

];
get filteredNavItems(): NavItem[] {
  return this.navItems.filter(item => {
    if (!item.roles) return true;
    return this.auth.hasRole(...item.roles);
  });
}


  constructor(private auth: AuthService, private notifService: NotificationService) {}

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    this.auth.currentUser$.subscribe(u => this.user = u);
    this.notifService.unreadCount$.subscribe(c => this.unreadCount = c);
    this.notifService.loadUnreadCount();
  }

  getInitials(): string {
    if (!this.user) return '';
    return (this.user.first_name?.[0] || '') + (this.user.last_name?.[0] || '');
  }

  getUserAvatarUrl(): string | null {
    if (this.user?.avatar_url) return this.user.avatar_url;
    if (this.user?.avatar && this.user.avatar !== 'null') {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}/storage/${this.user.avatar}`;
    }
    return null;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getPageTitle(): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/users': 'Users',
    '/caissiers-approval': 'Caissier Approval',
    '/caissier': 'Caissier',
    '/points-de-vente': 'Points of Sales',
    '/profile': 'Profile',
    '/products': 'Products',
    '/products-validation': 'Products Validation',
    '/stocks': 'Stocks',
    '/internal-orders': 'Internal Commands',
    '/menus': 'Menus',
    '/plannings': 'Planning',
    '/category': 'Category',
    '/reports': 'Reports',
  };

  const path = '/' + (window.location.pathname.split('/')[1] || 'dashboard');

  return titles[path] || 'AeroServe';
}
  onLogout(): void {
    this.auth.logout();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showUserMenu = false;
  }
}
