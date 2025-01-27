// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copyButton");
  const status = document.getElementById("status");
  const debugPatternInput = document.getElementById("debugPattern");
  const currentPatternSpan = document.getElementById("currentPattern");
  const debugModeToggle = document.getElementById("debugMode");

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

  copyButton.addEventListener("click", async () => {
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

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "copyLogs" }, resolve);
      });
      console.log("[EXTENSION] Content script response:", response);

      if (!response) {
        handleMissingContentScript(status);
        return;
      }

      // Update the current pattern display if it's included in the response
      if (response.currentPattern) {
        currentPatternSpan.textContent = response.currentPattern;
      }

      updateUI(status, response);
      showNotification(response);
    } catch (error) {
      handleError(status, error);
    }
  });

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
});
