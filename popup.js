/**
 * ExtractInfo Popup Script
 * Handles UI interactions and communication with content script
 */

document.addEventListener("DOMContentLoaded", () => {
  const scanBtn = document.getElementById("scanBtn");
  const resultsDiv = document.getElementById("results");
  const loadingDiv = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const statusBar = document.getElementById("statusBar");
  const pageInfo = document.getElementById("pageInfo");

  // Section elements
  const emailsList = document.getElementById("emailsList");
  const phonesList = document.getElementById("phonesList");
  const socialsList = document.getElementById("socialsList");
  const emailCount = document.getElementById("emailCount");
  const phoneCount = document.getElementById("phoneCount");
  const socialCount = document.getElementById("socialCount");

  /**
   * Show loading state
   */
  function showLoading() {
    loadingDiv.classList.remove("hidden");
    resultsDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");
    statusBar.classList.add("hidden");
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<span class="icon">⏳</span><span>Scanning...</span>';
  }

  /**
   * Hide loading state
   */
  function hideLoading() {
    loadingDiv.classList.add("hidden");
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<span class="icon">🔄</span><span>Scan Again</span>';
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    resultsDiv.classList.add("hidden");
    hideLoading();
  }

  /**
   * Create a copyable item element
   */
  function createItem(text, type) {
    const item = document.createElement("div");
    item.className = "item";

    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.textContent = text;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 1500);
      } catch (err) {
        copyBtn.textContent = "Failed";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1500);
      }
    };

    item.appendChild(textSpan);
    item.appendChild(copyBtn);

    // Click on the entire item also copies
    item.onclick = () => copyBtn.click();

    return item;
  }

  /**
   * Create a social media item element
   */
  function createSocialItem(social) {
    const item = document.createElement("div");
    item.className = "social-item";

    const iconSpan = document.createElement("span");
    iconSpan.className = "platform-icon";
    iconSpan.textContent = social.icon;

    const nameSpan = document.createElement("span");
    nameSpan.className = "platform-name";
    nameSpan.textContent = social.platform;

    const urlLink = document.createElement("a");
    urlLink.className = "url";
    urlLink.href = social.url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener noreferrer";
    // Show shortened URL
    try {
      const parsedUrl = new URL(social.url);
      urlLink.textContent =
        parsedUrl.pathname.substring(0, 40) +
        (parsedUrl.pathname.length > 40 ? "..." : "");
    } catch {
      urlLink.textContent = social.url;
    }
    urlLink.title = social.url; // Show full URL on hover

    item.appendChild(iconSpan);
    item.appendChild(nameSpan);
    item.appendChild(urlLink);

    return item;
  }

  /**
   * Render results to the UI
   */
  function renderResults(data) {
    resultsDiv.classList.remove("hidden");
    statusBar.classList.remove("hidden");

    // Update page info
    pageInfo.textContent = `Scanned: ${data.pageTitle || "Unknown Page"}`;

    // Render emails
    emailsList.innerHTML = "";
    if (data.emails && data.emails.length > 0) {
      emailCount.textContent = data.emails.length;
      data.emails.forEach((email) => {
        emailsList.appendChild(createItem(email, "email"));
      });
    } else {
      emailCount.textContent = "0";
      emailsList.innerHTML = '<div class="no-data">No emails found</div>';
    }

    // Render phones
    phonesList.innerHTML = "";
    if (data.phones && data.phones.length > 0) {
      phoneCount.textContent = data.phones.length;
      data.phones.forEach((phone) => {
        phonesList.appendChild(createItem(phone, "phone"));
      });
    } else {
      phoneCount.textContent = "0";
      phonesList.innerHTML =
        '<div class="no-data">No phone numbers found</div>';
    }

    // Render socials
    socialsList.innerHTML = "";
    if (data.socials && data.socials.length > 0) {
      socialCount.textContent = data.socials.length;
      data.socials.forEach((social) => {
        socialsList.appendChild(createSocialItem(social));
      });
    } else {
      socialCount.textContent = "0";
      socialsList.innerHTML =
        '<div class="no-data">No social links found</div>';
    }
  }

  /**
   * Perform the page scan
   */
  async function scanPage() {
    showLoading();

    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showError("No active tab found");
        return;
      }

      // Check if we can inject into this tab
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://")
      ) {
        showError("Cannot scan browser internal pages");
        return;
      }

      // Inject the content script programmatically
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "scanPage",
      });

      hideLoading();

      if (response && response.success) {
        renderResults(response.data);
      } else {
        showError(response?.error || "Failed to extract data from page");
      }
    } catch (error) {
      hideLoading();
      console.error("Scan error:", error);

      if (error.message.includes("Cannot access")) {
        showError("Cannot access this page. Try refreshing the page first.");
      } else if (error.message.includes("Receiving end does not exist")) {
        showError("Please refresh the page and try again.");
      } else {
        showError("Error scanning page: " + error.message);
      }
    }
  }

  // Event listener for scan button
  scanBtn.addEventListener("click", scanPage);
});
