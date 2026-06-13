import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:aeroserve_mobile/screens/dashboard_screen.dart';
import 'package:aeroserve_mobile/screens/orders_screen.dart';
import 'package:aeroserve_mobile/providers/auth_provider.dart';
import 'package:aeroserve_mobile/models/models.dart';

// ─── HTTP MOCKS FOR HEADLESS VERIFICATION ───

class MockHttpOverrides extends HttpOverrides {
  final Map<String, String> responses;
  MockHttpOverrides(this.responses);

  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return MockHttpClient(responses);
  }
}

class MockHttpClient implements HttpClient {
  final Map<String, String> responses;
  MockHttpClient(this.responses);

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    return MockHttpClientRequest(responses, url.path);
  }

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockHttpClientRequest implements HttpClientRequest {
  final Map<String, String> responses;
  final String path;
  MockHttpClientRequest(this.responses, this.path);

  @override
  final HttpHeaders headers = MockHttpHeaders();

  @override
  void write(Object? obj) {}

  @override
  Future<dynamic> addStream(Stream<List<int>> stream) async {}

  @override
  Future<HttpClientResponse> close() async {
    String body = '{}';
    for (final key in responses.keys) {
      if (path.endsWith(key)) {
        body = responses[key]!;
        break;
      }
    }
    return MockHttpClientResponse(body);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockHttpClientResponse implements HttpClientResponse {
  final String body;
  MockHttpClientResponse(this.body);

  @override
  int get statusCode => 200;

  @override
  int get contentLength => utf8.encode(body).length;

  @override
  bool get isRedirect => false;

  @override
  List<RedirectInfo> get redirects => const [];

  @override
  bool get persistentConnection => false;

  @override
  String get reasonPhrase => 'OK';

  @override
  final HttpHeaders headers = MockHttpHeaders();

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    final bytes = utf8.encode(body);
    final stream = Stream<List<int>>.value(bytes);
    return stream.listen(onData, onError: onError, onDone: onDone, cancelOnError: cancelOnError);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockHttpHeaders implements HttpHeaders {
  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

// ─── AUTH PROVIDER MOCK ───

class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  final User? mockUser;
  MockAuthProvider(this.mockUser);

  @override
  User? get user => mockUser;

  @override
  bool get isAuthenticated => mockUser != null;

  @override
  bool get isLoading => false;

  @override
  Future<void> login(String email, String password) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<void> refreshProfile() async {}

  @override
  Future<void> updateProfile({required String firstName, required String lastName, String? phone, String? avatarPath}) async {}
}

void main() {
  // Mock API Responses
  final mockResponses = {
    '/dashboard': jsonEncode({
      'today_sales': 10,
      'today_revenue': 15000.0,
      'pending_orders': 3,
      'total_users': 15,
      'recent_sales': [],
      'recent_orders': [],
      'popular_products': [],
      'sales_by_pdv': [],
    }),
    '/points-de-vente': jsonEncode([
      {'id': 1, 'name': 'PDV Terminal 1'},
      {'id': 2, 'name': 'PDV Terminal 2'},
    ]),
    '/products': jsonEncode({
      'data': [
        {'id': 1, 'name': 'Coca Cola 33cl', 'type': 'commercial', 'price': 150.0},
        {'id': 2, 'name': 'Croissant Chocolat', 'type': 'food', 'price': 200.0},
      ]
    }),
    '/internal-orders': jsonEncode({
      'data': [
        {
          'id': 1,
          'user_id': 1,
          'status': 'pending',
          'notes': 'urgent',
          'order_date': '2026-06-13T22:00:00Z',
          'items': [
            {
              'id': 1,
              'internal_order_id': 1,
              'product_id': 1,
              'product_name': 'Coca Cola 33cl',
              'quantity': 5
            }
          ]
        }
      ]
    }),
  };

  setUpAll(() {
    HttpOverrides.global = MockHttpOverrides(mockResponses);
    SharedPreferences.setMockInitialValues({});
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('DashboardScreen RESPONSABLE_FB tests', () {
    testWidgets('Hides sales/revenue cards and tables for RESPONSABLE_FB', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final fbUser = User(
        id: 1,
        firstName: 'Ahlem',
        lastName: 'F&B',
        email: 'fb@aeroserve.com',
        roleName: 'RESPONSABLE_FB',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>(
            create: (_) => MockAuthProvider(fbUser),
            child: const DashboardScreen(),
          ),
        ),
      );

      // Wait for async load
      await tester.pumpAndSettle();

      // Check stats cards shown vs hidden
      expect(find.text("COMMANDES"), findsOneWidget);
      expect(find.text("UTILISATEURS"), findsOneWidget);
      expect(find.text("VENTES AUJOURD'HUI"), findsNothing);
      expect(find.text("REVENUS"), findsNothing);

      // Check lists/headers shown vs hidden
      expect(find.text("Commandes récentes"), findsOneWidget);
      expect(find.text("Ventes récentes"), findsNothing);
      expect(find.text("Performance PDV"), findsNothing);
    });

    testWidgets('Shows all stats and sections for SUPER_ADMIN', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final adminUser = User(
        id: 2,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@aeroserve.com',
        roleName: 'SUPER_ADMIN',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>(
            create: (_) => MockAuthProvider(adminUser),
            child: const DashboardScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check all stats cards are present
      expect(find.text("COMMANDES"), findsOneWidget);
      expect(find.text("UTILISATEURS"), findsOneWidget);
      expect(find.text("VENTES AUJOURD'HUI"), findsOneWidget);
      expect(find.text("REVENUS"), findsOneWidget);

      // Check other sections are present
      expect(find.text("Commandes récentes"), findsOneWidget);
      expect(find.text("Ventes récentes"), findsOneWidget);
    });
  });

  group('OrdersScreen product picker tests', () {
    testWidgets('Opens searchable product picker bottom sheet', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final fbUser = User(
        id: 1,
        firstName: 'Ahlem',
        lastName: 'F&B',
        email: 'fb@aeroserve.com',
        roleName: 'RESPONSABLE_FB',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>(
            create: (_) => MockAuthProvider(fbUser),
            child: const OrdersScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap on FloatingActionButton to open create order modal
      final fab = find.byType(FloatingActionButton);
      expect(fab, findsOneWidget);
      await tester.tap(fab);
      await tester.pumpAndSettle();

      // Check creation modal is open
      expect(find.text('Nouvelle Commande'), findsOneWidget);

      // Verify default type chip selected (Alimentaire) and food products are shown
      // Croissant Chocolat is food, Coca Cola 33cl is commercial.
      expect(find.text('Croissant Chocolat'), findsOneWidget);
      expect(find.text('Coca Cola 33cl'), findsNothing);

      // Tap on Commercial chip to show commercial products
      final commercialChip = find.text('Commercial');
      expect(commercialChip, findsOneWidget);
      await tester.tap(commercialChip);
      await tester.pumpAndSettle();

      // Verify Coca Cola 33cl is shown, but Croissant Chocolat is not shown
      expect(find.text('Coca Cola 33cl'), findsOneWidget);
      expect(find.text('Croissant Chocolat'), findsNothing);

      // Tap "Ajouter" button for Coca Cola 33cl
      final addButton = find.text('Ajouter');
      expect(addButton, findsOneWidget);
      await tester.tap(addButton);
      await tester.pumpAndSettle();

      // Verify counter value is 1, and the submit button displays "Enregistrer (1 articles)"
      expect(find.text('1'), findsOneWidget);
      expect(find.text('Enregistrer (1 articles)'), findsOneWidget);

      // Tap submit button to close dialog and trigger submit
      await tester.tap(find.text('Enregistrer (1 articles)'));
      await tester.pumpAndSettle();

      // Verify modal closed
      expect(find.text('Nouvelle Commande'), findsNothing);
    });
  });
}
