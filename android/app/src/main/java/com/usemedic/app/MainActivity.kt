package com.usemedic.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var permissionRequest: PermissionRequest? = null
    private val webViewPermissionCode = 1001

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        // WebSettings configuration
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.javaScriptCanOpenWindowsAutomatically = true

        // Enable cookies and third-party cookies if needed for auth
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Custom WebClient to handle URL loading in-app
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                view?.loadUrl(url)
                return true
            }
        }

        // Custom ChromeClient to handle JavaScript dialogs, console logs, and media permissions
        webView.webChromeClient = object : WebChromeClient() {
            // Handle Jitsi Video Call camera and microphone permission prompts
            override fun onPermissionRequest(request: PermissionRequest?) {
                permissionRequest = request
                val requestedResources = request?.resources ?: arrayOf()
                val permissionsToRequest = mutableListOf<String>()

                for (resource in requestedResources) {
                    if (resource == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                        permissionsToRequest.add(Manifest.permission.CAMERA)
                    } else if (resource == PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                        permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
                    }
                }

                if (permissionsToRequest.isNotEmpty()) {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        permissionsToRequest.toTypedArray(),
                        webViewPermissionCode
                    )
                } else {
                    request?.grant(requestedResources)
                }
            }
        }

        // Load the deployed staging/production server URL
        // EDIT THIS URL TO YOUR DEPLOYED CLOUDFLARE PAGES URL (e.g. https://tanstack-start-app.pages.dev)
        webView.loadUrl("https://usemedic.pages.dev")
    }

    // Handle the permission result from Android OS and delegate back to the WebView's JavaScript engine
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == webViewPermissionCode) {
            val grantedResources = mutableListOf<String>()
            for (i in permissions.indices) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    if (permissions[i] == Manifest.permission.CAMERA) {
                        grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                    } else if (permissions[i] == Manifest.permission.RECORD_AUDIO) {
                        grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    }
                }
            }
            if (grantedResources.isNotEmpty()) {
                permissionRequest?.grant(grantedResources.toTypedArray())
            } else {
                permissionRequest?.deny()
            }
            permissionRequest = null
        }
    }

    // Enable back-button navigation inside the WebView history
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
