import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscure = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _showServerConfigDialog() async {
    await ApiService.init();
    final controller = TextEditingController(text: ApiService.baseUrl);
    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.primary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusM),
          side: const BorderSide(color: AppTheme.primaryLight, width: 1),
        ),
        title: Text(
          'Configuration Serveur', 
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 18.0,
          )
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Saisissez l\'adresse IP locale ou l\'URL de votre serveur Laravel (ex: http://192.168.1.50:8000).',
              style: GoogleFonts.inter(fontSize: 13.0, color: Colors.white.withValues(alpha: 0.7)),
            ),
            const SizedBox(height: AppTheme.spacingM),
            TextField(
              controller: controller,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 14.0),
              decoration: InputDecoration(
                labelText: 'URL de l\'API',
                labelStyle: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.7)),
                hintText: 'http://192.168.1.50:8000',
                hintStyle: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.3)),
                filled: true,
                fillColor: AppTheme.primaryLight.withValues(alpha: 0.5),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Annuler',
              style: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.6), fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              final newUrl = controller.text.trim();
              final messenger = ScaffoldMessenger.of(context);
              final navigator = Navigator.of(context);
              if (newUrl.isNotEmpty) {
                await ApiService.setBaseUrl(newUrl);
                messenger.showSnackBar(
                  SnackBar(
                    backgroundColor: AppTheme.accent,
                    content: Text(
                      'Serveur configuré : ${ApiService.baseUrl}',
                      style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500),
                    ),
                  ),
                );
              }
              navigator.pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusS)),
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXS),
            ),
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Veuillez remplir tous les champs.');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      await context.read<AuthProvider>().login(email, password);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Impossible de se connecter au serveur.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(AppIcons.settings, color: Colors.white, size: 24),
            tooltip: 'Configuration Serveur',
            onPressed: _showServerConfigDialog,
          ),
          const SizedBox(width: AppTheme.spacingS),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.primary, AppTheme.primaryLight],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.spacingL),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(AppTheme.spacingXL),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusL),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 30,
                    offset: const Offset(0, 15),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Image.asset('assets/logo.png', width: 72, height: 72),
                  const SizedBox(height: AppTheme.spacingM),
                  Text(
                    'AeroServe',
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Gestion de restauration aéroportuaire',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.spacingXL),
                  _buildField('Email', _emailController, false, TextInputType.emailAddress),
                  const SizedBox(height: AppTheme.spacingM),
                  _buildPasswordField(),
                  if (_error != null) ...[
                    const SizedBox(height: AppTheme.spacingM),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppTheme.spacingS),
                      decoration: BoxDecoration(
                        color: AppTheme.error.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppTheme.radiusS),
                        border: Border.all(color: AppTheme.error.withValues(alpha: 0.2), width: 1.0),
                      ),
                      child: Row(
                        children: [
                          const Icon(AppIcons.error, color: AppTheme.error, size: 18),
                          const SizedBox(width: AppTheme.spacingXS),
                          Expanded(
                            child: Text(
                              _error!, 
                              style: GoogleFonts.inter(
                                color: AppTheme.error, 
                                fontSize: 13, 
                                fontWeight: FontWeight.w500,
                              )
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: AppTheme.spacingXL),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusS)),
                        elevation: 0,
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 20, 
                              height: 20, 
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              'Se connecter', 
                              style: GoogleFonts.inter(
                                fontSize: 15, 
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.1,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, bool obscure, TextInputType type) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label, 
          style: GoogleFonts.inter(
            fontSize: 13, 
            fontWeight: FontWeight.w600, 
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: AppTheme.spacingXS),
        TextField(
          controller: controller,
          obscureText: obscure,
          keyboardType: type,
          style: GoogleFonts.inter(fontSize: 14.5, color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: label == 'Email' ? 'admin@aeroserve.com' : '••••••••',
            hintStyle: GoogleFonts.inter(color: AppTheme.textSecondary.withValues(alpha: 0.6)),
            filled: true,
            fillColor: AppTheme.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingM),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Mot de passe', 
          style: GoogleFonts.inter(
            fontSize: 13, 
            fontWeight: FontWeight.w600, 
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: AppTheme.spacingXS),
        TextField(
          controller: _passwordController,
          obscureText: _obscure,
          style: GoogleFonts.inter(fontSize: 14.5, color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: '••••••••',
            hintStyle: GoogleFonts.inter(color: AppTheme.textSecondary.withValues(alpha: 0.6)),
            filled: true,
            fillColor: AppTheme.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusS),
              borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingM),
            suffixIcon: IconButton(
              icon: Icon(
                _obscure ? Icons.visibility_off : Icons.visibility, 
                color: AppTheme.textSecondary,
                size: 20,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
      ],
    );
  }
}
