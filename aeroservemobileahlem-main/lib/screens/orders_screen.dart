import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/models.dart';

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
        _orders = (list as List).map((e) => Sale.fromJson(e) is InternalOrder ? InternalOrder.fromJson(e) : InternalOrder.fromJson(e)).toList();
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
      backgroundColor: const Color(0xFFf1f5f9),
      appBar: AppBar(
        title: const Text('Commandes internes', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFFb22222),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _orders.isEmpty
                  ? ListView(children: const [SizedBox(height: 200), Center(child: Text('Aucune commande'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _orders.length,
                      itemBuilder: (_, i) => _buildOrderCard(_orders[i], isCashier),
                    ),
            ),
      floatingActionButton: isCashier
          ? null
          : FloatingActionButton(
              backgroundColor: const Color(0xFFb22222),
              onPressed: () => _showCreateDialog(),
              child: const Icon(Icons.add, color: Colors.white),
            ),
    );
  }

  Widget _buildOrderCard(InternalOrder order, bool isCashier) {
    final date = DateFormat('dd/MM/yyyy HH:mm').format(order.orderDate);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFf97316).withOpacity(0.1),
          child: const Icon(Icons.inventory_2, color: Color(0xFFf97316), size: 20),
        ),
        title: Text('Commande #${order.id}', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(date),
        trailing: _statusBadge(order.status),
        children: [
          if (order.items != null)
            ...order.items!.map((item) => ListTile(
                  dense: true,
                  title: Text(item.productName ?? 'Produit #${item.productId}'),
                  trailing: Text('Qté: ${item.quantity}'),
                )),
          if (order.notes != null && order.notes!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('Note: ${order.notes}', style: const TextStyle(color: Color(0xFF64748b), fontSize: 13)),
            ),
          // Block cashiers from seeing/interacting with order status transitions
          if (!isCashier)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (order.status.toLowerCase() == 'pending') ...[
                    OutlinedButton.icon(
                      onPressed: () => _updateStatus(order.id, 'approved'),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Approuver'),
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF16a34a)),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (order.status.toLowerCase() == 'approved')
                    OutlinedButton.icon(
                      onPressed: () => _updateStatus(order.id, 'delivered'),
                      icon: const Icon(Icons.local_shipping, size: 16),
                      label: const Text('Livrer'),
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFb22222)),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color bg;
    Color fg;
    switch (status.toLowerCase()) {
      case 'approved':
        bg = const Color(0xFFe0e7ff);
        fg = const Color(0xFF4f46e5);
        break;
      case 'delivered':
        bg = const Color(0xFFdcfce7);
        fg = const Color(0xFF16a34a);
        break;
      case 'cancelled':
        bg = const Color(0xFFfee2e2);
        fg = const Color(0xFFdc2626);
        break;
      default:
        bg = const Color(0xFFFEF9C3);
        fg = const Color(0xFFca8a04);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }

  Future<void> _updateStatus(int id, String status) async {
    try {
      await ApiService.put('/internal-orders/$id/status', {'status': status});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _showCreateDialog() {
    final notesCtrl = TextEditingController();
    final itemRows = <_OrderItemRow>[_OrderItemRow()];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Nouvelle commande', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(
                controller: notesCtrl,
                decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              ...itemRows.asMap().entries.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextField(
                            controller: e.value.productCtrl,
                            decoration: const InputDecoration(labelText: 'Produit ID', border: OutlineInputBorder(), isDense: true),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: e.value.qtyCtrl,
                            decoration: const InputDecoration(labelText: 'Quantité', border: OutlineInputBorder(), isDense: true),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                  )),
              TextButton.icon(
                onPressed: () => setModalState(() => itemRows.add(_OrderItemRow())),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Ajouter article'),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFb22222), foregroundColor: Colors.white),
                  onPressed: () => _submitOrder(notesCtrl.text, itemRows, ctx),
                  child: const Text('Enregistrer'),
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
      if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }
}

class _OrderItemRow {
  final productCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();
}
