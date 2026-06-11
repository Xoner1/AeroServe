import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../widgets/empty_state_widget.dart';

class MenuPlanningScreen extends StatefulWidget {
  const MenuPlanningScreen({super.key});

  @override
  State<MenuPlanningScreen> createState() => _MenuPlanningScreenState();
}

class _MenuPlanningScreenState extends State<MenuPlanningScreen> {
  List<dynamic> _menus = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/menus');
      final data = res['data'] ?? res;
      setState(() {
        _menus = data is List ? data : [];
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
        title: const Text('Menu Hebdomadaire'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : _menus.isEmpty
              ? const EmptyStateWidget(
                  icon: AppIcons.noData,
                  title: 'Aucun menu',
                  description: 'Les menus hebdomadaires s\'afficheront ici.',
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.accent,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppTheme.spacingM),
                    itemCount: _menus.length,
                    itemBuilder: (ctx, i) => _buildMenuCard(_menus[i]),
                  ),
                ),
    );
  }

  Widget _buildMenuCard(dynamic menu) {
    final items = menu['items'] as List<dynamic>? ?? [];
    final weekStart = menu['week_start'] ?? '';
    final weekEnd = menu['week_end'] ?? '';
    final name = menu['name'] ?? 'Menu';

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        childrenPadding: const EdgeInsets.fromLTRB(AppTheme.spacingM, 0, AppTheme.spacingM, AppTheme.spacingM),
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
          child: const Icon(Icons.restaurant_menu_rounded, color: AppTheme.accent, size: 18),
        ),
        title: Text(
          name,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
        ),
        subtitle: Text(
          '$weekStart — $weekEnd',
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11.5),
        ),
        children: items.isEmpty
            ? [
                Padding(
                  padding: const EdgeInsets.all(AppTheme.spacingS),
                  child: Text(
                    'Aucun article dans ce menu.',
                    style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                )
              ]
            : items.map<Widget>((item) {
                final product = item['product'];
                final productName = product?['name'] ?? 'Produit #${item['product_id']}';
                final day = item['day_of_week'] ?? '';
                final meal = item['meal_type'] ?? '';
                return ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.08),
                    child: Text(
                      day.isNotEmpty ? day.substring(0, 2).toUpperCase() : '??',
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.accent),
                    ),
                  ),
                  title: Text(
                    productName,
                    style: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 12.5),
                  ),
                  subtitle: Text(
                    '$day · $meal',
                    style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                );
              }).toList(),
      ),
    );
  }
}
