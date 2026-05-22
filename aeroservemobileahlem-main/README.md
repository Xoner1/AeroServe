# AeroServe Mobile

Mobile application for the AeroServe airport catering management system, built with **Flutter 3.x** and **Dart**.

## Requirements

- Flutter SDK >= 3.5.4
- Dart SDK (included with Flutter)
- Android Studio / Xcode (for emulators)
- Java 17 (for Android builds)

## Installation

```bash
# Clone the repository
git clone git@github.com:AeroServe-Solution/AeroServeMobile.git
cd AeroServeMobile

# Install dependencies
flutter pub get
```

## Configuration

Update the API base URL in `lib/services/api_service.dart`:

```dart
static const String baseUrl = 'http://<YOUR-SERVER-IP>:8000/api';
```

Use your machine's local IP (not `localhost`) when testing on a physical device.

## Running the App

```bash
# Check connected devices
flutter devices

# Run on connected device or emulator
flutter run

# Run on a specific device
flutter run -d <device-id>
```

## Build

```bash
# Build debug APK
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
flutter build apk --debug

# Build release APK
flutter build apk --release
```

The APK will be at `build/app/outputs/flutter-apk/`.

## Project Structure

```
lib/
├── main.dart           # App entry point + routes
├── models/             # Data models (User, Product, Stock, etc.)
├── providers/          # State management (Provider)
├── screens/            # App screens (login, dashboard, etc.)
├── services/           # API service layer
└── widgets/            # Reusable UI components
```

## Features

- JWT-based login
- Role-aware navigation
- Dashboard with key stats
- Stock management
- Internal order management
- Menu viewing
- Sales tracking
- Hygiene reports
- Push-style notifications
