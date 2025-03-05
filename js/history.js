// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupEventListeners();
});

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
  // Clear all history button
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all learning history? This action cannot be undone.')) {
      chrome.storage.local.set({ 'learningHistory': [] }, () => {
        loadHistory();
        showNotification('History cleared successfully', 'success');
      });
    }
  });

  // Search box
  document.getElementById('searchBox').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterHistory(searchTerm);
  });
}

/**
 * Load learning history from storage and display in UI
 */
function loadHistory() {
  chrome.storage.local.get('learningHistory', (data) => {
    const history = data.learningHistory || [];
    const container = document.getElementById('historyContainer');
    
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>You haven't completed any learning sessions yet.</p>
          <p>Use the Teachme extension on webpages to start learning!</p>
        </div>
      `;
      return;
    }
    
    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Generate HTML for each history item
    let historyHTML = '';
    history.forEach((session, index) => {
      historyHTML += createSessionCard(session, index);
    });
    
    container.innerHTML = historyHTML;
    
    // Add event listeners to the newly created elements
    addCardEventListeners();
  });
}

/**
 * Filter history items based on search term
 */
function filterHistory(searchTerm) {
  chrome.storage.local.get('learningHistory', (data) => {
    const history = data.learningHistory || [];
    const container = document.getElementById('historyContainer');
    
    if (history.length === 0) return;
    
    // Filter based on search term
    const filteredHistory = history.filter(session => {
      return (
        session.title.toLowerCase().includes(searchTerm) ||
        session.content.toLowerCase().includes(searchTerm) ||
        (session.questions && session.questions.some(q => q.toLowerCase().includes(searchTerm)))
      );
    });
    
    if (filteredHistory.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No results found for "${searchTerm}"</p>
        </div>
      `;
      return;
    }
    
    // Sort by date (newest first)
    filteredHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Generate HTML for each history item
    let historyHTML = '';
    filteredHistory.forEach((session, index) => {
      historyHTML += createSessionCard(session, index);
    });
    
    container.innerHTML = historyHTML;
    
    // Add event listeners to the newly created elements
    addCardEventListeners();
  });
}

/**
 * Create HTML for a session card
 */
function createSessionCard(session, index) {
  const date = new Date(session.date).toLocaleString();
  const questionsHTML = session.questions && session.questions.length > 0 
    ? `
      <div class="session-questions">
        <h3>Review Questions:</h3>
        <ul>
          ${session.questions.map(q => `<li>${q}</li>`).join('')}
        </ul>
      </div>
    ` 
    : '';
  
  return `
    <div class="card" data-index="${index}">
      <div class="session-header">
        <h2 class="session-title">${session.title || 'Untitled Session'}</h2>
        <span class="session-date">${date}</span>
      </div>
      <div class="session-content">
        <p>${session.content.substring(0, 200)}${session.content.length > 200 ? '...' : ''}</p>
        ${questionsHTML}
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary review-btn" data-index="${index}">Review Session</button>
        <button class="btn delete-btn" data-index="${index}">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Add event listeners to card buttons
 */
function addCardEventListeners() {
  // Review session buttons
  document.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.getAttribute('data-index');
      chrome.storage.local.get('learningHistory', (data) => {
        const session = data.learningHistory[index];
        // Here you would implement the logic to review a session
        // For now, we'll just show a notification
        showNotification('Review functionality coming soon!', 'warning');
      });
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      deleteSession(index);
    });
  });
}

/**
 * Delete a session from history
 */
function deleteSession(index) {
  chrome.storage.local.get('learningHistory', (data) => {
    const history = data.learningHistory || [];
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
      chrome.storage.local.set({ 'learningHistory': history }, () => {
        loadHistory();
        showNotification('Session deleted successfully', 'success');
      });
    }
  });
}

/**
 * Display a notification message
 */
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `floating-notification notification-${type}`;
  notification.textContent = message;
  
  // Add to the document
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
} 