package com.usemedic.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private PermissionRequest permissionRequest;
    private static final int WEBVIEW_PERMISSION_CODE = 1001;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                view.loadUrl(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                permissionRequest = request;
                String[] requestedResources = request.getResources();
                List<String> permissionsToRequest = new ArrayList<>();

                for (String resource : requestedResources) {
                    if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        permissionsToRequest.add(Manifest.permission.CAMERA);
                    } else if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
                    }
                }

                if (!permissionsToRequest.isEmpty()) {
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        permissionsToRequest.toArray(new String[0]),
                        WEBVIEW_PERMISSION_CODE
                    );
                } else {
                    request.grant(requestedResources);
                }
            }
        });

        webView.loadUrl("https://usemedic.com.ng");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == WEBVIEW_PERMISSION_CODE) {
            List<String> grantedResources = new ArrayList<>();
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    if (permissions[i].equals(Manifest.permission.CAMERA)) {
                        grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                    } else if (permissions[i].equals(Manifest.permission.RECORD_AUDIO)) {
                        grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    }
                }
            }
            if (!grantedResources.isEmpty()) {
                permissionRequest.grant(grantedResources.toArray(new String[0]));
            } else {
                permissionRequest.deny();
            }
            permissionRequest = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
