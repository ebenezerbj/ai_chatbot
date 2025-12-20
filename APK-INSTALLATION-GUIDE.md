# APK Installation Guide - AKCB Chatbot

## Fix "Problem Parsing Package" Error

This error occurs when the APK cannot be installed. Follow these steps:

### Solution 1: Enable Unknown Sources (Android 7.0 and below)

1. Go to **Settings**
2. Navigate to **Security**
3. Enable **Unknown Sources**
4. Try installing the APK again

### Solution 2: Install from This Source (Android 8.0+)

1. Attempt to install the APK
2. When prompted "For your security, your phone is not allowed to install unknown apps from this source"
3. Tap **Settings**
4. Enable **Allow from this source**
5. Go back and try installing again

### Solution 3: Clear Package Installer Cache

1. Go to **Settings** → **Apps**
2. Find **Package Installer** (or **Google Play Store**)
3. Tap **Storage**
4. Tap **Clear Cache** and **Clear Data**
5. Try installing the APK again

### Solution 4: Use ADB (For Developers)

If you have Android Debug Bridge installed:

```bash
adb install -r AKCB-Chatbot-v1.5.0.apk
```

The `-r` flag reinstalls the app if it already exists.

### Solution 5: Transfer via USB

1. Connect phone to PC via USB
2. Copy APK to phone's **Downloads** folder
3. Open **Files** app on phone
4. Navigate to **Downloads**
5. Tap the APK file to install

### Solution 6: Check Android Version

Make sure your Android version is **7.0 (API 24) or higher**:
- Go to **Settings** → **About Phone**
- Check **Android Version**
- Minimum required: Android 7.0

## Installation Steps

1. **Download APK** to your device
2. **Enable Installation** from unknown sources (see above)
3. **Locate the APK** in Downloads or File Manager
4. **Tap the APK file**
5. **Review permissions**
6. **Tap Install**
7. **Tap Open** when installation completes

## Required Permissions

The app needs these permissions:
- **Internet** - To communicate with banking servers
- **Network State** - To check connection status
- **Geolocation** (Optional) - For branch locator feature

## Troubleshooting

### "App Not Installed" Error
- **Cause**: Conflicting package name or corrupted APK
- **Fix**: Uninstall any previous version first

### "Installation Blocked" Error
- **Cause**: Play Protect blocking installation
- **Fix**: 
  1. Open **Google Play Store**
  2. Tap profile icon → **Play Protect**
  3. Tap settings gear → Disable **Scan apps with Play Protect**
  4. Install APK
  5. Re-enable Play Protect

### "Signature Verification Failed"
- **Cause**: APK was modified after signing
- **Fix**: Download a fresh copy of the APK

### Device Storage Issues
- **Cause**: Insufficient storage space
- **Fix**: Free up at least 50MB of storage

## Verification After Installation

1. **Open the app**
2. **Check for "AMA" chat icon**
3. **Test chat functionality**
4. **Try account balance inquiry** (requires OTP)

## Uninstall Previous Version

If you have an older version installed:

1. Go to **Settings** → **Apps**
2. Find **AKCB Chatbot**
3. Tap **Uninstall**
4. Confirm uninstallation
5. Install the new APK

## Support

If you continue to have issues:
- **Email**: support@akamantinkasei.com
- **Phone**: +233 24 231 2059

## Technical Details

- **Package Name**: com.akamantinkasei.chatbot
- **Version**: 1.5.0 (Build 6)
- **Minimum SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **File Size**: ~3-4 MB
