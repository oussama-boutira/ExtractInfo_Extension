/**
 * ExtractInfo Content Script
 * Extracts emails, phone numbers, and social media links from the current page
 */

// Social media platforms configuration
const SOCIAL_PLATFORMS = [
  { name: "Facebook", domain: "facebook.com", icon: "📘" },
  { name: "LinkedIn", domain: "linkedin.com", icon: "💼" },
  { name: "Twitter", domain: "twitter.com", icon: "🐦" },
  { name: "X", domain: "x.com", icon: "✖️" },
  { name: "Instagram", domain: "instagram.com", icon: "📷" },
  { name: "TikTok", domain: "tiktok.com", icon: "🎵" },
  { name: "YouTube", domain: "youtube.com", icon: "🎬" },
  { name: "Pinterest", domain: "pinterest.com", icon: "📌" },
  { name: "GitHub", domain: "github.com", icon: "🐙" },
];

// Keywords to filter out share/intent links
const EXCLUDED_KEYWORDS = [
  "sharer",
  "share",
  "intent",
  "login",
  "signup",
  "register",
];

/**
 * Extract emails from the page
 * Primary: mailto: links, Secondary: regex scan
 */
function extractEmails() {
  const emails = new Set();

  // Primary Method: Scan mailto: links
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  mailtoLinks.forEach((link) => {
    let email = link.getAttribute("href");
    // Remove mailto: prefix
    email = email.replace(/^mailto:/i, "");
    // Remove query parameters
    email = email.split("?")[0];
    // Clean and validate
    email = email.trim().toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  });

  // Secondary Method: Regex scan of page text
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const bodyText = document.body.innerText;
  const regexMatches = bodyText.match(emailRegex) || [];
  regexMatches.forEach((email) => {
    email = email.trim().toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  });

  return Array.from(emails);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && !email.includes("..");
}

/**
 * Extract phone numbers from the page
 * Primary: tel: links, Secondary: regex scan
 */
function extractPhones() {
  const phones = new Set();

  // Primary Method: Scan tel: links
  const telLinks = document.querySelectorAll('a[href^="tel:"]');
  telLinks.forEach((link) => {
    let phone = link.getAttribute("href");
    // Remove tel: prefix
    phone = phone.replace(/^tel:/i, "");
    // Clean the number
    phone = cleanPhoneNumber(phone);
    if (phone) {
      phones.add(phone);
    }
  });

  // Secondary Method: Regex scan of page text
  const phonePatterns = [
    /\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, // International format
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, // US format (555) 123-4567
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g, // US format 555-123-4567
    /\+\d{10,15}/g, // Simple international format
  ];

  const bodyText = document.body.innerText;
  phonePatterns.forEach((pattern) => {
    const matches = bodyText.match(pattern) || [];
    matches.forEach((phone) => {
      const cleaned = cleanPhoneNumber(phone);
      if (cleaned && cleaned.length >= 10) {
        phones.add(cleaned);
      }
    });
  });

  return Array.from(phones);
}

/**
 * Clean and format phone number
 */
function cleanPhoneNumber(phone) {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  // Ensure + is only at the beginning
  if (cleaned.includes("+") && !cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/\+/g, "");
  }
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Extract social media links from the page
 */
function extractSocialLinks() {
  const socialLinks = new Map(); // Use Map to deduplicate by URL

  const allLinks = document.querySelectorAll("a[href]");

  allLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    try {
      // Handle relative URLs
      const url = new URL(href, window.location.origin);
      const hostname = url.hostname.toLowerCase();
      const fullUrl = url.href;

      // Check each social platform
      for (const platform of SOCIAL_PLATFORMS) {
        if (
          hostname.includes(platform.domain) ||
          hostname.endsWith(platform.domain)
        ) {
          // Check if it's a valid profile/page link (not share/intent)
          if (isValidSocialLink(fullUrl, platform.domain)) {
            socialLinks.set(fullUrl, {
              url: fullUrl,
              platform: platform.name,
              icon: platform.icon,
            });
          }
          break;
        }
      }
    } catch (e) {
      // Invalid URL, skip
    }
  });

  return Array.from(socialLinks.values());
}

/**
 * Validate social media link (exclude share/intent links and homepages)
 */
function isValidSocialLink(url, domain) {
  const urlLower = url.toLowerCase();

  // Check for excluded keywords
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (urlLower.includes(keyword)) {
      return false;
    }
  }

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    // Exclude homepage only links (e.g., facebook.com or facebook.com/)
    if (pathname === "/" || pathname === "") {
      return false;
    }

    // Exclude very short paths that are likely navigation (e.g., /login, /help)
    const pathParts = pathname.split("/").filter((p) => p.length > 0);
    if (pathParts.length === 0) {
      return false;
    }

    // For most platforms, we want at least one meaningful path segment
    const firstPart = pathParts[0].toLowerCase();
    const genericPaths = [
      "login",
      "signup",
      "register",
      "help",
      "about",
      "privacy",
      "terms",
      "settings",
      "explore",
      "search",
    ];
    if (genericPaths.includes(firstPart)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Main extraction function
 */
function extractAllData() {
  const emails = extractEmails();
  const phones = extractPhones();
  const socials = extractSocialLinks();

  return {
    emails,
    phones,
    socials,
    pageUrl: window.location.href,
    pageTitle: document.title,
    timestamp: new Date().toISOString(),
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    try {
      const data = extractAllData();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep message channel open for async response
});
