import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  // Basit bir inline stil
  const navStyle = {
    background: '#333',
    color: '#fff',
    padding: '10px 0',
    textAlign: 'center',
  };

  const linkStyle = {
    color: '#fff',
    margin: '0 10px',
    textDecoration: 'none',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle}>Ana Sayfa</Link>
      <Link to="/create-quiz" style={linkStyle}>Quiz Oluştur</Link>
      {/* Test için geçici linkler, daha sonra dinamik hale getirilecek */}
      <Link to="/quiz/test123/host" style={linkStyle}>Host Test Quiz</Link>
      <Link to="/quiz/ABCDE/play" style={linkStyle}>Play Test Quiz</Link>
      <Link to="/quiz/test123/scoreboard" style={linkStyle}>Skor Test Quiz</Link>
    </nav>
  );
}

export default Navbar;