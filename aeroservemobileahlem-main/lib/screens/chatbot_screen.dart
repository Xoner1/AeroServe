import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/app_theme.dart';
import '../core/app_icons.dart';
import '../services/api_service.dart';

class ChatbotScreen extends StatefulWidget {
  final int productId;
  final String productName;

  const ChatbotScreen({
    super.key,
    required this.productId,
    required this.productName,
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
    _messages.add({
      'sender': 'bot',
      'text': 'Bonjour ! Je suis l\'assistant nutritionnel intelligent d\'AeroServe. Posez-moi toutes vos questions sur la composition, les ingrédients et les allergènes pour le produit "${widget.productName}".'
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
      backgroundColor: AppTheme.primary,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Assistant IA AeroServe',
              style: GoogleFonts.inter(fontSize: 15.5, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2.0),
            Text(
              widget.productName,
              style: GoogleFonts.inter(fontSize: 11.5, color: Colors.white70, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: AppTheme.primaryLight.withValues(alpha: 0.5),
            height: 1.0,
          ),
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
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(AppTheme.radiusM),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.accent,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Analyse en cours...',
                          style: GoogleFonts.inter(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // QUICK SUGGESTION CHIPS (NO EMOJIS, ELEGANT ICONS MAPPING)
          Container(
            height: 48,
            color: AppTheme.primaryLight,
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

          // TEXT INPUT PANEL
          SafeArea(
            child: Container(
              padding: const EdgeInsets.all(AppTheme.spacingS),
              decoration: const BoxDecoration(
                color: AppTheme.primaryLight,
                border: Border(
                  top: BorderSide(color: AppTheme.primary, width: 0.5),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Posez une question sur le produit...',
                        hintStyle: GoogleFonts.inter(color: Colors.white38, fontSize: 14),
                        filled: true,
                        fillColor: AppTheme.primary,
                        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusXL),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusXL),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusXL),
                          borderSide: const BorderSide(color: AppTheme.accent, width: 1.0),
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
                      decoration: const BoxDecoration(
                        color: AppTheme.accent,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.send_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
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
        margin: const EdgeInsets.only(bottom: AppTheme.spacingS),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingM, vertical: AppTheme.spacingS),
        decoration: BoxDecoration(
          color: isSelf ? AppTheme.accent : AppTheme.primaryLight,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppTheme.radiusM),
            topRight: const Radius.circular(AppTheme.radiusM),
            bottomLeft: isSelf ? const Radius.circular(AppTheme.radiusM) : Radius.zero,
            bottomRight: isSelf ? Radius.zero : const Radius.circular(AppTheme.radiusM),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Text(
          text,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 13.5,
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
        labelStyle: GoogleFonts.inter(
          color: Colors.white.withValues(alpha: 0.9),
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        backgroundColor: AppTheme.primary,
        onPressed: _loading ? null : onTap,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.5), width: 0.8),
        ),
      ),
    );
  }
}
