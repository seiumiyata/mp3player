/**
 * PWA MP3 Player - Main Application Class
 * 音楽ファイルの再生、プレイリスト管理、UI制御など、
 * アプリケーションのすべてのロジックを管理します。
 */
class MP3Player {
  constructor() {
    // --- Core Elements ---
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

    // --- Display Elements ---
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

    // --- State Management (in-memory) ---
    this.tracks = [];
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.isShuffled = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.volume = 0.7;
    this.currentTheme = 'light';
    this.shuffleOrder = [];
    this.originalOrder = [];

    // --- Initialize ---
    this.init();
  }

  /**
   * アプリケーションの初期化
   */
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

  /**
   * すべてのイベントリスナーを設定
   */
  setupEventListeners() {
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.prevBtn.addEventListener('click', () => this.previousTrack());
    this.nextBtn.addEventListener('click', () => this.nextTrack());
    this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
    this.seekSlider.addEventListener('input', (e) => this.handleSeek(e));
    this.volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  /**
   * audio要素のイベントリスナーを設定
   */
  setupAudioEvents() {
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.handleTrackEnd());
    this.audio.addEventListener('play', () => this.handlePlay());
    this.audio.addEventListener('pause', () => this.handlePause());
    this.audio.addEventListener('error', (e) => this.handleAudioError(e));
  }

  /**
   * Media Session APIを設定し、OSの再生コントロールに対応
   */
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

