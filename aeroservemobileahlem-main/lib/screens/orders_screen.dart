import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/status_badge.dart';
import '../widgets/empty_state_widget.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<InternalOrder> _orders = [];
  bool _loading = true;
  List<Product> _products = [];
  List<dynamic> _pdvs = [];

  @override
  void initState() {
    super.initState();
    _load();
    _loadProducts();
    _loadPdvs();
  }

  Future<void> _loadProducts() async {
    try {
      final res = await ApiService.get('/products?is_active=1');
      final data = (res is Map) ? (res['data'] ?? res) : res;
      setState(() {
        _products = (data as List).map((e) => Product.fromJson(e)).toList();
      });
    } catch (_) {}
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

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/internal-orders');
      final list = res is List ? res : (res['data'] ?? []);
      setState(() {
        _orders = (list as List).map((e) => InternalOrder.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userRole = context.read<AuthProvider>().user?.roleName?.toUpperCase();
    final isCashier = userRole == 'CAISSIER';

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Commandes internes'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppTheme.accent,
              child: _orders.isEmpty
                  ? EmptyStateWidget(
                      icon: AppIcons.noData,
                      title: 'Aucune commande',
                      description: 'Créez une nouvelle commande en appuyant sur le bouton ci-dessous.',
                      actionLabel: isCashier ? null : 'Créer une commande',
                      onActionPressed: isCashier ? null : _showCreateDialog,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppTheme.spacingM),
                      itemCount: _orders.length,
                      itemBuilder: (_, i) => _buildOrderCard(_orders[i], isCashier),
                    ),
            ),
      floatingActionButton: isCashier
          ? null
          : FloatingActionButton(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
              onPressed: () => _showCreateDialog(),
              child: const Icon(AppIcons.add),
            ),
    );
  }

  Widget _buildOrderCard(InternalOrder order, bool isCashier) {
    final date = DateFormat('dd/MM/yyyy HH:mm').format(order.orderDate);
    final userRole = context.read<AuthProvider>().user?.roleName?.toUpperCase();
    final canUpdateStatus = userRole == 'SUPER_ADMIN' || userRole == 'CHEF_CUISINE' || userRole == 'CHEF_MAGASIN';
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
      elevation: 0,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusM)),
          ),
          collapsedShape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusM)),
          ),
          tilePadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
          leading: CircleAvatar(
            backgroundColor: AppTheme.warning.withValues(alpha: 0.08),
            child: const Icon(AppIcons.orders, color: AppTheme.warning, size: 18),
          ),
          title: Text(
            'Commande #${order.id}',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13.5),
          ),
          subtitle: Text(
            date,
            style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11.5),
          ),
          trailing: StatusBadge(status: order.status),
          children: [
            const Divider(color: AppTheme.divider, height: 1),
            if (order.items != null)
              ...order.items!.map((item) => ListTile(
                    dense: true,
                    title: Text(
                      item.productName ?? 'Produit #${item.productId}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w500, color: AppTheme.textPrimary, fontSize: 13),
                    ),
                    trailing: Text(
                      'Qté: ${item.quantity}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppTheme.textSecondary, fontSize: 12),
                    ),
                  )),
            if (order.notes != null && order.notes!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(
                  left: AppTheme.spacingM,
                  right: AppTheme.spacingM,
                  bottom: AppTheme.spacingS,
                  top: AppTheme.spacingXS,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(AppIcons.info, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: AppTheme.spacingXS),
                    Expanded(
                      child: Text(
                        'Note: ${order.notes}',
                        style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            if (canUpdateStatus)
              Padding(
                padding: const EdgeInsets.only(
                  right: AppTheme.spacingM,
                  bottom: AppTheme.spacingM,
                  top: AppTheme.spacingXS,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (order.status.toLowerCase() == 'pending') ...[
                      OutlinedButton.icon(
                        onPressed: () => _updateStatus(order.id, 'approved'),
                        icon: const Icon(AppIcons.check, size: 14),
                        label: const Text('Approuver'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.success,
                          side: const BorderSide(color: AppTheme.success, width: 1),
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXXS),
                        ),
                      ),
                      const SizedBox(width: AppTheme.spacingS),
                    ],
                    if (order.status.toLowerCase() == 'approved')
                      OutlinedButton.icon(
                        onPressed: () => _updateStatus(order.id, 'delivered'),
                        icon: const Icon(AppIcons.tracking, size: 14),
                        label: const Text('Livrer'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.accent,
                          side: const BorderSide(color: AppTheme.accent, width: 1),
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXXS),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(int id, String status) async {
    try {
      await ApiService.put('/internal-orders/$id/status', {'status': status});
      _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text(e.message, style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }

  void _showCreateDialog() {
    final notesCtrl = TextEditingController();
    final searchCtrl = TextEditingController();
    final quantities = <int, int>{}; // Map<product_id, quantity>
    String search = '';
    bool isSaving = false;

    final userRole = context.read<AuthProvider>().user?.roleName?.toUpperCase();
    final isChefCuisine = userRole == 'CHEF_CUISINE';
    final isFb = userRole == 'RESPONSABLE_FB';
    final isSuperAdmin = userRole == 'SUPER_ADMIN';
    final needsPdv = isFb || isSuperAdmin;

    String selectedType = isChefCuisine ? 'commercial' : 'food';
    int? selectedPdvId;
    DateTime? selectedDate = DateTime.now().add(const Duration(days: 1)); // Default to tomorrow

    if (needsPdv && _pdvs.isNotEmpty) {
      selectedPdvId = _pdvs.first['id'];
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusL)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final allowedProductTypes = <String>[];
          if (selectedType == 'food') {
            allowedProductTypes.add('food');
          } else if (selectedType == 'commercial') {
            if (isChefCuisine) {
              allowedProductTypes.add('matiere_premiere');
            } else {
              allowedProductTypes.add('commercial');
            }
          }

          final filteredProducts = _products.where((p) {
            final matchesSearch = p.name.toLowerCase().contains(search.toLowerCase());
            final matchesType = allowedProductTypes.contains(p.type);
            return matchesSearch && matchesType;
          }).toList();

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.85,
            ),
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
                      isChefCuisine 
                        ? "Nouvelle Demande (MP)" 
                        : "Nouvelle Commande",
                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    ),
                    IconButton(
                      icon: const Icon(AppIcons.cancel, color: AppTheme.textSecondary),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.spacingS),
                Expanded(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      if (!isChefCuisine) ...[
                        Text(
                          "Type d'approvisionnement",
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: AppTheme.spacingXS),
                        Row(
                          children: [
                            ChoiceChip(
                              label: const Text("Alimentaire"),
                              selected: selectedType == 'food',
                              selectedColor: AppTheme.accent.withValues(alpha: 0.15),
                              checkmarkColor: AppTheme.accent,
                              labelStyle: GoogleFonts.inter(
                                color: selectedType == 'food' ? AppTheme.accent : AppTheme.textSecondary,
                                fontWeight: selectedType == 'food' ? FontWeight.bold : FontWeight.normal,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setModalState(() {
                                    selectedType = 'food';
                                    quantities.clear();
                                  });
                                }
                              },
                            ),
                            const SizedBox(width: AppTheme.spacingS),
                            ChoiceChip(
                              label: const Text("Commercial"),
                              selected: selectedType == 'commercial',
                              selectedColor: AppTheme.accent.withValues(alpha: 0.15),
                              checkmarkColor: AppTheme.accent,
                              labelStyle: GoogleFonts.inter(
                                color: selectedType == 'commercial' ? AppTheme.accent : AppTheme.textSecondary,
                                fontWeight: selectedType == 'commercial' ? FontWeight.bold : FontWeight.normal,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setModalState(() {
                                    selectedType = 'commercial';
                                    quantities.clear();
                                  });
                                }
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: AppTheme.spacingM),
                      ],
                      if (needsPdv && _pdvs.isNotEmpty) ...[
                        Text(
                          "Point de Vente",
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: AppTheme.spacingXS),
                        DropdownButtonFormField<int>(
                          initialValue: selectedPdvId,
                          decoration: const InputDecoration(
                            contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                          ),
                          items: _pdvs.map<DropdownMenuItem<int>>((pdv) {
                            return DropdownMenuItem<int>(
                              value: pdv['id'],
                              child: Text(
                                pdv['name'] ?? '',
                                style: GoogleFonts.inter(fontSize: 13.5),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setModalState(() {
                              selectedPdvId = val;
                            });
                          },
                        ),
                        const SizedBox(height: AppTheme.spacingM),
                      ],
                      Text(
                        "Date de livraison prévue",
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(height: AppTheme.spacingXS),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: selectedDate ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 30)),
                          );
                          if (picked != null) {
                            setModalState(() {
                              selectedDate = picked;
                            });
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                selectedDate == null 
                                  ? "Sélectionner une date" 
                                  : DateFormat('dd/MM/yyyy').format(selectedDate!),
                                style: GoogleFonts.inter(fontSize: 13.5, color: AppTheme.textPrimary),
                              ),
                              const Icon(Icons.calendar_today, size: 16, color: AppTheme.textSecondary),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacingM),
                      Text(
                        "Notes",
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(height: AppTheme.spacingXS),
                      TextField(
                        controller: notesCtrl,
                        style: GoogleFonts.inter(fontSize: 13.5),
                        decoration: const InputDecoration(
                          hintText: 'Précisez les consignes de livraison...',
                          contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: AppTheme.spacingM),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Catalogue de produits',
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                          ),
                          if (quantities.isNotEmpty)
                            Text(
                              '${quantities.length} sélectionné(s)',
                              style: GoogleFonts.inter(fontSize: 12, color: AppTheme.accent, fontWeight: FontWeight.bold),
                            ),
                        ],
                      ),
                      const SizedBox(height: AppTheme.spacingXS),
                      TextField(
                        controller: searchCtrl,
                        style: GoogleFonts.inter(fontSize: 13.5),
                        decoration: const InputDecoration(
                          hintText: 'Rechercher un produit...',
                          prefixIcon: Icon(Icons.search, size: 18),
                          contentPadding: EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                        ),
                        onChanged: (v) => setModalState(() => search = v),
                      ),
                      const SizedBox(height: AppTheme.spacingS),
                      if (filteredProducts.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
                          child: Center(
                            child: Text(
                              "Aucun produit trouvé.",
                              style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13),
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredProducts.length,
                          itemBuilder: (context, idx) {
                            final p = filteredProducts[idx];
                            final qty = quantities[p.id] ?? 0;
                            return Container(
                              margin: const EdgeInsets.symmetric(vertical: AppTheme.spacingXXS),
                              padding: const EdgeInsets.all(AppTheme.spacingS),
                              decoration: BoxDecoration(
                                color: AppTheme.card,
                                borderRadius: BorderRadius.circular(AppTheme.radiusS),
                                border: Border.all(color: AppTheme.divider, width: 0.5),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          p.name,
                                          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${p.price?.toStringAsFixed(0) ?? '?'} DA',
                                          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 11),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (qty == 0)
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXXS),
                                        backgroundColor: AppTheme.accent.withValues(alpha: 0.1),
                                        foregroundColor: AppTheme.accent,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusM)),
                                        elevation: 0,
                                      ),
                                      onPressed: () => setModalState(() => quantities[p.id] = 1),
                                      child: const Text('Ajouter', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                    )
                                  else
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, color: AppTheme.textSecondary, size: 22),
                                          onPressed: () => setModalState(() {
                                            if (qty <= 1) {
                                              quantities.remove(p.id);
                                            } else {
                                              quantities[p.id] = qty - 1;
                                            }
                                          }),
                                        ),
                                        Text('$qty', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13.5)),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, color: AppTheme.accent, size: 22),
                                          onPressed: () => setModalState(() => quantities[p.id] = qty + 1),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTheme.spacingM),
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
                    onPressed: (isSaving || quantities.isEmpty || (needsPdv && selectedPdvId == null) || selectedDate == null)
                        ? null
                        : () async {
                            setModalState(() => isSaving = true);
                            await _submitOrder(
                              notes: notesCtrl.text,
                              quantities: quantities,
                              type: selectedType,
                              pdvId: selectedPdvId,
                              deliveryDate: selectedDate!,
                              ctx: ctx,
                            );
                            if (ctx.mounted) {
                              setModalState(() => isSaving = false);
                            }
                          },
                    child: isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            quantities.isEmpty
                                ? 'Enregistrer la commande'
                                : 'Enregistrer (${quantities.length} articles)',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13.5),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitOrder({
    required String notes,
    required Map<int, int> quantities,
    required String type,
    int? pdvId,
    required DateTime deliveryDate,
    required BuildContext ctx,
  }) async {
    final orderItems = quantities.entries
        .map((e) => {
              'product_id': e.key,
              'quantity_requested': e.value,
            })
        .toList();

    try {
      await ApiService.post('/internal-orders', {
        'type': type,
        'pdv_id': pdvId,
        'delivery_date': DateFormat('yyyy-MM-dd').format(deliveryDate),
        'notes': notes,
        'items': orderItems,
      });
      if (ctx.mounted) Navigator.pop(ctx);
      _load();
    } on ApiException catch (e) {
      if (ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text(e.message, style: GoogleFonts.inter(color: Colors.white)),
          ),
        );
      }
    }
  }
}
