import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/stat_card.dart';
import '../widgets/status_badge.dart';
import '../widgets/empty_state_widget.dart';
import 'profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DashboardData? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/dashboard');
      setState(() {
        _data = DashboardData.fromJson(res);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(AppIcons.notifications),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
          const SizedBox(width: AppTheme.spacingXS),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : _data == null
              ? EmptyStateWidget(
                  icon: AppIcons.error,
                  title: 'Impossible de charger le tableau de bord',
                  description: 'Vérifiez votre connexion internet ou réessayez plus tard.',
                  actionLabel: 'Réessayer',
                  onActionPressed: _load,
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.accent,
                  child: ListView(
                    padding: const EdgeInsets.all(AppTheme.spacingM),
                    children: [
                      _buildStatGrid(),
                      const SizedBox(height: AppTheme.spacingL),
                      _sectionTitle('Ventes récentes'),
                      const SizedBox(height: AppTheme.spacingXS),
                      if (_data!.recentSales.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
                          child: EmptyStateWidget(
                            icon: AppIcons.noData,
                            title: 'Aucune vente récente',
                            description: 'Les ventes d\'aujourd\'hui s\'afficheront ici.',
                          ),
                        )
                      else
                        ..._data!.recentSales.map(_buildSaleCard),
                      const SizedBox(height: AppTheme.spacingL),
                      _sectionTitle('Commandes récentes'),
                      const SizedBox(height: AppTheme.spacingXS),
                      if (_data!.recentOrders.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
                          child: EmptyStateWidget(
                            icon: AppIcons.noData,
                            title: 'Aucune commande récente',
                            description: 'Les commandes récentes s\'afficheront ici.',
                          ),
                        )
                      else
                        ..._data!.recentOrders.map(_buildOrderCard),
                      if (_data!.popularProducts.isNotEmpty) ...[
                        const SizedBox(height: AppTheme.spacingL),
                        _sectionTitle('Top Produits'),
                        const SizedBox(height: AppTheme.spacingXS),
                        ...(_data!.popularProducts).take(5).map(_buildProductCard),
                      ],
                      if (_data!.salesByPdv.isNotEmpty) ...[
                        const SizedBox(height: AppTheme.spacingL),
                        _sectionTitle('Performance PDV'),
                        const SizedBox(height: AppTheme.spacingXS),
                        ...(_data!.salesByPdv).map(_buildPdvCard),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildStatGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: AppTheme.spacingS,
      crossAxisSpacing: AppTheme.spacingS,
      childAspectRatio: 1.2,
      children: [
        StatCard(
          label: 'Ventes aujourd\'hui',
          value: '${_data!.todaySales}',
          icon: AppIcons.sales,
          color: AppTheme.accent,
        ),
        StatCard(
          label: 'Revenus',
          value: '${_data!.todayRevenue.toStringAsFixed(0)} DA',
          icon: Icons.attach_money_rounded,
          color: AppTheme.primary,
        ),
        StatCard(
          label: 'Commandes',
          value: '${_data!.pendingOrders}',
          icon: AppIcons.orders,
          color: AppTheme.warning,
        ),
        StatCard(
          label: 'Utilisateurs',
          value: '${_data!.totalUsers}',
          icon: AppIcons.profile,
          color: AppTheme.info,
        ),
      ],
    );
  }

  Widget _sectionTitle(String t) {
    return Text(
      t,
      style: GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppTheme.textPrimary,
        letterSpacing: -0.1,
      ),
    );
  }

  Widget _buildSaleCard(Sale sale) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingM,
          vertical: AppTheme.spacingXXS,
        ),
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withValues(alpha: 0.08),
          child: const Icon(AppIcons.sales, color: AppTheme.accent, size: 18),
        ),
        title: Text(
          'Vente #${sale.id}',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
        ),
        subtitle: Text(
          '${sale.totalAmount.toStringAsFixed(0)} DA · ${sale.paymentMethod}',
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
        ),
        trailing: StatusBadge(status: sale.status),
      ),
    );
  }

  Widget _buildOrderCard(InternalOrder order) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingM,
          vertical: AppTheme.spacingXXS,
        ),
        leading: CircleAvatar(
          backgroundColor: AppTheme.warning.withValues(alpha: 0.08),
          child: const Icon(AppIcons.orders, color: AppTheme.warning, size: 18),
        ),
        title: Text(
          'Commande #${order.id}',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
        ),
        subtitle: Text(
          order.notes ?? 'Aucune note',
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
        ),
        trailing: StatusBadge(status: order.status),
      ),
    );
  }

  Widget _buildProductCard(dynamic product) {
    final name = product['product']?['name'] ?? 'Produit';
    final totalSold = product['total_sold'] ?? 0;
    final type = product['product']?['type'] ?? '';
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        leading: CircleAvatar(
          backgroundColor: AppTheme.primary.withValues(alpha: 0.08),
          child: const Icon(Icons.star_rounded, color: AppTheme.primary, size: 16),
        ),
        title: Text(
          name,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
        ),
        subtitle: Text(
          type,
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
        ),
        trailing: Text(
          '$totalSold pcs',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppTheme.accent, fontSize: 12),
        ),
      ),
    );
  }

  Widget _buildPdvCard(dynamic pdv) {
    final pdvName = pdv['point_de_vente']?['name'] ?? 'PDV';
    final total = (pdv['total'] ?? 0).toDouble();
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withValues(alpha: 0.08),
          child: const Icon(Icons.store_rounded, color: AppTheme.accent, size: 16),
        ),
        title: Text(
          pdvName,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
        ),
        trailing: Text(
          '${total.toStringAsFixed(0)} DA',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppTheme.accent, fontSize: 12),
        ),
      ),
    );
  }
}
