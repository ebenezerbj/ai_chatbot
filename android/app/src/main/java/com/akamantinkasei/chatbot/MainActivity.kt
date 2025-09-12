package com.akamantinkasei.chatbot

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
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
                    return false // Let WebView handle all URLs
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
