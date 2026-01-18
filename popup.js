document.addEventListener('DOMContentLoaded', function() {
    const bookmarksList = document.getElementById('bookmarksList');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const filterDomain = document.getElementById('filterDomain');
    const filterType = document.getElementById('filterType');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const stats = document.getElementById('stats');
  
    let allBookmarks = [];
  
    // Load and display bookmarks
    function loadBookmarks() {
      chrome.storage.local.get(["downloadBookmarks"], (result) => {
        allBookmarks = result.downloadBookmarks || [];
        updateStats();
        updateFilters();
        displayBookmarks(allBookmarks);
      });
    }
  
    // Update statistics display
    function updateStats() {
      const domains = [...new Set(allBookmarks.map(b => b.domain))];
      const fileTypes = [...new Set(allBookmarks.map(b => b.fileType))];
      stats.textContent = `${allBookmarks.length} bookmarks • ${domains.length} domains • ${fileTypes.length} file types`;
    }
  
    // Update filter dropdowns
    function updateFilters() {
      const domains = [...new Set(allBookmarks.map(b => b.domain))].sort();
      const fileTypes = [...new Set(allBookmarks.map(b => b.fileType))].sort();
  
      // Update domain filter
      filterDomain.innerHTML = '<option value="">All Domains</option>';
      domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        filterDomain.appendChild(option);
      });
  
      // Update file type filter
      filterType.innerHTML = '<option value="">All File Types</option>';
      fileTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.toUpperCase();
        filterType.appendChild(option);
      });
    }
  
    // Display bookmarks in the list
    function displayBookmarks(bookmarks) {
      if (bookmarks.length === 0) {
        emptyState.style.display = 'block';
        bookmarksList.innerHTML = '';
        return;
      }
  
      emptyState.style.display = 'none';
      bookmarksList.innerHTML = '';
  
      bookmarks.forEach(bookmark => {
        const bookmarkElement = createBookmarkElement(bookmark);
        bookmarksList.appendChild(bookmarkElement);
      });
    }
  
    // Create HTML element for a bookmark
    function createBookmarkElement(bookmark) {
      const div = document.createElement('div');
      div.className = 'bookmark-item';
      
      const date = new Date(bookmark.dateAdded);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  
      div.innerHTML = `
        <div class="bookmark-header">
          <div>
            <div class="bookmark-name">${escapeHtml(bookmark.name)}</div>
            <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
          </div>
          <div class="bookmark-meta">
            <span>${bookmark.fileType.toUpperCase()}</span>
            <span>${formattedDate}</span>
          </div>
        </div>
        <div class="bookmark-meta">
          <span>From: ${escapeHtml(bookmark.domain)}</span>
        </div>
        ${bookmark.tags && bookmark.tags.length > 0 ? 
          `<div class="tags">${bookmark.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <div class="bookmark-actions">
          <button class="open-btn" data-url="${escapeHtml(bookmark.url)}">Open</button>
          <button class="copy-btn" data-url="${escapeHtml(bookmark.url)}">Copy Link</button>
          <button class="delete-btn" data-id="${bookmark.id}">Delete</button>
        </div>
      `;
  
      // Add event listeners to buttons
      div.querySelector('.open-btn').addEventListener('click', () => {
        chrome.tabs.create({ url: bookmark.url });
      });
  
      div.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(bookmark.url).then(() => {
          alert('Link copied to clipboard!');
        });
      });
  
      div.querySelector('.delete-btn').addEventListener('click', () => {
        deleteBookmark(bookmark.id);
      });
  
      return div;
    }
  
    // Delete a bookmark
    function deleteBookmark(id) {
      if (confirm('Are you sure you want to delete this bookmark?')) {
        const updatedBookmarks = allBookmarks.filter(b => b.id !== id);
        chrome.storage.local.set({ downloadBookmarks: updatedBookmarks }, () => {
          allBookmarks = updatedBookmarks;
          updateStats();
          updateFilters();
          displayBookmarks(allBookmarks);
        });
      }
    }
  
    // Export bookmarks to JSON file
    exportBtn.addEventListener('click', () => {
      const dataStr = JSON.stringify(allBookmarks, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `dev-download-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  
    // Import bookmarks from JSON file
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
  
    importFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedBookmarks = JSON.parse(e.target.result);
          
          if (Array.isArray(importedBookmarks)) {
            chrome.storage.local.get(["downloadBookmarks"], (result) => {
              const currentBookmarks = result.downloadBookmarks || [];
              const mergedBookmarks = [...currentBookmarks, ...importedBookmarks];
              
              // Remove duplicates by URL
              const uniqueBookmarks = mergedBookmarks.filter(
                (bookmark, index, self) =>
                  index === self.findIndex(b => b.url === bookmark.url)
              );
              
              chrome.storage.local.set({ downloadBookmarks: uniqueBookmarks }, () => {
                loadBookmarks();
                alert(`Imported ${importedBookmarks.length} bookmarks successfully!`);
              });
            });
          } else {
            alert('Invalid JSON format. Expected an array of bookmarks.');
          }
        } catch (error) {
          alert('Error parsing JSON file: ' + error.message);
        }
      };
      reader.readAsText(file);
    });
  
    // Clear all bookmarks
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL bookmarks? This cannot be undone.')) {
        chrome.storage.local.set({ downloadBookmarks: [] }, () => {
          allBookmarks = [];
          loadBookmarks();
        });
      }
    });
  
    // Search and filter functionality
    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedDomain = filterDomain.value;
      const selectedType = filterType.value;
  
      let filtered = allBookmarks;
  
      if (searchTerm) {
        filtered = filtered.filter(bookmark => 
          bookmark.name.toLowerCase().includes(searchTerm) ||
          bookmark.url.toLowerCase().includes(searchTerm) ||
          bookmark.domain.toLowerCase().includes(searchTerm) ||
          (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
      }
  
      if (selectedDomain) {
        filtered = filtered.filter(bookmark => bookmark.domain === selectedDomain);
      }
  
      if (selectedType) {
        filtered = filtered.filter(bookmark => bookmark.fileType === selectedType);
      }
  
      displayBookmarks(filtered);
    }
  
    searchInput.addEventListener('input', applyFilters);
    filterDomain.addEventListener('change', applyFilters);
    filterType.addEventListener('change', applyFilters);
  
    // Quick links functionality
    document.querySelectorAll('.quick-link').forEach(button => {
      button.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        if (url) {
          chrome.tabs.create({ url: url });
        }
      });
    });
  
    // Add custom source
    document.getElementById('addCustomSource').addEventListener('click', () => {
      const url = prompt('Enter the URL of the download folder or website:');
      if (url) {
        chrome.tabs.create({ url: url });
      }
    });
  
    // Helper function to escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
    // Initial load
    loadBookmarks();
  });