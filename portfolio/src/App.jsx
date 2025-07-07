import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Works from './pages/Works';
import About from './pages/About';
import Blog from './pages/Blog';
import './App.css';

function App() {
  return (
    <div className="app-root">
      <header className="header">
        <nav className="navbar">
          <div className="logo">Portfolio</div>
          <ul className="nav-links">
            <li><Link to="/works">Works</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </nav>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/works" />} />
          <Route path="/works" element={<Works />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
