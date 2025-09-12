package com.akamantinkasei.chatbot

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.*
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.akamantinkasei.chatbot.databinding.ActivityMainBinding
import java.util.*

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {
    
    private lateinit var binding: ActivityMainBinding
    private var textToSpeech: TextToSpeech? = null
    private val CHATBOT_URL = "https://ai-chatbot-1-a596.onrender.com/"
    private val LOCATION_PERMISSION_REQUEST = 1001
    private val AUDIO_PERMISSION_REQUEST = 1002
    
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialize Text-to-Speech
        textToSpeech = TextToSpeech(this, this)
        
        setupWebView()
        setupSwipeRefresh()
        loadChatbot()
        
        // Request permissions
        requestPermissions()
    }
    
    private fun setupWebView() {
        binding.webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                setSupportZoom(true)
                builtInZoomControls = false
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                
                // Enable media playback and audio features
                mediaPlaybackRequiresUserGesture = false
                
                // Modern web features
                setSupportMultipleWindows(false)
                setGeolocationEnabled(true)
                
                // Enable JavaScript interfaces for better API support
                javaScriptCanOpenWindowsAutomatically = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
            }
            
            // Add JavaScript interface for TTS fallback
            addJavascriptInterface(TTSJavaScriptInterface(), "AndroidTTS")
            
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    
                    return when {
                        // Handle phone calls
                        url.startsWith("tel:") -> {
                            try {
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse(url))
                                startActivity(intent)
                                true
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Cannot open phone dialer", Toast.LENGTH_SHORT).show()
                                true
                            }
                        }
                        
                        // Handle WhatsApp
                        url.startsWith("whatsapp:") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/") -> {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                startActivity(intent)
                                true
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "WhatsApp not installed", Toast.LENGTH_SHORT).show()
                                true
                            }
                        }
                        
                        // Handle SMS
                        url.startsWith("sms:") -> {
                            try {
                                val intent = Intent(Intent.ACTION_SENDTO, Uri.parse(url))
                                startActivity(intent)
                                true
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Cannot open SMS app", Toast.LENGTH_SHORT).show()
                                true
                            }
                        }
                        
                        // Handle email
                        url.startsWith("mailto:") -> {
                            try {
                                val intent = Intent(Intent.ACTION_SENDTO, Uri.parse(url))
                                startActivity(intent)
                                true
                            } catch (e: Exception) {
                                Toast.makeText(this@MainActivity, "Cannot open email app", Toast.LENGTH_SHORT).show()
                                true
                            }
                        }
                        
                        // Handle external URLs that should open in browser
                        url.startsWith("http://") || url.startsWith("https://") -> {
                            // Only allow the chatbot domain to load in WebView
                            if (url.contains("ai-chatbot-1-a596.onrender.com") || url.contains("localhost")) {
                                false // Let WebView handle it
                            } else {
                                // Open external URLs in browser
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    startActivity(intent)
                                    true
                                } catch (e: Exception) {
                                    false // Fallback to WebView
                                }
                            }
                        }
                        
                        else -> false // Let WebView handle other URLs
                    }
                }
                
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    binding.swipeRefresh.isRefreshing = false
                    
                    // Inject JavaScript to enhance TTS support
                    view?.evaluateJavascript("""
                        (function() {
                            // Check if Speech Synthesis API is available
                            if (!window.speechSynthesis) {
                                console.log('Speech Synthesis API not available, setting up fallback');
                                
                                // Create fallback speechSynthesis object
                                window.speechSynthesis = {
                                    speak: function(utterance) {
                                        if (window.AndroidTTS && utterance.text) {
                                            AndroidTTS.speak(utterance.text);
                                        }
                                    },
                                    cancel: function() {
                                        if (window.AndroidTTS) {
                                            AndroidTTS.stop();
                                        }
                                    },
                                    getVoices: function() {
                                        return [];
                                    }
                                };
                                
                                // Create SpeechSynthesisUtterance constructor
                                window.SpeechSynthesisUtterance = function(text) {
                                    this.text = text || '';
                                    this.voice = null;
                                    this.volume = 1;
                                    this.rate = 1;
                                    this.pitch = 1;
                                };
                            } else {
                                console.log('Speech Synthesis API is available');
                            }
                            
                            // Add debug function for testing TTS
                            window.testTTS = function(text) {
                                text = text || 'Hello, this is a test of text to speech functionality.';
                                if (window.speechSynthesis) {
                                    var utterance = new SpeechSynthesisUtterance(text);
                                    window.speechSynthesis.speak(utterance);
                                } else if (window.AndroidTTS) {
                                    AndroidTTS.speak(text);
                                }
                            };
                            
                            console.log('TTS enhancement script loaded');
                        })();
                    """.trimIndent(), null)
                }
                
                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    binding.swipeRefresh.isRefreshing = false
                    Toast.makeText(this@MainActivity, "Network error. Pull down to refresh.", Toast.LENGTH_LONG).show()
                }
            }
            
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    // Grant permissions for microphone, camera, location, and audio
                    request?.grant(request.resources)
                }
                
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }
                
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        println("WebView Console [${it.messageLevel()}]: ${it.message()} at ${it.sourceId()}:${it.lineNumber()}")
                    }
                    return true
                }
                
                override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    // Handle JavaScript alerts that might be related to TTS errors
                    Toast.makeText(this@MainActivity, message ?: "JavaScript Alert", Toast.LENGTH_SHORT).show()
                    result?.confirm()
                    return true
                }
            }
        }
    }
    
    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeResources(
                android.R.color.holo_blue_bright,
                android.R.color.holo_green_light,
                android.R.color.holo_orange_light,
                android.R.color.holo_red_light
            )
            
            setOnRefreshListener {
                loadChatbot()
            }
        }
    }
    
    private fun loadChatbot() {
        binding.swipeRefresh.isRefreshing = true
        binding.webView.loadUrl(CHATBOT_URL)
    }
    
    private fun requestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
        )
        
        val permissionsToRequest = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                LOCATION_PERMISSION_REQUEST
            )
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        when (requestCode) {
            LOCATION_PERMISSION_REQUEST -> {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Toast.makeText(this, "Permissions granted! Chatbot features fully enabled.", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Some features may be limited without permissions.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        textToSpeech?.let {
            it.stop()
            it.shutdown()
        }
        binding.webView.destroy()
        super.onDestroy()
    }
    
    // TextToSpeech.OnInitListener implementation
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            textToSpeech?.let { tts ->
                val result = tts.setLanguage(Locale.US)
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    Toast.makeText(this, "TTS Language not supported", Toast.LENGTH_SHORT).show()
                }
            }
        } else {
            Toast.makeText(this, "TTS Initialization failed", Toast.LENGTH_SHORT).show()
        }
    }
    
    // JavaScript Interface for TTS fallback
    inner class TTSJavaScriptInterface {
        @JavascriptInterface
        fun speak(text: String) {
            textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
        }
        
        @JavascriptInterface
        fun stop() {
            textToSpeech?.stop()
        }
        
        @JavascriptInterface
        fun isAvailable(): Boolean {
            return textToSpeech != null
        }
    }
}
