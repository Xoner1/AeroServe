import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Production backend API URL (can be customized dynamically via SharedPreferences)
  static String baseUrl = 'https://aeroserve.alwaysdata.net/api';

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('api_url');
    if (savedUrl != null && savedUrl.isNotEmpty) {
      baseUrl = savedUrl;
    }
  }

  static Future<void> setBaseUrl(String newUrl) async {
    if (newUrl.isEmpty) return;
    // Normalize URL
    String formattedUrl = newUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://$formattedUrl';
    }
    if (!formattedUrl.endsWith('/api')) {
      formattedUrl = formattedUrl.endsWith('/') ? '${formattedUrl}api' : '$formattedUrl/api';
    }
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_url', formattedUrl);
    baseUrl = formattedUrl;
  }

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Uri _uri(String endpoint) {
    // Dynamic initialization check
    return Uri.parse('$baseUrl${endpoint.startsWith('/') ? endpoint : '/$endpoint'}');
  }

  static Future<dynamic> get(String endpoint) async {
    await init(); // Ensure we have the latest URL
    final response = await http.get(
      _uri(endpoint),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    await init();
    final response = await http.post(
      _uri(endpoint),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    await init();
    final response = await http.put(
      _uri(endpoint),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Future<dynamic> delete(String endpoint) async {
    await init();
    final response = await http.delete(
      _uri(endpoint),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body);
    } else {
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      throw ApiException(
        statusCode: response.statusCode,
        message: body['message'] ?? 'Erreur serveur',
      );
    }
  }

  static Future<dynamic> askChatbot(int productId, String message) async {
    return await post('chatbot/ask', {
      'product_id': productId,
      'message': message,
    });
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => message;
}
