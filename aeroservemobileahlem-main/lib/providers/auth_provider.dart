import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = true;
  bool _isAuthenticated = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  AuthProvider() {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userData = prefs.getString('user');
      if (token != null && userData != null) {
        final user = User.fromJson(jsonDecode(userData));
        final role = user.roleName?.toUpperCase() ?? '';
        final allowedRoles = ['CAISSIER', 'SUPER_ADMIN', 'RESPONSABLE_HYGIENE', 'RESPONSABLE_FB'];
        
        if (allowedRoles.contains(role)) {
          _user = user;
          _isAuthenticated = true;
        } else {
          // Automatically discard invalid session if role list changes
          await prefs.remove('token');
          await prefs.remove('user');
          _isAuthenticated = false;
        }
      }
    } catch (_) {
      _isAuthenticated = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    final data = await ApiService.post('login', {
      'email': email,
      'password': password,
    });

    final token = data['access_token'];
    final userJson = data['user'];
    final tempUser = User.fromJson(userJson);
    final role = tempUser.roleName?.toUpperCase() ?? '';
    final allowedRoles = ['CAISSIER', 'SUPER_ADMIN', 'RESPONSABLE_HYGIENE', 'RESPONSABLE_FB'];

    if (!allowedRoles.contains(role)) {
      throw ApiException(
        statusCode: 403,
        message: 'Accès refusé : Ce profil n\'est pas autorisé à utiliser l\'application mobile.',
      );
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('user', jsonEncode(userJson));

    _user = tempUser;
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await ApiService.post('logout', {});
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    try {
      final data = await ApiService.get('profile');
      _user = User.fromJson(data);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', jsonEncode(data));
      notifyListeners();
    } catch (_) {}
  }

  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? avatarPath,
  }) async {
    final res = await ApiService.updateProfile(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      avatarPath: avatarPath,
    );

    final userJson = res['user'];
    if (userJson != null) {
      _user = User.fromJson(userJson);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', jsonEncode(userJson));
      notifyListeners();
    }
  }
}
