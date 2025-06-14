// MP3 Player PWA - Main Application
class MP3Player {
    constructor() {
        // Core elements
        this.audio = document.getElementById('audioPlayer');
        this.fileInput = document.getElementById('fileInput');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.seekSlider = document.getElementById('seekSlider');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.muteBtn = document.getElementById('muteBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
        
        // Display elements
        this.playerSection = document.getElementById('playerSection');
        this.playlistSection = document.getElementById('playlistSection');
        this.currentTitle = document.getElementById('currentTitle');
        this.currentArtist = document.getElementById('currentArtist');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.playlist = document.getElementById('playlist');
        this.albumArt = document.querySelector('.album-art');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.errorContainer = document.getElementById('errorContainer');
        this.errorMessage = document.getElementById('errorMessage');
        
        // State management (in-memory)
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isMuted = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.volume = 0.7;
        this.currentTheme = 'light';
        this.shuffleOrder = [];
        this.originalOrder = [];
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMediaSession();
        this.setupTheme();
        this.setupAudioEvents();
        this.updateVolumeIcon();
        this.hideError();
        
        // Set initial volume
        this.audio.volume = this.volume;
        this.volumeSlider.value = this.volume * 100;
        
        console.log('MP3 Player initialized successfully');
    }
    
    setupEventListeners() {
        // File input
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
        
        // Seek and volume
        this.seekSlider.addEventListener('input', (e) => this.handleSeek(e));
        this.volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e));
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    setupAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('play', () => this.handlePlay());
        this.audio.addEventListener('pause', () => this.handlePause());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('loadstart', () => this.handleLoadStart());
        this.audio.addEventListener('canplay', () => this.handleCanPlay());
    }
    
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime) {
                    this.audio.currentTime = details.seekTime;
                }
            });
        }
    }
    
    setupTheme() {
        // Check system preference
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentTheme = systemDarkMode ? 'dark' : 'light';
        this.applyTheme();
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.currentTheme = e.matches ? 'dark' : 'light';
            this.applyTheme();
        });
    }
    
    async handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        try {
            for (const file of files) {
                if (this.isValidAudioFile(file)) {
                    await this.addTrack(file);
                } else {
                    this.showError(`サポートされていないファイル形式: ${file.name}`);
                }
            }
            
            if (this.tracks.length > 0) {
                this.showPlayer();
                if (!this.isPlaying) {
                    this.loadTrack(0);
                }
            }
        } catch (error) {
            this.showError('ファイルの読み込み中にエラーが発生しました');
            console.error('File selection error:', error);
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    iisValidAudioFile(file) {
        const validTypes = [
            'audio/mpeg', 'audio/mp3',
            'audio/flac', 'audio/x-flac',
            'audio/wav', 'audio/x-wav',
            'audio/ogg', 'audio/x-ogg',
            'audio/aac', 'audio/mp4', 'audio/webm', 'audio/opus',
            'audio/mp4; codecs=alac', // ALAC
            'audio/mp4; codecs=pcm'   // PCM (WAV)
        ];
        const validExts = [
            '.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.opus', '.webm'
        ];
        // MIMEタイプまたは拡張子で判定
        return validTypes.includes(file.type)
            || validExts.some(ext => file.name.toLowerCase().endsWith(ext));
}

    
    async addTrack(file) {
        try {
            const audioUrl = URL.createObjectURL(file);
            const metadata = await this.extractMetadata(file, audioUrl);
            
            const track = {
                id: Date.now() + Math.random(),
                file: file,
                url: audioUrl,
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: metadata.artist || '不明なアーティスト',
                duration: metadata.duration || 0,
                blob: file
            };
            
            this.tracks.push(track);
            this.updateOriginalOrder();
            this.renderPlaylist();
            
        } catch (error) {
            console.error('Error adding track:', error);
            this.showError(`トラックの追加に失敗しました: ${file.name}`);
        }
    }
    
    async extractMetadata(file, audioUrl) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            
            const timeout = setTimeout(() => {
                resolve({ title: null, artist: null, duration: 0 });
            }, 3000);
            
            audio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve({
                    title: null, // MP3 metadata reading would require additional library
                    artist: null,
                    duration: audio.duration || 0
                });
            });
            
            audio.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve({ title: null, artist: null, duration: 0 });
            });
            
            audio.src = audioUrl;
        });
    }
    
    updateOriginalOrder() {
        this.originalOrder = this.tracks.map((_, index) => index);
        if (this.isShuffled) {
            this.generateShuffleOrder();
        }
    }
    
    generateShuffleOrder() {
        this.shuffleOrder = [...this.originalOrder];
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
        }
    }
    
    getCurrentOrder() {
        return this.isShuffled ? this.shuffleOrder : this.originalOrder;
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        const track = this.tracks[index];
        this.currentTrackIndex = index;
        
        // Update UI
        this.currentTitle.textContent = track.title;
        this.currentArtist.textContent = track.artist;
        this.totalTime.textContent = this.formatTime(track.duration);
        
        // Load audio
        this.audio.src = track.url;
        this.audio.load();
        
        // Update MediaSession
        this.updateMediaSession(track);
        
        // Update playlist highlighting
        this.updatePlaylistHighlight();
        
        this.hideError();
    }
    
    updateMediaSession(track) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: 'MP3プレイヤー',
                artwork: [
                    { src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIj48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjEwMCIgZmlsbD0iIzIxODA4RCIgLz48cGF0aCBkPSJNOTAgOTBWMTUwSDM0MFY5MGgtNjAiIGZpbGw9IiNGQ0ZDRjkiIC8+PC9zdmc+', sizes: '240x240', type: 'image/svg+xml' }
                ]
            });
        }
    }
    
    async togglePlayPause() {
        try {
            if (this.tracks.length === 0) {
                this.showError('プレイリストにトラックがありません');
                return;
            }
            
            if (this.isPlaying) {
                this.pause();
            } else {
                await this.play();
            }
        } catch (error) {
            this.handlePlaybackError(error);
        }
    }
    
    async play() {
        try {
            await this.audio.play();
        } catch (error) {
            this.handlePlaybackError(error);
        }
    }
    
    pause() {
        this.audio.pause();
    }
    
    previousTrack() {
        if (this.tracks.length === 0) return;
        
        const currentOrder = this.getCurrentOrder();
        const currentOrderIndex = currentOrder.indexOf(this.currentTrackIndex);
        
        let newOrderIndex;
        if (currentOrderIndex > 0) {
            newOrderIndex = currentOrderIndex - 1;
        } else {
            newOrderIndex = currentOrder.length - 1;
        }
        
        const newTrackIndex = currentOrder[newOrderIndex];
        this.loadTrack(newTrackIndex);
        
        if (this.isPlaying) {
            this.play();
        }
    }
    
    nextTrack() {
        if (this.tracks.length === 0) return;
        
        const currentOrder = this.getCurrentOrder();
        const currentOrderIndex = currentOrder.indexOf(this.currentTrackIndex);
        
        let newOrderIndex;
        if (currentOrderIndex < currentOrder.length - 1) {
            newOrderIndex = currentOrderIndex + 1;
        } else {
            newOrderIndex = 0;
        }
        
        const newTrackIndex = currentOrder[newOrderIndex];
        this.loadTrack(newTrackIndex);
        
        if (this.isPlaying) {
            this.play();
        }
    }
    
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        
        if (this.isShuffled) {
            this.generateShuffleOrder();
        }
    }
    
    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        this.repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
        
        // Update button appearance based on repeat mode
        const svg = this.repeatBtn.querySelector('svg');
        if (this.repeatMode === 'one') {
            svg.innerHTML = `
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <text x="12" y="17" text-anchor="middle" font-size="8" fill="currentColor">1</text>
            `;
        } else {
            svg.innerHTML = `
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            `;
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;
        this.muteBtn.classList.toggle('muted', this.isMuted);
        this.updateVolumeIcon();
    }
    
    handleVolumeChange(event) {
        this.volume = event.target.value / 100;
        this.audio.volume = this.volume;
        
        if (this.isMuted && this.volume > 0) {
            this.isMuted = false;
            this.audio.muted = false;
            this.muteBtn.classList.remove('muted');
        }
        
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const volume = this.isMuted ? 0 : this.volume;
        
        if (volume === 0) {
            this.volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
            `;
        } else if (volume < 0.5) {
            this.volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            `;
        } else {
            this.volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            `;
        }
    }
    
    handleSeek(event) {
        const time = (event.target.value / 100) * this.audio.duration;
        this.audio.currentTime = time;
    }
    
    handleTrackEnd() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.repeatMode === 'all' || this.getCurrentOrder().indexOf(this.currentTrackIndex) < this.getCurrentOrder().length - 1) {
            this.nextTrack();
        } else {
            this.pause();
        }
    }
    
    handlePlay() {
        this.isPlaying = true;
        this.playIcon.style.display = 'none';
        this.pauseIcon.style.display = 'block';
        this.albumArt.classList.add('spinning');
    }
    
    handlePause() {
        this.isPlaying = false;
        this.playIcon.style.display = 'block';
        this.pauseIcon.style.display = 'none';
        this.albumArt.classList.remove('spinning');
    }
    
    handleLoadStart() {
        this.playerSection.classList.add('loading');
    }
    
    handleCanPlay() {
        this.playerSection.classList.remove('loading');
    }
    
    handleAudioError(event) {
        const error = event.target.error;
        let message = 'オーディオの再生中にエラーが発生しました';
        
        switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                message = '再生が中断されました';
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                message = 'ネットワークエラーが発生しました';
                break;
            case MediaError.MEDIA_ERR_DECODE:
                message = 'オーディオのデコードに失敗しました';
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                message = 'サポートされていないオーディオ形式です';
                break;
        }
        
        this.showError(message);
        console.error('Audio error:', error);
    }
    
    handlePlaybackError(error) {
        if (error.name === 'NotAllowedError') {
            this.showError('再生するにはユーザーのインタラクションが必要です。再生ボタンを押してください。');
        } else if (error.name === 'NotSupportedError') {
            this.showError('このオーディオ形式はサポートされていません');
        } else {
            this.showError('再生中にエラーが発生しました');
        }
        console.error('Playback error:', error);
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.seekSlider.value = progress;
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    updateDuration() {
        if (this.audio.duration) {
            this.totalTime.textContent = this.formatTime(this.audio.duration);
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    renderPlaylist() {
        if (this.tracks.length===0) {
            this.playlist.innerHTML = '<div class="playlist-empty">プレイリストは空です</div>';
            return;
        }
        
        this.playlist.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            
            item.innerHTML = `
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${this.escapeHtml(track.title)}</div>
                    <div class="playlist-item-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="playlist-item-duration">${this.formatTime(track.duration)}</div>
                <button class="playlist-item-remove" aria-label="削除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </button>
            `;
            
            // Play track on click
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-item-remove')) {
                    this.loadTrack(index);
                    if (this.isPlaying) {
                        this.play();
                    }
                }
            });
            
            // Remove track
            item.querySelector('.playlist-item-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrack(index);
            });
            
            this.playlist.appendChild(item);
        });
        
        this.updatePlaylistHighlight();
    }
    
    updatePlaylistHighlight() {
        const items = this.playlist.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentTrackIndex);
        });
    }
    
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(this.tracks[index].url);
        
        // Remove track
        this.tracks.splice(index, 1);
        
        // Update current track index
        if (index === this.currentTrackIndex) {
            if (this.tracks.length === 0) {
                this.hidePlayer();
                return;
            } else if (this.currentTrackIndex >= this.tracks.length) {
                this.currentTrackIndex = 0;
            }
            this.loadTrack(this.currentTrackIndex);
        } else if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        }
        
        this.updateOriginalOrder();
        this.renderPlaylist();
    }
    
    clearPlaylist() {
        if (this.tracks.length === 0) return;
        
        // Revoke all object URLs
        this.tracks.forEach(track => {
            URL.revokeObjectURL(track.url);
        });
        
        // Clear data
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.originalOrder = [];
        this.shuffleOrder = [];
        
        // Reset UI
        this.pause();
        this.hidePlayer();
        this.renderPlaylist();
    }
    
    showPlayer() {
        this.playerSection.style.display = 'block';
        this.playlistSection.style.display = 'block';
        this.playerSection.classList.add('fade-in');
        this.playlistSection.classList.add('fade-in');
    }
    
    hidePlayer() {
        this.playerSection.style.display = 'none';
        this.playlistSection.style.display = 'none';
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-color-scheme', this.currentTheme);
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        this.errorContainer.style.display = 'none';
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
    
    handleKeydown(event) {
        // Only handle keyboard shortcuts when not typing in an input
        if (event.target.tagName === 'INPUT') return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousTrack();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextTrack();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.volumeSlider.value = Math.min(100, parseInt(this.volumeSlider.value) + 5);
                this.handleVolumeChange({ target: this.volumeSlider });
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.volumeSlider.value = Math.max(0, parseInt(this.volumeSlider.value) - 5);
                this.handleVolumeChange({ target: this.volumeSlider });
                break;
            case 'KeyM':
                event.preventDefault();
                this.toggleMute();
                break;
            case 'KeyS':
                event.preventDefault();
                this.toggleShuffle();
                break;
            case 'KeyR':
                event.preventDefault();
                this.toggleRepeat();
                break;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.mp3Player = new MP3Player();
    } catch (error) {
        console.error('Failed to initialize MP3 Player:', error);
        document.getElementById('errorMessage').textContent = 'アプリケーションの初期化に失敗しました';
        document.getElementById('errorContainer').style.display = 'block';
    }
});

// Handle page unload to clean up resources
window.addEventListener('beforeunload', () => {
    if (window.mp3Player && window.mp3Player.tracks) {
        window.mp3Player.tracks.forEach(track => {
            if (track.url) {
                URL.revokeObjectURL(track.url);
            }
        });
    }
});

// Handle visibility change for better mobile experience
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.mp3Player && window.mp3Player.isPlaying) {
        // Keep playing in background
        console.log('App moved to background, continuing playback');
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MP3Player;
}

// Service Worker 登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('ServiceWorker registration successful:', reg.scope);
      })
      .catch(err => {
        console.error('ServiceWorker registration failed:', err);
      });
  });
}
