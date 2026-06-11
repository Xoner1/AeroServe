import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/status_badge.dart';
import '../widgets/empty_state_widget.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<InternalOrder> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/internal-orders');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _orders = (list as List).map((e) => InternalOrder.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userRole = context.read<AuthProvider>().user?.roleName?.toUpperCase();
    final isCashier = userRole == 'CAISSIER';

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Commandes internes'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppTheme.accent,
              child: _orders.isEmpty
                  ? EmptyStateWidget(
                      icon: AppIcons.noData,
                      title: 'Aucune commande',
                      description: 'Créez une nouvelle commande en appuyant sur le bouton ci-dessous.',
                      actionLabel: isCashier ? null : 'Créer une commande',
                      onActionPressed: isCashier ? null : _showCreateDialog,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppTheme.spacingM),
                      itemCount: _orders.length,
                      itemBuilder: (_, i) => _buildOrderCard(_orders[i], isCashier),
                    ),
            ),
      floatingActionButton: isCashier
          ? null
          : FloatingActionButton(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
              onPressed: () => _showCreateDialog(),
              child: const Icon(AppIcons.add),
            ),
    );
  }

  Widget _buildOrderCard(InternalOrder order, bool isCashier) {
    final date = DateFormat('dd/MM/yyyy HH:mm').format(order.orderDate);
    final userRole = context.read<AuthProvider>().user?.roleName?.toUpperCase();
    final canUpdateStatus = userRole == 'SUPER_ADMIN' || userRole == 'CHEF_CUISINE' || userRole == 'CHEF_MAGASIN';
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusM)),
          ),
          collapsedShape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusM)),
          ),
          tilePadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
          leading: CircleAvatar(
            backgroundColor: AppTheme.warning.withValues(alpha: 0.08),
            child: const Icon(AppIcons.orders, color: AppTheme.warning, size: 18),
          ),
          title: Text(
            'Commande #${order.id}',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
          ),
          subtitle: Text(
            date,
            style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11.5),
          ),
          trailing: StatusBadge(status: order.status),
          children: [
            const Divider(color: AppTheme.divider, height: 1),
            if (order.items != null)
              ...order.items!.map((item) => ListTile(
                    dense: true,
                    title: Text(
                      item.productName ?? 'Produit #${item.productId}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w500, color: AppTheme.textPrimary, fontSize: 13),
                    ),
                    trailing: Text(
                      'Qté: ${item.quantity}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textSecondary, fontSize: 12),
                    ),
                  )),
            if (order.notes != null && order.notes!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(
                  left: AppTheme.spacingM,
                  right: AppTheme.spacingM,
                  bottom: AppTheme.spacingS,
                  top: AppTheme.spacingXS,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(AppIcons.info, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: AppTheme.spacingXS),
                    Expanded(
                      child: Text(
                        'Note: ${order.notes}',
                        style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            if (canUpdateStatus)
              Padding(
                padding: const EdgeInsets.only(
                  right: AppTheme.spacingM,
                  bottom: AppTheme.spacingM,
                  top: AppTheme.spacingXS,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (order.status.toLowerCase() == 'pending') ...[
                      OutlinedButton.icon(
                        onPressed: () => _updateStatus(order.id, 'approved'),
                        icon: const Icon(AppIcons.check, size: 14),
                        label: const Text('Approuver'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.success,
                          side: const BorderSide(color: AppTheme.success, width: 1),
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXXS),
                        ),
                      ),
                      const SizedBox(width: AppTheme.spacingS),
                    ],
                    if (order.status.toLowerCase() == 'approved')
                      OutlinedButton.icon(
                        onPressed: () => _updateStatus(order.id, 'delivered'),
                        icon: const Icon(AppIcons.tracking, size: 14),
                        label: const Text('Livrer'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.accent,
                          side: const BorderSide(color: AppTheme.accent, width: 1),
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXXS),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(int id, String status) async {
    try {
      await ApiService.put('/internal-orders/$id/status', {'status': status});
      _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text(e.message, style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }

  void _showCreateDialog() {
    final notesCtrl = TextEditingController();
    final itemRows = <_OrderItemRow>[_OrderItemRow()];

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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Nouvelle commande',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                  IconButton(
                    icon: const Icon(AppIcons.cancel, color: AppTheme.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacingM),
              TextField(
                controller: notesCtrl,
                style: GoogleFonts.inter(fontSize: 13.5),
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  hintText: 'Précisez les consignes de livraison...',
                  contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: AppTheme.spacingM),
              Text(
                'Articles',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: AppTheme.spacingXXS),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(ctx).size.height * 0.3,
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: itemRows.length,
                  itemBuilder: (context, idx) {
                    final row = itemRows[idx];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppTheme.spacingS),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: row.productCtrl,
                              style: GoogleFonts.inter(fontSize: 13.5),
                              decoration: const InputDecoration(
                                labelText: 'Produit ID',
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: AppTheme.spacingS),
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: row.qtyCtrl,
                              style: GoogleFonts.inter(fontSize: 13.5),
                              decoration: const InputDecoration(
                                labelText: 'Quantité',
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          if (itemRows.length > 1) ...[
                            const SizedBox(width: AppTheme.spacingXS),
                            IconButton(
                              icon: const Icon(AppIcons.delete, color: AppTheme.error),
                              onPressed: () => setModalState(() => itemRows.removeAt(idx)),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ),
              TextButton.icon(
                onPressed: () => setModalState(() => itemRows.add(_OrderItemRow())),
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
                  onPressed: () => _submitOrder(notesCtrl.text, itemRows, ctx),
                  child: Text(
                    'Enregistrer la commande',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitOrder(String notes, List<_OrderItemRow> items, BuildContext ctx) async {
    final orderItems = items
        .where((r) => r.productCtrl.text.isNotEmpty)
        .map((r) => {
              'product_id': int.tryParse(r.productCtrl.text) ?? 0,
              'quantity': int.tryParse(r.qtyCtrl.text) ?? 1,
            })
        .toList();

    if (orderItems.isEmpty) return;

    try {
      await ApiService.post('/internal-orders', {
        'notes': notes,
        'items': orderItems,
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

class _OrderItemRow {
  final productCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();
}
