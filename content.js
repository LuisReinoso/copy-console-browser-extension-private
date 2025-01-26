// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Array to store log messages
let logHistory = [];

// Default pattern
let pattern = "[DEBUG]";

// Function to check if message matches pattern
function matchesPattern(message, pattern) {
  if (typeof message === "string") {
    return message.includes(pattern);
  }
  return false;
}

// Override console methods
function overrideConsole() {
  console.log = function (...args) {
    const message = args.join(" ");
    if (matchesPattern(message, pattern)) {
      logHistory.push(message);
    }
    originalConsole.log.apply(console, args);
  };

  console.info = function (...args) {
    const message = args.join(" ");
    if (matchesPattern(message, pattern)) {
      logHistory.push(message);
    }
    originalConsole.info.apply(console, args);
  };

  console.warn = function (...args) {
    const message = args.join(" ");
    if (matchesPattern(message, pattern)) {
      logHistory.push(message);
    }
    originalConsole.warn.apply(console, args);
  };

  console.error = function (...args) {
    const message = args.join(" ");
    if (matchesPattern(message, pattern)) {
      logHistory.push(message);
    }
    originalConsole.error.apply(console, args);
  };
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMatchingLogs") {
    sendResponse({ logs: logHistory });
  } else if (request.action === "updatePattern") {
    pattern = request.pattern;
    sendResponse({ success: true });
  }
  return true;
});

// Initialize console override
overrideConsole();
