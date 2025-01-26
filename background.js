// Initialize pattern when extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  // Set default pattern if not already set
  const result = await chrome.storage.sync.get("pattern");
  if (!result.pattern) {
    await chrome.storage.sync.set({ pattern: "[DEBUG]" });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showNotification") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: request.title || "Copy Console",
      message: request.message,
    });
  }
  return true;
});
