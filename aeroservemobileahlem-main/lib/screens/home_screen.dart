import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'dashboard_screen.dart';
import 'sales_screen.dart';
import 'orders_screen.dart';
import 'planning_screen.dart';
import 'profile_screen.dart';
import 'qr_scanner_screen.dart';

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
          _NavItem(screen: const DashboardScreen(), icon: Icons.dashboard, label: 'Dashboard'),
          _NavItem(screen: const SalesScreen(), icon: Icons.point_of_sale, label: 'Ventes'),
          _NavItem(screen: const ProfileScreen(), icon: Icons.person, label: 'Profil'),
        ];
      case 'RESPONSABLE_FB':
        return [
          _NavItem(screen: const DashboardScreen(), icon: Icons.dashboard, label: 'Dashboard'),
          _NavItem(screen: const OrdersScreen(), icon: Icons.inventory_2, label: 'Commandes'),
          _NavItem(screen: const PlanningScreen(), icon: Icons.calendar_month, label: 'Planning'),
          _NavItem(screen: const ProfileScreen(), icon: Icons.person, label: 'Profil'),
        ];
      case 'RESPONSABLE_HYGIENE':
        return [
          _NavItem(screen: const DashboardScreen(), icon: Icons.dashboard, label: 'Dashboard'),
          _NavItem(screen: const QrScannerScreen(), icon: Icons.qr_code_scanner, label: 'Scanner QR'),
          _NavItem(screen: const ProfileScreen(), icon: Icons.person, label: 'Profil'),
        ];
      case 'CHEF_CUISINE':
      case 'CHEF_MAGASIN':
      case 'RESPONSABLE_ACHAT':
        return [
          _NavItem(screen: const DashboardScreen(), icon: Icons.dashboard, label: 'Dashboard'),
          _NavItem(screen: const OrdersScreen(), icon: Icons.inventory_2, label: 'Commandes'),
          _NavItem(screen: const ProfileScreen(), icon: Icons.person, label: 'Profil'),
        ];
      default:
        // Default (SUPER_ADMIN or others): all screens
        return [
          _NavItem(screen: const DashboardScreen(), icon: Icons.dashboard, label: 'Dashboard'),
          _NavItem(screen: const SalesScreen(), icon: Icons.point_of_sale, label: 'Ventes'),
          _NavItem(screen: const OrdersScreen(), icon: Icons.inventory_2, label: 'Commandes'),
          _NavItem(screen: const PlanningScreen(), icon: Icons.calendar_month, label: 'Planning'),
          _NavItem(screen: const ProfileScreen(), icon: Icons.person, label: 'Profil'),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final roleName = authProvider.user?.roleName;
    final navItems = _getNavItems(roleName);

    // Clamp index when role changes
    final safeIndex = _currentIndex < navItems.length ? _currentIndex : 0;

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: navItems.map((n) => n.screen).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: safeIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFFb22222),
        unselectedItemColor: const Color(0xFF94a3b8),
        backgroundColor: Colors.white,
        selectedFontSize: 12,
        unselectedFontSize: 11,
        items: navItems
            .map((n) => BottomNavigationBarItem(icon: Icon(n.icon), label: n.label))
            .toList(),
      ),
    );
  }
}

class _NavItem {
  final Widget screen;
  final IconData icon;
  final String label;
  const _NavItem({required this.screen, required this.icon, required this.label});
}
