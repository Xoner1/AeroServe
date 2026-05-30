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

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  List<_NavItem> _getNavItems(String? roleName) {
    final role = roleName?.toUpperCase() ?? '';
    switch (role) {
      case 'CAISSIER':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: SalesScreen(), icon: AppIcons.sales, activeIcon: AppIcons.sales, label: 'Ventes'),
          const _NavItem(screen: PlanningScreen(), icon: AppIcons.planning, activeIcon: AppIcons.planning, label: 'Planning'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      case 'RESPONSABLE_FB':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: OrdersScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Commandes'),
          const _NavItem(screen: PlanningScreen(), icon: AppIcons.planning, activeIcon: AppIcons.planning, label: 'Planning'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      case 'RESPONSABLE_HYGIENE':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: QrScannerScreen(), icon: AppIcons.scanner, activeIcon: AppIcons.scanner, label: 'Scanner QR'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      case 'CHEF_CUISINE':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: OrdersScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Commandes'),
          const _NavItem(screen: MenuPlanningScreen(), icon: AppIcons.planning, activeIcon: AppIcons.planning, label: 'Menu'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      case 'CHEF_MAGASIN':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: OrdersScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Commandes'),
          const _NavItem(screen: StockAlertsScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Stock'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      case 'RESPONSABLE_ACHAT':
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: OrdersScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Commandes'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
      default:
        return [
          const _NavItem(screen: DashboardScreen(), icon: AppIcons.dashboard, activeIcon: AppIcons.dashboard, label: 'Dashboard'),
          const _NavItem(screen: SalesScreen(), icon: AppIcons.sales, activeIcon: AppIcons.sales, label: 'Ventes'),
          const _NavItem(screen: OrdersScreen(), icon: AppIcons.orders, activeIcon: AppIcons.ordersActive, label: 'Commandes'),
          const _NavItem(screen: PlanningScreen(), icon: AppIcons.planning, activeIcon: AppIcons.planning, label: 'Planning'),
          const _NavItem(screen: ProfileScreen(), icon: AppIcons.profile, activeIcon: AppIcons.profile, label: 'Profil'),
        ];
    }
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
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AppTheme.divider, width: 1.0),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: safeIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textSecondary,
          backgroundColor: Colors.white,
          elevation: 0,
          selectedFontSize: 11.5,
          unselectedFontSize: 11.5,
          selectedLabelStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            letterSpacing: -0.1,
          ),
          unselectedLabelStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w500,
            letterSpacing: -0.1,
          ),
          items: navItems
              .map((n) => BottomNavigationBarItem(
                    icon: Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Icon(n.icon),
                    ),
                    activeIcon: Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Icon(n.activeIcon),
                    ),
                    label: n.label,
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _NavItem {
  final Widget screen;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({
    required this.screen,
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}
