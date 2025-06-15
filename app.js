class MP3Player {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffle = false;
        this.repeatMode = 'none'; // none, one, all
        this.volume = 1;
        this.isMuted = false;
        this.theme = 'auto';
        this.autoplayNext = true;
        
        this.supportedTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac',
            'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-ogg',
            'audio/aac', 'audio/mp4', 'audio/webm', 'audio/opus'
        ];
        
        this.init();
    savePlaylistAuto() {
        const playlistMeta = this.playlist.map(track => ({
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            fileName: track.file ? track.file.name : null
        }));
        localStorage.setItem('mp3player_playlist', JSON.stringify(playlistMeta));
    }

    loadPlaylistAuto() {
        const data = localStorage.getItem('mp3player_playlist');
        return data ? JSON.parse(data) : [];
    }

    exportPlaylist(filename = 'playlist.json') {
        const data = JSON.stringify(this.playlist.map(track => ({
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            fileName: track.file ? track.file.name : null
        })), null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    importPlaylist(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
            const tracks = JSON.parse(e.target.result);
            this.playlist = tracks.map(meta => ({
                ...meta,
                url: '',
                file: null,
                blob: null
            }));
            this.renderPlaylist();
            this.showPlayer();
            this.savePlaylistAuto();
            } catch (err) {
            this.showStatus('プレイリストファイルが不正です', 'error');
            }
        };
        reader.readAsText(file);
    }

    }
    
    savePlaylistAuto() {
        const playlistMeta = this.playlist.map(track => ({
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            fileName: track.file ? track.file.name : null
        }));
        localStorage.setItem('mp3player_playlist', JSON.stringify(playlistMeta));
    }

    loadPlaylistAuto() {
        const data = localStorage.getItem('mp3player_playlist');
        return data ? JSON.parse(data) : [];
    }

    exportPlaylist(filename = 'playlist.json') {
        const data = JSON.stringify(this.playlist.map(track => ({
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            fileName: track.file ? track.file.name : null
        })), null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    importPlaylist(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
            const tracks = JSON.parse(e.target.result);
            this.playlist = tracks.map(meta => ({
                ...meta,
                url: '', // ファイル本体は再選択してもらう
                file: null,
                blob: null
            }));
            this.renderPlaylist();
            this.showPlayer();
            this.savePlaylistAuto();
            } catch (err) {
            this.showStatus('プレイリストファイルが不正です', 'error');
            }
    };

    reader.readAsText(file);

}

    init() {
        console.log('MP3Player initializing...');
        this.bindEvents();
        this.setupMediaSession();
        this.setupKeyboardShortcuts();
        this.initTheme();
        this.updatePlaylistCount();
        console.log('MP3Player initialized successfully');
    }
    
    bindEvents() {
        // ファイル選択
        const selectBtn = document.getElementById('selectFilesBtn');
        const fileInput = document.getElementById('audioFiles');
        
        if (selectBtn && fileInput) {
            selectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Select files button clicked');
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                console.log('Files selected:', e.target.files.length);
                if (e.target.files.length > 0) {
                    this.handleFileSelection(e.target.files);
                }
            });
        }
        
        // プレイヤーコントロール
        this.bindPlayerControls();
        
        // テーマ関連
        this.bindThemeControls();
        
        // プレイリスト関連
        this.bindPlaylistControls();
        
        // オーディオイベント
        this.bindAudioEvents();
        
        // ドラッグ&ドロップ
        this.setupDragAndDrop();
    }
    
    bindPlayerControls() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const seekBar = document.getElementById('seekBar');
        const volumeBar = document.getElementById('volumeBar');
        const muteBtn = document.getElementById('muteBtn');
        const shuffleBtn = document.getElementById('shuffleBtn');
        const repeatBtn = document.getElementById('repeatBtn');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousTrack());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextTrack());
        }
        
        if (seekBar) {
            seekBar.addEventListener('input', (e) => this.seek(e.target.value));
        }
        
        if (volumeBar) {
            volumeBar.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }
        
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }
    }
    
    bindThemeControls() {
        const themeToggle = document.getElementById('themeToggle');
        const themeSelect = document.getElementById('themeSelect');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Theme toggle clicked');
                this.toggleTheme();
            });
        }
        
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                console.log('Theme select changed to:', e.target.value);
                this.setTheme(e.target.value);
            });
        }
    }
    
    bindPlaylistControls() {
        const clearBtn = document.getElementById('clearPlaylistBtn');
        const autoplayCheckbox = document.getElementById('autoplayNext');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearPlaylist());
        }
        
        if (autoplayCheckbox) {
            autoplayCheckbox.addEventListener('change', (e) => {
                this.autoplayNext = e.target.checked;
            });
        }
    }
    
    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('ended', () => {
            this.handleTrackEnd();
        });
        
        this.audio.addEventListener('error', (e) => {
            this.handleAudioError(e);
        });
        
        this.audio.addEventListener('loadstart', () => {
            this.showStatus('読み込み中...', 'info');
        });
        
        this.audio.addEventListener('canplay', () => {
            this.hideStatus();
        });
    }
    
    setupDragAndDrop() {
        const fileSection = document.querySelector('.file-section');
        
        if (!fileSection) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileSection.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileSection.addEventListener(eventName, () => {
                fileSection.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileSection.addEventListener(eventName, () => {
                fileSection.classList.remove('dragover');
            });
        });
        
        fileSection.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files);
            }
        });
    }
    
    handleFileSelection(files) {
        console.log('Handling file selection:', files.length, 'files');
        
        const audioFiles = Array.from(files).filter(file => {
            const isValidType = this.supportedTypes.some(type => file.type === type);
            const isValidExtension = file.name.match(/\.(mp3|flac|wav|ogg|aac|m4a|opus|webm)$/i);
            return isValidType || isValidExtension;
        });
        
        console.log('Valid audio files:', audioFiles.length);
        
        if (audioFiles.length === 0) {
            this.showStatus('対応していないファイル形式です', 'error');
            return;
        }
        
        const startIndex = this.playlist.length;
        
        audioFiles.forEach(file => {
            this.addToPlaylist(file);
        });
        
        this.showStatus(`${audioFiles.length}件のファイルを追加しました`, 'success');
        this.showPlayer();
        
        // 最初のファイルを追加した場合は読み込む
        if (startIndex === 0 && this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }
    
    addToPlaylist(file) {
        const url = URL.createObjectURL(file);
        const track = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            url: url,
            file: file,
            duration: 0
        };
        
        this.playlist.push(track);
        this.renderPlaylist();
        this.updatePlaylistCount();
        this.savePlaylistAuto(); // ← ここを追加
    }
    
    updatePlaylistCount() {
        const countEl = document.getElementById('playlistCount');
        if (countEl) {
            countEl.textContent = this.playlist.length;
        }
    }
    
    renderPlaylist() {
        const container = document.getElementById('playlistContainer');
        if (!container) return;
        
        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>プレイリストは空です</h3><p>音楽ファイルを追加してください</p></div>';
            return;
        }
        
        container.innerHTML = this.playlist.map((track, index) => `
            <div class="playlist-item ${index === this.currentTrackIndex ? 'active' : ''}" data-index="${index}">
                <div class="playlist-item__index">${index + 1}</div>
                <div class="playlist-item__content">
                    <div class="playlist-item__title">${this.escapeHtml(track.title)}</div>
                    <div class="playlist-item__info">${this.escapeHtml(track.artist)} • ${this.formatTime(track.duration)}</div>
                </div>
                <div class="playlist-item__actions">
                    <button class="playlist-item__remove" data-index="${index}" aria-label="削除" type="button">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // イベントリスナーを追加
        container.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('playlist-item__remove')) {
                    const index = parseInt(item.dataset.index);
                    this.loadTrack(index);
                }
            });
        });
        
        container.querySelectorAll('.playlist-item__remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.removeFromPlaylist(index);
            });
        });
    }
    
    removeFromPlaylist(index) {
        if (index === this.currentTrackIndex && this.isPlaying) {
            this.pause();

            this.renderPlaylist();
            this.updatePlaylistCount();
            this.savePlaylistAuto(); // ← ここを追加
        }
        
        // URLを解放
        URL.revokeObjectURL(this.playlist[index].url);
        
        this.playlist.splice(index, 1);
        
        if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        } else if (index === this.currentTrackIndex) {
            if (this.currentTrackIndex >= this.playlist.length) {
                this.currentTrackIndex = Math.max(0, this.playlist.length - 1);
            }
            if (this.playlist.length > 0) {
                this.loadTrack(this.currentTrackIndex);
            } else {
                this.hidePlayer();
            }
        }
        
        this.renderPlaylist();
        this.updatePlaylistCount();
        
        if (this.playlist.length === 0) {
            this.hidePlayer();
        }
    }
    
    clearPlaylist() {
        if (this.isPlaying) {
            this.pause();
            this.hidePlayer();
            this.showStatus('プレイリストをクリアしました', 'success');
            this.savePlaylistAuto(); // ← ここを追加
        }
        
        // 全URLを解放
        this.playlist.forEach(track => URL.revokeObjectURL(track.url));
        
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.renderPlaylist();
        this.updatePlaylistCount();
        this.hidePlayer();
        this.showStatus('プレイリストをクリアしました', 'success');
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audio.src = track.url;
        this.updateNowPlaying(track);
        this.renderPlaylist();
        this.updateMediaSession(track);
    }
    
    updateNowPlaying(track) {
        const titleEl = document.getElementById('trackTitle');
        const artistEl = document.getElementById('trackArtist');
        
        if (titleEl) titleEl.textContent = track.title;
        if (artistEl) artistEl.textContent = track.artist;
    }
    
    async togglePlayPause() {
        try {
            if (this.isPlaying) {
                this.pause();
            } else {
                await this.play();
            }
        } catch (error) {
            this.handlePlayError(error);
        }
    }
    
    async play() {
        if (this.playlist.length === 0) {
            this.showStatus('プレイリストが空です', 'error');
            return;
        }
        
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.updateMediaSession();
        } catch (error) {
            throw error;
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.updateMediaSession();
    }
    
    updatePlayButton() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) {
            btn.textContent = this.isPlaying ? '⏸️' : '▶️';
            btn.setAttribute('aria-label', this.isPlaying ? '一時停止' : '再生');
        }
    }
    
    previousTrack() {
        if (this.playlist.length === 0) return;
        
        let newIndex;
        if (this.isShuffle) {
            newIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            newIndex = this.currentTrackIndex - 1;
            if (newIndex < 0) {
                newIndex = this.playlist.length - 1;
            }
        }
        
        this.loadTrack(newIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    nextTrack() {
        if (this.playlist.length === 0) return;
        
        let newIndex;
        if (this.isShuffle) {
            newIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            newIndex = this.currentTrackIndex + 1;
            if (newIndex >= this.playlist.length) {
                newIndex = 0;
            }
        }
        
        this.loadTrack(newIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    handleTrackEnd() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.repeatMode === 'all' || this.autoplayNext) {
            if (this.currentTrackIndex < this.playlist.length - 1 || this.repeatMode === 'all') {
                this.nextTrack();
            } else {
                this.pause();
            }
        } else {
            this.pause();
        }
    }
    
    seek(percent) {
        const time = (percent / 100) * this.audio.duration;
        if (!isNaN(time)) {
            this.audio.currentTime = time;
        }
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            const seekBar = document.getElementById('seekBar');
            const currentTime = document.getElementById('currentTime');
            
            if (seekBar) seekBar.value = percent;
            if (currentTime) currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    updateDuration() {
        const duration = this.audio.duration;
        const durationEl = document.getElementById('duration');
        
        if (durationEl) {
            durationEl.textContent = this.formatTime(duration);
        }
        
        // プレイリストの時間も更新
        if (this.playlist[this.currentTrackIndex]) {
            this.playlist[this.currentTrackIndex].duration = duration;
            this.renderPlaylist();
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.isMuted ? 0 : this.volume;
        
        const volumeBar = document.getElementById('volumeBar');
        if (volumeBar) {
            volumeBar.value = this.volume * 100;
        }
        
        this.updateVolumeButton();
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.volume = this.isMuted ? 0 : this.volume;
        this.updateVolumeButton();
    }
    
    updateVolumeButton() {
        const btn = document.getElementById('muteBtn');
        if (!btn) return;
        
        if (this.isMuted || this.volume === 0) {
            btn.textContent = '🔇';
            btn.setAttribute('aria-label', 'ミュート解除');
        } else if (this.volume < 0.5) {
            btn.textContent = '🔉';
            btn.setAttribute('aria-label', 'ミュート');
        } else {
            btn.textContent = '🔊';
            btn.setAttribute('aria-label', 'ミュート');
        }
    }
    
    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        const btn = document.getElementById('shuffleBtn');
        if (btn) {
            btn.classList.toggle('active', this.isShuffle);
        }
        this.showStatus(this.isShuffle ? 'シャッフル ON' : 'シャッフル OFF', 'success');
    }
    
    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        const btn = document.getElementById('repeatBtn');
        if (btn) {
            btn.classList.toggle('active', this.repeatMode !== 'none');
        }
        
        const messages = {
            'none': 'リピート OFF',
            'one': '1曲リピート',
            'all': '全曲リピート'
        };
        
        this.showStatus(messages[this.repeatMode], 'success');
    }
    
    // テーマ関連
    initTheme() {
        const savedTheme = this.theme;
        this.setTheme(savedTheme);
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
    }
    
    setTheme(theme) {
        console.log('Setting theme to:', theme);
        this.theme = theme;
        
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = theme;
        }
        
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-color-scheme');
        } else {
            document.documentElement.setAttribute('data-color-scheme', theme);
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        console.log('Toggling theme from', currentTheme, 'to', newTheme);
        this.setTheme(newTheme);
    }
    
    // MediaSession API
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
        }
    }
    
    updateMediaSession(track) {
        if ('mediaSession' in navigator && track) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: 'MP3プレイヤー'
            });
        }
    }
    
    // キーボードショートカット
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousTrack();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextTrack();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setVolume(Math.min(1, this.volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.setVolume(Math.max(0, this.volume - 0.1));
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
            }
        });
    }
    
    // エラーハンドリング
    handleAudioError(error) {
        console.error('Audio error:', error);
        this.showStatus('再生エラーが発生しました', 'error');
        this.pause();
    }
    
    handlePlayError(error) {
        if (error.name === 'NotAllowedError') {
            this.showStatus('ブラウザの自動再生ポリシーにより再生できません。手動で再生してください。', 'error');
        } else {
            this.showStatus('再生エラーが発生しました', 'error');
        }
        console.error('Play error:', error);
    }
    
    // UI ヘルパー
    showPlayer() {
        const playerSection = document.getElementById('playerSection');
        const playlistSection = document.getElementById('playlistSection');
        
        if (playerSection) playerSection.classList.remove('hidden');
        if (playlistSection) playlistSection.classList.remove('hidden');
    }
    
    hidePlayer() {
        const playerSection = document.getElementById('playerSection');
        const playlistSection = document.getElementById('playlistSection');
        
        if (playerSection) playerSection.classList.add('hidden');
        if (playlistSection) playlistSection.classList.add('hidden');
    }
    
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.classList.remove('hidden');
        
        setTimeout(() => {
            this.hideStatus();
        }, 3000);
    }
    
    hideStatus() {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.classList.add('hidden');
        }
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing MP3Player');
    window.player = new MP3Player();
});

// Service Worker の登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('ServiceWorker registration successful:', registration.scope);
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}
