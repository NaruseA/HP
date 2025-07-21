import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Works from './pages/Works';
import About from './pages/About';
import Blog from './pages/Blog';
import './App.css';

function App() {
  return (
    <div className="main-layout-container">
      <nav className="sidebar">
        <div className="sidebar-inner">
          <Link to="/works" className="logo">Portfolio</Link>
          <ul className="nav-links">
            <li><Link to="/works">HOME</Link></li>
            <li><Link to="/works">Works</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </div>
      </nav>
      <main className="content-area">
        <div className="content-area-inner">
          <Routes>
            <Route path="/" element={<Navigate to="/works" />} />
            <Route path="/works" element={<Works />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
