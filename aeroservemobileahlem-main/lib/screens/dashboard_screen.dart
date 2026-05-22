import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/models.dart';

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
      backgroundColor: const Color(0xFFf1f5f9),
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1a56db),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _data == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Erreur de chargement'),
                      const SizedBox(height: 8),
                      ElevatedButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildStatGrid(),
                      const SizedBox(height: 20),
                      _sectionTitle('Ventes récentes'),
                      const SizedBox(height: 10),
                      ..._data!.recentSales.map(_buildSaleCard),
                      const SizedBox(height: 20),
                      _sectionTitle('Commandes récentes'),
                      const SizedBox(height: 10),
                      ..._data!.recentOrders.map(_buildOrderCard),
                    ],
                  ),
                ),
    );
  }

  Widget _buildStatGrid() {
    final stats = [
      _StatItem('Ventes aujourd\'hui', '${_data!.todaySales}', Icons.point_of_sale, const Color(0xFF1a56db)),
      _StatItem('Revenus', '${_data!.todayRevenue.toStringAsFixed(0)} DA', Icons.attach_money, const Color(0xFF059669)),
      _StatItem('Commandes', '${_data!.pendingOrders}', Icons.inventory_2, const Color(0xFFf97316)),
      _StatItem('Utilisateurs', '${_data!.totalUsers}', Icons.people, const Color(0xFF7c3aed)),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: stats.map((s) => _buildStatCard(s)).toList(),
    );
  }

  Widget _buildStatCard(_StatItem s) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(s.icon, color: s.color, size: 24),
          const SizedBox(height: 8),
          Text(s.value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: s.color)),
          const SizedBox(height: 2),
          Text(s.label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748b))),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) {
    return Text(t, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF0f172a)));
  }

  Widget _buildSaleCard(Sale sale) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF1a56db).withOpacity(0.1),
          child: const Icon(Icons.receipt_long, color: Color(0xFF1a56db), size: 20),
        ),
        title: Text('Vente #${sale.id}', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${sale.totalAmount.toStringAsFixed(0)} DA · ${sale.paymentMethod}'),
        trailing: _statusBadge(sale.status),
      ),
    );
  }

  Widget _buildOrderCard(InternalOrder order) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFf97316).withOpacity(0.1),
          child: const Icon(Icons.inventory_2, color: Color(0xFFf97316), size: 20),
        ),
        title: Text('Commande #${order.id}', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(order.notes ?? 'Aucune note'),
        trailing: _statusBadge(order.status),
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color bg;
    Color fg;
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        bg = const Color(0xFFdcfce7);
        fg = const Color(0xFF16a34a);
        break;
      case 'pending':
        bg = const Color(0xFFfef9c3);
        fg = const Color(0xFFca8a04);
        break;
      case 'cancelled':
        bg = const Color(0xFFfee2e2);
        fg = const Color(0xFFdc2626);
        break;
      default:
        bg = const Color(0xFFe0e7ff);
        fg = const Color(0xFF4f46e5);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  _StatItem(this.label, this.value, this.icon, this.color);
}
