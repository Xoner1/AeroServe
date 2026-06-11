import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';

class ChatbotScreen extends StatefulWidget {
  final int? productId;
  final String? productName;

  const ChatbotScreen({
    super.key,
    this.productId,
    this.productName,
  });

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final String initialText = widget.productName != null
        ? 'Bonjour ! Je suis l\'assistant nutritionnel intelligent d\'AeroServe. Posez-moi toutes vos questions sur la composition, les ingrédients et les allergènes pour le produit "${widget.productName}".'
        : 'Bonjour ! Je suis l\'assistant nutritionnel intelligent d\'AeroServe. Veuillez scanner le code QR d\'un produit ou le sélectionner depuis sa fiche pour poser vos questions (ex: intolérance au gluten, lactose, arachides, diabète, etc.).';
    _messages.add({
      'sender': 'bot',
      'text': initialText,
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? text]) async {
    final messageText = text ?? _controller.text.trim();
    if (messageText.isEmpty || _loading) return;

    if (text == null) {
      _controller.clear();
    }

    setState(() {
      _messages.add({'sender': 'user', 'text': messageText});
      _loading = true;
    });
    _scrollToBottom();

    try {
      final res = await ApiService.askChatbot(widget.productId, messageText);
      final aiResponse = res['response'] ?? 'Désolé, je n\'ai pas pu obtenir de réponse.';

      setState(() {
        _messages.add({'sender': 'bot', 'text': aiResponse});
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _messages.add({
          'sender': 'bot',
          'text': 'Oups, je rencontre des difficultés pour me connecter au service d\'intelligence artificielle pour le moment. Veuillez réessayer.'
        });
        _loading = false;
      });
    }
    _scrollToBottom();
  }

  void _askQuickQuestion(String question) {
    _sendMessage(question);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Assistant IA'),
            if (widget.productName != null) ...[
              const SizedBox(height: 2.0),
              Text(
                widget.productName!,
                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w400),
              ),
            ],
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(AppTheme.spacingM),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isSelf = msg['sender'] == 'user';
                return _buildChatBubble(msg['text'] as String, isSelf);
              },
            ),
          ),
          if (_loading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingXS),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(AppTheme.radiusM),
                      border: Border.all(color: AppTheme.divider, width: 1),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Analyse en cours...',
                          style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          if (widget.productId != null)
            Container(
              height: 44,
              color: AppTheme.card,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingS, vertical: AppTheme.spacingXS),
                children: [
                  _buildChip('Allergènes', AppIcons.allergens, () => _askQuickQuestion('Quels sont les allergènes présents ?')),
                  _buildChip('Ingrédients', AppIcons.ingredients, () => _askQuickQuestion('Quels sont les ingrédients ?')),
                  _buildChip('Sans Gluten', Icons.spa_rounded, () => _askQuickQuestion('Est-ce sans gluten ?')),
                  _buildChip('Présentation', AppIcons.info, () => _askQuickQuestion('Pouvez-vous me présenter ce produit ?')),
                ],
              ),
            ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.all(AppTheme.spacingS),
              decoration: BoxDecoration(
                color: AppTheme.card,
                border: Border(top: BorderSide(color: AppTheme.divider, width: 1)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Posez une question...',
                        hintStyle: GoogleFonts.inter(color: AppTheme.textSecondary.withValues(alpha: 0.5), fontSize: 13),
                        filled: true,
                        fillColor: AppTheme.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: 8),
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
                      onSubmitted: (_) => _sendMessage(),
                      enabled: !_loading,
                    ),
                  ),
                  const SizedBox(width: AppTheme.spacingXS),
                  GestureDetector(
                    onTap: _loading ? null : () => _sendMessage(),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(color: AppTheme.accent, shape: BoxShape.circle),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(String text, bool isSelf) {
    return Align(
      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppTheme.spacingXS),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
        decoration: BoxDecoration(
          color: isSelf ? AppTheme.accent : AppTheme.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppTheme.radiusM),
            topRight: const Radius.circular(AppTheme.radiusM),
            bottomLeft: isSelf ? const Radius.circular(AppTheme.radiusM) : Radius.zero,
            bottomRight: isSelf ? Radius.zero : const Radius.circular(AppTheme.radiusM),
          ),
          border: isSelf ? null : Border.all(color: AppTheme.divider, width: 1),
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Text(
          text,
          style: GoogleFonts.inter(
            color: isSelf ? Colors.white : AppTheme.textPrimary,
            fontSize: 13,
            height: 1.45,
            fontWeight: isSelf ? FontWeight.w500 : FontWeight.w400,
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, IconData icon, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: AppTheme.spacingXS),
      child: ActionChip(
        avatar: Icon(icon, size: 14, color: AppTheme.accent),
        label: Text(label),
        labelStyle: GoogleFonts.inter(color: AppTheme.accent, fontSize: 11, fontWeight: FontWeight.w600),
        backgroundColor: AppTheme.accent.withValues(alpha: 0.06),
        onPressed: _loading ? null : onTap,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          side: BorderSide(color: AppTheme.accent.withValues(alpha: 0.2), width: 0.8),
        ),
      ),
    );
  }
}