  /**
   * ダーク/ライトテーマの初期設定と自動切り替え
   */
  setupTheme() {
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.currentTheme = systemDarkMode ? 'dark' : 'light';
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.currentTheme = e.matches ? 'dark' : 'light';
      this.applyTheme();
    });
  }

  /**
   * ファイルが選択されたときの処理
   * @param {Event} event - ファイル選択イベント
   */
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
    event.target.value = ''; // Reset file input to allow selecting the same file again
  }

  /**
   * ファイルが対応する音声形式か検証
   * @param {File} file - 検証するファイル
   * @returns {boolean} - 対応していればtrue
   */
  isValidAudioFile(file) {
    const validTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac', 'audio/wav',
      'audio/x-wav', 'audio/ogg', 'audio/x-ogg', 'audio/aac', 'audio/mp4',
      'audio/webm', 'audio/opus'
    ];
    const validExts = [
      '.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.opus', '.webm'
    ];
    return validTypes.includes(file.type) ||
           validExts.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  /**
   * トラックをプレイリストに追加
   * @param {File} file - 追加する音声ファイル
   */
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
  
  /**
   * 音声ファイルからメタデータ（再生時間など）を抽出
   * @param {File} file - メタデータを抽出するファイル
   * @param {string} audioUrl - ファイルのBlob URL
   * @returns {Promise<object>} - 抽出されたメタデータ
   */
  extractMetadata(file, audioUrl) {
    return new Promise((resolve) => {
        const tempAudio = new Audio();
        tempAudio.preload = 'metadata';
        const timeout = setTimeout(() => {
            console.warn('Metadata extraction timed out for:', file.name);
            resolve({ title: null, artist: null, duration: 0 });
        }, 3000);

        tempAudio.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            // Full metadata (title, artist) requires a library like jsmediatags
            resolve({
                title: null, 
                artist: null,
                duration: tempAudio.duration || 0
            });
        });

        tempAudio.addEventListener('error', () => {
            clearTimeout(timeout);
            console.error('Error loading metadata for:', file.name);
            resolve({ title: null, artist: null, duration: 0 });
        });
        tempAudio.src = audioUrl;
    });
  }

  /**
   * 元のトラック順序を更新
   */
  updateOriginalOrder() {
    this.originalOrder = this.tracks.map((_, index) => index);
    if (this.isShuffled) {
      this.generateShuffleOrder();
    }
  }

  /**
   * シャッフル再生用の順序を生成
   */
  generateShuffleOrder() {
    this.shuffleOrder = [...this.originalOrder];
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
  }
  
  /**
   * 現在の再生順序（通常またはシャッフル）を取得
   * @returns {number[]} - トラックのインデックス配列
   */
  getCurrentOrder() {
      return this.isShuffled ? this.shuffleOrder : this.originalOrder;
  }

  /**
   * 指定されたインデックスのトラックを読み込む
   * @param {number} index - 読み込むトラックのインデックス
   */
  loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    const track = this.tracks[index];
    this.currentTrackIndex = index;

    this.currentTitle.textContent = track.title;
    this.currentArtist.textContent = track.artist;
    this.totalTime.textContent = this.formatTime(track.duration);
    this.audio.src = track.url;
    this.audio.load(); // Explicitly load the new source
    
    this.updateMediaSession(track);
    this.updatePlaylistHighlight();
    this.hideError();
  }

  /**
   * 再生を開始
   */
  async play() {
    if (this.tracks.length === 0) {
      this.showError('プレイリストにトラックがありません');
      return;
    }
    try {
      await this.audio.play();
    } catch (error) {
      this.handlePlaybackError(error);
    }
  }

  /**
   * 再生を一時停止
   */
  pause() {
    this.audio.pause();
  }
  
  /**
   * 再生/一時停止を切り替え
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * 前のトラックへ移動
   */
  previousTrack() {
    if (this.tracks.length === 0) return;
    const currentOrder = this.getCurrentOrder();
    const currentPosition = currentOrder.indexOf(this.currentTrackIndex);
    const newPosition = (currentPosition - 1 + currentOrder.length) % currentOrder.length;
    const newTrackIndex = currentOrder[newPosition];
    
    this.loadTrack(newTrackIndex);
    if (this.isPlaying) this.play();
  }

  /**
   * 次のトラックへ移動
   */
  nextTrack() {
    if (this.tracks.length === 0) return;
    const currentOrder = this.getCurrentOrder();
    const currentPosition = currentOrder.indexOf(this.currentTrackIndex);
    const newPosition = (currentPosition + 1) % currentOrder.length;
    const newTrackIndex = currentOrder[newPosition];

    this.loadTrack(newTrackIndex);
    if (this.isPlaying) this.play();
  }

  /**
   * トラック再生終了時の処理
   */
  handleTrackEnd() {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.play();
    } else if (this.repeatMode === 'all' || this.isShuffled || this.currentTrackIndex < this.tracks.length - 1) {
      this.nextTrack();
    } else {
      this.pause();
    }
  }

  // --- UI Update Methods ---

  renderPlaylist() {
    this.playlist.innerHTML = '';
    if (this.tracks.length === 0) {
      this.playlist.innerHTML = '<li class="playlist-empty">プレイリストは空です</li>';
      return;
    }

    this.tracks.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = 'playlist-item';
      li.dataset.index = index;
      li.innerHTML = `
        <div class="playlist-item-info">
          <div class="playlist-item-title">${track.title}</div>
          <div class="playlist-item-artist">${track.artist}</div>
        </div>
        <div class="playlist-item-duration">${this.formatTime(track.duration)}</div>
        <button class="playlist-item-remove" data-index="${index}" aria-label="${track.title}を削除">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      li.addEventListener('click', (e) => {
        if (!e.target.closest('.playlist-item-remove')) {
          this.loadTrack(index);
          this.play();
        }
      });
      this.playlist.appendChild(li);
    });

    this.playlist.querySelectorAll('.playlist-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTrack(parseInt(e.currentTarget.dataset.index, 10));
      });
    });

    this.updatePlaylistHighlight();
  }

  removeTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    
    // Revoke the blob URL to free up memory
    URL.revokeObjectURL(this.tracks[index].url);

    this.tracks.splice(index, 1);
    
    if (this.tracks.length === 0) {
        this.pause();
        this.hidePlayer();
    } else if (index === this.currentTrackIndex) {
        // If the current track was removed, load the next one or the first one
        this.loadTrack(index % this.tracks.length);
    } else if (index < this.currentTrackIndex) {
        // Adjust the current index if a track before it was removed
        this.currentTrackIndex--;
    }
    
    this.updateOriginalOrder();
    this.renderPlaylist();
  }

  clearPlaylist() {
    this.tracks.forEach(track => URL.revokeObjectURL(track.url));
    this.tracks = [];
    this.pause();
    this.hidePlayer();
    this.renderPlaylist();
    this.currentTrackIndex = 0;
  }

  updateProgress() {
    const { currentTime, duration } = this.audio;
    if (isNaN(duration)) return;
    const progressPercent = (currentTime / duration) * 100;
    this.seekSlider.value = progressPercent;
    this.currentTime.textContent = this.formatTime(currentTime);
  }

  updateDuration() {
    const duration = this.audio.duration;
    if (!isNaN(duration)) {
      this.totalTime.textContent = this.formatTime(duration);
    }
  }

  updatePlayPauseButton() {
    if (this.isPlaying) {
      this.playPauseBtn.classList.add('playing');
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
      this.albumArt.classList.add('spinning');
    } else {
      this.playPauseBtn.classList.remove('playing');
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
      this.albumArt.classList.remove('spinning');
    }
  }

  updateVolumeIcon() {
    const svg = this.volumeIcon;
    const volume = this.isMuted ? 0 : this.volume;
    if (volume === 0) {
      svg.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    } else if (volume < 0.5) {
      svg.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M16.5 12A4.5 4.5 0 0 1 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    } else {
      svg.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M16.5 12A4.5 4.5 0 0 1 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19.5 12A8.5 8.5 0 0 1 14 3.46v17.07c2.89-1.46 5-4.4 5.5-7.53z"/>';
    }
  }

  updatePlaylistHighlight() {
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.playlist-item[data-index="${this.currentTrackIndex}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  updateMediaSession(track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'PWA MP3 Player',
        artwork: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      });
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  showPlayer() {
    this.playerSection.classList.remove('hidden');
    this.playlistSection.classList.remove('hidden');
  }

  hidePlayer() {
    this.playerSection.classList.add('hidden');
    this.playlistSection.classList.add('hidden');
  }

  // --- Event Handlers ---

  handlePlay() {
    this.isPlaying = true;
    this.updatePlayPauseButton();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  handlePause() {
    this.isPlaying = false;
    this.updatePlayPauseButton();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }
  
  handleSeek(e) {
    const seekTime = (this.audio.duration / 100) * e.target.value;
    if (!isNaN(seekTime)) {
      this.audio.currentTime = seekTime;
    }
  }
  
  handleVolumeChange(e) {
    this.volume = e.target.value / 100;
    this.audio.volume = this.volume;
    this.isMuted = this.volume === 0;
    this.updateVolumeIcon();
  }

  handleKeydown(e) {
    if (e.target.tagName === 'INPUT') return; // Ignore if typing in an input
    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowRight':
        this.nextTrack();
        break;
      case 'ArrowLeft':
        this.previousTrack();
        break;
    }
  }

  handleAudioError(e) {
    console.error('Audio Error:', e);
    let message = 'オーディオの再生中にエラーが発生しました。';
    if (e.target && e.target.error) {
      switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED: message = '再生が中断されました。'; break;
        case e.target.error.MEDIA_ERR_NETWORK: message = 'ネットワークエラーにより再生できませんでした。'; break;
        case e.target.error.MEDIA_ERR_DECODE: message = 'ファイルのデコードに失敗しました。形式がサポートされていない可能性があります。'; break;
        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED: message = 'この音声形式はサポートされていません。'; break;
        default: message = '不明な再生エラーが発生しました。'; break;
      }
    }
    this.showError(message);
    this.pause();
  }
  
  handlePlaybackError(error) {
    if (error.name === 'NotAllowedError') {
      this.showError('ブラウザにより自動再生がブロックされました。再生ボタンを押してください。');
    } else {
      this.showError('再生を開始できませんでした。');
    }
    console.error('Playback error:', error);
    this.pause();
  }

  // --- Toggle Methods ---

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
    
    this.repeatBtn.classList.remove('repeat-one', 'repeat-all');
    this.repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
    
    if (this.repeatMode === 'one') {
      this.repeatBtn.classList.add('repeat-one');
    } else if (this.repeatMode === 'all') {
      this.repeatBtn.classList.add('repeat-all');
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    this.muteBtn.classList.toggle('muted', this.isMuted);
    this.updateVolumeIcon();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
  }
  
  applyTheme() {
    document.documentElement.setAttribute('data-color-scheme', this.currentTheme);
  }

  // --- Utility Methods ---

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  showError(message) {
    this.errorMessage.textContent = message;
    this.errorContainer.classList.remove('hidden');
    setTimeout(() => this.hideError(), 5000); // Auto-hide after 5 seconds
  }
  
  hideError() {
    this.errorContainer.classList.add('hidden');
    this.errorMessage.textContent = '';
  }
}

// --- Initialize the player when the DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
  new MP3Player();
});
