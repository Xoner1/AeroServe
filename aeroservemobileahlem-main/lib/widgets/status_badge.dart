import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    
    final normalized = status.trim().toLowerCase();

    switch (normalized) {
      case 'approved':
      case 'active':
        bg = AppTheme.info.withValues(alpha: 0.1);
        fg = AppTheme.info;
        break;
      case 'delivered':
      case 'completed':
      case 'paid':
      case 'success':
        bg = AppTheme.success.withValues(alpha: 0.1);
        fg = AppTheme.success;
        break;
      case 'cancelled':
      case 'failed':
      case 'rejected':
        bg = AppTheme.error.withValues(alpha: 0.1);
        fg = AppTheme.error;
        break;
      case 'pending':
      case 'waiting':
      default:
        bg = AppTheme.warning.withValues(alpha: 0.1);
        fg = AppTheme.warning;
        break;
    }

    // Capitalize first letter for display
    final displayLabel = status.isNotEmpty 
        ? '${status[0].toUpperCase()}${status.substring(1).toLowerCase()}'
        : '';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingXS,
        vertical: AppTheme.spacingXXS,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTheme.radiusS),
      ),
      child: Text(
        displayLabel,
        style: GoogleFonts.inter(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}
