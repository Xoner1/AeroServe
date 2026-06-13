import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/empty_state_widget.dart';

class CashierKanbanScreen extends StatefulWidget {
  const CashierKanbanScreen({super.key});

  @override
  State<CashierKanbanScreen> createState() => _CashierKanbanScreenState();
}

class _CashierKanbanScreenState extends State<CashierKanbanScreen> {
  List<User> _cashiers = [];
  List<dynamic> _pdvs = [];
  bool _loading = true;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCashiers();
    _loadPdvs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCashiers() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('caissier');
      final list = res is List ? res : [];
      setState(() {
        _cashiers = list.map((e) => User.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text('Erreur lors du chargement des caissiers', style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }

  Future<void> _loadPdvs() async {
    try {
      final res = await ApiService.get('/points-de-vente');
      final data = (res is Map) ? (res['data'] ?? res) : res;
      setState(() {
        _pdvs = data as List;
      });
    } catch (_) {}
  }

  Future<void> _updateStatus(User cashier, String newStatus) async {
    final oldStatus = cashier.status;

    // Optimistic update
    setState(() {
      final idx = _cashiers.indexWhere((u) => u.id == cashier.id);
      if (idx != -1) {
        final updatedUser = User(
          id: cashier.id,
          firstName: cashier.firstName,
          lastName: cashier.lastName,
          email: cashier.email,
          roleId: cashier.roleId,
          roleName: cashier.roleName,
          avatarUrl: cashier.avatarUrl,
          phone: cashier.phone,
          status: newStatus,
          pdvName: cashier.pdvName,
        );
        _cashiers[idx] = updatedUser;
      }
    });

    try {
      await ApiService.put('caissiers/${cashier.id}/status', {'status': newStatus});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.success,
            duration: const Duration(seconds: 2),
            content: Text(
              'Statut de ${cashier.fullName} mis à jour : ${newStatus == 'active' ? 'Actif' : 'Inactif'}',
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500),
            ),
          ),
        );
      }
    } catch (e) {
      // Revert status on failure
      setState(() {
        final idx = _cashiers.indexWhere((u) => u.id == cashier.id);
        if (idx != -1) {
          final revertedUser = User(
            id: cashier.id,
            firstName: cashier.firstName,
            lastName: cashier.lastName,
            email: cashier.email,
            roleId: cashier.roleId,
            roleName: cashier.roleName,
            avatarUrl: cashier.avatarUrl,
            phone: cashier.phone,
            status: oldStatus,
            pdvName: cashier.pdvName,
          );
          _cashiers[idx] = revertedUser;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text('Échec de la mise à jour du statut : $e', style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }

  Future<void> _assignPdv(User cashier, int? pdvId) async {
    setState(() => _loading = true);
    try {
      await ApiService.put('users/${cashier.id}/caissier', {'pdv_id': pdvId});
      await _loadCashiers();
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text('Échec de l\'affectation du PDV: $e', style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }

  void _showAssignPdvDialog(User cashier) {
    int? selectedPdvId;
    if (cashier.pdvName != null) {
      final matchingPdv = _pdvs.firstWhere(
        (p) => p['name'] == cashier.pdvName,
        orElse: () => null,
      );
      if (matchingPdv != null) {
        selectedPdvId = matchingPdv['id'];
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusL)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: AppTheme.spacingL,
            right: AppTheme.spacingL,
            top: AppTheme.spacingL,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppTheme.spacingL,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Affecter à un PDV',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                  IconButton(
                    icon: const Icon(AppIcons.cancel, color: AppTheme.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacingS),
              Text(
                "Caissier: ${cashier.fullName}",
                style: GoogleFonts.inter(fontSize: 13.5, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: AppTheme.spacingM),
              Text(
                "Point de Vente",
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: AppTheme.spacingXS),
              DropdownButtonFormField<int?>(
                initialValue: selectedPdvId,
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                ),
                items: [
                  DropdownMenuItem<int?>(
                    value: null,
                    child: Text(
                      'Aucun PDV (Désaffecter)',
                      style: GoogleFonts.inter(fontSize: 13.5, color: AppTheme.textSecondary),
                    ),
                  ),
                  ..._pdvs.map<DropdownMenuItem<int?>>((pdv) {
                    return DropdownMenuItem<int?>(
                      value: pdv['id'],
                      child: Text(
                        pdv['name'] ?? '',
                        style: GoogleFonts.inter(fontSize: 13.5, color: AppTheme.textPrimary),
                      ),
                    );
                  }),
                ],
                onChanged: (val) {
                  setModalState(() {
                    selectedPdvId = val;
                  });
                },
              ),
              const SizedBox(height: AppTheme.spacingL),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                    elevation: 0,
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await _assignPdv(cashier, selectedPdvId);
                  },
                  child: Text(
                    'Enregistrer',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCashierCard(User cashier) {
    final hasPdv = cashier.pdvName != null;
    final isActive = cashier.status == 'active';

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: const BorderSide(color: AppTheme.divider, width: 0.8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacingM),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
                  backgroundImage: cashier.avatarUrl != null ? NetworkImage(cashier.avatarUrl!) : null,
                  child: cashier.avatarUrl == null
                      ? Text(
                          cashier.initials,
                          style: GoogleFonts.inter(
                            color: AppTheme.accent,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: AppTheme.spacingM),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cashier.fullName,
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w600,
                          fontSize: 14.5,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        cashier.email,
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          color: AppTheme.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: isActive,
                  activeThumbColor: AppTheme.success,
                  onChanged: (val) {
                    final newStatus = val ? 'active' : 'inactive';
                    _updateStatus(cashier, newStatus);
                  },
                ),
              ],
            ),
            const SizedBox(height: AppTheme.spacingM),
            const Divider(color: AppTheme.divider, height: 1),
            const SizedBox(height: AppTheme.spacingS),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                InkWell(
                  onTap: () => _showAssignPdvDialog(cashier),
                  borderRadius: BorderRadius.circular(AppTheme.radiusS),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXS),
                    decoration: BoxDecoration(
                      color: hasPdv 
                        ? AppTheme.accent.withValues(alpha: 0.08)
                        : AppTheme.textSecondary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppTheme.radiusS),
                      border: Border.all(
                        color: hasPdv 
                          ? AppTheme.accent.withValues(alpha: 0.15)
                          : AppTheme.divider,
                        width: 0.5,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.storefront_rounded, 
                          size: 13, 
                          color: hasPdv ? AppTheme.accent : AppTheme.textSecondary
                        ),
                        const SizedBox(width: 4),
                        Text(
                          cashier.pdvName ?? 'Aucun PDV',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: hasPdv ? AppTheme.accent : AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.edit_rounded, 
                          size: 10, 
                          color: hasPdv ? AppTheme.accent : AppTheme.textSecondary
                        ),
                      ],
                    ),
                  ),
                ),
                if (cashier.phone != null && cashier.phone!.isNotEmpty)
                  Row(
                    children: [
                      const Icon(Icons.phone_rounded, size: 12, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        cashier.phone!,
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _cashiers.where((c) {
      final query = _searchQuery.toLowerCase();
      final name = c.fullName.toLowerCase();
      final email = c.email.toLowerCase();
      return name.contains(query) || email.contains(query);
    }).toList();

    final activeCashiers = filtered.where((c) => c.status != 'inactive').toList();
    final inactiveCashiers = filtered.where((c) => c.status == 'inactive').toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.surface,
        appBar: AppBar(
          title: const Text('Gestion des Caissiers'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Actualiser',
              onPressed: _loadCashiers,
            ),
            const SizedBox(width: AppTheme.spacingXS),
          ],
          bottom: TabBar(
            indicatorColor: AppTheme.accent,
            labelColor: AppTheme.accent,
            unselectedLabelColor: AppTheme.textSecondary,
            labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13.5),
            unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.normal, fontSize: 13.5),
            tabs: [
              Tab(text: 'Actifs (${activeCashiers.length})'),
              Tab(text: 'Inactifs (${inactiveCashiers.length})'),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(AppTheme.spacingM),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: GoogleFonts.inter(fontSize: 13.5),
                      decoration: InputDecoration(
                        hintText: 'Rechercher un caissier...',
                        prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textSecondary, size: 20),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, color: AppTheme.textSecondary, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: AppTheme.card,
                        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
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
                  ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        activeCashiers.isEmpty
                            ? EmptyStateWidget(
                                icon: AppIcons.noData,
                                title: 'Aucun caissier actif',
                                description: _searchQuery.isNotEmpty
                                    ? 'Aucun caissier ne correspond à votre recherche.'
                                    : 'Tous les caissiers actifs s\'afficheront ici.',
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM),
                                itemCount: activeCashiers.length,
                                itemBuilder: (context, index) {
                                  return _buildCashierCard(activeCashiers[index]);
                                },
                              ),
                        inactiveCashiers.isEmpty
                            ? EmptyStateWidget(
                                icon: AppIcons.noData,
                                title: 'Aucun caissier inactif',
                                description: _searchQuery.isNotEmpty
                                    ? 'Aucun caissier ne correspond à votre recherche.'
                                    : 'Tous les caissiers inactifs s\'afficheront ici.',
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM),
                                itemCount: inactiveCashiers.length,
                                itemBuilder: (context, index) {
                                  return _buildCashierCard(inactiveCashiers[index]);
                                },
                              ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
