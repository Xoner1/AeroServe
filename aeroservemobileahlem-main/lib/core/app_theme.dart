import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // Colors
  static const Color primary = Color(0xFF1B2A4A);      // Dark Navy
  static const Color primaryLight = Color(0xFF2D4373);  // Medium Navy
  static const Color accent = Color(0xFFC8963E);        // Warm Gold/Copper
  static const Color surface = Color(0xFFF8F9FC);       // Light Gray Surface
  static const Color card = Color(0xFFFFFFFF);          // Card White
  static const Color textPrimary = Color(0xFF1A1D29);   // Dark Slate text
  static const Color textSecondary = Color(0xFF6B7280); // Muted gray text
  static const Color divider = Color(0xFFE8ECF1);       // Light divider

  // Semantic Status Colors
  static const Color success = Color(0xFF0D9668);       // Modern Emerald Green
  static const Color warning = Color(0xFFE5A100);       // Warm Amber
  static const Color error = Color(0xFFD93025);         // Refined Crimson Red
  static const Color info = Color(0xFF2563EB);          // Cobalt Blue

  // Spacing System
  static const double spacingXXS = 4.0;
  static const double spacingXS = 8.0;
  static const double spacingS = 12.0;
  static const double spacingM = 16.0;
  static const double spacingL = 24.0;
  static const double spacingXL = 32.0;
  static const double spacingXXL = 48.0;

  // Border Radius System
  static const double radiusS = 8.0;
  static const double radiusM = 12.0;
  static const double radiusL = 16.0;
  static const double radiusXL = 24.0;
  static const double radiusFull = 999.0;

  // Custom Elevation Shadows
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: primary.withValues(alpha: 0.06),
          offset: const Offset(0, 4),
          blurRadius: 16,
          spreadRadius: -2,
        ),
        BoxShadow(
          color: primary.withValues(alpha: 0.03),
          offset: const Offset(0, 2),
          blurRadius: 4,
          spreadRadius: -1,
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: primary.withValues(alpha: 0.04),
          offset: const Offset(0, 8),
          blurRadius: 24,
          spreadRadius: -4,
        ),
        BoxShadow(
          color: primary.withValues(alpha: 0.02),
          offset: const Offset(0, 2),
          blurRadius: 8,
          spreadRadius: -2,
        ),
      ];

  // ThemeData Definition
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
      
      // Card Theme
      cardTheme: const CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(radiusM)),
          side: BorderSide(color: divider, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      // AppBar Theme
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 18.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: spacingM,
          vertical: spacingM,
        ),
        hintStyle: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 14.0,
        ),
        labelStyle: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 14.0,
          fontWeight: FontWeight.w500,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusS),
          borderSide: const BorderSide(color: divider, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusS),
          borderSide: const BorderSide(color: divider, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusS),
          borderSide: const BorderSide(color: accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusS),
          borderSide: const BorderSide(color: error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusS),
          borderSide: const BorderSide(color: error, width: 1.5),
        ),
      ),

      // Button Themes
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: spacingL,
            vertical: spacingM,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusS),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 15.0,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.1,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 1.5),
          padding: const EdgeInsets.symmetric(
            horizontal: spacingL,
            vertical: spacingM,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusS),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 15.0,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.1,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: GoogleFonts.inter(
            fontSize: 14.0,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // TabBar Theme
      tabBarTheme: TabBarThemeData(
        labelColor: primary,
        unselectedLabelColor: textSecondary,
        labelStyle: GoogleFonts.inter(
          fontSize: 14.0,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: GoogleFonts.inter(
          fontSize: 14.0,
          fontWeight: FontWeight.w500,
        ),
        indicatorColor: accent,
        indicatorSize: TabBarIndicatorSize.tab,
      ),

      // Text Theme overrides
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 32.0,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.8,
        ),
        displayMedium: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 24.0,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 18.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        titleMedium: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 16.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
        bodyLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 15.0,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 14.0,
          height: 1.4,
        ),
        labelLarge: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 14.0,
          fontWeight: FontWeight.w500,
        ),
        bodySmall: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 12.0,
          fontWeight: FontWeight.w400,
        ),
      ),
    );
  }
}
