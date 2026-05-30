import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
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
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: Text(
          'Profil', 
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 18.5),
        ),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppTheme.spacingM),
        children: [
          // User card
          Container(
            padding: const EdgeInsets.all(AppTheme.spacingL),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusM),
              border: Border.all(color: AppTheme.divider, width: 1.0),
              boxShadow: AppTheme.softShadow,
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppTheme.primary,
                  backgroundImage: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                      ? NetworkImage(user.avatarUrl!)
                      : null,
                  child: (user?.avatarUrl == null || user!.avatarUrl!.isEmpty)
                      ? Text(
                          user?.initials ?? '?',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: AppTheme.spacingM),
                Text(
                  user?.fullName ?? 'Utilisateur',
                  style: GoogleFonts.inter(
                    fontSize: 19, 
                    fontWeight: FontWeight.w700, 
                    color: AppTheme.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '', 
                  style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13.5),
                ),
                if (user?.roleName != null) ...[
                  const SizedBox(height: AppTheme.spacingS),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                    child: Text(
                      user!.roleName!.toUpperCase(),
                      style: GoogleFonts.inter(
                        color: AppTheme.accent, 
                        fontWeight: FontWeight.w600, 
                        fontSize: 11.5,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppTheme.spacingXL),
          
          // Notifications header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Notifications récentes', 
                style: GoogleFonts.inter(
                  fontSize: 15.5, 
                  fontWeight: FontWeight.w700, 
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.1,
                ),
              ),
              if (_notifications.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  ),
                  child: Text(
                    '${_notifications.length}', 
                    style: GoogleFonts.inter(
                      color: AppTheme.primary, 
                      fontSize: 11, 
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppTheme.spacingS),
          
          if (_loadingNotif)
            const Padding(
              padding: EdgeInsets.all(AppTheme.spacingXL), 
              child: Center(child: CircularProgressIndicator(color: AppTheme.accent)),
            )
          else if (_notifications.isEmpty)
            Container(
              padding: const EdgeInsets.all(AppTheme.spacingXL),
              decoration: BoxDecoration(
                color: Colors.white, 
                borderRadius: BorderRadius.circular(AppTheme.radiusM),
                border: Border.all(color: AppTheme.divider, width: 1.0),
              ),
              child: Center(
                child: Column(
                  children: [
                    Icon(AppIcons.notifications, color: AppTheme.textSecondary.withValues(alpha: 0.5), size: 36),
                    const SizedBox(height: AppTheme.spacingS),
                    Text(
                      'Aucune notification', 
                      style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13.5, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._notifications.take(8).map(_buildNotificationCard),
            
          const SizedBox(height: AppTheme.spacingXXL),
          
          // Logout button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () async {
                await auth.logout();
              },
              icon: const Icon(AppIcons.logout, size: 18),
              label: const Text('Se déconnecter'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusS)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification n) {
    final isUnread = n.readAt == null;
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
      elevation: 0,
      color: isUnread ? AppTheme.info.withValues(alpha: 0.04) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: BorderSide(
          color: isUnread ? AppTheme.info.withValues(alpha: 0.2) : AppTheme.divider,
          width: 1,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: isUnread ? AppTheme.info.withValues(alpha: 0.1) : AppTheme.surface,
          child: Icon(
            isUnread ? AppIcons.notifications : Icons.notifications_none_rounded,
            color: isUnread ? AppTheme.info : AppTheme.textSecondary,
            size: 18,
          ),
        ),
        title: Text(
          n.title, 
          style: GoogleFonts.inter(
            fontWeight: isUnread ? FontWeight.w600 : FontWeight.w500, 
            fontSize: 13.5,
            color: AppTheme.textPrimary,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2.0),
          child: Text(
            n.body, 
            style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary), 
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        onTap: () async {
          if (isUnread) {
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
