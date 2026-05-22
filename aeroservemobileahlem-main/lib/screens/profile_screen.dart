import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<AppNotification> _notifications = [];
  bool _loadingNotif = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _loadingNotif = true);
    try {
      final res = await ApiService.get('/notifications');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _notifications = (list as List).map((e) => AppNotification.fromJson(e)).toList();
        _loadingNotif = false;
      });
    } catch (_) {
      setState(() => _loadingNotif = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: const Color(0xFFf1f5f9),
      appBar: AppBar(
        title: const Text('Profil', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1a56db),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: const Color(0xFF1a56db),
                  child: Text(
                    user?.initials ?? '?',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.fullName ?? 'Utilisateur',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF0f172a)),
                ),
                const SizedBox(height: 4),
                Text(user?.email ?? '', style: const TextStyle(color: Color(0xFF64748b))),
                if (user?.roleName != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1a56db).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      user!.roleName!,
                      style: const TextStyle(color: Color(0xFF1a56db), fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Notifications section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Notifications', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF0f172a))),
              if (_notifications.isNotEmpty)
                Text('${_notifications.length}', style: const TextStyle(color: Color(0xFF64748b))),
            ],
          ),
          const SizedBox(height: 10),
          if (_loadingNotif)
            const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()))
          else if (_notifications.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: const Center(child: Text('Aucune notification', style: TextStyle(color: Color(0xFF94a3b8)))),
            )
          else
            ..._notifications.take(10).map(_buildNotificationCard),
          const SizedBox(height: 24),
          // Logout button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () async {
                await auth.logout();
              },
              icon: const Icon(Icons.logout),
              label: const Text('Se déconnecter', style: TextStyle(fontWeight: FontWeight.w600)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFdc2626),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification n) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: n.readAt == null ? const Color(0xFF1a56db).withOpacity(0.1) : const Color(0xFFf1f5f9),
          child: Icon(
            n.readAt == null ? Icons.notifications_active : Icons.notifications_none,
            color: n.readAt == null ? const Color(0xFF1a56db) : const Color(0xFF94a3b8),
            size: 18,
          ),
        ),
        title: Text(n.title, style: TextStyle(fontWeight: n.readAt == null ? FontWeight.w600 : FontWeight.w400, fontSize: 14)),
        subtitle: Text(n.body, style: const TextStyle(fontSize: 12, color: Color(0xFF64748b)), maxLines: 2),
        onTap: () async {
          if (n.readAt == null) {
            try {
              await ApiService.put('/notifications/${n.id}/read', {});
              _loadNotifications();
            } catch (_) {}
          }
        },
      ),
    );
  }
}
