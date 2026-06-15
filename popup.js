/**
 * Popup script: orchestrates the UI and communicates with content + background scripts.
 */

let currentPostData = null;
let selectedTone = null;
let isGenerating = false;
let replyMode = 'post'; // 'post' | 'comment'

// ── DOM refs ──
const els = {
  notReddit: document.getElementById('notReddit'),
  notPost: document.getElementById('notPost'),
  noApiKey: document.getElementById('noApiKey'),
  mainContent: document.getElementById('mainContent'),
  subredditBadge: document.getElementById('subredditBadge'),
  postTitle: document.getElementById('postTitle'),
  postBodyPreview: document.getElementById('postBodyPreview'),
  replyModeControl: document.getElementById('replyModeControl'),
  targetCommentSection: document.getElementById('targetCommentSection'),
  targetComment: document.getElementById('targetComment'),
  toneGrid: document.getElementById('toneGrid'),
  extraContext: document.getElementById('extraContext'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnIcon: document.getElementById('generateBtnIcon'),
  generateBtnText: document.getElementById('generateBtnText'),
  resultSection: document.getElementById('resultSection'),
  typingIndicator: document.getElementById('typingIndicator'),
  resultHeader: document.getElementById('resultHeader'),
  resultBox: document.getElementById('resultBox'),
  copyBtn: document.getElementById('copyBtn'),
  regenBtn: document.getElementById('regenBtn'),
  copyToast: document.getElementById('copyToast'),
  errorBox: document.getElementById('errorBox'),
  settingsBtn: document.getElementById('settingsBtn'),
  goToSettingsBtn: document.getElementById('goToSettingsBtn'),
};

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function showState(state) {
  hide(els.notReddit);
  hide(els.notPost);
  hide(els.noApiKey);
  hide(els.mainContent);
  if (state === 'notReddit') show(els.notReddit);
  else if (state === 'notPost') show(els.notPost);
  else if (state === 'noApiKey') show(els.noApiKey);
  else if (state === 'main') show(els.mainContent);
}

// ── Reply mode toggle ──
els.replyModeControl.addEventListener('click', (e) => {
  const btn = e.target.closest('.segment-btn');
  if (!btn) return;
  replyMode = btn.dataset.mode;
  document.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  if (replyMode === 'comment') {
    show(els.targetCommentSection);
    els.targetComment.focus();
  } else {
    hide(els.targetCommentSection);
    els.targetComment.value = '';
  }

  // Re-validate generate button if a tone is already selected
  if (selectedTone) updateGenerateBtnState();
  hide(els.errorBox);
});

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  // Consume any pending context from a right-click menu action
  const { pendingContext } = await chrome.storage.local.get('pendingContext');
  if (pendingContext) await chrome.storage.local.remove('pendingContext');

  // Check that the active provider's API key is set
  const { apiKey, deepseekApiKey, provider } = await chrome.storage.sync.get([
    'apiKey',
    'deepseekApiKey',
    'provider',
  ]);
  const activeKey = (provider || 'openai') === 'deepseek' ? deepseekApiKey : apiKey;
  if (!activeKey) {
    showState('noApiKey');
    return;
  }

  // Determine which tab to read from. When the popup is opened via
  // windows.create (context-menu fallback), the active tab belongs to the
  // popup window, not the Reddit page — use the stored tabId in that case.
  let tab;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (activeTab?.url?.includes('reddit.com')) {
    tab = activeTab;
  } else if (pendingContext?.tabId) {
    try {
      tab = await chrome.tabs.get(pendingContext.tabId);
    } catch (_) {
      tab = activeTab;
    }
  } else {
    tab = activeTab;
  }

  if (!tab?.url || !tab.url.includes('reddit.com')) {
    showState('notReddit');
    return;
  }

  if (!/\/r\/[^/]+\/comments\//.test(tab.url)) {
    showState('notPost');
    return;
  }

  // Inject content script if needed
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  } catch (_) {
    // Already injected — that's fine
  }

  // Request post data from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPostData' });
    if (response?.success && response.data) {
      currentPostData = response.data;
      renderPostPreview(currentPostData);
      showState('main');
    } else if (pendingContext?.postData) {
      // Fallback: use the post data captured at context-menu time
      currentPostData = pendingContext.postData;
      renderPostPreview(currentPostData);
      showState('main');
    } else {
      showState('notPost');
      return;
    }
  } catch (err) {
    if (pendingContext?.postData) {
      currentPostData = pendingContext.postData;
      renderPostPreview(currentPostData);
      showState('main');
    } else {
      showState('notPost');
      return;
    }
  }

  // Pre-fill from right-click context if available
  if (pendingContext?.targetComment) {
    replyMode = 'comment';
    document.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.segment-btn[data-mode="comment"]').classList.add('active');
    show(els.targetCommentSection);
    els.targetComment.value = pendingContext.targetComment;
    // Focus the tone grid so the user's next step is obvious
    els.toneGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

function renderPostPreview(data) {
  els.subredditBadge.textContent = `r/${data.subreddit || '?'}`;
  els.postTitle.textContent = data.title || 'Untitled post';
  if (data.body) {
    els.postBodyPreview.textContent = data.body;
    show(els.postBodyPreview);
  } else {
    hide(els.postBodyPreview);
  }
}

// ── Tone selection ──
els.toneGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.tone-btn');
  if (!btn) return;

  document.querySelectorAll('.tone-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedTone = btn.dataset.tone;

  updateGenerateBtnState();
  hide(els.errorBox);

  // Auto-generate immediately — unless in comment mode with no comment text yet
  const commentMissing = replyMode === 'comment' && !els.targetComment.value.trim();
  if (!commentMissing) generateReply();
});

