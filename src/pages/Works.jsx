import './Works.css';

const dummyItems = Array.from({ length: 20 }).map((_, i) => {
  if (i < 12) {
    return `https://placehold.jp/40/cccccc/444444/300x300.png?text=Work+${i+1}`;
  } else {
    return null; // Noneを表示する場所
  }
});

export default function Works() {
  return (
    <div>
      
      <div className="works-grid">
        {dummyItems.map((item, i) => (
          <div className="work-item" key={i}>
            {item ? (
              <img src={item} alt={`Work ${i+1}`} />
            ) : (
              <div className="work-item-none">None</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 