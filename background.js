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

// Constants
const LEMON_SQUEEZY_API = "https://api.lemonsqueezy.com/v1/licenses";
const STORE_ID = "438130"; // Store ID from Lemon Squeezy
const PRODUCT_ID = "108772"; // Product ID from Lemon Squeezy

// Update license validation handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "validateLicense") {
    console.log("License validation requested:", request.key);
    const licenseKey = request.key;

    // Lemon Squeezy license validation
    const activationUrl = `${LEMON_SQUEEZY_API}/activate`;
    const requestBody = {
      license_key: licenseKey,
      instance_name: chrome.runtime.id,
      instance_id: chrome.runtime.id,
    };

    console.log("Sending activation request to:", activationUrl);
    console.log("Request body:", requestBody);

    fetch(activationUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then((response) => {
        console.log("Raw response:", response);
        return response.json();
      })
      .then((data) => {
        console.log("Response data:", data);
        // Check for activation success
        if (!data.activated) {
          console.error("Activation failed:", data);
          throw new Error(data.error || "Activation failed");
        }

        const isValid = data.activated;
        chrome.storage.local.set({
          licenseValid: isValid,
          licenseKey: isValid ? licenseKey : null,
          licenseData: isValid ? data : null,
          trialStart: isValid ? null : Date.now(),
        });
        sendResponse({
          valid: isValid,
          status: isValid ? "active" : "inactive",
          expiresAt: data.license_key?.expires_at,
        });
      })
      .catch((error) => {
        console.error("License validation failed:", error);
        sendResponse({
          valid: false,
          error: error.message,
        });
      });

    return true; // Keep message channel open
  }
});

// Add trial period check
async function checkLicenseStatus() {
  const { licenseValid, trialStart } = await chrome.storage.local.get([
    "licenseValid",
    "trialStart",
  ]);

  if (licenseValid) return true;

  // 7-day trial period
  const trialDays = 7;
  const trialEnd = trialStart + trialDays * 24 * 60 * 60 * 1000;
  return Date.now() < trialEnd;
}
