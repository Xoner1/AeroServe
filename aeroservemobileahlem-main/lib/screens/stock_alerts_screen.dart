import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../widgets/empty_state_widget.dart';

class StockAlertsScreen extends StatefulWidget {
  const StockAlertsScreen({super.key});

  @override
  State<StockAlertsScreen> createState() => _StockAlertsScreenState();
}

class _StockAlertsScreenState extends State<StockAlertsScreen> {
  List<dynamic> _lowStock = [];
  List<dynamic> _expired = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final stockRes = await ApiService.get('/stock-movements');
      final data = stockRes['data'] ?? stockRes;
      setState(() {
        _lowStock = data is List ? data.where((m) => (m['quantity'] ?? 0) < 15).toList() : [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
    try {
      final prodRes = await ApiService.get('/products');
      final pData = prodRes['data'] ?? prodRes;
      final now = DateTime.now();
      setState(() {
        _expired = pData is List
            ? pData.where((p) {
                final exp = DateTime.tryParse(p['expiration_date'] ?? '');
                return exp != null && exp.isBefore(now);
              }).toList()
            : [];
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Alertes Stock'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppTheme.accent,
              child: ListView(
                padding: const EdgeInsets.all(AppTheme.spacingM),
                children: [
                  _sectionTitle('Stock Critique', Icons.warning_amber, AppTheme.error),
                  const SizedBox(height: AppTheme.spacingXS),
                  if (_lowStock.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
                      child: EmptyStateWidget(
                        icon: AppIcons.success,
                        title: 'Stock suffisant',
                        description: 'Aucun produit en seuil critique.',
                      ),
                    )
                  else
                    ..._lowStock.map(_buildLowStockCard),
                  const SizedBox(height: AppTheme.spacingL),
                  _sectionTitle('Produits Expirés', Icons.event_busy, AppTheme.warning),
                  const SizedBox(height: AppTheme.spacingXS),
                  if (_expired.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
                      child: EmptyStateWidget(
                        icon: AppIcons.success,
                        title: 'Aucune expiration',
                        description: 'Aucun produit expiré détecté.',
                      ),
                    )
                  else
                    ..._expired.map(_buildExpiredCard),
                ],
              ),
            ),
    );
  }

  Widget _sectionTitle(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: AppTheme.spacingS),
        Text(
          title,
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
      ],
    );
  }

  Widget _buildLowStockCard(dynamic item) {
    final productName = item['product']?['name'] ?? 'Produit #${item['product_id']}';
    final qty = item['quantity'] ?? 0;
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: BorderSide(color: AppTheme.error.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        leading: CircleAvatar(
          backgroundColor: AppTheme.error.withValues(alpha: 0.1),
          child: const Icon(Icons.warning_amber, color: AppTheme.error, size: 16),
        ),
        title: Text(productName, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
        trailing: Text(
          '$qty unités',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: AppTheme.error, fontSize: 12),
        ),
      ),
    );
  }

  Widget _buildExpiredCard(dynamic product) {
    final name = product['name'] ?? 'Produit';
    final expDate = product['expiration_date'] ?? '';
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: BorderSide(color: AppTheme.warning.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        leading: CircleAvatar(
          backgroundColor: AppTheme.warning.withValues(alpha: 0.1),
          child: const Icon(Icons.event_busy, color: AppTheme.warning, size: 16),
        ),
        title: Text(name, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
        subtitle: Text(
          'Expiré le $expDate',
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
        ),
      ),
    );
  }
}
