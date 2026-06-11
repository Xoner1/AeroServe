import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../providers/auth_provider.dart';
import 'chatbot_screen.dart';
import 'hygiene_check_screen.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  String? _scannedValue;
  bool _isScanning = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_isScanning) return;
    final barcodes = capture.barcodes;
    if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
      final String scannedCode = barcodes.first.rawValue!;

      setState(() {
        _scannedValue = scannedCode;
        _isScanning = false;
      });
      _controller.stop();

      // Smart product parser
      int? productId;

      // 1. Try parsing directly as integer
      productId = int.tryParse(scannedCode);

      // 2. Try parsing prefix strings (e.g. aeroserve_product_3, product_3)
      if (productId == null) {
        final regExp = RegExp(r'(?:product|aeroserve)_(\d+)', caseSensitive: false);
        final match = regExp.firstMatch(scannedCode);
        if (match != null) {
          productId = int.tryParse(match.group(1)!);
        }
      }

      // If we got a valid product ID, navigate to the correct screen based on role
      if (productId != null) {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        final isHygiene = auth.user?.roleName?.toUpperCase() == 'RESPONSABLE_HYGIENE';

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => isHygiene
                ? HygieneCheckScreen(productId: productId!)
                : ChatbotScreen(
                    productId: productId!,
                    productName: 'Produit Scanné #$productId',
                  ),
          ),
        ).then((_) {
          // Reset scanning when coming back
          _reset();
        });
      }
    }
  }

  void _reset() {
    setState(() {
      _scannedValue = null;
      _isScanning = true;
    });
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Scanner QR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded),
            onPressed: () => _controller.switchCamera(),
          ),
          const SizedBox(width: AppTheme.spacingXS),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: _isScanning
                ? Stack(
                    children: [
                      MobileScanner(
                        controller: _controller,
                        onDetect: _onDetect,
                      ),
                      Center(
                        child: Container(
                          width: 250,
                          height: 250,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: AppTheme.accent,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(AppTheme.radiusM),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.3),
                                spreadRadius: 400,
                                blurRadius: 0,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  )
                : Container(
                    color: AppTheme.primary,
                    child: const Center(
                      child: Icon(AppIcons.scanner, size: 80, color: Colors.white30),
                    ),
                  ),
          ),
          Expanded(
            flex: 2,
            child: Container(
              width: double.infinity,
              color: AppTheme.card,
              padding: const EdgeInsets.all(AppTheme.spacingL),
              child: _scannedValue != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Résultat du scan',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: AppTheme.spacingS),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppTheme.spacingM),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withValues(alpha: 0.06),
                            border: Border.all(color: AppTheme.success.withValues(alpha: 0.2), width: 1.0),
                            borderRadius: BorderRadius.circular(AppTheme.radiusM),
                          ),
                          child: Text(
                            _scannedValue!,
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              color: AppTheme.success,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppTheme.spacingM),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _reset,
                                icon: const Icon(AppIcons.scanner, size: 16),
                                label: const Text('Scanner à nouveau'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppTheme.accent,
                                  side: const BorderSide(color: AppTheme.accent, width: 1),
                                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingS),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppTheme.radiusM),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: AppTheme.spacingS),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Valeur copiée: ${_scannedValue!}',
                                        style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                                      ),
                                      backgroundColor: AppTheme.accent,
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.copy_rounded, size: 16),
                                label: const Text('Copier'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingS),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppTheme.radiusM),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppTheme.spacingM),
                          decoration: BoxDecoration(
                            color: AppTheme.accent.withValues(alpha: 0.06),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(AppIcons.scanner, size: 36, color: AppTheme.accent),
                        ),
                        const SizedBox(height: AppTheme.spacingM),
                        Text(
                          'Pointez la caméra vers un code QR',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            color: AppTheme.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          'Il sera automatiquement analysé pour ouvrir l\'assistant IA.',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppTheme.textSecondary.withValues(alpha: 0.6),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
