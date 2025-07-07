import './Works.css';

const dummyImages = Array.from({ length: 12 }).map((_, i) => `https://placehold.jp/40/cccccc/444444/300x300.png?text=Work+${i+1}`);

export default function Works() {
  return (
    <div>
      <h2 className="works-title">作品集</h2>
      <div className="works-grid">
        {dummyImages.map((src, i) => (
          <div className="work-item" key={i}>
            <img src={src} alt={`Work ${i+1}`} />
          </div>
        ))}
      </div>
    </div>
  );
} 