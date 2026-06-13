const form = document.getElementById('settingsForm');
const providerSelect = document.getElementById('provider');
const apiKeyInput = document.getElementById('apiKey');
const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
const modelSelect = document.getElementById('model');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const toggleKey = document.getElementById('toggleKey');
const toggleDeepseekKey = document.getElementById('toggleDeepseekKey');
const openaiKeyField = document.getElementById('openaiKeyField');
const deepseekKeyField = document.getElementById('deepseekKeyField');
const modelDesc = document.getElementById('modelDesc');

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (recommended)' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
  { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
];

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'deepseek-chat (recommended)' },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
];

function updateProviderUI(provider) {
  const isDeepSeek = provider === 'deepseek';

  openaiKeyField.classList.toggle('hidden', isDeepSeek);
  deepseekKeyField.classList.toggle('hidden', !isDeepSeek);

  const models = isDeepSeek ? DEEPSEEK_MODELS : OPENAI_MODELS;
  const currentVal = modelSelect.value;
  modelSelect.innerHTML = models
    .map((m) => `<option value="${m.value}">${m.label}</option>`)
    .join('');

  // Try to keep the previously selected model if it's still valid
  if (models.some((m) => m.value === currentVal)) {
    modelSelect.value = currentVal;
  }

  if (isDeepSeek) {
    modelDesc.innerHTML =
      '<code>deepseek-chat</code> is fast and cost-effective. Use <code>deepseek-reasoner</code> for complex reasoning tasks.';
  } else {
    modelDesc.innerHTML =
      '<code>gpt-4o-mini</code> is fast and cheap. Use <code>gpt-4o</code> for higher quality.';
  }
}

// Load saved settings
chrome.storage.sync.get(['apiKey', 'deepseekApiKey', 'model', 'provider'], (stored) => {
  const provider = stored.provider || 'openai';
  providerSelect.value = provider;
  updateProviderUI(provider);

  if (stored.apiKey) apiKeyInput.value = stored.apiKey;
  if (stored.deepseekApiKey) deepseekApiKeyInput.value = stored.deepseekApiKey;
  if (stored.model) modelSelect.value = stored.model;
});

// Update UI when provider changes
providerSelect.addEventListener('change', () => {
  updateProviderUI(providerSelect.value);
});

// Toggle password visibility — OpenAI key
toggleKey.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKey.title = isPassword ? 'Hide key' : 'Show key';
});

// Toggle password visibility — DeepSeek key
toggleDeepseekKey.addEventListener('click', () => {
  const isPassword = deepseekApiKeyInput.type === 'password';
  deepseekApiKeyInput.type = isPassword ? 'text' : 'password';
  toggleDeepseekKey.title = isPassword ? 'Hide key' : 'Show key';
});

// Save
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const deepseekApiKey = deepseekApiKeyInput.value.trim();
  const model = modelSelect.value;

  const activeKey = provider === 'deepseek' ? deepseekApiKey : apiKey;
  const activeInput = provider === 'deepseek' ? deepseekApiKeyInput : apiKeyInput;

  if (!activeKey) {
    activeInput.focus();
    return;
  }

  chrome.storage.sync.set({ apiKey, deepseekApiKey, model, provider }, () => {
    saveStatus.classList.remove('hidden');
    setTimeout(() => saveStatus.classList.add('hidden'), 2500);
  });
});
