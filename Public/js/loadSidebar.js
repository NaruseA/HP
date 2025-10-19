fetch('/common/sidebar.html')
  .then(res => res.text())
  .then(html => {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = html;
    sidebar.style.display = 'block';

    // 現在ページリンクをアクティブにする
    const links = sidebar.querySelectorAll('.nav-link');
    const current = location.pathname.split('/').pop();
    links.forEach(link => {
      if(link.getAttribute('href') === current) {
        link.classList.add('active');
      }
    });
  })
  .catch(err => console.error('サイドバー読み込み失敗:', err));
