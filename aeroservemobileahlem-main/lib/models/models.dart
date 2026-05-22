class User {
  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final int? roleId;
  final String? roleName;

  User({required this.id, required this.firstName, required this.lastName, required this.email, this.roleId, this.roleName});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'],
        firstName: json['first_name'] ?? '',
        lastName: json['last_name'] ?? '',
        email: json['email'] ?? '',
        roleId: json['role_id'],
        roleName: json['role'] is Map ? json['role']['name'] : json['role_name'],
      );

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();
}

class Role {
  final int id;
  final String name;

  Role({required this.id, required this.name});
  factory Role.fromJson(Map<String, dynamic> json) => Role(id: json['id'], name: json['name']);
}

class Sale {
  final int id;
  final int userId;
  final double totalAmount;
  final String paymentMethod;
  final String status;
  final DateTime saleDate;
  final List<SaleItem>? items;

  Sale({required this.id, required this.userId, required this.totalAmount, required this.paymentMethod, required this.status, required this.saleDate, this.items});

  factory Sale.fromJson(Map<String, dynamic> json) => Sale(
        id: json['id'],
        userId: json['user_id'] ?? 0,
        totalAmount: (json['total_amount'] ?? 0).toDouble(),
        paymentMethod: json['payment_method'] ?? 'cash',
        status: json['status'] ?? 'pending',
        saleDate: DateTime.tryParse(json['sale_date'] ?? json['created_at'] ?? '') ?? DateTime.now(),
        items: json['items'] != null ? (json['items'] as List).map((e) => SaleItem.fromJson(e)).toList() : null,
      );
}

class SaleItem {
  final int id;
  final int saleId;
  final int productId;
  final String? productName;
  final int quantity;
  final double unitPrice;

  SaleItem({required this.id, required this.saleId, required this.productId, this.productName, required this.quantity, required this.unitPrice});

  factory SaleItem.fromJson(Map<String, dynamic> json) => SaleItem(
        id: json['id'] ?? 0,
        saleId: json['sale_id'] ?? 0,
        productId: json['product_id'] ?? 0,
        productName: json['product'] is Map ? json['product']['name'] : json['product_name'],
        quantity: json['quantity'] ?? 0,
        unitPrice: (json['unit_price'] ?? 0).toDouble(),
      );
}

class InternalOrder {
  final int id;
  final int userId;
  final String status;
  final String? notes;
  final DateTime orderDate;
  final List<OrderItem>? items;

  InternalOrder({required this.id, required this.userId, required this.status, this.notes, required this.orderDate, this.items});

  factory InternalOrder.fromJson(Map<String, dynamic> json) => InternalOrder(
        id: json['id'],
        userId: json['user_id'] ?? 0,
        status: json['status'] ?? 'pending',
        notes: json['notes'],
        orderDate: DateTime.tryParse(json['order_date'] ?? json['created_at'] ?? '') ?? DateTime.now(),
        items: json['items'] != null ? (json['items'] as List).map((e) => OrderItem.fromJson(e)).toList() : null,
      );
}

class OrderItem {
  final int id;
  final int orderId;
  final int productId;
  final String? productName;
  final int quantity;

  OrderItem({required this.id, required this.orderId, required this.productId, this.productName, required this.quantity});

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json['id'] ?? 0,
        orderId: json['internal_order_id'] ?? json['order_id'] ?? 0,
        productId: json['product_id'] ?? 0,
        productName: json['product'] is Map ? json['product']['name'] : json['product_name'],
        quantity: json['quantity'] ?? 0,
      );
}

class Planning {
  final int id;
  final int userId;
  final String? userName;
  final DateTime date;
  final String? shiftStart;
  final String? shiftEnd;
  final bool isDayOff;

  Planning({required this.id, required this.userId, this.userName, required this.date, this.shiftStart, this.shiftEnd, required this.isDayOff});

  factory Planning.fromJson(Map<String, dynamic> json) => Planning(
        id: json['id'],
        userId: json['user_id'] ?? 0,
        userName: json['user'] is Map ? '${json['user']['first_name']} ${json['user']['last_name']}' : json['user_name'],
        date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
        shiftStart: json['shift_start'],
        shiftEnd: json['shift_end'],
        isDayOff: json['is_day_off'] == true || json['is_day_off'] == 1,
      );
}

class AppNotification {
  final int id;
  final String title;
  final String body;
  final String? readAt;

  AppNotification({required this.id, required this.title, required this.body, this.readAt});

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'],
        title: json['title'] ?? '',
        body: json['body'] ?? json['message'] ?? '',
        readAt: json['read_at'],
      );
}

class DashboardData {
  final int todaySales;
  final double todayRevenue;
  final int pendingOrders;
  final int totalUsers;
  final List<Sale> recentSales;
  final List<InternalOrder> recentOrders;

  DashboardData({
    required this.todaySales,
    required this.todayRevenue,
    required this.pendingOrders,
    required this.totalUsers,
    required this.recentSales,
    required this.recentOrders,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) => DashboardData(
        todaySales: json['today_sales'] ?? 0,
        todayRevenue: (json['today_revenue'] ?? 0).toDouble(),
        pendingOrders: json['pending_orders'] ?? 0,
        totalUsers: json['total_users'] ?? 0,
        recentSales: json['recent_sales'] != null ? (json['recent_sales'] as List).map((e) => Sale.fromJson(e)).toList() : [],
        recentOrders: json['recent_orders'] != null ? (json['recent_orders'] as List).map((e) => InternalOrder.fromJson(e)).toList() : [],
      );
}
