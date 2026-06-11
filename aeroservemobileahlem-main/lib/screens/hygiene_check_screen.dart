import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class HygieneCheckScreen extends StatefulWidget {
  final int productId;

  const HygieneCheckScreen({super.key, required this.productId});

  @override
  State<HygieneCheckScreen> createState() => _HygieneCheckScreenState();
}

class _HygieneCheckScreenState extends State<HygieneCheckScreen> {
  Product? _product;
  bool _loadingProduct = true;
  String? _errorMsg;

  // Form states
  bool _allergensVerified = false;
  bool _expirationVerified = false;
  String _status = 'conforme'; // conforme, non_conforme, en_cours
  final TextEditingController _remarksController = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    setState(() {
      _loadingProduct = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiService.get('/products/${widget.productId}');
      final product = Product.fromJson(res is Map<String, dynamic> ? res : res['data'] ?? res);
      
      setState(() {
        _product = product;
        _loadingProduct = false;
      });
    } catch (e) {
      setState(() {
        _errorMsg = e.toString();
        _loadingProduct = false;
      });
    }
  }

  Future<void> _submitReport() async {
    if (_product == null) return;

    setState(() {
      _saving = true;
    });

    try {
      await ApiService.post('/hygiene-reports', {
        'product_id': _product!.id,
        'allergens_verified': _allergensVerified,
        'expiration_verified': _expirationVerified,
        'status': _status,
        'remarks': _remarksController.text.trim().isNotEmpty ? _remarksController.text.trim() : null,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.success,
            content: Text(
              'Rapport d\'hygiène enregistré avec succès.',
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500),
            ),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text(
              'Erreur : $e',
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500),
            ),
          ),
        );
      }
      setState(() {
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Contrôle Hygiène'),
      ),
      body: _buildBody(theme),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_loadingProduct) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.accent),
      );
    }

    if (_errorMsg != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spacingXL),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 48),
              const SizedBox(height: AppTheme.spacingM),
              Text(
                'Erreur lors du chargement du produit',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: AppTheme.spacingXS),
              Text(
                _errorMsg!,
                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.spacingL),
              ElevatedButton(
                onPressed: _loadProduct,
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }

    if (_product == null) {
      return Center(
        child: Text(
          'Produit non trouvé',
          style: GoogleFonts.inter(color: AppTheme.textSecondary),
        ),
      );
    }

    final isFood = _product!.type == 'food' || _product!.type == 'plat';

    if (!isFood) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spacingXL),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange.shade600, size: 48),
              const SizedBox(height: AppTheme.spacingM),
              Text(
                'Type de produit non autorisé',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: AppTheme.spacingXS),
              Text(
                'Le produit "${_product!.name}" est de type "${_product!.type}". Seuls les produits de type FOOD ou PLAT peuvent faire l\'objet d\'un contrôle d\'hygiène.',
                style: GoogleFonts.inter(fontSize: 12.5, color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.spacingL),
              OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.divider),
                ),
                child: const Text('Retour'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTheme.spacingM),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Info Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppTheme.spacingL),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(AppTheme.radiusM),
              border: Border.all(color: AppTheme.divider, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _product!.name,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppTheme.radiusS),
                      ),
                      child: Text(
                        _product!.type.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: AppTheme.accent,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                if (_product!.description != null && _product!.description!.isNotEmpty) ...[
                  const SizedBox(height: AppTheme.spacingS),
                  Text(
                    _product!.description!,
                    style: GoogleFonts.inter(fontSize: 12.5, color: AppTheme.textSecondary),
                  ),
                ],
                const Divider(color: AppTheme.divider, height: 24),
                // Allergens info
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: AppTheme.textSecondary),
                    const SizedBox(width: 8),
                    Text(
                      'Allergènes déclarés : ',
                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                    Expanded(
                      child: Text(
                        (_product!.allergens != null && _product!.allergens!.isNotEmpty)
                            ? _product!.allergens!.join(', ')
                            : 'Aucun',
                        style: GoogleFonts.inter(fontSize: 12.5, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Expiration info
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.textSecondary),
                    const SizedBox(width: 8),
                    Text(
                      'Date d\'expiration : ',
                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                    Expanded(
                      child: Text(
                        _product!.expirationDate ?? 'Non spécifiée',
                        style: GoogleFonts.inter(fontSize: 12.5, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.spacingL),

          // Check Form
          Text(
            'Points de contrôle',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: AppTheme.spacingS),

          // Checkbox: Allergens Verified
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusM),
              side: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            color: AppTheme.card,
            child: SwitchListTile(
              title: Text(
                'Allergènes vérifiés',
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              subtitle: Text(
                'La conformité des allergènes indiqués sur l\'étiquette a été vérifiée.',
                style: GoogleFonts.inter(fontSize: 11.5, color: AppTheme.textSecondary),
              ),
              value: _allergensVerified,
              activeThumbColor: AppTheme.accent,
              activeTrackColor: AppTheme.accent.withValues(alpha: 0.3),
              onChanged: (val) => setState(() => _allergensVerified = val),
            ),
          ),
          const SizedBox(height: AppTheme.spacingXS),

          // Checkbox: Expiration Verified
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusM),
              side: const BorderSide(color: AppTheme.divider, width: 1),
            ),
            color: AppTheme.card,
            child: SwitchListTile(
              title: Text(
                'Date d\'expiration vérifiée',
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              subtitle: Text(
                'La date d\'expiration a été validée et le produit n\'est pas périmé.',
                style: GoogleFonts.inter(fontSize: 11.5, color: AppTheme.textSecondary),
              ),
              value: _expirationVerified,
              activeThumbColor: AppTheme.accent,
              activeTrackColor: AppTheme.accent.withValues(alpha: 0.3),
              onChanged: (val) => setState(() => _expirationVerified = val),
            ),
          ),
          const SizedBox(height: AppTheme.spacingL),

          // Status selector
          Text(
            'Statut de conformité',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: AppTheme.spacingS),

          Row(
            children: [
              _buildStatusChip('conforme', 'Conforme', AppTheme.success),
              const SizedBox(width: AppTheme.spacingS),
              _buildStatusChip('non_conforme', 'Non conforme', AppTheme.error),
              const SizedBox(width: AppTheme.spacingS),
              _buildStatusChip('en_cours', 'En cours', Colors.orange),
            ],
          ),
          const SizedBox(height: AppTheme.spacingL),

          // Remarks field
          Text(
            'Remarques / Observations',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: AppTheme.spacingS),
          TextField(
            controller: _remarksController,
            maxLines: 4,
            style: GoogleFonts.inter(fontSize: 13.0, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Saisir les remarques (obligatoire si non conforme)...',
              hintStyle: GoogleFonts.inter(color: AppTheme.textSecondary.withValues(alpha: 0.6), fontSize: 13.0),
              filled: true,
              fillColor: AppTheme.card,
              contentPadding: const EdgeInsets.all(AppTheme.spacingM),
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
          const SizedBox(height: AppTheme.spacingXL),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: _saving ? null : _submitReport,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      'Enregistrer le rapport',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
            ),
          ),
          const SizedBox(height: AppTheme.spacingXL),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String value, String label, Color color) {
    final isSelected = _status == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _status = value),
        child: Container(
          height: 38,
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.1) : AppTheme.card,
            border: Border.all(
              color: isSelected ? color : AppTheme.divider,
              width: isSelected ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(AppTheme.radiusM),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: isSelected ? color : AppTheme.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
