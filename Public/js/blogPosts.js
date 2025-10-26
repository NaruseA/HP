const postsContainer = document.getElementById('blog-posts');
const postsEmptyMessage = document.getElementById('blog-empty');
const tagList = document.getElementById('blog-tags');
const tagEmptyMessage = document.getElementById('tag-empty');

if (postsContainer) {
  loadBlogContent().catch((error) => {
    console.error('ブログ記事の読み込みに失敗しました:', error);
    if (postsEmptyMessage) {
      postsEmptyMessage.style.display = 'block';
    }
    if (tagEmptyMessage) {
      tagEmptyMessage.style.display = 'block';
    }
  });
}

async function loadBlogContent() {
  const response = await fetch('/api/posts');
  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  const posts = await response.json();
  renderPosts(posts);
  renderTags(posts);
}

function renderPosts(posts) {
  postsContainer.innerHTML = '';

  if (!Array.isArray(posts) || posts.length === 0) {
    if (postsEmptyMessage) {
      postsEmptyMessage.style.display = 'block';
    }
    return;
  }

  if (postsEmptyMessage) {
    postsEmptyMessage.style.display = 'none';
  }

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';

    const title = document.createElement('h3');
    title.textContent = post?.title?.trim() || 'Untitled';
    article.appendChild(title);

    const excerpt = document.createElement('p');
    const plainText = (post?.content || '').trim();
    excerpt.textContent = plainText ? truncateText(plainText, 160) : '本文は準備中です。';
    article.appendChild(excerpt);

    const meta = document.createElement('p');
    meta.className = 'blog-meta';
    const tags = Array.isArray(post?.tags) && post.tags.length > 0 ? `#${post.tags.join(' / #')}` : 'タグ未設定';
    meta.textContent = tags;
    article.appendChild(meta);

    postsContainer.appendChild(article);
  });
}

function renderTags(posts) {
  if (!tagList) {
    return;
  }

  tagList.innerHTML = '';

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
    if (tagEmptyMessage) {
      tagEmptyMessage.style.display = 'block';
    }
    return;
  }

  if (tagEmptyMessage) {
    tagEmptyMessage.style.display = 'none';
  }

  uniqueTags.forEach((tag) => {
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
