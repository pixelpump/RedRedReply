# RedDeadWit — Chrome Extension

AI-powered comebacks and replies for Reddit, with full tone control. Reads any Reddit post or comment thread and generates a contextual reply in the tone of your choice. Supports both **OpenAI** and **DeepSeek** as AI providers.

## Features

- **Dual AI providers** — switch between OpenAI and DeepSeek in Settings
- **Reply to posts or comments** — choose whether you're replying to the original post or a specific comment in the thread
- **Right-click to generate** — highlight a comment and right-click, or open a reply box and right-click inside it, to launch the extension pre-loaded with context
- **8 tone options** — pick the vibe before generating
- **Extra context field** — add personal notes or instructions to steer the reply
- **One-click copy** — copy the result straight to your clipboard

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
4. Select this project folder

### 2. Configure your AI provider

1. Click the extension icon in your Chrome toolbar
2. Click the ⚙️ settings icon (or go to the extension's Options page)
3. Choose your **AI Provider** — OpenAI or DeepSeek
4. Paste the corresponding API key
5. Select your preferred model
6. Click **Save Settings**

#### OpenAI
Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

| Model | Notes |
|-------|-------|
| `gpt-4o-mini` | Fast, cheap, great quality — recommended |
| `gpt-4o` | Highest quality, slower and more expensive |
| `gpt-4-turbo` | High quality with a large context window |
| `gpt-3.5-turbo` | Fastest and cheapest, lower quality |

#### DeepSeek
Get an API key at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys).

| Model | Notes |
|-------|-------|
| `deepseek-chat` | Fast, cost-effective — recommended |
| `deepseek-reasoner` | Step-by-step reasoning for complex replies |

## Usage

### Replying to a post

1. Navigate to any Reddit post (`reddit.com/r/*/comments/...`)
2. Click the **Reddit Reply AI** icon in your toolbar
3. The post title and body are automatically detected and previewed
4. Leave the toggle on **Original Post**
5. Select a tone, optionally add context, and click **Generate Reply**
6. Copy the result and paste it into Reddit

### Replying to a specific comment

**Option A — Toolbar popup**
1. Open the extension popup on a Reddit post page
2. Switch the toggle to **A Comment**
3. Paste the comment text you want to reply to
4. Select a tone and click **Generate Comment Reply**

**Option B — Right-click (recommended)**

*From a comment's text:*
1. Select (highlight) the comment text you want to reply to
2. Right-click and choose **Generate AI Reply**
3. The popup opens with the comment pre-filled and context auto-loaded — just pick a tone and generate

*From a reply box:*
1. Click Reddit's **Reply** button on any comment to open the compose box
2. Right-click inside the reply textarea
3. Choose **Generate AI Reply**
4. The extension auto-detects the parent comment and pre-fills everything

## File Structure

```
├── manifest.json        # Extension manifest (MV3)
├── content.js           # Scrapes post/comment data; handles right-click context
├── background.js        # Service worker — API calls + context menu registration
├── popup.html/css/js    # Extension popup UI
├── options.html/css/js  # Settings page (provider, API keys, model)
└── icons/               # Extension icons (16, 48, 128px)
```

## Privacy

- API keys are stored only in Chrome's local sync storage and never leave your browser
- Data is sent exclusively to `api.openai.com` or `api.deepseek.com` depending on your chosen provider — nowhere else
- The extension only activates on `*.reddit.com` pages
- No analytics, no tracking, no third-party services
