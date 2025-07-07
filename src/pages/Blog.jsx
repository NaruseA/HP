const dummyPosts = [
  { title: 'ポートフォリオサイトをリニューアルしました', date: '2024-06-01', excerpt: '新しいデザインで公開しました。制作のポイントや工夫した点を紹介します。' },
  { title: 'UIデザインの配色Tips', date: '2024-05-20', excerpt: '彩度を抑えた配色で落ち着いた印象に。実例とともに解説します。' },
  { title: 'Figmaで効率的に作業する方法', date: '2024-05-10', excerpt: 'ショートカットや便利なプラグインをまとめました。' },
];

export default function Blog() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ color: '#444', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>Blog</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {dummyPosts.map((post, i) => (
          <li key={i} style={{ background: '#f8f8fa', borderRadius: 10, marginBottom: '1.2rem', padding: '1.2rem 1.5rem', boxShadow: '0 2px 8px rgba(80,80,80,0.04)' }}>
            <div style={{ color: '#7e8a97', fontSize: '0.95rem', marginBottom: 4 }}>{post.date}</div>
            <div style={{ color: '#333', fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>{post.title}</div>
            <div style={{ color: '#666', fontSize: '0.98rem' }}>{post.excerpt}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 