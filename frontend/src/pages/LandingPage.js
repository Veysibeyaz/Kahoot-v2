// src/pages/LobbyPage.js
import React, { useState, useEffect, useCallback } from 'react'; // useCallback eklendi
import { useParams } from 'react-router-dom';
import './LobbyPage.css';

// Bu bilgiyi gerçek uygulamanızda kullanıcının oturumundan veya global state'ten almalısınız.
// Örneğin: const currentUser = useAuth(); // Kendi auth hook'unuzdan
const MOCK_CURRENT_USER_ID = 'user123'; // Şimdilik mevcut kullanıcıyı simüle ediyoruz
                                      // GERÇEK KULLANICI ID'NİZ İLE DEĞİŞTİRİN VEYA DİNAMİK ALIN

const LobbyPage = () => {
  const { gameCode } = useParams();
  const [players, setPlayers] = useState([]); // Başlangıçta boş dizi
  const [gameDetails, setGameDetails] = useState(null); // Oyun detayları (host bilgisi vb. için)
  const [isLoading, setIsLoading] = useState(true); // Sayfa yüklenirken true
  const [error, setError] = useState(null); // Hata mesajları için
 
  // Mevcut kullanıcının host olup olmadığını kontrol et
  // Bu, gameDetails içindeki hostId ile currentUser.id karşılaştırılarak yapılmalı.
  // Şimdilik MOCK_CURRENT_USER_ID ve gameDetails.hostId (eğer varsa) üzerinden gidiyoruz.
  const isHost = gameDetails && gameDetails.hostId === MOCK_CURRENT_USER_ID;

  // Oyuncuları ve oyun detaylarını çekme fonksiyonu
  const fetchGameData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Önce oyun detaylarını (host bilgisi vs. için) ve oyuncuları çekebiliriz.
      // Backend'inizde böyle bir endpoint varsa: GET /api/games/GAME_CODE
      // Bu endpoint hem oyunun genel bilgilerini (hostId, gameState) hem de oyuncu listesini dönebilir.
      // Ya da oyuncuları ayrı bir endpoint'ten çekebilirsiniz: GET /api/games/GAME_CODE/players
      
      // Varsayım: /api/games/:gameCode hem oyun detaylarını hem de oyuncu listesini dönüyor.
      const response = await fetch(`http://localhost:5000/api/games/${gameCode}`, {
        headers: {
          // 'Authorization': `Bearer ${YOUR_USER_TOKEN}`, // Gerekliyse token
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Oyun verileri çekilemedi (HTTP ${response.status})`);
      }
      const data = await response.json();
      
      // Backend'den gelen yanıta göre state'leri güncelle
      // Örneğin, backend şöyle bir data dönebilir:
      // { hostId: 'someUserId', players: [{id: 'user1', username: 'Player1'}, ...], gameState: 'waiting' }
      setGameDetails(data); // Oyunun genel bilgilerini sakla
      setPlayers(data.players || []); // Oyuncu listesini güncelle

    } catch (err) {
      console.error('Oyun verilerini çekerken hata:', err);
      setError(err.message);
      setPlayers([]); // Hata durumunda oyuncu listesini boşalt
    } finally {
      setIsLoading(false);
    }
  }, [gameCode]); // YOUR_USER_TOKEN da bağımlılığa eklenebilir eğer kullanılıyorsa

  useEffect(() => {
    fetchGameData(); // Sayfa yüklendiğinde ve gameCode değiştiğinde verileri çek

    // Gerçek zamanlı güncellemeler için WebSocket veya periyodik polling eklenebilir.
    // Örneğin, her 5 saniyede bir oyuncu listesini tekrar çek:
    const intervalId = setInterval(fetchGameData, 5000); // Her 5 saniyede bir güncelle

    return () => clearInterval(intervalId); // Component unmount olduğunda interval'ı temizle
  }, [fetchGameData]); // fetchGameData useCallback ile sarmalandığı için buraya eklenebilir.

  const handleStartGame = async () => {
    // ... (Bu fonksiyon aynı kalabilir, sadece token'ı doğru yerden aldığından emin ol)
    // 'Authorization': `Bearer ${YOUR_HOST_TOKEN}`
  };

  if (isLoading) {
    return <div className="lobby-container"><p>Lobi yükleniyor...</p></div>;
  }

  if (error) {
    return <div className="lobby-container"><p>Hata: {error} <button onClick={fetchGameData}>Tekrar Dene</button></p></div>;
  }

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>Bekleme Odası</h1>
        <p className="game-code-display">Oyun Kodu: <strong>{gameCode}</strong></p>
        {gameDetails && <p>Oyun Durumu: {gameDetails.gameState}</p>}
      </header>

      <div className="players-list">
        <h2>Katılan Oyuncular ({players.length})</h2>
        {players.length > 0 ? (
          <div className="balloons-area">
            {players.map((player) => (
              <div key={player.id} className="player-balloon">
                {player.username}
                {/* Eğer mevcut kullanıcı bu oyuncuysa veya host ise farklı bir işaret koyabilirsin */}
                {player.id === MOCK_CURRENT_USER_ID && <span> (Bu Sensin!)</span>}
                {gameDetails && player.id === gameDetails.hostId && <span> (Host)</span>}
              </div>
            ))}
          </div>
        ) : (
          <p>Henüz katılan oyuncu yok veya oyuncular yüklenemedi.</p>
        )}
      </div>

      <footer className="lobby-footer">
        {isHost ? ( // isHost artık gameDetails.hostId ve MOCK_CURRENT_USER_ID'ye göre çalışmalı
          <button
            onClick={handleStartGame}
            disabled={isLoading || players.length < 1} // Veya backend'den gelen gameState'e göre
            className="start-game-button"
          >
            {isLoading ? 'Başlatılıyor...' : 'Oyunu Başlat'}
          </button>
        ) : (
          <p className="waiting-message">Hostun oyunu başlatması bekleniyor...</p>
        )}
      </footer>
    </div>
  );
};

export default LobbyPage;