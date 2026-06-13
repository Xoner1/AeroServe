import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../widgets/empty_state_widget.dart';
import 'hygiene_check_screen.dart';

class HygieneProductsScreen extends StatefulWidget {
  const HygieneProductsScreen({super.key});

  @override
  State<HygieneProductsScreen> createState() => _HygieneProductsScreenState();
}

class _HygieneProductsScreenState extends State<HygieneProductsScreen> {
  List<dynamic> _products = [];
  List<dynamic> _filteredProducts = [];
  bool _loading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(_filterList);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/products');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _products = list;
        _filteredProducts = list;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _filterList() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredProducts = _products;
      } else {
        _filteredProducts = _products.where((p) {
          final name = (p['name'] ?? '').toString().toLowerCase();
          final type = (p['type'] ?? '').toString().toLowerCase();
          return name.contains(query) || type.contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Contrôle Produits'),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(AppTheme.spacingM),
            child: TextField(
              controller: _searchController,
              style: GoogleFonts.inter(fontSize: 13.0, color: AppTheme.textPrimary),
              decoration: InputDecoration(
                hintText: 'Rechercher un plat ou aliment...',
                hintStyle: GoogleFonts.inter(color: AppTheme.textSecondary.withValues(alpha: 0.6), fontSize: 13.0),
                prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppTheme.textSecondary),
                filled: true,
                fillColor: AppTheme.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusM),
                  borderSide: const BorderSide(color: AppTheme.divider, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusM),
                  borderSide: const BorderSide(color: AppTheme.divider, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusM),
                  borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
                ),
              ),
            ),
          ),
          
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
                : RefreshIndicator(
                    onRefresh: _load,
                    color: AppTheme.accent,
                    child: _filteredProducts.isEmpty
                        ? EmptyStateWidget(
                            icon: AppIcons.success,
                            title: 'Aucun produit',
                            description: _searchController.text.isNotEmpty
                                ? 'Aucun produit ne correspond à votre recherche.'
                                : 'Aucun produit approuvé de type FOOD ou PLAT n\'est disponible.',
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM),
                            itemCount: _filteredProducts.length,
                            itemBuilder: (context, index) {
                              return _buildProductCard(_filteredProducts[index]);
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(dynamic p) {
    final name = p['name'] ?? 'Produit';
    final type = (p['type'] ?? 'food').toString().toUpperCase();
    final allergens = p['allergens'] is List 
        ? (p['allergens'] as List).join(', ') 
        : (p['allergens'] ?? 'Aucun');
    final expirationDate = p['expiration_date'] ?? 'Non spécifiée';
    
    // Determine hygiene status from the latest report (sorted by created_at desc)
    String status = 'A inspecter';
    Color statusColor = AppTheme.textSecondary;
    if (p['hygiene_reports'] is List && (p['hygiene_reports'] as List).isNotEmpty) {
      final reports = List.from(p['hygiene_reports']);
      reports.sort((a, b) => (b['created_at'] ?? '').compareTo(a['created_at'] ?? ''));
      final latest = reports.first;
      final st = latest['status'] ?? 'en_cours';
      if (st == 'conforme') {
        status = 'Conforme';
        statusColor = AppTheme.success;
      } else if (st == 'non_conforme') {
        status = 'Non conforme';
        statusColor = AppTheme.error;
      } else {
        status = 'En cours';
        statusColor = Colors.orange;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: const BorderSide(color: AppTheme.divider, width: 1),
      ),
      color: AppTheme.card,
      child: ListTile(
        contentPadding: const EdgeInsets.all(AppTheme.spacingM),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                name,
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  fontSize: 14.5,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppTheme.radiusS),
              ),
              child: Text(
                status,
                style: GoogleFonts.inter(
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 6),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  ),
                  child: Text(
                    type,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accent,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'DLC: $expirationDate',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, size: 13, color: AppTheme.textSecondary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Allergènes: $allergens',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      color: AppTheme.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondary),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => HygieneCheckScreen(productId: p['id']),
            ),
          );
          _load(); // Reload to refresh the hygiene status badge
        },
      ),
    );
  }
}
