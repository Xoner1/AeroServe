import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../providers/auth_provider.dart';
import 'dashboard_screen.dart';
import 'sales_screen.dart';
import 'orders_screen.dart';
import 'planning_screen.dart';
import 'menu_planning_screen.dart';
import 'profile_screen.dart';
import 'qr_scanner_screen.dart';
import 'stock_alerts_screen.dart';
import 'chatbot_screen.dart';
import 'cashier_kanban_screen.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  Timer? _notificationTimer;
  int? _lastNotificationId;

  @override
  void initState() {
    super.initState();
    _startNotificationPolling();
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  void _startNotificationPolling() {
    _checkNewNotifications(); // Initial check
    _notificationTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      _checkNewNotifications();
    });
  }

  Future<void> _checkNewNotifications() async {
    try {
      final res = await ApiService.get('/notifications');
      final list = res is Map ? (res['data'] ?? []) : (res is List ? res : []);
      if (list is List && list.isNotEmpty) {
        final notifications = list.map((e) => AppNotification.fromJson(e)).toList();
        final maxId = notifications.map((n) => n.id).reduce((a, b) => a > b ? a : b);

        if (_lastNotificationId == null) {
          _lastNotificationId = maxId;
          return;
        }

        final newNotifications = notifications.where((n) => n.id > _lastNotificationId! && n.readAt == null).toList();
        if (newNotifications.isNotEmpty) {
          for (final notif in newNotifications) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppTheme.info,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                  margin: const EdgeInsets.all(AppTheme.spacingM),
                  content: Row(
                    children: [
                      const Icon(Icons.notifications_active_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: AppTheme.spacingS),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              notif.title,
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              notif.body,
                              style: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.9), fontSize: 11.5),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
          }
          _lastNotificationId = maxId;
        }
      }
    } catch (_) {
      // Fail silently to avoid breaking UX
    }
  }

  List<_NavItem> _getNavItems(String? roleName) {
    final role = roleName?.toUpperCase() ?? '';
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(OrdersScreen(), AppIcons.orders, 'Commandes'),
          const _NavItem(SalesScreen(), AppIcons.sales, 'Ventes'),
          const _NavItem(StockAlertsScreen(), Icons.inventory_2_rounded, 'Stocks'),
          const _NavItem(PlanningScreen(), AppIcons.planning, 'Planning'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'RESPONSABLE_FB':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(OrdersScreen(), AppIcons.orders, 'Commandes'),
          const _NavItem(CashierKanbanScreen(), Icons.people_outline_rounded, 'Caissiers'),
          const _NavItem(PlanningScreen(), AppIcons.planning, 'Planning'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'CHEF_CUISINE':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(OrdersScreen(), AppIcons.orders, 'Commandes'),
          const _NavItem(MenuPlanningScreen(), Icons.restaurant_menu_rounded, 'Menus'),
          const _NavItem(StockAlertsScreen(), Icons.inventory_2_rounded, 'Stocks'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'CHEF_MAGASIN':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(OrdersScreen(), AppIcons.orders, 'Commandes'),
          const _NavItem(StockAlertsScreen(), Icons.inventory_2_rounded, 'Stocks'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'RESPONSABLE_ACHAT':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'RESPONSABLE_HYGIENE':
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(QrScannerScreen(), AppIcons.scanner, 'Scanner QR'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      case 'CAISSIER':
        return [
          const _NavItem(PlanningScreen(), AppIcons.planning, 'Planning'),
          const _NavItem(ChatbotScreen(), Icons.chat_bubble_outline_rounded, 'Chatbot IA'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
      default:
        return [
          const _NavItem(DashboardScreen(), AppIcons.dashboard, 'Dashboard'),
          const _NavItem(ProfileScreen(), AppIcons.profile, 'Profil'),
        ];
    }
  }

  Widget _buildBottomNav(List<_NavItem> items) {
    return Container(
      height: 56,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
      child: Row(
        children: List.generate(items.length, (i) {
          final isSelected = i == _currentIndex;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _currentIndex = i),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    items[i].icon,
                    size: 22,
                    color: isSelected ? AppTheme.accent : AppTheme.textSecondary.withValues(alpha: 0.6),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    items[i].label,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      color: isSelected ? AppTheme.accent : AppTheme.textSecondary.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final roleName = authProvider.user?.roleName;
    final navItems = _getNavItems(roleName);
    final safeIndex = _currentIndex < navItems.length ? _currentIndex : 0;

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: navItems.map((n) => n.screen).toList(),
      ),
      bottomNavigationBar: _buildBottomNav(navItems),
    );
  }
}

class _NavItem {
  final Widget screen;
  final IconData icon;
  final String label;
  const _NavItem(this.screen, this.icon, this.label);
}
