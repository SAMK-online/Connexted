const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:8000",
  appBaseUrl: "http://localhost:5173",
  organizationId: "demo-org",
  repId: "demo-rep",
  eventName: ""
};

const form = document.getElementById("post-form");
const statusNode = document.getElementById("status");
const sendButton = document.getElementById("send-post");
const openDashboardButton = document.getElementById("open-dashboard");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const settings = await storageGet("sync", DEFAULT_SETTINGS);
  setValue("api-base-url", settings.apiBaseUrl);
  setValue("app-base-url", settings.appBaseUrl);
  setValue("organization-id", settings.organizationId);
  setValue("rep-id", settings.repId);
  setValue("event-name", settings.eventName);

  const pending = await consumePendingPost();
  if (pending?.url) {
    setValue("post-url", pending.url);
    setValue("post-text", pending.text || "");
  } else {
    await populateFromActiveTab();
  }

  form.addEventListener("submit", sendPost);
  openDashboardButton.addEventListener("click", openDashboard);
}

async function populateFromActiveTab() {
  const [tab] = await queryTabs({ active: true, currentWindow: true });
  if (!tab) return;

  setValue("post-url", tab.url || "");
  const selectedText = await getSelectedText(tab.id);
  if (selectedText) {
    setValue("post-text", selectedText);
  }
}

async function sendPost(event) {
  event.preventDefault();
  setStatus("Sending...", "");
  sendButton.disabled = true;

  const settings = readSettings();
  const postUrl = valueOf("post-url");
  const postText = valueOf("post-text");

  try {
    if (!settings.eventName) {
      throw new Error("Event folder is required.");
    }
    if (!postUrl && !postText) {
      throw new Error("Post URL or post text is required.");
    }

    await ensureApiPermission(settings.apiBaseUrl);
    await storageSet("sync", settings);

    const payload = {
      organization_id: settings.organizationId,
      rep_id: settings.repId,
      event_name: settings.eventName,
      platforms: ["manual_import"],
      post_links: postUrl ? [postUrl] : [],
      pasted_posts: postText,
      hashtags: splitList(valueOf("hashtags")),
      keywords: splitList(valueOf("keywords")),
      max_posts: 10
    };

    const response = await fetch(`${settings.apiBaseUrl}/api/social/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    const discovery = await response.json();
    const count = discovery.candidates?.length || 0;
    setStatus(`Imported ${count} prospective ${count === 1 ? "visitor" : "visitors"}.`, "success");
  } catch (error) {
    setStatus(error.message || "Could not send post.", "error");
  } finally {
    sendButton.disabled = false;
  }
}

async function openDashboard() {
  const settings = readSettings();
  await storageSet("sync", settings);
  const url = `${settings.appBaseUrl}/app/dashboard`;
  chrome.tabs.create({ url });
}

function readSettings() {
  return {
    apiBaseUrl: normalizeBaseUrl(valueOf("api-base-url")),
    appBaseUrl: normalizeBaseUrl(valueOf("app-base-url")),
    organizationId: valueOf("organization-id") || DEFAULT_SETTINGS.organizationId,
    repId: valueOf("rep-id") || DEFAULT_SETTINGS.repId,
    eventName: valueOf("event-name")
  };
}

async function ensureApiPermission(apiBaseUrl) {
  const origin = originPattern(apiBaseUrl);
  const hasPermission = await permissionsContains({ origins: [origin] });
  if (hasPermission) return;

  const granted = await permissionsRequest({ origins: [origin] });
  if (!granted) {
    throw new Error("API permission was not granted.");
  }
}

function originPattern(apiBaseUrl) {
  const url = new URL(apiBaseUrl);
  return `${url.origin}/*`;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function splitList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setValue(id, value) {
  document.getElementById(id).value = value || "";
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function setStatus(message, type) {
  statusNode.textContent = message;
  statusNode.className = `status ${type || ""}`.trim();
}

async function consumePendingPost() {
  const data = await storageGet("local", { pendingPost: null });
  if (data.pendingPost) {
    await storageRemove("local", "pendingPost");
  }
  return data.pendingPost;
}

function getSelectedText(tabId) {
  if (!tabId) return Promise.resolve("");
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => window.getSelection()?.toString() || ""
      },
      (results) => {
        if (chrome.runtime.lastError) {
          resolve("");
          return;
        }
        resolve(results?.[0]?.result || "");
      }
    );
  });
}

function queryTabs(query) {
  return new Promise((resolve) => chrome.tabs.query(query, resolve));
}

function permissionsContains(permissions) {
  return new Promise((resolve) => chrome.permissions.contains(permissions, resolve));
}

function permissionsRequest(permissions) {
  return new Promise((resolve) => chrome.permissions.request(permissions, resolve));
}

function storageGet(area, defaults) {
  return new Promise((resolve) => chrome.storage[area].get(defaults, resolve));
}

function storageSet(area, values) {
  return new Promise((resolve) => chrome.storage[area].set(values, resolve));
}

function storageRemove(area, key) {
  return new Promise((resolve) => chrome.storage[area].remove(key, resolve));
}
