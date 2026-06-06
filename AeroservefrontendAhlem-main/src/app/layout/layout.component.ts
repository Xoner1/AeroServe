import { Component, OnInit, HostListener, inject, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { WebSocketService } from '../core/services/websocket.service';
import { ApiService } from '../core/services/api.service';
import { User, Notification } from '../core/models';
import { environment } from '../../environments/environment';
import { AppIconComponent } from '../shared/icon/app-icon.component';

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
  imports: [CommonModule, FormsModule, RouterModule, AppIconComponent],
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  showNotifications = false;
  showUserMenu = false;
  user: User | null = null;
  unreadCount = 0;
  notifications: Notification[] = [];
  mobileSidebarOpen = false;
  wsConnected = false;

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'LayoutDashboard', route: '/dashboard', roles: ['SUPER_ADMIN', 'RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT', 'RESPONSABLE_HYGIENE'] },
    { label: 'Utilisateurs', icon: 'Users', route: '/users', roles: ['SUPER_ADMIN'] },
    { label: 'Approbation Caissiers', icon: 'UserCheck', route: '/caissiers-approval', roles: ['RESPONSABLE_FB'] },

    { label: 'Points de vente', icon: 'Store', route: '/points-de-vente', roles: ['SUPER_ADMIN'] },
    { label: 'Produits', icon: 'Package', route: '/products', roles: ['CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT'] },
    { label: 'Validation Produits', icon: 'CheckCircle', route: '/products-validation', roles: ['RESPONSABLE_ACHAT'] },
    { label: 'Stocks', icon: 'Warehouse', route: '/stocks', roles: ['CHEF_MAGASIN', 'CHEF_CUISINE'] },
    { label: 'Commandes Internes', icon: 'ShoppingCart', route: '/internal-orders', roles: ['RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT'] },
    { label: 'Menus Hebdomadaires', icon: 'UtensilsCrossed', route: '/menus', roles: ['CHEF_CUISINE'] },
    { label: 'Besoins d\'Achat', icon: 'Receipt', route: '/purchase-needs', roles: ['CHEF_CUISINE', 'CHEF_MAGASIN'] },
    { label: 'Plannings & Horaires', icon: 'Calendar', route: '/plannings', roles: ['RESPONSABLE_FB', 'CAISSIER'] },
    { label: 'Rapports d\'Hygiène', icon: 'ShieldCheck', route: '/hygiene-reports', roles: ['RESPONSABLE_HYGIENE'] },
    { label: 'Catégories', icon: 'Tag', route: '/category', roles: ['RESPONSABLE_ACHAT'] },

    { label: 'Mon profil', icon: 'User', route: '/profile', roles: ['SUPER_ADMIN', 'RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT', 'RESPONSABLE_HYGIENE', 'CAISSIER'] }
  ];

  get filteredNavItems(): NavItem[] {
    const role = this.auth.getCurrentUser()?.role?.name || '';
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      return this.auth.hasRole(...item.roles);
    }).map(item => {
      if (item.route === '/caissiers-approval' && role === 'RESPONSABLE_FB') {
        return { ...item, label: 'Gestion Caissiers' };
      }
      return item;
    });
  }

  avatarLoadFailed = false;

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ─── Chatbot ─────────────────────────────────────────────────────────────────
  showChatbot = false;
  chatbotMessages: { sender: 'user' | 'bot'; text: string }[] = [];
  chatbotInput = '';
  chatbotLoading = false;

  constructor(
    private auth: AuthService,
    private notifService: NotificationService,
    private api: ApiService,
    private ws: WebSocketService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(u => {
      this.user = u;
      this.avatarLoadFailed = false;
    });
    this.notifService.unreadCount$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(c => this.unreadCount = c);
    this.notifService.loadUnreadCount();
    this.notifService.connectWebSocket();
    this.ws.connectionStatus$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(connected => this.wsConnected = connected);
    this.notifService.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(notifs => {
      const current = [...this.notifications];
      for (const n of notifs) {
        if (!current.find(ex => ex.id === n.id)) {
          current.unshift(n);
        }
      }
      this.notifications = current.slice(0, 50);
    });
  }

  ngOnDestroy(): void {
    this.notifService.disconnectWebSocket();
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
    this.avatarLoadFailed = true;
  }

  getPageTitle(): string {
    const role = this.auth.getCurrentUser()?.role?.name || '';
    const isFb = role === 'RESPONSABLE_FB';
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/users': 'Users',
      '/caissiers-approval': isFb ? 'Gestion Caissiers' : 'Caissier Approval',
      '/caissier': 'Caissier',
      '/points-de-vente': 'Points of Sales',
      '/profile': 'Profile',
      '/products': 'Products',
      '/products-validation': 'Products Validation',
      '/stocks': 'Stocks',
      '/internal-orders': 'Internal Commands',
      '/menus': 'Menus',
      '/purchase-needs': 'Purchase Needs',
      '/plannings': 'Planning',
      '/category': 'Category',
      '/reports': 'Reports',
      '/hygiene-reports': 'Hygiene Reports',
    };

    const path = '/' + (this.router.url.split('?')[0].split('/')[1] || 'dashboard');

    return titles[path] || 'AeroServe';
  }

  toggleChatbot(): void {
    this.showChatbot = !this.showChatbot;
    if (this.showChatbot && this.chatbotMessages.length === 0) {
      this.chatbotMessages = [
        { sender: 'bot', text: `Bonjour ! Je suis l'assistant AeroServe. Posez-moi vos questions sur les produits, les stocks, les commandes ou tout autre sujet.` }
      ];
    }
  }

  sendChatbotMessage(): void {
    if (!this.chatbotInput.trim() || this.chatbotLoading) return;
    const userMsg = this.chatbotInput.trim();
    this.chatbotMessages.push({ sender: 'user', text: userMsg });
    this.chatbotInput = '';
    this.chatbotLoading = true;
    this.api.post<any>('chatbot/ask', { message: userMsg }).subscribe({
      next: (res) => {
        this.chatbotMessages.push({ sender: 'bot', text: res.response });
        this.chatbotLoading = false;
      },
      error: () => {
        this.chatbotMessages.push({ sender: 'bot', text: "Désolé, je rencontre des difficultés pour me connecter au service pour le moment." });
        this.chatbotLoading = false;
      }
    });
  }

  askQuickQuestion(question: string): void {
    this.chatbotInput = question;
    this.sendChatbotMessage();
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

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
      this.showUserMenu = false;
    }
  }

  loadNotifications(): void {
    this.notifService.getAll().subscribe((res: any) => {
      if (res && Array.isArray(res.data)) {
        this.notifications = res.data;
      } else if (Array.isArray(res)) {
        this.notifications = res;
      } else {
        this.notifications = [];
      }
    });
  }

  markAsRead(event: Event, notif: Notification): void {
    event.stopPropagation();
    if (!notif.is_read) {
      this.notifService.markAsRead(notif.id).subscribe(() => {
        notif.is_read = true;
        this.notifService.loadUnreadCount();
      });
    }
  }

  navigateToNotification(notif: Notification): void {
    this.showNotifications = false;
    let route = '/dashboard';
    let data = notif.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {}
    }
    if (data?.route) {
      route = data.route;
    } else if (data?.order_id) {
      route = '/internal-orders';
    } else if (notif.type === 'low_stock' || notif.type === 'warning' || notif.type === 'alert') {
      route = '/stocks';
    } else if (notif.type === 'new_order') {
      route = '/internal-orders';
    } else if (notif.type === 'hygiene_alert') {
      route = '/hygiene-reports';
    } else if (notif.type === 'planning_update') {
      route = '/plannings';
    }
    this.router.navigateByUrl(route);
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
      this.notifService.loadUnreadCount();
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showUserMenu = false;
    this.showNotifications = false;
  }
}
