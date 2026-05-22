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
        _user = User.fromJson(jsonDecode(userData));
        _isAuthenticated = true;
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

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('user', jsonEncode(userJson));

    _user = User.fromJson(userJson);
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
}
