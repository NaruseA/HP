fetch('common/sidebar.html')
  .then(response => response.text())
  .then(html => {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = html;

    activateCurrentLink(); 
  })
  .catch(err => console.error('サイドバー読み込み失敗:', err));

  