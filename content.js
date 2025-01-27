(function () {
  const EXTENSION_PREFIX = "[EXTENSION]";
  // Store the original console methods IMMEDIATELY
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  // Store all logs and filter them based on pattern
  const allLogs = [];
  let currentPattern = "[DEBUG]";
  let debugMode = false;

  // Helper function for extension logging
  function extensionLog(...args) {
    if (debugMode) {
      originalConsole.log(EXTENSION_PREFIX, ...args);
    }
  }

  function extensionError(...args) {
    if (debugMode) {
      originalConsole.error(EXTENSION_PREFIX, ...args);
    }
  }

  // Function to filter logs based on current pattern
  function getFilteredLogs() {
    return allLogs.filter(
      (log) =>
        log.message.includes(currentPattern) &&
        !log.message.includes(EXTENSION_PREFIX)
    );
  }

  // Load settings from storage immediately and whenever it changes
  function loadSettings() {
    chrome.storage.sync.get(
      { pattern: "[DEBUG]", debugMode: false },
      (result) => {
        extensionLog("Loaded settings from storage:", result);
        currentPattern = result.pattern;
        debugMode = result.debugMode;
      }
    );
  }

  // Load settings initially
  loadSettings();

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
      if (changes.pattern) {
        extensionLog("Pattern changed in storage:", changes.pattern.newValue);
        currentPattern = changes.pattern.newValue;
      }
      if (changes.debugMode) {
        debugMode = changes.debugMode.newValue;
        extensionLog("Debug mode changed to:", debugMode);
      }
    }
  });

  // Listen for messages from the injected script
  window.addEventListener("message", function (event) {
    // Add origin check for security
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === "CONSOLE_CAPTURE") {
      try {
        const { method, args } = event.data;
        // Properly serialize all arguments
        const message = args
          .map((arg) => {
            try {
              return typeof arg === "object"
                ? JSON.stringify(
                    arg,
                    (_, v) => (typeof v === "bigint" ? v.toString() : v),
                    2
                  )
                : String(arg);
            } catch (e) {
              return `[Unserializable ${typeof arg}]`;
            }
          })
          .join(" ");

        // Store all logs
        allLogs.push({
          type: method.toUpperCase(),
          message: message,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        extensionError("Error processing message:", error);
      }
    }
  });

  // Handle copy requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "copyLogs") {
      extensionLog("Copy request received, using pattern:", currentPattern);

      const filteredLogs = getFilteredLogs();

      if (filteredLogs.length > 0) {
        const logText = filteredLogs
          .map((log) => `[${log.timestamp}] ${log.type}: ${log.message}`)
          .join("\n");

        const copyWithFallback = (text) => {
          return new Promise((resolve, reject) => {
            // Try modern clipboard API first
            if (navigator.clipboard) {
              navigator.clipboard
                .writeText(text)
                .then(resolve)
                .catch((err) => {
                  extensionLog("Modern clipboard failed, trying fallback");
                  fallbackCopyText(text) ? resolve() : reject(err);
                });
            } else {
              fallbackCopyText(text)
                ? resolve()
                : reject(new Error("Clipboard API unavailable"));
            }
          });
        };

        const fallbackCopyText = (text) => {
          try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.select();

            const result = document.execCommand("copy");
            document.body.removeChild(textArea);

            if (!result) throw new Error("Fallback copy failed");
            return true;
          } catch (err) {
            extensionError("Fallback copy failed:", err);
            return false;
          }
        };

        copyWithFallback(logText)
          .then(() => {
            extensionLog("Clipboard write successful");
            sendResponse({
              status: "success",
              logCount: filteredLogs.length,
              currentPattern: currentPattern,
            });
          })
          .catch((err) => {
            extensionError("All copy methods failed:", err);
            sendResponse({
              status: "error",
              error: `${err.name}: ${err.message}`,
              currentPattern: currentPattern,
              details: {
                logLength: logText.length,
                isSecureContext: window.isSecureContext,
                userAgent: navigator.userAgent,
                clipboardWriteSupported: !!navigator.clipboard?.writeText,
                execCommandSupported: document.queryCommandSupported?.("copy"),
              },
            });
          });
      } else {
        sendResponse({
          status: "empty",
          message: "No logs found matching pattern: " + currentPattern,
          currentPattern: currentPattern,
        });
      }
      return true;
    } else if (request.action === "updatePattern") {
      currentPattern = request.pattern;
      extensionLog("Pattern updated to:", currentPattern);
      const filteredLogs = getFilteredLogs();
      sendResponse({
        success: true,
        currentPattern: currentPattern,
        matchingLogs: filteredLogs.length,
      });
      return true;
    } else if (request.action === "updateDebugMode") {
      debugMode = request.debugMode;
      extensionLog("Debug mode updated to:", debugMode);
      sendResponse({ success: true, debugMode: debugMode });
      return true;
    }
  });

  // Immediately inject the capture script when content script loads
  (function injectCaptureScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inject.js");
    script.onload = function () {
      this.remove();
      extensionLog("Capture script injected");
    };
    (document.head || document.documentElement).appendChild(script);
  })();
})();
