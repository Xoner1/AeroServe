import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/empty_state_widget.dart';

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
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: Text(
          'Planning', 
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 18.5),
        ),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppTheme.primary,
              child: _plannings.isEmpty
                  ? EmptyStateWidget(
                      icon: AppIcons.planning,
                      title: 'Aucun planning',
                      description: 'Votre planning de travail n\'a pas encore été planifié.',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppTheme.spacingM),
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
      margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
      elevation: 0,
      color: isDayOff ? AppTheme.warning.withValues(alpha: 0.04) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: BorderSide(
          color: isDayOff ? AppTheme.warning.withValues(alpha: 0.2) : AppTheme.divider,
          width: 1,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
        leading: CircleAvatar(
          backgroundColor: isDayOff 
              ? AppTheme.warning.withValues(alpha: 0.1) 
              : AppTheme.primary.withValues(alpha: 0.08),
          child: Icon(
            isDayOff ? Icons.weekend_rounded : Icons.schedule_rounded,
            color: isDayOff ? AppTheme.warning : AppTheme.primary,
            size: 20,
          ),
        ),
        title: Text(
          p.userName ?? 'Utilisateur #${p.userId}',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600, 
            color: AppTheme.textPrimary,
            fontSize: 15.0,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              // Capitalize first letter of day in french
              date.isNotEmpty ? '${date[0].toUpperCase()}${date.substring(1)}' : '', 
              style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
            ),
            if (!isDayOff) ...[
              const SizedBox(height: AppTheme.spacingS),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppTheme.radiusS),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.login_rounded, size: 13, color: AppTheme.success),
                        const SizedBox(width: 4),
                        Text(
                          p.shiftStart ?? '-', 
                          style: GoogleFonts.inter(
                            fontSize: 12, 
                            fontWeight: FontWeight.w600, 
                            color: AppTheme.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppTheme.spacingS),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppTheme.radiusS),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.logout_rounded, size: 13, color: AppTheme.error),
                        const SizedBox(width: 4),
                        Text(
                          p.shiftEnd ?? '-', 
                          style: GoogleFonts.inter(
                            fontSize: 12, 
                            fontWeight: FontWeight.w600, 
                            color: AppTheme.error,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: isDayOff
            ? Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.spacingXS, 
                  vertical: AppTheme.spacingXXS,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withValues(alpha: 0.1), 
                  borderRadius: BorderRadius.circular(AppTheme.radiusS),
                ),
                child: Text(
                  'Repos', 
                  style: GoogleFonts.inter(
                    color: AppTheme.warning, 
                    fontSize: 11, 
                    fontWeight: FontWeight.w600,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}
