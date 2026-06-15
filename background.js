/**
 * Service worker: handles AI API calls to avoid CORS issues from popup context.
 * Also registers the right-click context menu.
 */

// ── Context menu registration ────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Remove any stale entry before (re-)creating to avoid duplicate errors.
  chrome.contextMenus.remove('generateReply', () => {
    void chrome.runtime.lastError; // suppress "not found" error on first install
    chrome.contextMenus.create({
      id: 'generateReply',
      title: 'Generate AI Reply',
      // Show when text is selected OR when right-clicking inside an editable field
      contexts: ['selection', 'editable'],
      documentUrlPatterns: ['https://*.reddit.com/r/*/comments/*'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'generateReply') return;

  // Ask the content script for the target comment + post data
  let pendingContext = { targetComment: null, postData: null, source: null, tabId: tab.id };
  try {
    const data = await chrome.tabs.sendMessage(tab.id, {
      action: 'getContextMenuData',
      selectionText: info.selectionText || null,
    });
    if (data) {
      pendingContext = { ...data, tabId: tab.id };
    }
  } catch (_) {
    // Content script not yet injected — store minimal context; popup will handle it
  }

  await chrome.storage.local.set({ pendingContext });

  // Open the extension popup.  openPopup() is preferred (Chrome 99+/127+ stable);
  // fall back to a small popup window on older builds.
  try {
    await chrome.action.openPopup({ windowId: tab.windowId });
  } catch (_) {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 400,
      height: 660,
      focused: true,
    });
  }
});

const TONE_PROMPTS = {
  positive: {
    label: 'Positive',
    instruction:
      'Write a warm, supportive, and encouraging reply. Be genuinely helpful and uplifting. Agree with positives and add constructive insights.',
  },
  negative: {
    label: 'Critical',
    instruction:
      'Write a critical, skeptical reply. Point out flaws, question assumptions, and offer a contrarian perspective. Be direct but not cruel.',
  },
  funny: {
    label: 'Funny',
    instruction:
      'Write a genuinely funny reply with humor, wit, and jokes. Use Reddit-style humor — puns, absurdist takes, or clever observations are welcome.',
  },
  sarcastic: {
    label: 'Sarcastic',
    instruction:
      'Write a sarcastic reply dripping with dry wit and irony. Use classic Reddit sarcasm — say the opposite of what you mean, be subtly condescending.',
  },
  informative: {
    label: 'Informative',
    instruction:
      'Write an informative, well-researched reply as if you are an expert on the topic. Include useful context, facts, or explanations. Be like the knowledgeable commenter everyone appreciates.',
  },
  empathetic: {
    label: 'Empathetic',
    instruction:
      'Write an empathetic, emotionally intelligent reply. Acknowledge feelings, validate experiences, and offer compassionate support or understanding.',
  },
  devils_advocate: {
    label: "Devil's Advocate",
    instruction:
      "Write a devil's advocate reply that challenges the prevailing opinion with a thoughtful counterargument. Present the opposing viewpoint persuasively without being aggressive.",
  },
  spicy: {
    label: 'Spicy / Hot Take',
    instruction:
      'Write a bold, controversial hot take. Be provocative and opinionated. Say something that will spark debate — but make it clever and interesting, not just offensive.',
  },
};

const PROVIDER_CONFIG = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/pixelpump/RedRedReply',
      'X-Title': 'RedDeadWit',
    },
  },
};

async function generateReply({ postData, tone, extraContext, model, apiKey, provider, replyMode, targetComment }) {
  const toneConfig = TONE_PROMPTS[tone];
  if (!toneConfig) {
    throw new Error(`Unknown tone: ${tone}`);
  }

  const postContext = [
    `Subreddit: r/${postData.subreddit}`,
    `Title: ${postData.title}`,
    postData.body ? `Post body:\n${postData.body}` : null,
    postData.topComments?.length
      ? `Top comments for context:\n${postData.topComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  let userMessage;
  let systemPrompt;

  if (replyMode === 'comment' && targetComment) {
    systemPrompt = `You are a Reddit user replying to a specific comment in a thread. ${toneConfig.instruction}

Rules:
- Write in a natural Reddit voice — conversational, direct, no corporate speak
- Keep it concise: 1–3 short paragraphs max
- Address the specific comment directly — your reply should make sense as a response to it
- Use the original post as background context, not as your primary target
- Do NOT say you are an AI or mention the tone you are using
- Do NOT use headers, bullet points, or markdown formatting beyond what Reddit supports
- Just write the reply directly, as if you are typing it into the comment box`;

    userMessage = [
      `Here is the original Reddit post for context:\n\n${postContext}`,
      `Here is the specific comment I want to reply to:\n\n${targetComment}`,
      extraContext ? `Additional context from me: ${extraContext}` : null,
      'Write my reply to that comment now.',
    ]
      .filter(Boolean)
      .join('\n\n');
  } else {
    systemPrompt = `You are a Reddit user crafting a reply to a post. ${toneConfig.instruction}

Rules:
- Write in a natural Reddit voice — conversational, direct, no corporate speak
- Keep it concise: 1–3 short paragraphs max
- Do NOT say you are an AI or mention the tone you are using
- Do NOT use headers, bullet points, or markdown formatting beyond what Reddit supports
- Just write the reply directly, as if you are typing it into the comment box`;

    userMessage = [
      `Here is the Reddit post I want to reply to:\n\n${postContext}`,
      extraContext ? `Additional context from me: ${extraContext}` : null,
      'Write my reply now.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const cfg = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.openai;

  const response = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...( cfg.extraHeaders || {} ),
    },
    body: JSON.stringify({
      model: model || cfg.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.85,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody?.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'generateReply') {
    chrome.storage.sync.get(['apiKey', 'deepseekApiKey', 'openrouterApiKey', 'model', 'provider'], async (stored) => {
      try {
        const provider = stored.provider || 'openai';
        const keyMap = { openai: stored.apiKey, deepseek: stored.deepseekApiKey, openrouter: stored.openrouterApiKey };
        const apiKey = keyMap[provider];

        if (!apiKey) {
          sendResponse({ success: false, error: 'NO_API_KEY' });
          return;
        }
        const reply = await generateReply({
          ...message.payload,
          apiKey,
          model: stored.model,
          provider,
        });
        sendResponse({ success: true, reply });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // keep message channel open for async response
  }
});
