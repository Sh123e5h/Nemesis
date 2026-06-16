import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nemesis.app',
  appName: 'Nemesis',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'AAB'
    },
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#f8fafc'
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
      backgroundColor: '#00000000'
    },
    Keyboard: {
      resize: 'none',
      style: 'DARK',
      resizeOnFullScreen: false
    },
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#f8fafc",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      androidSplashResourceName: "splash"
    }
  }
};

export default config;
