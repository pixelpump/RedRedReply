# Reddit Reply AI — Chrome Extension

A Chrome extension that reads any Reddit post and uses OpenAI to generate a reply in the tone of your choice.

## Tones Available

| Tone | Description |
|------|-------------|
| 👍 Positive | Warm, supportive, encouraging |
| 👎 Critical | Skeptical, contrarian, direct |
| 😂 Funny | Witty, humorous, Reddit-style jokes |
| 😏 Sarcastic | Dry wit and irony |
| 🤓 Informative | Expert-level, factual, helpful |
| 💙 Empathetic | Emotionally intelligent, compassionate |
| 😈 Devil's Advocate | Challenges the prevailing view |
| 🔥 Hot Take | Bold, controversial, provocative |

## Setup

### 1. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `reddit-reply-extension` folder

### 2. Add your OpenAI API key

1. Click the extension icon in your Chrome toolbar
2. Click the ⚙️ settings icon (or go to the extension's Options page)
3. Paste your OpenAI API key (`sk-...`)
4. Select your preferred model (default: `gpt-4o-mini`)
5. Click **Save Settings**

Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

## Usage

1. Navigate to any Reddit post (`reddit.com/r/*/comments/...`)
2. Click the **Reddit Reply AI** icon in your toolbar
3. The post is automatically detected and previewed
4. Select a tone from the grid
5. Optionally add extra context (e.g. "I have personal experience with this")
6. Click **Generate Reply**
7. Copy the result and paste it into Reddit

## Files

```
reddit-reply-extension/
├── manifest.json      # Extension manifest (MV3)
├── content.js         # Reads Reddit post from the page DOM
├── background.js      # Service worker — makes OpenAI API calls
├── popup.html/css/js  # Extension popup UI
├── options.html/css/js # Settings page (API key, model)
└── icons/             # Extension icons (16, 48, 128px)
```

## Privacy

- Your API key is stored only in Chrome's local/sync storage
- No data is sent anywhere except directly to `api.openai.com`
- The extension only activates on `*.reddit.com` pages

## Models

- **gpt-4o-mini** — Fast, cheap, great quality (recommended)
- **gpt-4o** — Highest quality, slower, more expensive
- **gpt-3.5-turbo** — Fastest and cheapest, lower quality

