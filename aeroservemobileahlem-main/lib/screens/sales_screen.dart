import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  List<Sale> _sales = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/sales');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _sales = (list as List).map((e) => Sale.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf1f5f9),
      appBar: AppBar(
        title: const Text('Ventes', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1a56db),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _sales.isEmpty
                  ? ListView(children: const [SizedBox(height: 200), Center(child: Text('Aucune vente'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _sales.length,
                      itemBuilder: (_, i) => _buildSaleCard(_sales[i]),
                    ),
            ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF1a56db),
        onPressed: () => _showCreateDialog(),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildSaleCard(Sale sale) {
    final date = DateFormat('dd/MM/yyyy HH:mm').format(sale.saleDate);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF1a56db).withOpacity(0.1),
          child: const Icon(Icons.receipt_long, color: Color(0xFF1a56db), size: 20),
        ),
        title: Text('Vente #${sale.id}', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('$date · ${sale.totalAmount.toStringAsFixed(0)} DA'),
        trailing: _paymentBadge(sale.paymentMethod),
        children: [
          if (sale.items != null)
            ...sale.items!.map((item) => ListTile(
                  dense: true,
                  title: Text(item.productName ?? 'Produit #${item.productId}'),
                  trailing: Text('${item.quantity} x ${item.unitPrice.toStringAsFixed(0)} DA'),
                )),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total: ${sale.totalAmount.toStringAsFixed(0)} DA',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1a56db))),
                _statusChip(sale.status),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentBadge(String method) {
    final isCard = method.toLowerCase().contains('card') || method.toLowerCase().contains('carte');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isCard ? const Color(0xFFe0e7ff) : const Color(0xFFdcfce7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        method,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isCard ? const Color(0xFF4f46e5) : const Color(0xFF16a34a),
        ),
      ),
    );
  }

  Widget _statusChip(String status) {
    Color bg;
    Color fg;
    switch (status.toLowerCase()) {
      case 'completed':
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

  void _showCreateDialog() {
    final itemRows = <_ItemRow>[_ItemRow()];
    String paymentMethod = 'cash';

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
              const Text('Nouvelle vente', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: paymentMethod,
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Espèces')),
                  DropdownMenuItem(value: 'card', child: Text('Carte')),
                ],
                onChanged: (v) => setModalState(() => paymentMethod = v!),
                decoration: const InputDecoration(labelText: 'Mode de paiement', border: OutlineInputBorder()),
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
                            decoration: const InputDecoration(labelText: 'Qté', border: OutlineInputBorder(), isDense: true),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: e.value.priceCtrl,
                            decoration: const InputDecoration(labelText: 'Prix', border: OutlineInputBorder(), isDense: true),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                  )),
              TextButton.icon(
                onPressed: () => setModalState(() => itemRows.add(_ItemRow())),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Ajouter article'),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1a56db), foregroundColor: Colors.white),
                  onPressed: () => _submitSale(paymentMethod, itemRows, ctx),
                  child: const Text('Enregistrer'),
                ),
              ),
            ],
          ),
        ),
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
        ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _ItemRow {
  final productCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
}
