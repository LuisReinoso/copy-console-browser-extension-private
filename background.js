// Initialize pattern when extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[EXTENSION] Extension installed/updated");
  // Set default pattern if not already set
  const result = await chrome.storage.sync.get("pattern");
  if (!result.pattern) {
    console.log("[EXTENSION] Setting default pattern");
    await chrome.storage.sync.set({ pattern: "[DEBUG]" });
  }

  // Inject the console override script into all tabs
  chrome.tabs.query(
    { url: ["http://*/*", "https://*/*", "ftp://*/*"] },
    function (tabs) {
      tabs.forEach((tab) => {
        // Add additional safety check
        if (!tab.url || !isValidUrl(tab.url)) return;

        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: () => {
              const originals = {
                log: console.log.bind(console),
                info: console.info.bind(console),
                warn: console.warn.bind(console),
                error: console.error.bind(console),
              };

              ["log", "info", "warn", "error"].forEach((method) => {
                console[method] = function (...args) {
                  // Call original first
                  originals[method].apply(console, args);
                  // Send message to content script
                  window.postMessage(
                    {
                      type: "CONSOLE_CAPTURE",
                      method,
                      args: args.map((arg) => {
                        try {
                          return typeof arg === "object"
                            ? JSON.stringify(arg)
                            : String(arg);
                        } catch {
                          return String(arg);
                        }
                      }),
                    },
                    "*"
                  );
                };
              });
            },
          })
          .catch((error) => {
            console.log(
              `[EXTENSION] Injection failed for tab ${tab.id}:`,
              error
            );
          });
      });
    }
  );
});

// Add URL validation helper
function isValidUrl(url) {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("ftp://")
  );
}

// Add this to background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyLogs") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "injectCapture" });
    });
  }
});
