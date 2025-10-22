// src/App.jsx
import React from 'react';
import BirthdayGame from './BirthdayGame'; // Component'inizin adı ve yoluna göre ayarlayın
import './index.css'; // Varsayılan Vite stilini koruyabiliriz

function App() {
  // Oyunun tam ekran (full-viewport) çalışmasını sağlamak için
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a2e', // Oyunun kendi arka plan rengini korumak için
      padding: '20px 0'
    }}>
      <BirthdayGame />
    </div>
  );
}

export default App;
