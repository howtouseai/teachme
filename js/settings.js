/**
 * Settings script for Teachme Learning Assistant
 * Handles loading, saving, and updating user settings
 */

// DOM Elements
const settingsForm = document.getElementById('settingsForm');
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const apiModelSelect = document.getElementById('apiModel');
const useSimulationCheckbox = document.getElementById('useSimulation');
const voiceRateInput = document.getElementById('voiceRate');
const voiceRateValue = document.getElementById('voiceRateValue');
const voicePitchInput = document.getElementById('voicePitch');
const voicePitchValue = document.getElementById('voicePitchValue');
const maxContentLengthInput = document.getElementById('maxContentLength');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const statusMessage = document.getElementById('status-message');

// Default settings
const defaultSettings = {
  apiProvider: 'openai',
  apiKey: '',
  apiModel: 'gpt-3.5-turbo',
  useSimulation: true,
  voiceRate: 1.0,
  voicePitch: 1.0,
  maxContentLength: 5000
};

// Initialize the settings page
document.addEventListener('DOMContentLoaded', () => {
  // Load current settings
  loadSettings();
  
  // Add event listeners
  settingsForm.addEventListener('submit', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  
  // Update value displays for sliders
  voiceRateInput.addEventListener('input', () => {
    voiceRateValue.textContent = voiceRateInput.value;
  });
  
  voicePitchInput.addEventListener('input', () => {
    voicePitchValue.textContent = voicePitchInput.value;
  });
  
  // Update model options based on selected provider
  apiProviderSelect.addEventListener('change', updateModelOptions);
  
  // Toggle API key field based on simulation mode
  useSimulationCheckbox.addEventListener('change', () => {
    apiKeyInput.disabled = useSimulationCheckbox.checked;
    
    if (useSimulationCheckbox.checked) {
      apiKeyInput.placeholder = 'Disabled in simulation mode';
      apiKeyInput.parentElement.classList.add('api-key-disabled');
    } else {
      apiKeyInput.placeholder = 'Enter your API key';
      apiKeyInput.parentElement.classList.remove('api-key-disabled');
    }
    
    // Ensure the visual state matches
    if (apiKeyInput.disabled) {
      apiKeyInput.style.backgroundColor = '#f5f5f5';
      apiKeyInput.style.color = '#999';
    } else {
      apiKeyInput.style.backgroundColor = '#fff';
      apiKeyInput.style.color = '#333';
    }
  });
});

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || defaultSettings;
    
    // Populate form fields with current settings
    apiProviderSelect.value = settings.apiProvider || defaultSettings.apiProvider;
    apiKeyInput.value = settings.apiKey || '';
    
    // Update model options based on provider
    updateModelOptions();
    
    // Set the model value after options are updated
    setTimeout(() => {
      apiModelSelect.value = settings.apiModel || defaultSettings.apiModel;
    }, 0);
    
    useSimulationCheckbox.checked = settings.useSimulation !== undefined ? 
      settings.useSimulation : defaultSettings.useSimulation;
    
    voiceRateInput.value = settings.voiceRate || defaultSettings.voiceRate;
    voiceRateValue.textContent = voiceRateInput.value;
    
    voicePitchInput.value = settings.voicePitch || defaultSettings.voicePitch;
    voicePitchValue.textContent = voicePitchInput.value;
    
    maxContentLengthInput.value = settings.maxContentLength || defaultSettings.maxContentLength;
    
    // Update UI based on simulation mode
    apiKeyInput.disabled = useSimulationCheckbox.checked;
    if (useSimulationCheckbox.checked) {
      apiKeyInput.placeholder = 'Disabled in simulation mode';
    }
  });
}

// Save settings to storage
function saveSettings(event) {
  event.preventDefault();
  
  const settings = {
    apiProvider: apiProviderSelect.value,
    apiKey: apiKeyInput.value,
    apiModel: apiModelSelect.value,
    useSimulation: useSimulationCheckbox.checked,
    voiceRate: parseFloat(voiceRateInput.value),
    voicePitch: parseFloat(voicePitchInput.value),
    maxContentLength: parseInt(maxContentLengthInput.value, 10)
  };
  
  chrome.storage.local.set({ settings }, () => {
    showStatusMessage('Settings saved successfully!', 'success');
  });
}

// Reset settings to defaults
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    // Set form values to defaults
    apiProviderSelect.value = defaultSettings.apiProvider;
    apiKeyInput.value = '';
    
    // Update model options based on default provider
    updateModelOptions();
    
    apiModelSelect.value = defaultSettings.apiModel;
    useSimulationCheckbox.checked = defaultSettings.useSimulation;
    
    voiceRateInput.value = defaultSettings.voiceRate;
    voiceRateValue.textContent = defaultSettings.voiceRate;
    
    voicePitchInput.value = defaultSettings.voicePitch;
    voicePitchValue.textContent = defaultSettings.voicePitch;
    
    maxContentLengthInput.value = defaultSettings.maxContentLength;
    
    // Update UI based on simulation mode
    apiKeyInput.disabled = useSimulationCheckbox.checked;
    if (useSimulationCheckbox.checked) {
      apiKeyInput.placeholder = 'Disabled in simulation mode';
    }
    
    // Save to storage
    chrome.storage.local.set({ settings: defaultSettings }, () => {
      showStatusMessage('Settings reset to defaults.', 'success');
    });
  }
}

// Update model options based on selected provider
function updateModelOptions() {
  const provider = apiProviderSelect.value;
  
  // Clear current options
  apiModelSelect.innerHTML = '';
  
  // Add appropriate options based on provider
  switch (provider) {
    case 'openai':
      addOption(apiModelSelect, 'gpt-3.5-turbo', 'GPT-3.5 Turbo');
      addOption(apiModelSelect, 'gpt-3.5-turbo-16k', 'GPT-3.5 Turbo 16K');
      addOption(apiModelSelect, 'gpt-4', 'GPT-4');
      addOption(apiModelSelect, 'gpt-4-32k', 'GPT-4 32K');
      addOption(apiModelSelect, 'gpt-4-turbo', 'GPT-4 Turbo');
      addOption(apiModelSelect, 'gpt-4o', 'GPT-4o');
      break;
      
    case 'google':
      addOption(apiModelSelect, 'gemini-pro', 'Gemini Pro');
      addOption(apiModelSelect, 'gemini-1.5-pro', 'Gemini 1.5 Pro');
      addOption(apiModelSelect, 'gemini-1.5-flash', 'Gemini 1.5 Flash');
      break;
      
    case 'anthropic':
      addOption(apiModelSelect, 'claude-instant-1', 'Claude Instant');
      addOption(apiModelSelect, 'claude-2', 'Claude 2');
      addOption(apiModelSelect, 'claude-2.1', 'Claude 2.1');
      addOption(apiModelSelect, 'claude-3-haiku', 'Claude 3 Haiku');
      addOption(apiModelSelect, 'claude-3-sonnet', 'Claude 3 Sonnet');
      addOption(apiModelSelect, 'claude-3-opus', 'Claude 3 Opus');
      break;
  }
}

// Helper function to add an option to a select element
function addOption(selectElement, value, text) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  selectElement.appendChild(option);
}

// Show status message
function showStatusMessage(message, type = 'success') {
  // Create a floating notification instead of using the status-message element
  const notification = document.createElement('div');
  notification.className = `floating-notification notification-${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500); // Wait for fade out animation
  }, 3000);
} 