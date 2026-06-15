const form = document.getElementById('settingsForm');
const providerSelect = document.getElementById('provider');
const apiKeyInput = document.getElementById('apiKey');
const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
const openrouterApiKeyInput = document.getElementById('openrouterApiKey');
const modelSelect = document.getElementById('model');
const saveStatus = document.getElementById('saveStatus');
const toggleKey = document.getElementById('toggleKey');
const toggleDeepseekKey = document.getElementById('toggleDeepseekKey');
const toggleOpenrouterKey = document.getElementById('toggleOpenrouterKey');
const openaiKeyField = document.getElementById('openaiKeyField');
const deepseekKeyField = document.getElementById('deepseekKeyField');
const openrouterKeyField = document.getElementById('openrouterKeyField');
const modelDesc = document.getElementById('modelDesc');

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini',   label: 'gpt-4o-mini (recommended)' },
  { value: 'gpt-4o',        label: 'gpt-4o' },
  { value: 'gpt-4-turbo',   label: 'gpt-4-turbo' },
  { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
];

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat',     label: 'deepseek-chat (recommended)' },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
];

const OPENROUTER_MODELS = [
  { value: 'openai/gpt-4o-mini',                      label: 'GPT-4o Mini  (OpenAI)' },
  { value: 'openai/gpt-4o',                           label: 'GPT-4o  (OpenAI)' },
  { value: 'anthropic/claude-3.5-sonnet',             label: 'Claude 3.5 Sonnet  (Anthropic)' },
  { value: 'anthropic/claude-3-haiku',                label: 'Claude 3 Haiku  (Anthropic) — fast & cheap' },
  { value: 'google/gemini-flash-1.5',                 label: 'Gemini Flash 1.5  (Google)' },
  { value: 'google/gemini-pro-1.5',                   label: 'Gemini Pro 1.5  (Google)' },
  { value: 'meta-llama/llama-3.1-70b-instruct',       label: 'Llama 3.1 70B  (Meta)' },
  { value: 'mistralai/mistral-7b-instruct',           label: 'Mistral 7B  (Mistral)' },
  { value: 'deepseek/deepseek-chat',                  label: 'DeepSeek Chat  (DeepSeek)' },
];

const MODEL_DESCS = {
  openai:      '<code>gpt-4o-mini</code> is fast and cheap. Use <code>gpt-4o</code> for higher quality.',
  deepseek:    '<code>deepseek-chat</code> is fast and cost-effective. Use <code>deepseek-reasoner</code> for complex reasoning.',
  openrouter:  'Route to 300+ models through one key. <code>Claude 3 Haiku</code> and <code>GPT-4o Mini</code> are great value picks.',
};

function updateProviderUI(provider) {
  openaiKeyField.classList.toggle('hidden',      provider !== 'openai');
  deepseekKeyField.classList.toggle('hidden',    provider !== 'deepseek');
  openrouterKeyField.classList.toggle('hidden',  provider !== 'openrouter');

  const modelsMap = { openai: OPENAI_MODELS, deepseek: DEEPSEEK_MODELS, openrouter: OPENROUTER_MODELS };
  const models = modelsMap[provider] || OPENAI_MODELS;
  const currentVal = modelSelect.value;

  modelSelect.innerHTML = models
    .map((m) => `<option value="${m.value}">${m.label}</option>`)
    .join('');

  if (models.some((m) => m.value === currentVal)) modelSelect.value = currentVal;

  modelDesc.innerHTML = MODEL_DESCS[provider] || MODEL_DESCS.openai;
}

// Load saved settings
chrome.storage.sync.get(['apiKey', 'deepseekApiKey', 'openrouterApiKey', 'model', 'provider'], (stored) => {
  const provider = stored.provider || 'openai';
  providerSelect.value = provider;
  updateProviderUI(provider);

  if (stored.apiKey)          apiKeyInput.value          = stored.apiKey;
  if (stored.deepseekApiKey)  deepseekApiKeyInput.value  = stored.deepseekApiKey;
  if (stored.openrouterApiKey) openrouterApiKeyInput.value = stored.openrouterApiKey;
  if (stored.model)           modelSelect.value          = stored.model;
});

// Update UI when provider changes
providerSelect.addEventListener('change', () => updateProviderUI(providerSelect.value));

// Toggle password visibility helpers
function makeToggle(btn, input) {
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.title = isPassword ? 'Hide key' : 'Show key';
  });
}
makeToggle(toggleKey,           apiKeyInput);
makeToggle(toggleDeepseekKey,   deepseekApiKeyInput);
makeToggle(toggleOpenrouterKey, openrouterApiKeyInput);

// Save
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const provider        = providerSelect.value;
  const apiKey          = apiKeyInput.value.trim();
  const deepseekApiKey  = deepseekApiKeyInput.value.trim();
  const openrouterApiKey = openrouterApiKeyInput.value.trim();
  const model           = modelSelect.value;

  const activeKeyMap = { openai: apiKey, deepseek: deepseekApiKey, openrouter: openrouterApiKey };
  const activeInputMap = { openai: apiKeyInput, deepseek: deepseekApiKeyInput, openrouter: openrouterApiKeyInput };

  if (!activeKeyMap[provider]) {
    activeInputMap[provider].focus();
    return;
  }

  chrome.storage.sync.set({ apiKey, deepseekApiKey, openrouterApiKey, model, provider }, () => {
    saveStatus.classList.remove('hidden');
    setTimeout(() => saveStatus.classList.add('hidden'), 2500);
  });
});
