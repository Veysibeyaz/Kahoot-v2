// src/services/audioService.js
class AudioService {
  constructor() {
    this.sounds = {};
    this.backgroundMusic = null;
    this.isMuted = false;
    this.volume = 0.7;
    this.musicVolume = 0.3;
    
    // localStorage'dan ses ayarlarını yükle
    this.loadSettings();
    
    // Ses dosyalarını preload et
    this.preloadSounds();
  }

  // Ses ayarlarını localStorage'dan yükle
  loadSettings() {
    const savedSettings = localStorage.getItem('audioSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.isMuted = settings.isMuted || false;
      this.volume = settings.volume || 0.7;
      this.musicVolume = settings.musicVolume || 0.3;
    }
  }

  // Ses ayarlarını localStorage'a kaydet
  saveSettings() {
    const settings = {
      isMuted: this.isMuted,
      volume: this.volume,
      musicVolume: this.musicVolume
    };
    localStorage.setItem('audioSettings', JSON.stringify(settings));
  }

  // Ses dosyalarını önceden yükle
  preloadSounds() {
    const soundFiles = {
      // Correct answer sounds
      correct1: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      correct2: 'https://www.soundjay.com/misc/sounds/success-notification.wav',
      
      // Wrong answer sounds  
      wrong1: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav',
      wrong2: 'https://www.soundjay.com/misc/sounds/negative-beep.wav',
      
      // Timer sounds
      tick: 'https://www.soundjay.com/misc/sounds/clock-tick.wav',
      timeUp: 'https://www.soundjay.com/misc/sounds/time-up-alarm.wav',
      warning: 'https://www.soundjay.com/misc/sounds/warning-beep.wav',
      
      // Game flow sounds
      gameStart: 'https://www.soundjay.com/misc/sounds/game-start.wav',
      gameEnd: 'https://www.soundjay.com/misc/sounds/game-end.wav',
      nextQuestion: 'https://www.soundjay.com/misc/sounds/next-level.wav',
      
      // UI sounds
      click: 'https://www.soundjay.com/misc/sounds/button-click.wav',
      hover: 'https://www.soundjay.com/misc/sounds/button-hover.wav',
      join: 'https://www.soundjay.com/misc/sounds/player-join.wav',
      leave: 'https://www.soundjay.com/misc/sounds/player-leave.wav'
    };

    // Fallback olarak Web Audio API ile basit sesler oluştur
    this.createFallbackSounds();
    
    // Gerçek ses dosyalarını yükle (varsa)
    Object.keys(soundFiles).forEach(key => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this.volume;
        // Ses dosyası yüklenemezse fallback kullan
        audio.onerror = () => {
          console.log(`Using fallback sound for ${key}`);
        };
        this.sounds[key] = audio;
      } catch (error) {
        console.log(`Failed to load sound ${key}, using fallback`);
      }
    });
  }

  // Web Audio API ile basit sesler oluştur
  createFallbackSounds() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.log('Web Audio API not supported');
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();

    // Basit ses oluşturma fonksiyonları
    this.createBeepSound = (frequency, duration, type = 'sine') => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };
  }

  // Background music çal
  playBackgroundMusic() {
    if (this.isMuted) return;
    
    // Basit background music (birden fazla ton kombinasyonu)
    if (this.audioContext) {
      this.playAmbientMusic();
    }
  }

  // Ambient music çal
  playAmbientMusic() {
    if (this.isMuted || !this.audioContext) return;
    
    const playTone = (freq, duration, delay = 0) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.1, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
      }, delay * 1000);
    };

    // Sıralı notalar (basit melodi)
    const melody = [523, 587, 659, 698, 784, 698, 659, 587]; // C, D, E, F, G, F, E, D
    melody.forEach((freq, index) => {
      playTone(freq, 0.8, index * 0.5);
    });
    
    // 4 saniye sonra tekrar başlat
    setTimeout(() => {
      if (!this.isMuted) {
        this.playAmbientMusic();
      }
    }, 4000);
  }

  // Background music durdur
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  // Doğru cevap sesi
  playCorrectSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Yükselen ton dizisi (başarı)
      [523, 659, 784].forEach((freq, index) => {
        setTimeout(() => {
          this.createBeepSound(freq, 0.2, 'triangle');
        }, index * 100);
      });
    }
  }

  // Yanlış cevap sesi
  playWrongSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Düşük, keskin ses (hata)
      this.createBeepSound(200, 0.5, 'sawtooth');
    }
  }

  // Timer tick sesi
  playTickSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      this.createBeepSound(800, 0.1, 'square');
    }
  }

  // Süre doldu sesi
  playTimeUpSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Alarm sesi
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.createBeepSound(1000, 0.3, 'square');
        }, i * 300);
      }
    }
  }

  // Uyarı sesi (son 5 saniye)
  playWarningSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      this.createBeepSound(1200, 0.15, 'triangle');
    }
  }

  // Oyun başlama sesi
  playGameStartSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Artan ton dizisi
      [440, 554, 659, 880].forEach((freq, index) => {
        setTimeout(() => {
          this.createBeepSound(freq, 0.3, 'triangle');
        }, index * 150);
      });
    }
  }

  // Oyun bitme sesi
  playGameEndSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Kapanış melodisi
      [880, 784, 659, 523, 440].forEach((freq, index) => {
        setTimeout(() => {
          this.createBeepSound(freq, 0.4, 'sine');
        }, index * 200);
      });
    }
  }

  // Sonraki soru sesi
  playNextQuestionSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Kısa, pozitif ses
      [659, 784].forEach((freq, index) => {
        setTimeout(() => {
          this.createBeepSound(freq, 0.2, 'triangle');
        }, index * 100);
      });
    }
  }

  // UI click sesi
  playClickSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      this.createBeepSound(600, 0.1, 'square');
    }
  }

  // UI hover sesi
  playHoverSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      this.createBeepSound(400, 0.05, 'sine');
    }
  }

  // Oyuncu katılma sesi
  playJoinSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Yükselen kısa ton
      this.createBeepSound(523, 0.2, 'triangle');
      setTimeout(() => {
        this.createBeepSound(659, 0.2, 'triangle');
      }, 100);
    }
  }

  // Oyuncu ayrılma sesi
  playLeaveSound() {
    if (this.isMuted) return;
    
    if (this.audioContext) {
      // Düşen kısa ton
      this.createBeepSound(659, 0.2, 'triangle');
      setTimeout(() => {
        this.createBeepSound(523, 0.2, 'triangle');
      }, 100);
    }
  }

  // Sesi aç/kapat
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
    
    return this.isMuted;
  }

  // Ses seviyesi ayarla
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    
    // Mevcut seslerin seviyesini güncelle
    Object.values(this.sounds).forEach(sound => {
      if (sound.volume !== undefined) {
        sound.volume = this.volume;
      }
    });
  }

  // Müzik seviyesi ayarla
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume;
    }
  }

  // Ses durumu bilgilerini al
  getAudioState() {
    return {
      isMuted: this.isMuted,
      volume: this.volume,
      musicVolume: this.musicVolume,
      isBackgroundMusicPlaying: this.backgroundMusic && !this.backgroundMusic.paused
    };
  }

  // Audio Context'i başlat (user interaction gerekli)
  initAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Singleton instance
const audioService = new AudioService();

export default audioService;