const postsContainer = document.getElementById('blog-posts');
const postsLoadingMessage = document.getElementById('blog-loading');
const postsEmptyMessage = document.getElementById('blog-empty');
const postsErrorMessage = document.getElementById('blog-error');

const tagList = document.getElementById('blog-tags');
const tagLoadingMessage = document.getElementById('tag-loading');
const tagEmptyMessage = document.getElementById('tag-empty');
const tagErrorMessage = document.getElementById('tag-error');

if (postsContainer) {
  loadBlogContent().catch((error) => {
    console.error('ブログ記事の読み込みに失敗しました:', error);
    hide(postsLoadingMessage);
    hide(tagLoadingMessage);
    hide(postsEmptyMessage);
    hide(tagEmptyMessage);
    show(postsErrorMessage);
    show(tagErrorMessage);
  });
}

async function loadBlogContent() {
  show(postsLoadingMessage);
  show(tagLoadingMessage);

  const response = await fetch('/api/posts');
  if (!response.ok) {
    throw new Error(await buildApiErrorMessage(response));
  }

  const posts = await response.json();
  if (!Array.isArray(posts)) {
    throw new Error('API responded with an unexpected payload');
  }

  hide(postsErrorMessage);
  hide(tagErrorMessage);
  renderPosts(posts);
  renderTags(posts);
}

function renderPosts(posts) {
  postsContainer.innerHTML = '';
  hide(postsLoadingMessage);

  if (!Array.isArray(posts) || posts.length === 0) {
    show(postsEmptyMessage);
    return;
  }

  hide(postsEmptyMessage);

  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = Date.parse(a?.lastEdited ?? a?.createdAt ?? 0) || 0;
    const timeB = Date.parse(b?.lastEdited ?? b?.createdAt ?? 0) || 0;
    return timeB - timeA;
  });

  sortedPosts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';

    const title = document.createElement('h3');
    const postTitle = post?.title?.trim() || 'Untitled';
    if (post?.url) {
      const link = document.createElement('a');
      link.href = post.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = postTitle;
      title.appendChild(link);
    } else {
      title.textContent = postTitle;
    }
    article.appendChild(title);

    const excerpt = document.createElement('p');
    const plainText = (post?.content || '').trim();
    excerpt.textContent = plainText ? truncateText(plainText, 160) : '本文は準備中です。';
    article.appendChild(excerpt);

    const meta = document.createElement('p');
    meta.className = 'blog-meta';
    const tags = Array.isArray(post?.tags) ? post.tags.filter(Boolean) : [];
    const dateText = formatDate(post?.lastEdited ?? post?.createdAt);

    const metaParts = [];
    if (dateText) {
      metaParts.push(dateText);
    }
    if (tags.length > 0) {
      metaParts.push(`#${tags.join(' / #')}`);
    }

    meta.textContent = metaParts.length > 0 ? metaParts.join(' ｜ ') : 'タグ未設定';
    article.appendChild(meta);

    postsContainer.appendChild(article);
  });
}

function renderTags(posts) {
  if (!tagList) {
    return;
  }

  tagList.innerHTML = '';
  hide(tagLoadingMessage);

  const uniqueTags = new Set();
  posts.forEach((post) => {
    if (Array.isArray(post?.tags)) {
      post.tags.forEach((tag) => {
        if (tag && typeof tag === 'string') {
          uniqueTags.add(tag);
        }
      });
    }
  });

  if (uniqueTags.size === 0) {
    show(tagEmptyMessage);
    return;
  }

  hide(tagEmptyMessage);

  Array.from(uniqueTags)
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = `#${tag}`;
      tagList.appendChild(item);
    });
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

async function buildApiErrorMessage(response) {
  const status = response.status || 'unknown';
  const statusText = response.statusText || '';

  try {
    const data = await response.json();
    if (data && typeof data.error === 'string' && data.error.trim() !== '') {
      return `API responded with ${status} ${statusText}: ${data.error}`;
    }
  } catch (error) {
    // Ignore body parsing errors and fallback to plain text.
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return `API responded with ${status} ${statusText}: ${text}`;
    }
  } catch (error) {
    // Ignore body parsing errors.
  }

  return `API responded with ${status} ${statusText}`;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function show(element) {
  if (!element) {
    return;
  }
  element.style.display = 'block';
}

function hide(element) {
  if (!element) {
    return;
  }
  element.style.display = 'none';
}
