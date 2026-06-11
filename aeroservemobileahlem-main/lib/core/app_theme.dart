import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// AeroServe Mobile Theme — matches the web application design system exactly.
/// Based on _variables.scss from the Angular frontend.
class AppTheme {
  AppTheme._();

  // ─── Colors (from web _variables.scss) ──────────────────────────
  static const Color primary = Color(0xFF0F172A);       // Slate 900 — Dark sidebar
  static const Color primaryLight = Color(0xFF1E293B);  // Slate 800 — Active states
  static const Color accent = Color(0xFF0D9488);        // Teal 600 — Electric Teal
  static const Color surface = Color(0xFFF8FAFC);       // Slate 50 — Page background
  static const Color card = Color(0xFFFFFFFF);          // White — Card background
  static const Color textPrimary = Color(0xFF1E293B);   // Slate 800 — Primary text
  static const Color textSecondary = Color(0xFF475569); // Slate 600 — Secondary text
  static const Color divider = Color(0xFFE2E8F0);       // Slate 200 — Borders

  // Semantic Status Colors (from web)
  static const Color success = Color(0xFF10B981);       // Emerald 500
  static const Color warning = Color(0xFFF59E0B);       // Amber 500
  static const Color error = Color(0xFFEF4444);         // Red 500
  static const Color info = Color(0xFF3B82F6);          // Blue 500

  // ─── Spacing System ─────────────────────────────────────────────
  static const double spacingXXS = 4.0;
  static const double spacingXS = 8.0;
  static const double spacingS = 12.0;
  static const double spacingM = 16.0;
  static const double spacingL = 24.0;
  static const double spacingXL = 32.0;
  static const double spacingXXL = 48.0;

  // ─── Border Radius System (smaller, sharper — like web) ─────────
  static const double radiusS = 4.0;   // radius-sm
  static const double radiusM = 8.0;   // radius-md
  static const double radiusL = 12.0;  // radius-lg
  static const double radiusXL = 24.0;
  static const double radiusFull = 999.0;

  // ─── Shadows (subtle, professional — like web $shadow-sm / $shadow-md) ──
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          offset: const Offset(0, 1),
          blurRadius: 2,
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          offset: const Offset(0, 4),
          blurRadius: 6,
          spreadRadius: -1,
        ),
      ];

  // ─── ThemeData Definition ───────────────────────────────────────
  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.interTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: surface,
        error: error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
      ),
      scaffoldBackgroundColor: surface,
      dividerColor: divider,

      // Text Selection Theme - unifies cursor and selection highlight colors with the accent teal
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: accent,
        selectionColor: Color(0x4D0D9488), // Teal accent with ~30% opacity
        selectionHandleColor: accent,
      ),

      // Card Theme — matches web .stat-card / .table-container
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusM),
          side: const BorderSide(color: divider, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      // AppBar Theme — white/light premium style
      appBarTheme: AppBarTheme(
        backgroundColor: card,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 15.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: const IconThemeData(color: textPrimary),
        shape: const Border(
          bottom: BorderSide(color: divider, width: 1),
        ),
      ),

      // Input Decoration Theme — matches web .form-group input
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: spacingM,
          vertical: spacingM,
        ),
        hintStyle: GoogleFonts.inter(
          color: textSecondary.withValues(alpha: 0.6),
          fontSize: 13.0,
        ),
        labelStyle: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 12.0,
          fontWeight: FontWeight.w500,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusM),
          borderSide: const BorderSide(color: divider, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusM),
          borderSide: const BorderSide(color: divider, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusM),
          borderSide: const BorderSide(color: accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusM),
          borderSide: const BorderSide(color: error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusM),
          borderSide: const BorderSide(color: error, width: 1.5),
        ),
      ),

      // Button Themes — matches web .btn classes
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: spacingM,
            vertical: spacingS,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusM),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 13.0,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: divider, width: 1),
          padding: const EdgeInsets.symmetric(
            horizontal: spacingM,
            vertical: spacingS,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusM),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 13.0,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: accent,
          textStyle: GoogleFonts.inter(
            fontSize: 13.0,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      // Text Theme overrides
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 30.0,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.8,
        ),
        displayMedium: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 22.0,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 17.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        titleMedium: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 15.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
        bodyLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 14.0,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 13.0,
          height: 1.4,
        ),
        labelLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 13.0,
          fontWeight: FontWeight.w500,
        ),
        bodySmall: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 11.0,
          fontWeight: FontWeight.w400,
        ),
      ),
    );
  }
}
