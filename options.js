document.addEventListener("DOMContentLoaded", async () => {
  const patternInput = document.getElementById("pattern");
  const saveButton = document.getElementById("save");
  const status = document.getElementById("status");

  // Load saved pattern
  const result = await chrome.storage.sync.get({ pattern: "[DEBUG]" });
  patternInput.value = result.pattern;

  saveButton.addEventListener("click", async () => {
    const pattern = patternInput.value.trim();

    if (!pattern) {
      status.textContent = "Pattern cannot be empty";
      status.className = "status error";
      return;
    }

    try {
      // Save pattern
      await chrome.storage.sync.set({ pattern });

      // Update pattern in all active tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: "updatePattern",
            pattern,
          });
        } catch (error) {
          // Ignore errors for tabs that don't have our content script
        }
      }

      status.textContent = "Settings saved successfully!";
      status.className = "status success";
    } catch (error) {
      status.textContent = "Error saving settings: " + error.message;
      status.className = "status error";
    }
  });
});
