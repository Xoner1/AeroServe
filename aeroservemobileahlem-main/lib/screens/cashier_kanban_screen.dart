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
  bool _loading = true;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCashiers();
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

  @override
  Widget build(BuildContext context) {
    // Filter cashiers by search query
    final filtered = _cashiers.where((c) {
      final query = _searchQuery.toLowerCase();
      final name = c.fullName.toLowerCase();
      final email = c.email.toLowerCase();
      return name.contains(query) || email.contains(query);
    }).toList();

    // Separate active and inactive cashiers
    final activeCashiers = filtered.where((c) => c.status != 'inactive').toList();
    final inactiveCashiers = filtered.where((c) => c.status == 'inactive').toList();

    return Scaffold(
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
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : Column(
              children: [
                // Top Search Bar
                Padding(
                  padding: const EdgeInsets.all(AppTheme.spacingM),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: GoogleFonts.inter(fontSize: 13.5),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un caissier par nom ou email...',
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
                // Kanban board columns
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final columnWidth = constraints.maxWidth * 0.82;
                      return SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Column 1: ACTIVE CASSHIERS
                            _buildKanbanColumn(
                              title: 'Caissiers Actifs',
                              count: activeCashiers.length,
                              columnWidth: columnWidth,
                              targetStatus: 'active',
                              cashiers: activeCashiers,
                              headerColor: AppTheme.success,
                            ),
                            const SizedBox(width: AppTheme.spacingM),
                            // Column 2: INACTIVE CASHIERS
                            _buildKanbanColumn(
                              title: 'Caissiers Inactifs',
                              count: inactiveCashiers.length,
                              columnWidth: columnWidth,
                              targetStatus: 'inactive',
                              cashiers: inactiveCashiers,
                              headerColor: AppTheme.error,
                            ),
                            const SizedBox(width: AppTheme.spacingM),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildKanbanColumn({
    required String title,
    required int count,
    required double columnWidth,
    required String targetStatus,
    required List<User> cashiers,
    required Color headerColor,
  }) {
    return DragTarget<User>(
      onWillAcceptWithDetails: (details) => details.data.status != targetStatus,
      onAcceptWithDetails: (details) {
        _updateStatus(details.data, targetStatus);
      },
      builder: (context, candidateData, rejectedData) {
        final isHighlighted = candidateData.isNotEmpty;
        return Container(
          width: columnWidth,
          decoration: BoxDecoration(
            color: isHighlighted 
                ? headerColor.withValues(alpha: 0.04) 
                : AppTheme.card,
            borderRadius: BorderRadius.circular(AppTheme.radiusL),
            border: Border.all(
              color: isHighlighted 
                  ? headerColor.withValues(alpha: 0.3) 
                  : AppTheme.divider,
              width: isHighlighted ? 1.5 : 1.0,
            ),
            boxShadow: AppTheme.softShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Column Header
              Padding(
                padding: const EdgeInsets.all(AppTheme.spacingM),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: headerColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: AppTheme.spacingXS),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: headerColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppTheme.radiusS),
                      ),
                      child: Text(
                        '$count',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: headerColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(color: AppTheme.divider, height: 1),
              // Column content / List
              Expanded(
                child: cashiers.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(AppTheme.spacingL),
                        child: EmptyStateWidget(
                          icon: AppIcons.noData,
                          title: 'Aucun caissier',
                          description: targetStatus == 'active'
                              ? 'Glissez un caissier ici pour l\'activer.'
                              : 'Glissez un caissier ici pour le suspendre.',
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(AppTheme.spacingS),
                        itemCount: cashiers.length,
                        itemBuilder: (context, index) {
                          final cashier = cashiers[index];
                          return _buildDraggableCard(cashier, targetStatus);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDraggableCard(User cashier, String currentColumnStatus) {
    return LongPressDraggable<User>(
      data: cashier,
      feedback: Material(
        color: Colors.transparent,
        child: Opacity(
          opacity: 0.85,
          child: Transform.rotate(
            angle: 0.04,
            child: SizedBox(
              width: MediaQuery.of(context).size.width * 0.75,
              child: _buildCardContent(cashier, isFeedback: true),
            ),
          ),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: Container(
          margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
          height: 110,
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusM),
            border: Border.all(color: AppTheme.divider, style: BorderStyle.none), // custom dashed look
          ),
          child: Center(
            child: Icon(
              Icons.drag_indicator_rounded,
              color: AppTheme.textSecondary.withValues(alpha: 0.3),
            ),
          ),
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
        child: _buildCardContent(cashier, onMovePressed: () {
          final nextStatus = currentColumnStatus == 'active' ? 'inactive' : 'active';
          _updateStatus(cashier, nextStatus);
        }),
      ),
    );
  }

  Widget _buildCardContent(User cashier, {bool isFeedback = false, VoidCallback? onMovePressed}) {
    return Card(
      elevation: isFeedback ? 8 : 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusM),
        side: const BorderSide(color: AppTheme.divider, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacingS),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
                  backgroundImage: cashier.avatarUrl != null ? NetworkImage(cashier.avatarUrl!) : null,
                  child: cashier.avatarUrl == null
                      ? Text(
                          cashier.initials,
                          style: GoogleFonts.inter(
                            color: AppTheme.accent,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: AppTheme.spacingS),
                // Name / Role
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cashier.fullName,
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        cashier.email,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Swap Action Button (for ease of use on tap)
                if (onMovePressed != null)
                  IconButton(
                    icon: Icon(
                      cashier.status == 'inactive'
                          ? Icons.arrow_circle_left_outlined
                          : Icons.arrow_circle_right_outlined,
                      color: cashier.status == 'inactive' ? AppTheme.success : AppTheme.error,
                      size: 22,
                    ),
                    onPressed: onMovePressed,
                    tooltip: cashier.status == 'inactive' ? 'Activer' : 'Suspendre',
                    constraints: const BoxConstraints(),
                    padding: EdgeInsets.zero,
                  ),
              ],
            ),
            const SizedBox(height: AppTheme.spacingS),
            // Footer (PDV information or phone)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Assigned Point de vente
                Row(
                  children: [
                    const Icon(Icons.storefront_rounded, size: 12, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      cashier.pdvName ?? 'Aucun PDV',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: cashier.pdvName != null ? FontWeight.w500 : FontWeight.normal,
                        color: cashier.pdvName != null ? AppTheme.accent : AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                // Phone (if exists)
                if (cashier.phone != null && cashier.phone!.isNotEmpty)
                  Row(
                    children: [
                      const Icon(Icons.phone_rounded, size: 11, color: AppTheme.textSecondary),
                      const SizedBox(width: 2),
                      Text(
                        cashier.phone!,
                        style: GoogleFonts.inter(
                          fontSize: 10,
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
}
