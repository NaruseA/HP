// ① Notion設定はサーバーサイドで管理

// ② APIに問い合わせてデータを取得
async function renderPosts() {
  const container = document.getElementById("posts");

  try {
    const res = await fetch("/api/posts"); // サーバーレス経由
    if (!res.ok) throw new Error("サーバーからの取得失敗");

    const data = await res.json();

    if (!data.length) {
      container.textContent = "記事はまだありません。";
      return;
    }

    container.innerHTML = data.map(post => `
      <article data-id="${post.id}">
        <a href="post.html?slug=${post.id}">
          <h2>${post.title}</h2>
          <p class="tags">${post.tags.join(", ")}</p>
        </a>
      </article>
    `).join("");

  } catch (err) {
    console.error(err);
    container.textContent = "記事取得に失敗しました。";
  }
}

renderPosts();