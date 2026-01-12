/**
 * ExtractInfo Background Service Worker
 * Manifest V3 service worker for handling background tasks
 */

// This extension uses programmatic script injection from popup.js
// The background service worker is kept minimal as most logic is handled in content.js and popup.js

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("ExtractInfo installed/updated:", details.reason);
});

// Optional: Handle any future background tasks like context menus
// chrome.contextMenus.create({...});
