# Copy Console Browser Extension

A browser extension that allows developers to easily copy console log messages containing specified patterns (default: `[DEBUG]`). This tool is particularly useful when working with language models (LLMs) and debugging applications.

## Features

- One-click copying of console logs containing a configured pattern
- Configurable pattern matching (default: `[DEBUG]`)
- Visual feedback and notifications when logs are copied
- Works across all console methods (log, info, warn, error)
- Efficient console message interception and processing
- Modular architecture with utility functions for better maintainability

## Installation

1. Clone this repository or download the source code
2. Open your browser's extension management page:
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`
3. Enable "Developer Mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your browser toolbar to copy matching logs
2. Access the options page by right-clicking the extension icon and selecting "Options" to configure the pattern
3. The extension will collect all console messages containing your specified pattern
4. Click the toolbar button to copy all matching logs to your clipboard

## Development

The extension is built using standard web technologies:
- HTML/CSS for the user interface
- JavaScript for the core functionality
- Chrome Extension Manifest V3

### Project Structure

```
├── manifest.json          # Extension configuration
├── background.js         # Background service worker
├── content.js           # Console interception logic
├── inject.js           # Injected content script utilities
├── utils.js           # Shared utility functions
├── popup.html        # Toolbar popup interface
├── popup.js         # Popup functionality
├── options.html    # Settings page
├── options.js     # Settings functionality
├── styles.css    # Shared styles
└── icons/       # Extension icons
```

### Dependencies

The project uses minimal dependencies and is managed with pnpm for better package management.

## Contributing

Feel free to submit issues and enhancement requests! Follow these steps to contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 