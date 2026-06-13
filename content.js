/**
 * Content script: runs on Reddit pages and extracts post data.
 * Handles both new Reddit (www.reddit.com) and old Reddit (old.reddit.com).
 */

// Track the element the user last right-clicked so the background can request
// context after a context-menu item is chosen.
let lastRightClickedEl = null;
document.addEventListener('contextmenu', (e) => {
  lastRightClickedEl = e.target;
});

// ── Post extraction ──────────────────────────────────────────────────────────

function extractNewRedditPost() {
  const titleEl =
    document.querySelector('h1[slot="title"]') ||
    document.querySelector('[data-testid="post-title"]') ||
    document.querySelector('h1');
  const title = titleEl ? titleEl.innerText.trim() : '';

  const bodyEl =
    document.querySelector('[data-testid="post-container"] [data-click-id="text"] .md') ||
    document.querySelector('[data-click-id="text"] .md') ||
    document.querySelector('[data-testid="post-rtjson-content"]') ||
    document.querySelector('[class*="usertext"] .md');
  const body = bodyEl ? bodyEl.innerText.trim() : '';

  const subredditMatch = window.location.pathname.match(/\/r\/([^/]+)/);
  const subreddit = subredditMatch ? subredditMatch[1] : '';

  const commentEls = document.querySelectorAll(
    '[data-testid="comment"] [data-testid="comment-top-meta"] ~ div .RichTextJSON-root, ' +
    'shreddit-comment .md'
  );
  const topComments = Array.from(commentEls)
    .slice(0, 3)
    .map((el) => el.innerText.trim())
    .filter(Boolean);

  return { title, body, subreddit, topComments, isOldReddit: false };
}

function extractOldRedditPost() {
  const titleEl = document.querySelector('.top-matter p.title a.title');
  const title = titleEl ? titleEl.innerText.trim() : '';

  const bodyEl = document.querySelector('.usertext-body .md');
  const body = bodyEl ? bodyEl.innerText.trim() : '';

  const subredditMatch = window.location.pathname.match(/\/r\/([^/]+)/);
  const subreddit = subredditMatch ? subredditMatch[1] : '';

  const commentEls = document.querySelectorAll('.commentarea .usertext-body .md');
  const topComments = Array.from(commentEls)
    .slice(0, 3)
    .map((el) => el.innerText.trim())
    .filter(Boolean);

  return { title, body, subreddit, topComments, isOldReddit: true };
}

function extractPostData() {
  const isOldReddit = window.location.hostname === 'old.reddit.com';
  const isPostPage = /\/r\/[^/]+\/comments\//.test(window.location.pathname);

  if (!isPostPage) return null;

  const data = isOldReddit ? extractOldRedditPost() : extractNewRedditPost();
  if (!data.title) return null;

  return { ...data, url: window.location.href };
}

// ── Parent-comment extraction ────────────────────────────────────────────────

/**
 * Given an element (e.g. inside a reply textarea), walks up the DOM to find
 * the comment being replied to and returns its text content.
 *
 * Supports three Reddit layouts:
 *   1. Shreddit  – <shreddit-comment> web components (current reddit.com)
 *   2. React new – [data-testid="comment"] divs (older new Reddit)
 *   3. Old Reddit – .comment divs
 */
function findParentCommentText(el) {
  if (!el) return null;

  // 1. Shreddit (web-component Reddit)
  const shredditComment = el.closest('shreddit-comment');
  if (shredditComment) {
    const body =
      shredditComment.querySelector('[id^="comment-body-"]') ||
      shredditComment.querySelector('[slot="text-body"] .md') ||
      shredditComment.querySelector('.RichTextJSON-root') ||
      shredditComment.querySelector('[class*="-comment-body"]');
    if (body) return body.innerText.trim().slice(0, 1500) || null;
  }

  // 2. React new Reddit
  const reactComment = el.closest('[data-testid="comment"]');
  if (reactComment) {
    const body =
      reactComment.querySelector('.RichTextJSON-root') ||
      reactComment.querySelector('[data-click-id="text"] .md');
    if (body) return body.innerText.trim().slice(0, 1500) || null;
  }

  // 3. Old Reddit
  const oldComment = el.closest('.comment');
  if (oldComment) {
    const body = oldComment.querySelector('.usertext-body .md');
    if (body) return body.innerText.trim().slice(0, 1500) || null;
  }

  return null;
}

// ── Message handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getPostData') {
    const data = extractPostData();
    if (data) {
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false, error: 'Could not extract post data' });
    }
    return true;
  }

  if (message.action === 'getContextMenuData') {
    const postData = extractPostData();

    let targetComment = null;
    let source = null;

    // Prefer explicitly selected text (user highlighted a comment before right-clicking)
    if (message.selectionText) {
      targetComment = message.selectionText.trim().slice(0, 1500);
      source = 'selection';
    } else if (lastRightClickedEl) {
      // Right-clicked inside a reply textarea → find the owning comment
      targetComment = findParentCommentText(lastRightClickedEl);
      source = targetComment ? 'parent' : null;
    }

    sendResponse({ postData, targetComment, source });
    return true;
  }
});
