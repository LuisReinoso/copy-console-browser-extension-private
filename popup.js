// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const copyButton = document.getElementById("copyButton");
  const status = document.getElementById("status");
  const debugPatternInput = document.getElementById("debugPattern");
  const currentPatternSpan = document.getElementById("currentPattern");
  const debugModeToggle = document.getElementById("debugMode");
  const licenseStatus = document.getElementById("licenseStatus");
  const freeUsageStatus = document.getElementById("freeUsageStatus");
  const remainingCopies = document.getElementById("remainingCopies");

  // Add event listener for activate premium button
  document
    .getElementById("activateLicense")
    .addEventListener("click", async () => {
      const licenseKey = document.getElementById("licenseKey").value;
      if (!licenseKey) {
        status.textContent = "Please enter a license key";
        status.className = "status error";
        return;
      }

      status.textContent = "Validating license...";
      status.className = "status info";

      try {
        const response = await chrome.runtime.sendMessage({
          action: "validateLicense",
          key: licenseKey,
        });

        if (response.valid) {
          status.textContent = "License activated successfully!";
          status.className = "status success";
          window.location.reload(); // Reload popup to update UI
        } else {
          status.textContent = response.error || "Invalid license key";
          status.className = "status error";
        }
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
        status.className = "status error";
      }
    });

  // Check license status
  const { licenseValid, licenseData } = await chrome.storage.local.get([
    "licenseValid",
    "licenseData",
  ]);

  if (licenseValid && licenseData) {
    // Show premium badge
    document.getElementById("licenseBadge").textContent = "Premium";
    document.getElementById("licenseBadge").classList.add("active");
    // Hide license input and free usage status when premium
    document.querySelector(".license-input").style.display = "none";
    document.querySelector(".buy-link").style.display = "none";
    freeUsageStatus.style.display = "none";
  } else {
    document.getElementById("licenseBadge").textContent = "Free";
    document.getElementById("licenseBadge").classList.remove("active");
    // Show license input and free usage status
    document.querySelector(".license-input").style.display = "block";
    document.querySelector(".buy-link").style.display = "block";
    freeUsageStatus.style.display = "block";

    // Update remaining copies display
    updateRemainingCopies();
  }

  // Function to update remaining copies display
  async function updateRemainingCopies() {
    const { copyClickCount = 0 } = await chrome.storage.local.get(
      "copyClickCount"
    );
    const remaining = Math.max(0, MAX_COPY_CLICKS - copyClickCount);
    remainingCopies.textContent = remaining;
  }

  // Load current settings
  chrome.storage.sync.get(
    { pattern: "[DEBUG]", debugMode: false },
    (result) => {
      debugPatternInput.value = result.pattern;
      currentPatternSpan.textContent = result.pattern;
      debugModeToggle.checked = result.debugMode;
    }
  );

  // Save pattern when changed
  let updateTimeout;
  debugPatternInput.addEventListener("input", () => {
    const newPattern = debugPatternInput.value;
    // Update display immediately
    currentPatternSpan.textContent = newPattern;

    // Debounce storage update to avoid too many writes
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      chrome.storage.sync.set({ pattern: newPattern }, () => {
        // Notify content script of pattern change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: "updatePattern",
                pattern: newPattern,
              },
              (response) => {
                if (response?.currentPattern) {
                  currentPatternSpan.textContent = response.currentPattern;
                  // Update status to show matching logs count
                  if (response.matchingLogs > 0) {
                    status.textContent = `Found ${response.matchingLogs} matching logs`;
                    status.className = "status success";
                  } else {
                    status.textContent = "No logs match current pattern";
                    status.className = "status warning";
                  }
                }
              }
            );
          }
        });
      });
    }, 300);
  });

  // Handle debug mode toggle
  debugModeToggle.addEventListener("change", () => {
    const debugMode = debugModeToggle.checked;
    chrome.storage.sync.set({ debugMode }, () => {
      // Notify content script of debug mode change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "updateDebugMode",
              debugMode: debugMode,
            },
            (response) => {
              if (response?.success) {
                status.textContent = `Debug mode ${
                  debugMode ? "enabled" : "disabled"
                }`;
                status.className = "status info";
                setTimeout(() => {
                  status.textContent = "";
                  status.className = "status";
                }, 2000);
              }
            }
          );
        }
      });
    });
  });

  let copyClickCount = 0;
  const MAX_COPY_CLICKS = 5;

  async function handleCopyButtonClick() {
    console.log("[EXTENSION] Copy button clicked");
    status.textContent = "Copying...";
    status.className = "status info";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log(`[EXTENSION] Active tab ID: ${tab?.id || "none"}`);

      if (!tab?.id) throw new Error("No active tab found");

      // Check if user has premium status
      chrome.storage.local.get(
        ["licenseValid", "copyClickCount"],
        function (result) {
          if (!result.licenseValid) {
            // Free user - check click limit
            const currentClicks = (result.copyClickCount || 0) + 1;

            if (currentClicks > MAX_COPY_CLICKS) {
              status.textContent =
                "Free plan limited to 5 copies per day. Please upgrade to Premium for unlimited access!";
              status.className = "status error";
              return;
            }

            // Update click count and remaining copies display
            chrome.storage.local.set({ copyClickCount: currentClicks }, () => {
              updateRemainingCopies();
            });
          }

          // Proceed with copy operation
          chrome.tabs.sendMessage(
            tab.id,
            { action: "copyLogs" },
            (response) => {
              if (!response) {
                handleMissingContentScript(status);
                return;
              }

              if (response.currentPattern) {
                currentPatternSpan.textContent = response.currentPattern;
              }

              updateUI(status, response);
              showNotification(response);
            }
          );
        }
      );
    } catch (error) {
      handleError(status, error);
    }
  }

  // Attach the click handler to the copy button
  copyButton.addEventListener("click", handleCopyButtonClick);

  function handleMissingContentScript(statusElement) {
    statusElement.textContent = "Error: Please refresh the page and try again";
    statusElement.className = "status error";
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Copy Console Error",
      message: "Extension not active on this page - please refresh",
    });
  }

  function updateUI(statusElement, response) {
    if (response.status === "success") {
      statusElement.textContent = `Copied ${response.logCount} logs using pattern: ${response.currentPattern}`;
      statusElement.className = "status success";
    } else if (response.status === "empty") {
      statusElement.textContent = response.message;
      statusElement.className = "status warning";
    } else {
      statusElement.textContent = response.error || "Unknown error";
      statusElement.className = "status error";
    }
  }

  function showNotification(response) {
    if (response.success) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Copy Console",
        message: response.message,
      });
    }
  }

  function handleError(statusElement, error) {
    console.error("Extension error:", error);
    statusElement.textContent = `Error: ${error.message}`;
    statusElement.className = "status error";
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Copy Console Error",
      message: error.message,
    });
  }

  document.getElementById("copyLogs").addEventListener("click", async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: "copyLogs" });
      const statusElement = document.getElementById("status");

      if (response.status === "success") {
        statusElement.textContent = `Copied ${response.logCount} logs to clipboard`;
        statusElement.style.color = "green";
      } else if (response.status === "empty") {
        statusElement.textContent = "No logs available to copy";
        statusElement.style.color = "orange";
      } else {
        statusElement.textContent = `Error: ${response.error}`;
        statusElement.style.color = "red";
      }
    } catch (error) {
      console.error("Error copying logs:", error);
      document.getElementById("status").textContent = `Error: ${error.message}`;
    }
  });

  function resetCopyClickCount() {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    chrome.storage.local.set(
      {
        copyClickCount: 0,
        lastResetDate: new Date().toDateString(),
      },
      () => {
        updateRemainingCopies(); // Update display after reset
      }
    );
  }

  function checkAndResetCounter() {
    chrome.storage.local.get(["lastResetDate"], function (data) {
      const today = new Date().toDateString();
      if (!data.lastResetDate || data.lastResetDate !== today) {
        resetCopyClickCount();
      } else {
        updateRemainingCopies(); // Update display on popup open
      }
    });
  }

  // Initialize
  checkAndResetCounter();
  copyButton.addEventListener("click", handleCopyButtonClick);
});
