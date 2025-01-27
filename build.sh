#!/bin/bash

TARGET_BROWSER=${1:-chrome}

# Create output directory
mkdir -p dist/$TARGET_BROWSER

# Copy ALL essential files
cp -R icons content.js inject.js options.html popup.html styles.css utils.js dist/$TARGET_BROWSER/

# Copy browser-specific JS files
cp background.js popup.js options.js dist/$TARGET_BROWSER/

# Browser-specific processing
case $TARGET_BROWSER in
  chrome)
    cp manifest-v3.json dist/$TARGET_BROWSER/manifest.json
    cp background.js dist/$TARGET_BROWSER/
    ;;
  firefox)
    cp manifest-v2.json dist/$TARGET_BROWSER/manifest.json
    cp background.js dist/$TARGET_BROWSER/
    ;;
  *)
    echo "Invalid browser target. Use 'chrome' or 'firefox'"
    exit 1
    ;;
esac

echo "Build complete for $TARGET_BROWSER in dist/$TARGET_BROWSER/" 