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
    if (!post || !post.id) {
      return;
    }

    const link = document.createElement('a');
    link.className = 'blog-item';
    link.href = `blog-detail.html?id=${encodeURIComponent(post.id)}`;
    const titleText = post?.title?.trim() || 'Untitled';
    link.setAttribute('aria-label', `${titleText}の記事詳細を読む`);

    const thumbnail = document.createElement('div');
    thumbnail.className = 'blog-thumbnail';

    const coverUrl = (post?.coverUrl || '').trim();
    if (coverUrl) {
      const img = document.createElement('img');
      img.src = coverUrl;
      img.alt = `${titleText}のサムネイル画像`;
      thumbnail.appendChild(img);
    } else {
      thumbnail.classList.add('is-placeholder');
      const placeholder = document.createElement('span');
      placeholder.textContent = '画像なし';
      thumbnail.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'blog-info';

    const title = document.createElement('h3');
    title.textContent = titleText;
    info.appendChild(title);

    const subtitle = (post?.subtitle || '').trim();
    if (subtitle) {
      const excerpt = document.createElement('p');
      excerpt.className = 'blog-excerpt';
      excerpt.textContent = truncateText(subtitle, 160);
      info.appendChild(excerpt);
    }

    const meta = document.createElement('p');
    meta.className = 'blog-meta';
    const tags = Array.isArray(post?.tags) && post.tags.length > 0 ? `#${post.tags.join(' / #')}` : 'タグ未設定';
    meta.textContent = tags;
    info.appendChild(meta);

    link.appendChild(thumbnail);
    link.appendChild(info);

    postsContainer.appendChild(link);
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
