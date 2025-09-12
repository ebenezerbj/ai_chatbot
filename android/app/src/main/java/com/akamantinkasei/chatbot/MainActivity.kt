package com.akamantinkasei.chatbot

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.akamantinkasei.chatbot.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val CHATBOT_URL = "https://ai-chatbot-1-a596.onrender.com/"
    private val LOCATION_PERMISSION_REQUEST = 1001
    private val AUDIO_PERMISSION_REQUEST = 1002
    
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
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
                
                // Enable media playback
                mediaPlaybackRequiresUserGesture = false
                
                // Modern web features
                setSupportMultipleWindows(false)
                setGeolocationEnabled(true)
            }
            
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
                }
                
                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    binding.swipeRefresh.isRefreshing = false
                    Toast.makeText(this@MainActivity, "Network error. Pull down to refresh.", Toast.LENGTH_LONG).show()
                }
            }
            
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    // Grant permissions for microphone, camera, location
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
                        println("WebView Console: ${it.message()}")
                    }
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
        binding.webView.destroy()
        super.onDestroy()
    }
}
