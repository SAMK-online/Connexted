const MENU_ID = "send-to-connexted";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Send to CONNEXTed",
      contexts: ["selection", "link", "page"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const pendingPost = {
    url: info.linkUrl || info.pageUrl || tab?.url || "",
    text: info.selectionText || "",
    title: tab?.title || ""
  };

  chrome.storage.local.set({ pendingPost }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html?pending=1"),
      type: "popup",
      width: 420,
      height: 680
    });
  });
});
