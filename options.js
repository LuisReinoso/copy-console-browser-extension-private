document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copyButton");
  const status = document.getElementById("status");

  copyButton.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        status.textContent = "Error: No active tab found";
        status.className = "status error";
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "copyLogs",
      });

      if (!response) {
        throw new Error("Content script not responding");
      }

      // ... rest of original code ...
    } catch (error) {
      status.textContent = `Error: ${error.message}`;
      status.className = "status error";
      console.error("Extension error:", error);
    }
  });
});
