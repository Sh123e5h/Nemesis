/**
 * Detects if the app is running inside a native Cordova WebView container.
 * window.cordova is injected by the Cordova runtime at startup.
 */
export function isNativeApp(): boolean {
  return typeof (window as any).cordova !== 'undefined';
}

/**
 * Opens a URL in the Android system browser (bypasses WebView restrictions).
 * Uses the '_system' target which triggers the Android Intent system, launching
 * Chrome or the default browser where PDFs and Drive files render correctly.
 */
export function openInSystemBrowser(url: string): void {
  if (isNativeApp()) {
    // Cordova's allow-intent config routes _system opens to the native browser
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
