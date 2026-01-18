// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "save-download-link",
      title: "Save to Bookmarks Buddy",
      contexts: ["link"]
    });
  
    // Initialize storage with empty array if not exists
    chrome.storage.local.get(["downloadBookmarks"], (result) => {
      if (!result.downloadBookmarks) {
        chrome.storage.local.set({ downloadBookmarks: [] });
      }
    });
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "save-download-link" && info.linkUrl) {
      // Extract filename from URL
      const url = new URL(info.linkUrl);
      const filename = url.pathname.split('/').pop() || 'unnamed-file';
      
      const bookmark = {
        id: Date.now().toString(),
        name: filename,
        url: info.linkUrl,
        source: tab.url,
        domain: url.hostname,
        dateAdded: new Date().toISOString(),
        tags: [],
        notes: "",
        fileType: filename.split('.').pop() || 'unknown'
      };
  
      // Check for duplicates before saving
      chrome.storage.local.get(["downloadBookmarks"], (result) => {
        const bookmarks = result.downloadBookmarks || [];
        const isDuplicate = bookmarks.some(b => b.url === info.linkUrl);
        
        if (!isDuplicate) {
          bookmarks.push(bookmark);
          chrome.storage.local.set({ downloadBookmarks: bookmarks }, () => {
            // Show confirmation notification
            chrome.notifications.create({
              type: "basic",
              iconUrl: "icons/icon48.png",
              title: "Bookmark Saved",
              message: `Saved "${filename}" to your collection`
            });
          });
        } else {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Duplicate Found",
            message: "This link is already in your bookmarks"
          });
        }
      });
    }
  });