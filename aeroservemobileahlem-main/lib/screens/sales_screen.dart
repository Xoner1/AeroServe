import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/status_badge.dart';
import '../widgets/empty_state_widget.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  List<Sale> _sales = [];
  bool _loading = true;
  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    _load();
    _loadProducts();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/sales');
      final data = res['data'] ?? res;
      setState(() {
        _sales = (data as List).map((e) => Sale.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadProducts() async {
    try {
      final res = await ApiService.get('/products');
      final data = res['data'] ?? res;
      setState(() {
        _products = (data as List).map((e) => Product.fromJson(e)).toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Ventes'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : _sales.isEmpty
              ? const EmptyStateWidget(
                  icon: AppIcons.noData,
                  title: 'Aucune vente',
                  description: 'Les ventes enregistrées s\'afficheront ici.',
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.accent,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppTheme.spacingM),
                    itemCount: _sales.length,
                    itemBuilder: (ctx, i) => _buildSaleCard(_sales[i]),
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(),
        backgroundColor: AppTheme.accent,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
        child: const Icon(AppIcons.add, size: 22),
      ),
    );
  }

  Widget _buildSaleCard(Sale sale) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        childrenPadding: const EdgeInsets.fromLTRB(AppTheme.spacingM, 0, AppTheme.spacingM, AppTheme.spacingM),
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withValues(alpha: 0.08),
          child: const Icon(AppIcons.sales, color: AppTheme.accent, size: 18),
        ),
        title: Text(
          'Vente #${sale.id}',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
        ),
        subtitle: Text(
          '${sale.totalAmount.toStringAsFixed(0)} DA · ${DateFormat('dd/MM HH:mm').format(sale.saleDate)}',
          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11.5),
        ),
        trailing: StatusBadge(status: sale.status),
        children: sale.items?.map((item) => ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: Text(
            item.productName ?? 'Produit #${item.productId}',
            style: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 12.5),
          ),
          subtitle: Text(
            '${item.quantity} x ${item.unitPrice.toStringAsFixed(0)} DA',
            style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
          ),
          trailing: Text(
            '${(item.quantity * item.unitPrice).toStringAsFixed(0)} DA',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.accent, fontSize: 12),
          ),
        )).toList() ?? [],
      ),
    );
  }

  void _showCreateDialog() {
    final itemRows = <_ItemRow>[_ItemRow()];
    String paymentMethod = 'cash';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusL)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: AppTheme.spacingL,
            right: AppTheme.spacingL,
            top: AppTheme.spacingL,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppTheme.spacingL,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Nouvelle vente',
                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    ),
                    IconButton(
                      icon: const Icon(AppIcons.cancel, color: AppTheme.textSecondary),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.spacingM),
                DropdownButtonFormField<String>(
                  initialValue: paymentMethod,
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('Espèces')),
                    DropdownMenuItem(value: 'card', child: Text('Carte')),
                  ],
                  onChanged: (v) => setModalState(() => paymentMethod = v!),
                  decoration: const InputDecoration(
                    labelText: 'Mode de paiement',
                    contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                  ),
                ),
                const SizedBox(height: AppTheme.spacingM),
                Text(
                  'Articles',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: AppTheme.spacingXXS),
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.4),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: itemRows.length,
                    itemBuilder: (context, idx) {
                      final row = itemRows[idx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppTheme.spacingS),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextFormField(
                              controller: row.productCtrl,
                              style: GoogleFonts.inter(fontSize: 13.5),
                              decoration: InputDecoration(
                                labelText: 'Rechercher un produit...',
                                isDense: true,
                                suffixIcon: const Icon(Icons.search, size: 18),
                                contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                              ),
                              onTap: () => _showProductPicker(ctx, setModalState, row, itemRows),
                              readOnly: true,
                            ),
                            if (row.selectedProductName != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${row.selectedProductName!} — ${row.selectedProductPrice?.toStringAsFixed(0) ?? '?'} DA',
                                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.accent, fontWeight: FontWeight.w500),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: row.qtyCtrl,
                                    style: GoogleFonts.inter(fontSize: 13.5),
                                    decoration: const InputDecoration(
                                      labelText: 'Qté',
                                      isDense: true,
                                      contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                                    ),
                                    keyboardType: TextInputType.number,
                                  ),
                                ),
                                const SizedBox(width: AppTheme.spacingS),
                                Expanded(
                                  child: TextField(
                                    controller: row.priceCtrl,
                                    style: GoogleFonts.inter(fontSize: 13.5),
                                    decoration: const InputDecoration(
                                      labelText: 'Prix (DA)',
                                      isDense: true,
                                      contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                                    ),
                                    keyboardType: TextInputType.number,
                                  ),
                                ),
                                if (itemRows.length > 1) ...[
                                  const SizedBox(width: AppTheme.spacingXS),
                                  IconButton(
                                    icon: const Icon(AppIcons.delete, color: AppTheme.error, size: 18),
                                    onPressed: () => setModalState(() => itemRows.removeAt(idx)),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                TextButton.icon(
                  onPressed: () => setModalState(() => itemRows.add(_ItemRow())),
                  icon: const Icon(AppIcons.add, size: 16),
                  label: const Text('Ajouter article'),
                  style: TextButton.styleFrom(foregroundColor: AppTheme.accent),
                ),
                const SizedBox(height: AppTheme.spacingM),
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                    ),
                    onPressed: () => _submitSale(paymentMethod, itemRows, ctx),
                    child: Text(
                      'Enregistrer la vente',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showProductPicker(BuildContext ctx, StateSetter setModalState, _ItemRow row, List<_ItemRow> itemRows) {
    String searchQuery = '';
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusL)),
      ),
      builder: (pickerCtx) => StatefulBuilder(
        builder: (pickerCtx, setPickerState) {
          final filtered = _products.where((p) =>
            p.name.toLowerCase().contains(searchQuery.toLowerCase())
          ).toList();
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(pickerCtx).viewInsets.bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppTheme.spacingM),
                  child: TextField(
                    autofocus: true,
                    style: GoogleFonts.inter(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                    ),
                    onChanged: (v) => setPickerState(() => searchQuery = v),
                  ),
                ),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: filtered.length,
                    itemBuilder: (pickerCtx, i) {
                      final p = filtered[i];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
                          child: Text(
                            p.name.isNotEmpty ? p.name[0].toUpperCase() : '?',
                            style: GoogleFonts.inter(color: AppTheme.accent, fontWeight: FontWeight.w600),
                          ),
                        ),
                        title: Text(p.name, style: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 13)),
                        subtitle: Text(
                          '${p.type} · ${p.price?.toStringAsFixed(0) ?? '?'} DA',
                          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
                        ),
                        onTap: () {
                          Navigator.pop(pickerCtx);
                          setModalState(() {
                            row.productCtrl.text = p.id.toString();
                            row.selectedProductName = p.name;
                            row.selectedProductPrice = p.price;
                            row.priceCtrl.text = p.price?.toStringAsFixed(0) ?? '';
                          });
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitSale(String paymentMethod, List<_ItemRow> items, BuildContext ctx) async {
    final saleItems = items
        .where((r) => r.productCtrl.text.isNotEmpty)
        .map((r) => {
              'product_id': int.tryParse(r.productCtrl.text) ?? 0,
              'quantity': int.tryParse(r.qtyCtrl.text) ?? 1,
              'unit_price': double.tryParse(r.priceCtrl.text) ?? 0,
            })
        .toList();

    if (saleItems.isEmpty) return;

    try {
      await ApiService.post('/sales', {
        'payment_method': paymentMethod,
        'items': saleItems,
      });
      if (ctx.mounted) Navigator.pop(ctx);
      _load();
    } on ApiException catch (e) {
      if (ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text(e.message, style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }
}

class _ItemRow {
  final productCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  String? selectedProductName;
  double? selectedProductPrice;
}
