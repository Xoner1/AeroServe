import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class PlanningScreen extends StatefulWidget {
  const PlanningScreen({super.key});

  @override
  State<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends State<PlanningScreen> {
  List<Planning> _plannings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/plannings');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _plannings = (list as List).map((e) => Planning.fromJson(e)).toList();
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
        title: const Text('Planning', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1a56db),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _plannings.isEmpty
                  ? ListView(children: const [SizedBox(height: 200), Center(child: Text('Aucun planning'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _plannings.length,
                      itemBuilder: (_, i) => _buildPlanningCard(_plannings[i]),
                    ),
            ),
    );
  }

  Widget _buildPlanningCard(Planning p) {
    final date = DateFormat('EEEE dd/MM/yyyy', 'fr_FR').format(p.date);
    final isDayOff = p.isDayOff;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: isDayOff ? const Color(0xFFFEF9C3) : Colors.white,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: isDayOff ? const Color(0xFFfbbf24).withOpacity(0.2) : const Color(0xFF1a56db).withOpacity(0.1),
          child: Icon(
            isDayOff ? Icons.beach_access : Icons.schedule,
            color: isDayOff ? const Color(0xFFd97706) : const Color(0xFF1a56db),
            size: 20,
          ),
        ),
        title: Text(
          p.userName ?? 'Utilisateur #${p.userId}',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(date, style: const TextStyle(fontSize: 13)),
            if (!isDayOff) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.login, size: 14, color: Color(0xFF16a34a)),
                  const SizedBox(width: 4),
                  Text(p.shiftStart ?? '-', style: const TextStyle(fontSize: 13)),
                  const SizedBox(width: 12),
                  const Icon(Icons.logout, size: 14, color: Color(0xFFdc2626)),
                  const SizedBox(width: 4),
                  Text(p.shiftEnd ?? '-', style: const TextStyle(fontSize: 13)),
                ],
              ),
            ],
          ],
        ),
        trailing: isDayOff
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: const Color(0xFFfbbf24), borderRadius: BorderRadius.circular(8)),
                child: const Text('Repos', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              )
            : null,
      ),
    );
  }
}
