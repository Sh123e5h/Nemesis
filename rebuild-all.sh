#!/bin/bash
set -e

echo "🚀 Starting Full Build & Sync Process..."

# 1. Build Web App
echo "📦 Building Web App..."
npm run build

# 2. Sync to Cordova www
echo "🔄 Syncing assets to Cordova www..."
rm -rf nemesis-app/www/*
cp -r dist/* nemesis-app/www/

# 3. Restore Native Cordova Scripts
echo "🛠️ Restoring Native Cordova Bridge scripts..."
# Copy from platform_www to www so they are available in the webview
cp -r nemesis-app/platforms/android/platform_www/* nemesis-app/www/

# 4. Build Signed Android App Bundle (AAB) for Google Play
echo "🤖 Building Signed Android App Bundle..."
cd nemesis-app
npx cordova build android --release --buildConfig build.json -- --packageType=bundle

echo "✅ Done! New AAB generated at nemesis-app/platforms/android/app/build/outputs/bundle/release/app-release.aab"
