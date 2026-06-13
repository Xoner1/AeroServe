import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
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
        title: const Text('Profil'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppTheme.spacingM),
        children: [
          // User card
          Container(
            padding: const EdgeInsets.all(AppTheme.spacingL),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(AppTheme.radiusM),
              border: Border.all(color: AppTheme.divider, width: 1),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppTheme.accent,
                  backgroundImage: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                      ? NetworkImage(user.avatarUrl!)
                      : null,
                  child: (user?.avatarUrl == null || user!.avatarUrl!.isEmpty)
                      ? Text(
                          user?.initials ?? '?',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: AppTheme.spacingM),
                Text(
                  user?.fullName ?? 'Utilisateur',
                  style: GoogleFonts.inter(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12.5),
                ),
                if (user?.roleName != null) ...[
                  const SizedBox(height: AppTheme.spacingS),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
                        decoration: BoxDecoration(
                          color: AppTheme.accent.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                        ),
                        child: Text(
                          user!.roleName!.toUpperCase(),
                          style: GoogleFonts.inter(
                            color: AppTheme.accent,
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      if (user.roleName == 'CAISSIER' || user.roleName == 'RESPONSABLE_FB')
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
                          decoration: BoxDecoration(
                            color: (user.pdvName != null) ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.textSecondary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.storefront_rounded,
                                size: 11,
                                color: (user.pdvName != null) ? AppTheme.success : AppTheme.textSecondary,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                user.pdvName ?? 'Aucun PDV',
                                style: GoogleFonts.inter(
                                  color: (user.pdvName != null) ? AppTheme.success : AppTheme.textSecondary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
                const Divider(color: AppTheme.divider, height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: OutlinedButton.icon(
                    onPressed: () => _showEditProfileBottomSheet(context, user),
                    icon: const Icon(Icons.edit_rounded, size: 14, color: AppTheme.accent),
                    label: Text(
                      'Modifier le profil',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accent),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      side: const BorderSide(color: AppTheme.accent, width: 1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.spacingL),

          // Notifications header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Notifications récentes',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              if (_notifications.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  ),
                  child: Text(
                    '${_notifications.length}',
                    style: GoogleFonts.inter(
                      color: AppTheme.accent,
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
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(AppTheme.radiusM),
                border: Border.all(color: AppTheme.divider, width: 1),
              ),
              child: Center(
                child: Column(
                  children: [
                    Icon(AppIcons.notifications, color: AppTheme.textSecondary.withValues(alpha: 0.4), size: 32),
                    const SizedBox(height: AppTheme.spacingS),
                    Text(
                      'Aucune notification',
                      style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w500),
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
            height: 38,
            child: OutlinedButton.icon(
              onPressed: () async {
                await auth.logout();
              },
              icon: const Icon(AppIcons.logout, size: 16),
              label: const Text('Se déconnecter'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error, width: 1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
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
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      color: isUnread ? AppTheme.info.withValues(alpha: 0.04) : AppTheme.card,
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
          radius: 16,
          backgroundColor: isUnread ? AppTheme.info.withValues(alpha: 0.1) : AppTheme.surface,
          child: Icon(
            isUnread ? AppIcons.notifications : Icons.notifications_none_rounded,
            color: isUnread ? AppTheme.info : AppTheme.textSecondary,
            size: 16,
          ),
        ),
        title: Text(
          n.title,
          style: GoogleFonts.inter(
            fontWeight: isUnread ? FontWeight.w600 : FontWeight.w500,
            fontSize: 13,
            color: AppTheme.textPrimary,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2.0),
          child: Text(
            n.body,
            style: GoogleFonts.inter(fontSize: 11.5, color: AppTheme.textSecondary),
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

  Future<void> _showEditProfileBottomSheet(BuildContext context, User? user) async {
    if (user == null) return;

    final firstNameController = TextEditingController(text: user.firstName);
    final lastNameController = TextEditingController(text: user.lastName);
    final phoneController = TextEditingController(text: user.phone ?? '');

    File? selectedImage;
    bool saving = false;
    String? errorMsg;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setBottomSheetState) {
            return Container(
              decoration: const BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusL)),
              ),
              padding: EdgeInsets.only(
                left: AppTheme.spacingL,
                right: AppTheme.spacingL,
                top: AppTheme.spacingL,
                bottom: MediaQuery.of(context).viewInsets.bottom + AppTheme.spacingL,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.divider,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: AppTheme.spacingM),
                    Text(
                      'Modifier le profil',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spacingL),

                    // Avatar selector
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () async {
                        try {
                          final picker = ImagePicker();
                          final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
                          if (image != null) {
                            setBottomSheetState(() {
                              selectedImage = File(image.path);
                              errorMsg = null;
                            });
                          }
                        } catch (e) {
                          setBottomSheetState(() {
                            errorMsg = "Erreur galerie : $e";
                          });
                        }
                      },
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 36,
                            backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
                            backgroundImage: selectedImage != null
                                ? FileImage(selectedImage!)
                                : (user.avatarUrl != null && user.avatarUrl!.isNotEmpty)
                                    ? NetworkImage(user.avatarUrl!) as ImageProvider
                                    : null,
                            child: (selectedImage == null && (user.avatarUrl == null || user.avatarUrl!.isEmpty))
                                ? Text(
                                    user.initials,
                                    style: GoogleFonts.inter(
                                      color: AppTheme.accent,
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                                : null,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: AppTheme.accent,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.camera_alt_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppTheme.spacingL),

                    // Inputs
                    _buildEditField('Prénom', firstNameController),
                    const SizedBox(height: AppTheme.spacingM),
                    _buildEditField('Nom', lastNameController),
                    const SizedBox(height: AppTheme.spacingM),
                    _buildEditField('Téléphone', phoneController, keyboardType: TextInputType.phone),

                    if (errorMsg != null) ...[
                      const SizedBox(height: AppTheme.spacingM),
                      Text(
                        errorMsg!,
                        style: GoogleFonts.inter(color: AppTheme.error, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ],

                    const SizedBox(height: AppTheme.spacingXL),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: saving ? null : () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppTheme.divider, width: 1),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingS),
                            ),
                            child: Text(
                              'Annuler',
                              style: GoogleFonts.inter(color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppTheme.spacingM),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: saving
                                ? null
                                : () async {
                                    final fName = firstNameController.text.trim();
                                    final lName = lastNameController.text.trim();
                                    final phone = phoneController.text.trim();

                                    if (fName.isEmpty || lName.isEmpty) {
                                      setBottomSheetState(() {
                                        errorMsg = 'Le prénom et le nom sont obligatoires.';
                                      });
                                      return;
                                    }

                                    setBottomSheetState(() {
                                      saving = true;
                                      errorMsg = null;
                                    });

                                    try {
                                      await context.read<AuthProvider>().updateProfile(
                                        firstName: fName,
                                        lastName: lName,
                                        phone: phone.isNotEmpty ? phone : null,
                                        avatarPath: selectedImage?.path,
                                      );
                                      if (context.mounted) {
                                        Navigator.pop(context);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            backgroundColor: AppTheme.success,
                                            content: Text(
                                              'Profil mis à jour avec succès.',
                                              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500),
                                            ),
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      setBottomSheetState(() {
                                        saving = false;
                                        errorMsg = e.toString();
                                      });
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.accent,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingS),
                            ),
                            child: saving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : Text(
                                    'Enregistrer',
                                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.spacingS),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildEditField(String label, TextEditingController controller, {TextInputType keyboardType = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: AppTheme.spacingXXS),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: GoogleFonts.inter(fontSize: 13.0, color: AppTheme.textPrimary),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppTheme.surface,
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
      ],
    );
  }
}
