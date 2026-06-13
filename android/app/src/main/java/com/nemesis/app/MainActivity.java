package com.nemesis.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import android.content.ComponentCallbacks2;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 🚀 FIX OVERLAP: Ensure content doesn't flow behind status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Force status bar to pure white
            getWindow().setStatusBarColor(Color.WHITE); 
            
            // 🌚 FORCE BLACK ICONS: Explicitly set dark appearance for status bar icons
            View decorView = getWindow().getDecorView();
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), decorView);
            controller.setAppearanceLightStatusBars(true);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.setOverScrollMode(View.OVER_SCROLL_ALWAYS);
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            
            WebSettings settings = webView.getSettings();
            
            // 🚀 DISABLE AUTOMATIC DARK MODE: Enforce light mode style for the WebView
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
            } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                @SuppressWarnings("deprecation")
                int forceDarkOff = WebSettingsCompat.FORCE_DARK_OFF;
                WebSettingsCompat.setForceDark(settings, forceDarkOff);
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().clearCache(false);
                this.bridge.getWebView().evaluateJavascript("window.dispatchEvent(new Event('capacitor:trimMemory'));", null);
            }
        }
    }
}
