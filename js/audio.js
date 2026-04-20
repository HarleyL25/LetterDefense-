// Audio Manager using Web Audio API
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.musicVolume = 0.2;
        this.sfxVolume = 0.4;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.backgroundMusic = null;
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Create an oscillator-based sound effect
    createTone(frequency, type, duration, volume = 1) {
        if (!this.audioContext || !this.sfxEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(volume * this.sfxVolume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    // Shoot sound - quick laser-like beep
    playShoot() {
        if (!this.audioContext || !this.sfxEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        
        const now = this.audioContext.currentTime;
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }

    // Hit sound - satisfying pop when letter is destroyed
    playHit() {
        if (!this.audioContext || !this.sfxEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.4 * this.sfxVolume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    // Miss sound - when letter reaches bottom
    playMiss() {
        if (!this.audioContext || !this.sfxEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        
        const now = this.audioContext.currentTime;
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        gainNode.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    // Victory sound - ascending triumphant tone
    playVictory() {
        if (!this.audioContext || !this.sfxEnabled) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (major chord)
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                
                oscillator.start(now);
                oscillator.stop(now + 0.4);
            }, index * 100);
        });
    }

    // Game Over sound - descending sad tone
    playGameOver() {
        if (!this.audioContext || !this.sfxEnabled) return;

        const notes = [392.00, 349.23, 293.66, 261.63]; // G, F, D, C (descending)
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'triangle';
                oscillator.frequency.value = freq;
                
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                oscillator.start(now);
                oscillator.stop(now + 0.5);
            }, index * 150);
        });
    }

    // Background music - simple looping melody
    startBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled || this.backgroundMusic) return;

        this.backgroundMusic = {
            playing: true,
            interval: null
        };

        const melody = [
            { freq: 261.63, duration: 0.3 }, // C
            { freq: 293.66, duration: 0.3 }, // D
            { freq: 329.63, duration: 0.3 }, // E
            { freq: 293.66, duration: 0.3 }, // D
            { freq: 261.63, duration: 0.3 }, // C
            { freq: 293.66, duration: 0.3 }, // D
            { freq: 329.63, duration: 0.6 }, // E
            { freq: 349.23, duration: 0.6 }, // F
        ];

        let noteIndex = 0;

        const playNote = () => {
            if (!this.backgroundMusic || !this.backgroundMusic.playing) return;

            const note = melody[noteIndex];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = note.freq;
            
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.1 * this.musicVolume * this.masterVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.duration);
            
            oscillator.start(now);
            oscillator.stop(now + note.duration);

            noteIndex = (noteIndex + 1) % melody.length;
            
            this.backgroundMusic.timeout = setTimeout(playNote, note.duration * 1000);
        };

        playNote();
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.playing = false;
            if (this.backgroundMusic.timeout) {
                clearTimeout(this.backgroundMusic.timeout);
            }
            this.backgroundMusic = null;
        }
    }

    // Toggle functions
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopBackgroundMusic();
        }
        return this.musicEnabled;
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}

// Create global audio manager instance
const audioManager = new AudioManager();
