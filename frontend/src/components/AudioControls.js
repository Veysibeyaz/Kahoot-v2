// src/components/AudioControls.js
import React, { useState, useEffect } from 'react';
import audioService from '../services/audioService';
import './AudioControls.css';

const AudioControls = ({ showInGame = false }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Audio service'den mevcut durumu al
    const audioState = audioService.getAudioState();
    setIsMuted(audioState.isMuted);
    setVolume(audioState.volume);
    setMusicVolume(audioState.musicVolume);
  }, []);

  const handleToggleMute = () => {
    const newMutedState = audioService.toggleMute();
    setIsMuted(newMutedState);
    
    // Click sound çal (mute değilse)
    if (!newMutedState) {
      audioService.playClickSound();
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    audioService.setVolume(newVolume);
    
    // Volume değiştiğinde test sesi çal
    if (!isMuted) {
      audioService.playClickSound();
    }
  };

  const handleMusicVolumeChange = (newVolume) => {
    setMusicVolume(newVolume);
    audioService.setMusicVolume(newVolume);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!isMuted) {
      audioService.playClickSound();
    }
  };

  if (showInGame) {
    // Oyun içi minimal kontroller
    return (
      <div className="audio-controls-ingame">
        <button 
          onClick={handleToggleMute}
          className={`mute-button-ingame ${isMuted ? 'muted' : ''}`}
          title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
        
        {showControls && (
          <div className="audio-panel-ingame">
            <div className="volume-control">
              <i className="fas fa-volume-down"></i>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="volume-slider"
                disabled={isMuted}
              />
              <i className="fas fa-volume-up"></i>
            </div>
            
            <div className="music-control">
              <i className="fas fa-music"></i>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={musicVolume}
                onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                className="music-slider"
                disabled={isMuted}
              />
            </div>
          </div>
        )}
        
        <button 
          onClick={toggleControls}
          className="settings-button-ingame"
          title="Ses Ayarları"
        >
          <i className="fas fa-cog"></i>
        </button>
      </div>
    );
  }

  // Dashboard ve diğer sayfalardaki tam kontroller
  return (
    <div className="audio-controls">
      <div className="audio-header">
        <h3>
          <i className="fas fa-volume-up"></i>
          Ses Ayarları
        </h3>
        <button 
          onClick={handleToggleMute}
          className={`mute-toggle ${isMuted ? 'muted' : ''}`}
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
          {isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
        </button>
      </div>

      <div className="controls-grid">
        <div className="control-group">
          <label>
            <i className="fas fa-volume-down"></i>
            Efekt Sesleri
          </label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
              disabled={isMuted}
            />
            <span className="volume-display">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <div className="control-group">
          <label>
            <i className="fas fa-music"></i>
            Arka Plan Müziği
          </label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
              className="music-slider"
              disabled={isMuted}
            />
            <span className="volume-display">{Math.round(musicVolume * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="audio-test-buttons">
        <button 
          onClick={() => audioService.playCorrectSound()}
          disabled={isMuted}
          className="test-button correct"
        >
          <i className="fas fa-check"></i>
          Doğru Ses
        </button>
        
        <button 
          onClick={() => audioService.playWrongSound()}
          disabled={isMuted}
          className="test-button wrong"
        >
          <i className="fas fa-times"></i>
          Yanlış Ses
        </button>
        
        <button 
          onClick={() => audioService.playWarningSound()}
          disabled={isMuted}
          className="test-button warning"
        >
          <i className="fas fa-exclamation-triangle"></i>
          Uyarı Sesi
        </button>
      </div>

      <div className="audio-info">
        <p>
          <i className="fas fa-info-circle"></i>
          Ses efektleri ve müzik oyun deneyiminizi geliştirir. İstemezseniz kapatabilirsiniz.
        </p>
      </div>
    </div>
  );
};

export default AudioControls;