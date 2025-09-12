# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep WebView related classes for chatbot functionality
-keep class android.webkit.** { *; }
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.webkit.WebChromeClient { *; }

# Keep JavaScript interface classes
-keepclassmembers class com.akamantinkasei.chatbot.AndroidFeaturesInterface {
   public *;
}

# Keep MainActivity JavaScript bridge methods
-keepclassmembers class com.akamantinkasei.chatbot.MainActivity {
   @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods and JNI
-keepclasseswithmembernames class * {
   native <methods>;
}

# Keep enum classes
-keepclassmembers enum * {
   public static **[] values();
   public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
 public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
   static final long serialVersionUID;
   private static final java.io.ObjectStreamField[] serialPersistentFields;
   !static !transient <fields>;
   private void writeObject(java.io.ObjectOutputStream);
   private void readObject(java.io.ObjectInputStream);
   java.lang.Object writeReplace();
   java.lang.Object readResolve();
}

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
   public static *** d(...);
   public static *** v(...);
   public static *** i(...);
}

# Keep crash reporting
-keep class com.google.firebase.crashlytics.** { *; }
-dontwarn com.google.firebase.crashlytics.**
