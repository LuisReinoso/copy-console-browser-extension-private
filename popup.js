document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copyButton");
  const status = document.getElementById("status");

  copyButton.addEventListener("click", async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Request logs from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getMatchingLogs",
      });

      if (response && response.logs && response.logs.length > 0) {
        // Copy logs to clipboard
        await navigator.clipboard.writeText(response.logs.join("\n"));

        // Show success message
        status.textContent = `${response.logs.length} log(s) copied!`;
        status.className = "status success";

        // Send notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Copy Console",
          message: `${response.logs.length} log(s) copied to clipboard!`,
        });
      } else {
        status.textContent = "No matching logs found";
        status.className = "status warning";
      }
    } catch (error) {
      status.textContent = "Error: " + error.message;
      status.className = "status error";
    }
  });
});
