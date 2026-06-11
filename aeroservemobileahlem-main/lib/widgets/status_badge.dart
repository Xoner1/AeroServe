import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';

/// Web-style pill badge matching .badge in styles.scss
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
        bg = const Color(0xFFDBEAFE); // blue-100
        fg = const Color(0xFF1D4ED8); // blue-700
        break;
      case 'delivered':
      case 'completed':
      case 'paid':
      case 'success':
        bg = const Color(0xFFDCFCE7); // green-100
        fg = const Color(0xFF15803D); // green-700
        break;
      case 'cancelled':
      case 'failed':
      case 'rejected':
        bg = const Color(0xFFFEE2E2); // red-100
        fg = const Color(0xFFB91C1C); // red-700
        break;
      case 'pending':
      case 'waiting':
      default:
        bg = const Color(0xFFFEF3C7); // amber-100
        fg = const Color(0xFFB45309); // amber-700
        break;
    }

    final displayLabel = status.isNotEmpty
        ? '${status[0].toUpperCase()}${status.substring(1).toLowerCase()}'
        : '';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Text(
        displayLabel,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: fg,
        ),
      ),
    );
  }
}
