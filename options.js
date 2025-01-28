document.addEventListener("DOMContentLoaded", async () => {
  const copyButton = document.getElementById("copyButton");
  const status = document.getElementById("status");
  const { licenseValid, licenseData } = await chrome.storage.local.get([
    "licenseValid",
    "licenseData",
  ]);
  const statusElement = document.getElementById("licenseStatus");
  const trialElement = document.getElementById("trialStatus");

  if (licenseValid && licenseData) {
    // Show license status
    const status = licenseData.license_key.status;
    const expiresAt = licenseData.license_key.expires_at;

    statusElement.textContent = `✅ License ${status}${
      expiresAt ? ` (Expires: ${new Date(expiresAt).toLocaleDateString()})` : ""
    }`;
    statusElement.className = "status success";

    // Show customer info if available
    if (licenseData.meta.customer_name) {
      const customerInfo = document.createElement("div");
      customerInfo.textContent = `Licensed to: ${licenseData.meta.customer_name}`;
      statusElement.appendChild(customerInfo);
    }
  } else {
    statusElement.textContent = "❌ No active license";
    statusElement.className = "status error";

    // Show trial status
    const { trialStart } = await chrome.storage.local.get("trialStart");
    if (trialStart) {
      const trialDaysLeft = Math.ceil(
        7 - (Date.now() - trialStart) / (1000 * 3600 * 24)
      );
      trialElement.textContent =
        trialDaysLeft > 0
          ? `Trial active - ${trialDaysLeft} days remaining`
          : "Trial expired";
    }
  }

  document
    .getElementById("activateLicense")
    .addEventListener("click", async () => {
      const licenseKey = document.getElementById("licenseKey").value;
      chrome.runtime.sendMessage(
        {
          action: "validateLicense",
          key: licenseKey,
        },
        (response) => {
          if (response.valid) {
            window.location.reload();
          } else {
            statusElement.textContent = "❌ Invalid license key";
            statusElement.className = "status error";
          }
        }
      );
    });

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
