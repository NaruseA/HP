const detailContainer = document.getElementById('blog-detail');
const titleElement = document.getElementById('blog-title');
const tagsElement = document.getElementById('blog-tags');
const coverWrapper = document.getElementById('blog-cover-wrapper');
const contentElement = document.getElementById('blog-content');
const errorMessage = document.getElementById('blog-error');

if (detailContainer) {
  detailContainer.setAttribute('aria-busy', 'true');
}

const searchParams = new URLSearchParams(window.location.search);
const postId = searchParams.get('id');

if (postId) {
  loadPost(postId).catch((error) => {
    console.error('記事の読み込みに失敗しました:', error);
    showError();
  });
} else {
  showError('記事IDが指定されていません。');
}

async function loadPost(id) {
  const response = await fetch(`/api/posts?id=${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  const post = await response.json();
  renderPost(post);
}

function renderPost(post) {
  if (!post || typeof post !== 'object') {
    showError('記事が見つかりませんでした。');
    return;
  }

  hideError();

  const titleText = (post.title || '').trim() || 'Untitled';
  if (titleElement) {
    titleElement.textContent = titleText;
  }
  document.title = `${titleText} | Blog`;

  renderTags(Array.isArray(post.tags) ? post.tags : []);
  renderCover((post.coverUrl || '').trim(), titleText);
  renderContent({
    html: (post.contentHtml || '').trim(),
    plainText: (post.content || '').trim(),
  });

  if (detailContainer) {
    detailContainer.setAttribute('aria-busy', 'false');
  }
}

function renderTags(tags) {
  if (!tagsElement) {
    return;
  }

  if (!Array.isArray(tags) || tags.length === 0) {
    tagsElement.textContent = 'タグ未設定';
    return;
  }

  tagsElement.textContent = `#${tags.join(' / #')}`;
}

function renderCover(url, titleText) {
  if (!coverWrapper) {
    return;
  }

  coverWrapper.innerHTML = '';

  if (!url) {
    coverWrapper.style.display = 'none';
    return;
  }

  const image = document.createElement('img');
  image.src = url;
  image.alt = `${titleText}のサムネイル画像`;
  coverWrapper.appendChild(image);
  coverWrapper.style.display = 'block';
}

function renderContent({ html, plainText }) {
  if (!contentElement) {
    return;
  }

  contentElement.innerHTML = '';

  if (html) {
    contentElement.innerHTML = html;
    return;
  }

  if (!plainText) {
    const placeholder = document.createElement('p');
    placeholder.textContent = '本文は準備中です。';
    contentElement.appendChild(placeholder);
    return;
  }

  const normalized = plainText.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  if (paragraphs.length === 0) {
    const fallback = document.createElement('p');
    fallback.textContent = normalized;
    contentElement.appendChild(fallback);
    return;
  }

  paragraphs.forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    contentElement.appendChild(p);
  });
}

function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message || '記事を読み込めませんでした。';
    errorMessage.style.display = 'block';
  }

  if (detailContainer) {
    detailContainer.setAttribute('aria-busy', 'false');
  }

  if (titleElement) {
    titleElement.textContent = '記事を読み込めませんでした';
  }

  document.title = '記事を読み込めませんでした | Blog';

  if (coverWrapper) {
    coverWrapper.style.display = 'none';
    coverWrapper.innerHTML = '';
  }

  if (contentElement) {
    contentElement.innerHTML = '';
  }
}

function hideError() {
  if (errorMessage) {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
  }
}
