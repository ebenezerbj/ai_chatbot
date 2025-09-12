package com.akamantinkasei.chatbot

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import androidx.appcompat.app.AppCompatActivity
import com.akamantinkasei.chatbot.databinding.ActivitySplashBinding

class SplashActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySplashBinding
    private val SPLASH_DELAY = 2500L // 2.5 seconds
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupAnimations()
        startMainActivity()
    }
    
    private fun setupAnimations() {
        // Fade in animation for logo
        val fadeIn = AnimationUtils.loadAnimation(this, android.R.anim.fade_in).apply {
            duration = 1000
        }
        
        // Scale animation for logo
        val scaleAnimation = AnimationUtils.loadAnimation(this, R.anim.scale_bounce)
        
        binding.logoImageView.apply {
            startAnimation(fadeIn)
            fadeIn.setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationStart(animation: Animation?) {}
                override fun onAnimationRepeat(animation: Animation?) {}
                override fun onAnimationEnd(animation: Animation?) {
                    startAnimation(scaleAnimation)
                }
            })
        }
        
        // Fade in animation for app name and subtitle
        val textFadeIn = AnimationUtils.loadAnimation(this, android.R.anim.fade_in).apply {
            duration = 800
            startOffset = 500
        }
        
        binding.appNameTextView.startAnimation(textFadeIn)
        binding.subtitleTextView.startAnimation(textFadeIn)
    }
    
    private fun startMainActivity() {
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }, SPLASH_DELAY)
    }
}