function updateGenerateBtnState() {
  const commentRequired = replyMode === 'comment' && !els.targetComment.value.trim();
  els.generateBtn.disabled = !selectedTone || commentRequired;

  if (!selectedTone) {
    els.generateBtnText.textContent = 'Select a tone to generate';
  } else {
    const hasResult = !els.resultSection.classList.contains('hidden');
    const toneBtn = document.querySelector(`.tone-btn[data-tone="${selectedTone}"]`);
    const toneName = toneBtn ? toneBtn.querySelector('.tone-name').textContent : '';
    const target = replyMode === 'comment' ? 'Comment Reply' : 'Reply';
    els.generateBtnText.textContent = hasResult
      ? `Regenerate ${toneName} ${target}`
      : `Generate ${toneName} ${target}`;
  }
}

// Re-validate when comment textarea changes; no auto-generate here since the
// user is still typing — they can click the button or use the right-click flow.
els.targetComment.addEventListener('input', () => {
  if (selectedTone) updateGenerateBtnState();
});

// ── Generate ──
els.generateBtn.addEventListener('click', () => {
  if (selectedTone) generateReply();
});

els.regenBtn.addEventListener('click', () => {
  if (selectedTone) generateReply();
});

async function generateReply() {
  if (isGenerating || !selectedTone || !currentPostData) return;

  isGenerating = true;
  setGeneratingState(true);
  hide(els.errorBox);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateReply',
      payload: {
        postData: currentPostData,
        tone: selectedTone,
        extraContext: els.extraContext.value.trim(),
        replyMode,
        targetComment: replyMode === 'comment' ? els.targetComment.value.trim() : null,
      },
    });

    if (response.success) {
      showResult(response.reply);
    } else {
      if (response.error === 'NO_API_KEY') {
        showState('noApiKey');
      } else {
        showError(response.error || 'Something went wrong.');
      }
    }
  } catch (err) {
    showError(err.message || 'Failed to connect to AI service.');
  } finally {
    isGenerating = false;
    setGeneratingState(false);
  }
}

function setGeneratingState(loading) {
  els.generateBtn.classList.toggle('loading', loading);
  els.generateBtnIcon.textContent = loading ? '⏳' : '✨';

  if (loading) {
    els.generateBtnText.textContent = 'Generating...';
    // Show the result section immediately with the typing animation
    show(els.typingIndicator);
    hide(els.resultHeader);
    hide(els.resultBox);
    els.resultSection.classList.add('generating');
    show(els.resultSection);
    els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    hide(els.typingIndicator);
    els.resultSection.classList.remove('generating');
    updateGenerateBtnState();
  }
}

function showResult(text) {
  els.resultBox.textContent = text;
  hide(els.typingIndicator);
  show(els.resultHeader);
  show(els.resultBox);
  show(els.resultSection);
  els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  updateGenerateBtnState(); // switch label to "Regenerate …"
}

function showError(msg) {
  els.errorBox.textContent = `⚠️ ${msg}`;
  show(els.errorBox);
  hide(els.typingIndicator);
  hide(els.resultSection);
}

// ── Copy ──
els.copyBtn.addEventListener('click', async () => {
  const text = els.resultBox.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    show(els.copyToast);
    setTimeout(() => hide(els.copyToast), 2000);
  } catch (_) {
    // Fallback for older environments
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    show(els.copyToast);
    setTimeout(() => hide(els.copyToast), 2000);
  }
});

// ── Settings ──
function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

els.settingsBtn.addEventListener('click', openSettings);
if (els.goToSettingsBtn) {
  els.goToSettingsBtn.addEventListener('click', openSettings);
}
