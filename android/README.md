# Android APK Build Instructions

## Prerequisites

1. **Java Development Kit (JDK) 11 or higher**
   - Download from: https://adoptium.net/
   - Verify installation: `java -version`

2. **Android Studio** (Recommended) or **Android SDK Command Line Tools**
   - Download Android Studio: https://developer.android.com/studio
   - Or SDK Command Line Tools: https://developer.android.com/studio#command-tools

3. **Android SDK Setup**
   - API Level 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools

## Build Process

### Option 1: Using Android Studio (Recommended)

1. Open Android Studio
2. Select "Open an existing project"
3. Navigate to `android/` folder in this project
4. Wait for Gradle sync to complete
5. Build > Generate Signed Bundle / APK
6. Choose APK and follow the signing wizard
7. APK will be generated in `android/app/build/outputs/apk/`

### Option 2: Command Line Build

1. Navigate to the android directory:
   ```bash
   cd android
   ```

2. Make gradlew executable (Linux/Mac):
   ```bash
   chmod +x gradlew
   ```

3. Build debug APK:
   ```bash
   ./gradlew assembleDebug
   ```

4. Build release APK (requires signing):
   ```bash
   ./gradlew assembleRelease
   ```

5. Find APK in: `app/build/outputs/apk/debug/` or `app/build/outputs/apk/release/`

### Option 3: Windows Command Line

1. Open Command Prompt or PowerShell
2. Navigate to android directory:
   ```cmd
   cd android
   ```

3. Build debug APK:
   ```cmd
   gradlew.bat assembleDebug
   ```

4. Build release APK:
   ```cmd
   gradlew.bat assembleRelease
   ```

## APK Signing (For Release)

### Generate Keystore:
```bash
keytool -genkey -v -keystore chatbot-release-key.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
```

### Sign APK:
```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore chatbot-release-key.keystore app-release-unsigned.apk chatbot
```

### Align APK:
```bash
zipalign -v 4 app-release-unsigned.apk ChatbotApp.apk
```

## Installation

### Install on Device:
```bash
adb install app-debug.apk
```

### Or transfer APK to device and install manually

## Features

- **Full-screen WebView** displaying the chatbot interface
- **Splash screen** with animated logo
- **Pull-to-refresh** functionality
- **Permission handling** for location, microphone, and camera
- **Back button** navigation within WebView
- **Network error handling** with user feedback
- **Modern Material Design** UI

## App Permissions

- `INTERNET` - Required for chatbot communication
- `ACCESS_FINE_LOCATION` - For location-based services
- `ACCESS_COARSE_LOCATION` - Backup location access
- `RECORD_AUDIO` - For voice features
- `CAMERA` - For document scanning capabilities

## Troubleshooting

### Common Issues:

1. **Gradle sync failed**
   - Ensure proper Android SDK installation
   - Check internet connection for dependency downloads

2. **Build failed**
   - Verify Java JDK version (11+)
   - Clean and rebuild: `./gradlew clean && ./gradlew assembleDebug`

3. **APK not installing**
   - Enable "Unknown sources" in device settings
   - Check device storage space
   - Verify APK is not corrupted

4. **App crashes on startup**
   - Check device Android version (minimum API 24 / Android 7.0)
   - Verify network connectivity for chatbot URL

### Log Debugging:
```bash
adb logcat | grep ChatBot
```

## Configuration

- **Chatbot URL**: Configured in `MainActivity.kt` as `CHATBOT_URL`
- **App Name**: Defined in `strings.xml`
- **Theme Colors**: Customizable in `colors.xml`
- **Permissions**: Listed in `AndroidManifest.xml`

## File Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/akamantinkasei/chatbot/
│   │   │   ├── MainActivity.kt
│   │   │   └── SplashActivity.kt
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   ├── values/
│   │   │   ├── drawable/
│   │   │   └── mipmap/
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── gradle/
├── build.gradle
└── gradle.properties
```
