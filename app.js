/**
 * 高機能 MP3 プレイヤー
 * 機能：再生制御、プレイリスト管理、永続化、シャッフル、リピート
 */

// アプリケーション設定
const APP_CONFIG = {
  supportedFormats: ["audio/mpeg", "audio/mp3", "audio/flac", "audio/x-flac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/x-ogg", "audio/aac", "audio/mp4", "audio/webm", "audio/opus"],
  fileExtensions: [".mp3", ".flac", ".wav", ".ogg", ".aac", ".m4a", ".opus", ".webm"],
  defaultSettings: {
    theme: "auto",
    autoplayNext: true,
    volume: 1,
    repeatMode: "none",
    shuffle: false
  },
  storageKeys: {
    settings: "mp3player_settings",
    playlists: "mp3player_playlists",
    currentPlaylist: "mp3player_current_playlist",
    playbackState: "mp3player_playback_state"
  }
};

/**
 * MP3プレイヤークラス
 * 音楽再生とプレイリスト管理を担当
 */
class MP3Player {
  constructor() {
    this.initDOMElements();
    this.initPlayerState();
    this.init();
  }

  /**
   * DOM要素の初期化
   */
  initDOMElements() {
    // DOM要素
    this.audioElement = document.getElementById('audio-player');
    this.playBtn = document.getElementById('play-btn');
    this.playIcon = document.getElementById('play-icon');
    this.pauseIcon = document.getElementById('pause-icon');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.shuffleBtn = document.getElementById('shuffle-btn');
    this.repeatBtn = document.getElementById('repeat-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.volumeIcon = document.getElementById('volume-icon');
    this.muteIcon = document.getElementById('mute-icon');
    this.volumeSlider = document.getElementById('volume-slider');
    this.seekBar = document.getElementById('seek-bar');
    this.currentTimeDisplay = document.getElementById('current-time');
    this.durationDisplay = document.getElementById('duration');
    this.currentTrackTitle = document.getElementById('current-track-title');
    this.currentTrackArtist = document.getElementById('current-track-artist');
    this.playlistItems = document.getElementById('playlist-items');
    this.playlistSelect = document.getElementById('playlist-select');
    this.fileInput = document.getElementById('file-input');
    this.fileSelectBtn = document.getElementById('file-select-btn');
    this.dropArea = document.getElementById('drop-area');
    this.themeToggle = document.getElementById('theme-toggle');
    this.createPlaylistBtn = document.getElementById('create-playlist-btn');
    this.renamePlaylistBtn = document.getElementById('rename-playlist-btn');
    this.deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    this.exportPlaylistBtn = document.getElementById('export-playlist-btn');
    this.importPlaylistBtn = document.getElementById('import-playlist-btn');
    this.importFileInput = document.getElementById('import-file-input');
    this.playlistDialog = document.getElementById('playlist-dialog');
    this.dialogTitle = document.getElementById('dialog-title');
    this.playlistNameInput = document.getElementById('playlist-name');
    this.dialogCancel = document.getElementById('dialog-cancel');
    this.dialogConfirm = document.getElementById('dialog-confirm');
  }

  /**
   * プレイヤーの状態の初期化
   */
  initPlayerState() {
    // プレイヤーの状態
    this.playlists = {}; // 複数プレイリスト格納用オブジェクト
    this.currentPlaylist = 'default'; // 現在のプレイリスト名
    this.currentTrackIndex = -1; // 現在の曲のインデックス
    this.isPlaying = false; // 再生中かどうか
    this.isSeeking = false; // シークバーをドラッグ中かどうか
    this.settings = { ...APP_CONFIG.defaultSettings }; // アプリ設定
    this.dialogMode = 'create'; // ダイアログモード（create/rename）
  }

  /**
   * プレイヤーの初期化
   */
  init() {
    // 設定の読み込み
    this.loadSettings();
    
    // プレイリストの読み込み
    this.loadPlaylists();
    
    // 再生状態の復元
    this.loadPlaybackState();
    
    // テーマ設定の適用
    this.applyTheme();
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // プレイリストUIの更新
    this.updatePlaylistUI();
    
    // ボリューム設定の適用
    this.updateVolumeUI();
    
    // シャッフルとリピートモードのUIを更新
    this.updateShuffleUI();
    this.updateRepeatUI();
    
    console.log('MP3 Player initialized successfully');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // オーディオ要素のイベント
    this.audioElement.addEventListener('timeupdate', this.updateTimeDisplay.bind(this));
    this.audioElement.addEventListener('loadedmetadata', this.onTrackLoaded.bind(this));
    this.audioElement.addEventListener('ended', this.onTrackEnded.bind(this));
    this.audioElement.addEventListener('error', this.handleAudioError.bind(this));
    
    // 再生コントロール
    this.playBtn.addEventListener('click', this.togglePlayPause.bind(this));
    this.prevBtn.addEventListener('click', this.playPreviousTrack.bind(this));
    this.nextBtn.addEventListener('click', this.playNextTrack.bind(this));
    this.shuffleBtn.addEventListener('click', this.toggleShuffle.bind(this));
    this.repeatBtn.addEventListener('click', this.toggleRepeat.bind(this));
    
    // ボリュームコントロール
    this.muteBtn.addEventListener('click', this.toggleMute.bind(this));
    this.volumeSlider.addEventListener('input', this.changeVolume.bind(this));
    
    // シークバー
    this.seekBar.addEventListener('input', this.seeking.bind(this));
    this.seekBar.addEventListener('change', this.seeked.bind(this));
    
    // ファイル入力
    this.fileSelectBtn.addEventListener('click', () => {
      console.log('File select button clicked');
      this.fileInput.click();
    });
    
    this.fileInput.addEventListener('change', (e) => {
      console.log('File input changed', e.target.files);
      this.handleFileSelect(e);
    });
    
    // ドラッグ&ドロップ
    this.setupDragAndDrop();
    
    // プレイリスト選択
    this.playlistSelect.addEventListener('change', this.switchPlaylist.bind(this));
    
    // プレイリスト管理
    this.createPlaylistBtn.addEventListener('click', this.showCreatePlaylistDialog.bind(this));
    this.renamePlaylistBtn.addEventListener('click', this.showRenamePlaylistDialog.bind(this));
    this.deletePlaylistBtn.addEventListener('click', this.deleteCurrentPlaylist.bind(this));
    this.exportPlaylistBtn.addEventListener('click', this.exportPlaylist.bind(this));
    this.importPlaylistBtn.addEventListener('click', () => {
      console.log('Import playlist button clicked');
      this.importFileInput.click();
    });
    
    this.importFileInput.addEventListener('change', (e) => {
      console.log('Import file input changed', e.target.files);
      this.importPlaylist(e);
    });
    
    // ダイアログ
    this.dialogCancel.addEventListener('click', this.hideDialog.bind(this));
    this.dialogConfirm.addEventListener('click', this.confirmDialog.bind(this));
    
    // テーマ切り替え
    this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    
    // キーボードショートカット
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  /**
   * ドラッグ&ドロップの設定
   */
  setupDragAndDrop() {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const highlight = () => {
      this.dropArea.classList.add('drag-over');
    };
    
    const unhighlight = () => {
      this.dropArea.classList.remove('drag-over');
    };
    
    const handleDrop = (e) => {
      unhighlight();
      const dt = e.dataTransfer;
      const files = dt.files;
      this.processFiles(files);
    };
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    this.dropArea.addEventListener('drop', handleDrop, false);
  }

  /**
   * ファイル選択ハンドラー
   */
  handleFileSelect(e) {
    console.log('Handling file selection');
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log(`Selected ${files.length} files`);
    this.processFiles(files);
    this.fileInput.value = ''; // 同じファイルを再度選択できるようにリセット
  }

  /**
   * ファイルの処理
   */
  processFiles(files) {
    if (!files || files.length === 0) {
      console.log('No files to process');
      return;
    }
    
    console.log(`Processing ${files.length} files`);
    
    const audioFiles = Array.from(files).filter(file => {
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const isSupported = APP_CONFIG.supportedFormats.includes(fileType) || 
                         APP_CONFIG.fileExtensions.includes(fileExtension);
      
      console.log(`File: ${file.name}, Type: ${fileType}, Extension: ${fileExtension}, Supported: ${isSupported}`);
      return isSupported;
    });
    
    if (audioFiles.length === 0) {
      alert('サポートされていないファイル形式です。MP3, FLAC, WAV, OGG, AAC, M4A, Opus, WebMファイルを選択してください。');
      return;
    }
    
    console.log(`Adding ${audioFiles.length} audio files to playlist`);
    this.addTracksToPlaylist(audioFiles);
  }

  /**
   * プレイリストにトラックを追加
   */
  addTracksToPlaylist(files) {
    const tracks = Array.from(files).map(file => {
      const fileName = file.name;
      const fileNameParts = fileName.split('.');
      fileNameParts.pop(); // 拡張子を削除
      const title = fileNameParts.join('.');
      
      return {
        id: this.generateUniqueId(),
        title: title,
        artist: 'Unknown Artist',
        duration: 0,
        file: file,
        url: URL.createObjectURL(file)
      };
    });
    
    if (!this.playlists[this.currentPlaylist]) {
      this.playlists[this.currentPlaylist] = [];
    }
    
    this.playlists[this.currentPlaylist] = [...this.playlists[this.currentPlaylist], ...tracks];
    
    // プレイリストが空だった場合は最初の曲を選択
    if (this.currentTrackIndex === -1 && this.playlists[this.currentPlaylist].length > 0) {
      this.currentTrackIndex = 0;
      this.loadTrack(0);
    }
    
    this.updatePlaylistUI();
    this.savePlaylists();
  }

  /**
   * 一意のIDを生成
   */
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * プレイリストのUIを更新
   */
  updatePlaylistUI() {
    // プレイリスト選択UIの更新
    this.updatePlaylistSelectUI();
    
    // トラックリストの更新
    this.updateTrackListUI();
  }

  /**
   * プレイリスト選択UIの更新
   */
  updatePlaylistSelectUI() {
    // プレイリスト選択肢をクリア
    this.playlistSelect.innerHTML = '';
    
    // プレイリスト選択肢を追加
    Object.keys(this.playlists).forEach(playlistName => {
      const option = document.createElement('option');
      option.value = playlistName;
      option.textContent = playlistName;
      option.selected = playlistName === this.currentPlaylist;
      this.playlistSelect.appendChild(option);
    });
    
    // プレイリストが存在しない場合はデフォルトを追加
    if (Object.keys(this.playlists).length === 0) {
      const option = document.createElement('option');
      option.value = 'default';
      option.textContent = 'デフォルトプレイリスト';
      this.playlistSelect.appendChild(option);
      this.playlists['default'] = [];
      this.currentPlaylist = 'default';
    }
  }

  /**
   * トラックリストUIの更新
   */
  updateTrackListUI() {
    // トラックリストをクリア
    this.playlistItems.innerHTML = '';
    
    const tracks = this.playlists[this.currentPlaylist] || [];
    
    if (tracks.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty-playlist';
      emptyItem.textContent = 'プレイリストは空です。ファイルを追加してください。';
      this.playlistItems.appendChild(emptyItem);
      return;
    }
    
    // トラックをリストに追加
    tracks.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = 'track-item';
      if (index === this.currentTrackIndex) {
        li.classList.add('active');
      }
      
      li.innerHTML = `
        <div class="track-number">${index + 1}</div>
        <div class="track-details">
          <div class="track-title">${this.escapeHTML(track.title)}</div>
          <div class="track-artist">${this.escapeHTML(track.artist)}</div>
        </div>
        <div class="track-duration">${this.formatTime(track.duration)}</div>
        <button class="btn track-remove" aria-label="削除">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      // クリックイベントの追加
      li.addEventListener('click', (e) => {
        // 削除ボタンがクリックされた場合
        if (e.target.closest('.track-remove')) {
          e.stopPropagation();
          this.removeTrack(index);
          return;
        }
        
        this.playTrack(index);
      });
      
      this.playlistItems.appendChild(li);
    });
  }

  /**
   * HTMLのエスケープ処理
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * プレイリストを切り替え
   */
  switchPlaylist() {
    const selectedPlaylist = this.playlistSelect.value;
    if (this.currentPlaylist === selectedPlaylist) return;
    
    console.log(`Switching from playlist "${this.currentPlaylist}" to "${selectedPlaylist}"`);
    this.currentPlaylist = selectedPlaylist;
    this.currentTrackIndex = -1;
    
    // プレイリストに曲がある場合は最初の曲をロード
    if (this.playlists[this.currentPlaylist] && this.playlists[this.currentPlaylist].length > 0) {
      this.currentTrackIndex = 0;
      this.loadTrack(0);
    } else {
      // プレイリストが空の場合
      this.resetPlayerDisplay();
    }
    
    this.updatePlaylistUI();
    this.saveCurrentPlaylist();
  }

  /**
   * プレイヤーの表示をリセット
   */
  resetPlayerDisplay() {
    console.log('Resetting player display');
    this.currentTrackTitle.textContent = '選択された曲はありません';
    this.currentTrackArtist.textContent = 'アーティスト情報';
    this.seekBar.value = 0;
    this.currentTimeDisplay.textContent = '0:00';
    this.durationDisplay.textContent = '0:00';
    this.audioElement.src = '';
    this.isPlaying = false;
    this.updatePlayPauseUI();
  }

  /**
   * トラックを再生
   */
  playTrack(index) {
    if (index < 0 || !this.playlists[this.currentPlaylist] || 
        index >= this.playlists[this.currentPlaylist].length) {
      console.log(`Invalid track index: ${index}`);
      return;
    }
    
    // 同じトラックの場合は再生/一時停止を切り替え
    if (index === this.currentTrackIndex) {
      console.log(`Toggle play/pause for track ${index}`);
      this.togglePlayPause();
      return;
    }
    
    console.log(`Playing track ${index}`);
    this.currentTrackIndex = index;
    this.loadTrack(index);
    this.playAudio();
    this.updatePlaylistUI();
  }

  /**
   * トラックをロード
   */
  loadTrack(index) {
    if (index < 0 || !this.playlists[this.currentPlaylist] || 
        index >= this.playlists[this.currentPlaylist].length) {
      console.log(`Cannot load track at index ${index}`);
      return;
    }
    
    const track = this.playlists[this.currentPlaylist][index];
    console.log(`Loading track: ${track.title}`);
    
    if (track.url) {
      this.audioElement.src = track.url;
      this.audioElement.load();
    } else {
      console.error('Track URL is missing');
    }
    
    this.currentTrackTitle.textContent = track.title || 'Unknown Title';
    this.currentTrackArtist.textContent = track.artist || 'Unknown Artist';
    
    this.savePlaybackState();
  }

  /**
   * オーディオ再生
   */
  playAudio() {
    if (!this.audioElement.src) {
      console.log('No audio source to play');
      return;
    }
    
    console.log('Playing audio');
    const playPromise = this.audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Playback started successfully');
          this.isPlaying = true;
          this.updatePlayPauseUI();
        })
        .catch(error => {
          console.error('Playback failed:', error);
          this.isPlaying = false;
          this.updatePlayPauseUI();
        });
    }
  }

  /**
   * オーディオ一時停止
   */
  pauseAudio() {
    console.log('Pausing audio');
    this.audioElement.pause();
    this.isPlaying = false;
    this.updatePlayPauseUI();
  }

  /**
   * 再生/一時停止の切り替え
   */
  togglePlayPause() {
    console.log('Toggle play/pause');
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      // 何も選択されていない場合は最初のトラックを再生
      if (this.currentTrackIndex === -1 && 
          this.playlists[this.currentPlaylist] && 
          this.playlists[this.currentPlaylist].length > 0) {
        this.playTrack(0);
      } else {
        this.playAudio();
      }
    }
  }

  /**
   * 再生/一時停止ボタンのUI更新
   */
  updatePlayPauseUI() {
    if (this.isPlaying) {
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
    } else {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }

  /**
   * 前のトラックを再生
   */
  playPreviousTrack() {
    console.log('Play previous track');
    if (!this.playlists[this.currentPlaylist] || this.playlists[this.currentPlaylist].length === 0) {
      return;
    }
    
    // 現在の曲の再生時間が3秒以上なら最初から再生
    if (this.audioElement.currentTime > 3) {
      console.log('Current time > 3s, restarting track');
      this.audioElement.currentTime = 0;
      return;
    }
    
    let prevIndex;
    if (this.settings.shuffle) {
      // シャッフルモードの場合はランダムに選択
      prevIndex = Math.floor(Math.random() * this.playlists[this.currentPlaylist].length);
      console.log(`Shuffle mode: selected random track ${prevIndex}`);
    } else {
      // 通常モードの場合は前の曲
      prevIndex = this.currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = this.playlists[this.currentPlaylist].length - 1;
      }
      console.log(`Normal mode: selected previous track ${prevIndex}`);
    }
    
    this.playTrack(prevIndex);
  }

  /**
   * 次のトラックを再生
   */
  playNextTrack() {
    console.log('Play next track');
    if (!this.playlists[this.currentPlaylist] || this.playlists[this.currentPlaylist].length === 0) {
      return;
    }
    
    let nextIndex;
    if (this.settings.shuffle) {
      // シャッフルモードの場合はランダムに選択
      nextIndex = Math.floor(Math.random() * this.playlists[this.currentPlaylist].length);
      console.log(`Shuffle mode: selected random track ${nextIndex}`);
    } else {
      // 通常モードの場合は次の曲
      nextIndex = this.currentTrackIndex + 1;
      if (nextIndex >= this.playlists[this.currentPlaylist].length) {
        nextIndex = 0;
      }
      console.log(`Normal mode: selected next track ${nextIndex}`);
    }
    
    this.playTrack(nextIndex);
  }

  /**
   * トラック終了時の処理
   */
  onTrackEnded() {
    console.log('Track ended');
    switch (this.settings.repeatMode) {
      case 'one':
        // 1曲リピート
        console.log('Repeat mode: one - replaying current track');
        this.audioElement.currentTime = 0;
        this.playAudio();
        break;
      case 'all':
        // 全曲リピート
        console.log('Repeat mode: all - playing next track');
        this.playNextTrack();
        break;
      case 'none':
        // リピートなし
        if (this.currentTrackIndex < this.playlists[this.currentPlaylist].length - 1) {
          console.log('Repeat mode: none - playing next track');
          this.playNextTrack();
        } else {
          // プレイリストの最後の曲の場合
          console.log('Repeat mode: none - reached end of playlist');
          this.isPlaying = false;
          this.updatePlayPauseUI();
        }
        break;
    }
  }

  /**
   * トラックロード時の処理
   */
  onTrackLoaded() {
    console.log('Track loaded');
    // 曲の長さを更新
    const duration = this.audioElement.duration || 0;
    this.durationDisplay.textContent = this.formatTime(duration);
    this.seekBar.max = duration;
    
    // トラックの長さを保存
    if (this.playlists[this.currentPlaylist] && this.playlists[this.currentPlaylist][this.currentTrackIndex]) {
      this.playlists[this.currentPlaylist][this.currentTrackIndex].duration = duration;
      this.updatePlaylistUI();
      this.savePlaylists();
    }
  }

  /**
   * オーディオエラーハンドラー
   */
  handleAudioError(e) {
    console.error('Audio playback error:', e);
    alert(`音声の再生中にエラーが発生しました: ${e.message || 'Unknown error'}`);
    
    // 次の曲に進む
    if (this.settings.autoplayNext) {
      this.playNextTrack();
    }
  }

  /**
   * 時間表示の更新
   */
  updateTimeDisplay() {
    if (this.isSeeking) return;
    
    const currentTime = this.audioElement.currentTime || 0;
    const duration = this.audioElement.duration || 0;
    
    this.currentTimeDisplay.textContent = this.formatTime(currentTime);
    this.seekBar.value = currentTime;
    
    // 再生状態を保存（毎秒保存すると重いので10秒ごとに保存）
    if (Math.floor(currentTime) % 10 === 0) {
      this.savePlaybackState();
    }
  }

  /**
   * シーク中の処理
   */
  seeking() {
    this.isSeeking = true;
    this.currentTimeDisplay.textContent = this.formatTime(parseFloat(this.seekBar.value));
  }

  /**
   * シーク完了時の処理
   */
  seeked() {
    this.audioElement.currentTime = parseFloat(this.seekBar.value);
    this.isSeeking = false;
  }

  /**
   * 時間を「分:秒」形式にフォーマット
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  /**
   * ボリューム変更
   */
  changeVolume() {
    const volume = parseFloat(this.volumeSlider.value);
    console.log(`Changing volume to ${volume}`);
    this.audioElement.volume = volume;
    this.settings.volume = volume;
    this.updateVolumeUI();
    this.saveSettings();
  }

  /**
   * ボリュームUIの更新
   */
  updateVolumeUI() {
    // ミュート状態の更新
    if (this.audioElement.volume === 0 || this.audioElement.muted) {
      this.volumeIcon.classList.add('hidden');
      this.muteIcon.classList.remove('hidden');
    } else {
      this.volumeIcon.classList.remove('hidden');
      this.muteIcon.classList.add('hidden');
    }
    
    // ボリュームスライダーの更新
    this.volumeSlider.value = this.audioElement.volume;
  }

  /**
   * ミュートの切り替え
   */
  toggleMute() {
    console.log(`Toggling mute: ${!this.audioElement.muted}`);
    this.audioElement.muted = !this.audioElement.muted;
    this.updateVolumeUI();
  }

  /**
   * シャッフルの切り替え
   */
  toggleShuffle() {
    console.log(`Toggling shuffle: ${!this.settings.shuffle}`);
    this.settings.shuffle = !this.settings.shuffle;
    this.updateShuffleUI();
    this.saveSettings();
  }

  /**
   * シャッフルUIの更新
   */
  updateShuffleUI() {
    if (this.settings.shuffle) {
      this.shuffleBtn.classList.add('active');
    } else {
      this.shuffleBtn.classList.remove('active');
    }
  }

  /**
   * リピートモードの切り替え
   */
  toggleRepeat() {
    const currentMode = this.settings.repeatMode;
    let newMode;
    
    switch (currentMode) {
      case 'none':
        newMode = 'all';
        break;
      case 'all':
        newMode = 'one';
        break;
      case 'one':
        newMode = 'none';
        break;
      default:
        newMode = 'none';
    }
    
    console.log(`Changing repeat mode from ${currentMode} to ${newMode}`);
    this.settings.repeatMode = newMode;
    this.updateRepeatUI();
    this.saveSettings();
  }

  /**
   * リピートUIの更新
   */
  updateRepeatUI() {
    this.repeatBtn.classList.remove('active');
    this.repeatBtn.removeAttribute('data-repeat-one');
    
    if (this.settings.repeatMode === 'all') {
      this.repeatBtn.classList.add('active');
    } else if (this.settings.repeatMode === 'one') {
      this.repeatBtn.classList.add('active');
      this.repeatBtn.setAttribute('data-repeat-one', 'true');
    }
  }

  /**
   * トラックの削除
   */
  removeTrack(index) {
    if (!this.playlists[this.currentPlaylist]) return;
    
    console.log(`Removing track at index ${index}`);
    
    // URLの解放
    if (this.playlists[this.currentPlaylist][index].url) {
      URL.revokeObjectURL(this.playlists[this.currentPlaylist][index].url);
    }
    
    // トラックの削除
    this.playlists[this.currentPlaylist].splice(index, 1);
    
    // 現在再生中のトラックが削除された場合
    if (index === this.currentTrackIndex) {
      // プレイリストが空になった場合
      if (this.playlists[this.currentPlaylist].length === 0) {
        console.log('Playlist is now empty');
        this.currentTrackIndex = -1;
        this.resetPlayerDisplay();
      } else {
        // 他のトラックがある場合は次のトラックを再生
        const newIndex = index < this.playlists[this.currentPlaylist].length ? index : 0;
        console.log(`Playing next available track at index ${newIndex}`);
        this.currentTrackIndex = newIndex;
        this.loadTrack(newIndex);
        this.playAudio();
      }
    } else if (index < this.currentTrackIndex) {
      // 現在のトラックより前のトラックが削除された場合はインデックスを調整
      console.log(`Adjusting currentTrackIndex from ${this.currentTrackIndex} to ${this.currentTrackIndex - 1}`);
      this.currentTrackIndex--;
    }
    
    this.updatePlaylistUI();
    this.savePlaylists();
  }

  /**
   * 新規プレイリスト作成ダイアログを表示
   */
  showCreatePlaylistDialog() {
    console.log('Showing create playlist dialog');
    this.dialogMode = 'create';
    this.dialogTitle.textContent = '新規プレイリスト作成';
    this.playlistNameInput.value = '';
    this.showDialog();
  }

  /**
   * プレイリスト名変更ダイアログを表示
   */
  showRenamePlaylistDialog() {
    console.log('Showing rename playlist dialog');
    this.dialogMode = 'rename';
    this.dialogTitle.textContent = 'プレイリスト名変更';
    this.playlistNameInput.value = this.currentPlaylist;
    this.showDialog();
  }

  /**
   * ダイアログを表示
   */
  showDialog() {
    this.playlistDialog.classList.remove('hidden');
    this.playlistNameInput.focus();
  }

  /**
   * ダイアログを非表示
   */
  hideDialog() {
    console.log('Hiding dialog');
    this.playlistDialog.classList.add('hidden');
  }

  /**
   * ダイアログの確認
   */
  confirmDialog() {
    const name = this.playlistNameInput.value.trim();
    
    if (!name) {
      alert('プレイリスト名を入力してください');
      return;
    }
    
    console.log(`Confirming dialog in mode: ${this.dialogMode}, name: ${name}`);
    
    if (this.dialogMode === 'create') {
      this.createPlaylist(name);
    } else if (this.dialogMode === 'rename') {
      this.renamePlaylist(name);
    }
    
    this.hideDialog();
  }

  /**
   * プレイリストの作成
   */
  createPlaylist(name) {
    if (this.playlists[name]) {
      alert(`プレイリスト "${name}" は既に存在します`);
      return;
    }
    
    console.log(`Creating new playlist: ${name}`);
    this.playlists[name] = [];
    this.currentPlaylist = name;
    this.currentTrackIndex = -1;
    
    this.updatePlaylistUI();
    this.resetPlayerDisplay();
    this.savePlaylists();
    this.saveCurrentPlaylist();
  }

  /**
   * プレイリスト名の変更
   */
  renamePlaylist(newName) {
    if (this.currentPlaylist === newName) return;
    
    if (this.playlists[newName]) {
      alert(`プレイリスト "${newName}" は既に存在します`);
      return;
    }
    
    console.log(`Renaming playlist from "${this.currentPlaylist}" to "${newName}"`);
    
    // プレイリストのリネーム
    this.playlists[newName] = [...this.playlists[this.currentPlaylist]];
    delete this.playlists[this.currentPlaylist];
    this.currentPlaylist = newName;
    
    this.updatePlaylistUI();
    this.savePlaylists();
    this.saveCurrentPlaylist();
  }

  /**
   * 現在のプレイリストの削除
   */
  deleteCurrentPlaylist() {
    if (Object.keys(this.playlists).length <= 1) {
      alert('最後のプレイリストは削除できません');
      return;
    }
    
    if (!confirm(`プレイリスト "${this.currentPlaylist}" を削除しますか？`)) {
      return;
    }
    
    console.log(`Deleting playlist: ${this.currentPlaylist}`);
    
    // URLの解放
    if (this.playlists[this.currentPlaylist]) {
      this.playlists[this.currentPlaylist].forEach(track => {
        if (track.url) {
          URL.revokeObjectURL(track.url);
        }
      });
    }
    
    // プレイリストの削除
    delete this.playlists[this.currentPlaylist];
    
    // 他のプレイリストを選択
    const newPlaylist = Object.keys(this.playlists)[0];
    console.log(`Switching to playlist: ${newPlaylist}`);
    this.currentPlaylist = newPlaylist;
    this.currentTrackIndex = -1;
    
    // プレイリストに曲がある場合は最初の曲をロード
    if (this.playlists[this.currentPlaylist] && this.playlists[this.currentPlaylist].length > 0) {
      this.currentTrackIndex = 0;
      this.loadTrack(0);
    } else {
      this.resetPlayerDisplay();
    }
    
    this.updatePlaylistUI();
    this.savePlaylists();
    this.saveCurrentPlaylist();
  }

  /**
   * プレイリストのエクスポート
   */
  exportPlaylist() {
    if (!this.playlists[this.currentPlaylist] || this.playlists[this.currentPlaylist].length === 0) {
      alert('エクスポートするトラックがありません');
      return;
    }
    
    console.log(`Exporting playlist: ${this.currentPlaylist}`);
    
    // エクスポートデータの作成
    const exportData = {
      name: this.currentPlaylist,
      tracks: this.playlists[this.currentPlaylist].map(track => ({
        title: track.title,
        artist: track.artist,
        duration: track.duration
      }))
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロードリンクの作成
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentPlaylist}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * プレイリストのインポート
   */
  importPlaylist(e) {
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected for import');
      return;
    }
    
    console.log(`Importing playlist from file: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (!data.name || !Array.isArray(data.tracks)) {
          throw new Error('Invalid playlist format');
        }
        
        let playlistName = data.name;
        let counter = 1;
        
        // 同名のプレイリストが存在する場合は名前を変更
        while (this.playlists[playlistName]) {
          playlistName = `${data.name} (${counter})`;
          counter++;
        }
        
        console.log(`Creating imported playlist: ${playlistName}`);
        
        // プレイリストの作成
        this.playlists[playlistName] = data.tracks.map(track => ({
          id: this.generateUniqueId(),
          title: track.title || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          duration: track.duration || 0
        }));
        
        this.currentPlaylist = playlistName;
        this.currentTrackIndex = -1;
        
        this.updatePlaylistUI();
        this.resetPlayerDisplay();
        this.savePlaylists();
        this.saveCurrentPlaylist();
        
        alert(`プレイリスト "${playlistName}" をインポートしました`);
      } catch (error) {
        console.error('Import error:', error);
        alert('プレイリストのインポートに失敗しました');
      }
    };
    
    reader.readAsText(file);
    this.importFileInput.value = '';
  }

  /**
   * テーマの切り替え
   */
  toggleTheme() {
    const body = document.body;
    
    console.log(`Current theme: ${this.settings.theme}`);
    
    if (this.settings.theme === 'dark') {
      this.settings.theme = 'light';
      body.setAttribute('data-color-scheme', 'light');
    } else if (this.settings.theme === 'light') {
      this.settings.theme = 'auto';
      body.removeAttribute('data-color-scheme');
    } else {
      this.settings.theme = 'dark';
      body.setAttribute('data-color-scheme', 'dark');
    }
    
    console.log(`New theme: ${this.settings.theme}`);
    this.saveSettings();
  }

  /**
   * テーマの適用
   */
  applyTheme() {
    const body = document.body;
    
    console.log(`Applying theme: ${this.settings.theme}`);
    
    if (this.settings.theme === 'dark') {
      body.setAttribute('data-color-scheme', 'dark');
    } else if (this.settings.theme === 'light') {
      body.setAttribute('data-color-scheme', 'light');
    } else {
      body.removeAttribute('data-color-scheme');
    }
  }

  /**
   * キーボードショートカットのハンドラー
   */
  handleKeyboardShortcuts(e) {
    // フォーム要素にフォーカスがある場合はショートカットを無効化
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    switch (e.key) {
      case ' ': // スペースキー
        e.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowLeft': // 左矢印
        if (e.ctrlKey) {
          e.preventDefault();
          this.playPreviousTrack();
        }
        break;
      case 'ArrowRight': // 右矢印
        if (e.ctrlKey) {
          e.preventDefault();
          this.playNextTrack();
        }
        break;
      case 'ArrowUp': // 上矢印
        if (e.ctrlKey) {
          e.preventDefault();
          this.volumeSlider.value = Math.min(1, parseFloat(this.volumeSlider.value) + 0.1);
          this.changeVolume();
        }
        break;
      case 'ArrowDown': // 下矢印
        if (e.ctrlKey) {
          e.preventDefault();
          this.volumeSlider.value = Math.max(0, parseFloat(this.volumeSlider.value) - 0.1);
          this.changeVolume();
        }
        break;
      case 'm': // M
      case 'M':
        e.preventDefault();
        this.toggleMute();
        break;
      case 's': // S
      case 'S':
        e.preventDefault();
        this.toggleShuffle();
        break;
      case 'r': // R
      case 'R':
        e.preventDefault();
        this.toggleRepeat();
        break;
    }
  }

  /**
   * 設定の保存
   */
  saveSettings() {
    try {
      console.log('Saving settings to localStorage');
      localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  /**
   * 設定の読み込み
   */
  loadSettings() {
    try {
      console.log('Loading settings from localStorage');
      const savedSettings = localStorage.getItem(APP_CONFIG.storageKeys.settings);
      if (savedSettings) {
        this.settings = { ...APP_CONFIG.defaultSettings, ...JSON.parse(savedSettings) };
        console.log('Settings loaded:', this.settings);
      } else {
        console.log('No saved settings found, using defaults');
      }
      
      // ボリュームの設定
      this.audioElement.volume = this.settings.volume;
      this.volumeSlider.value = this.settings.volume;
    } catch (e) {
      console.error('Failed to load settings:', e);
      this.settings = { ...APP_CONFIG.defaultSettings };
    }
  }

  /**
   * プレイリストの保存
   */
  savePlaylists() {
    try {
      console.log('Saving playlists to localStorage');
      // URL を除外してプレイリストを保存（ファイルオブジェクトは保存できないため）
      const playlistsToSave = {};
      
      Object.keys(this.playlists).forEach(name => {
        playlistsToSave[name] = this.playlists[name].map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          duration: track.duration
        }));
      });
      
      localStorage.setItem(APP_CONFIG.storageKeys.playlists, JSON.stringify(playlistsToSave));
    } catch (e) {
      console.error('Failed to save playlists:', e);
    }
  }

  /**
   * プレイリストの読み込み
   */
  loadPlaylists() {
    try {
      console.log('Loading playlists from localStorage');
      const savedPlaylists = localStorage.getItem(APP_CONFIG.storageKeys.playlists);
      if (savedPlaylists) {
        this.playlists = JSON.parse(savedPlaylists);
        console.log(`Loaded ${Object.keys(this.playlists).length} playlists`);
      } else {
        console.log('No saved playlists found, creating default playlist');
      }
      
      // プレイリストが空の場合はデフォルトを作成
      if (Object.keys(this.playlists).length === 0) {
        this.playlists = { 'default': [] };
      }
      
      // 現在のプレイリストを読み込み
      const savedCurrentPlaylist = localStorage.getItem(APP_CONFIG.storageKeys.currentPlaylist);
      if (savedCurrentPlaylist && this.playlists[savedCurrentPlaylist]) {
        this.currentPlaylist = savedCurrentPlaylist;
        console.log(`Loaded current playlist: ${this.currentPlaylist}`);
      } else {
        this.currentPlaylist = Object.keys(this.playlists)[0];
        console.log(`Using first available playlist: ${this.currentPlaylist}`);
      }
    } catch (e) {
      console.error('Failed to load playlists:', e);
      this.playlists = { 'default': [] };
      this.currentPlaylist = 'default';
    }
  }

  /**
   * 現在のプレイリストを保存
   */
  saveCurrentPlaylist() {
    try {
      console.log(`Saving current playlist: ${this.currentPlaylist}`);
      localStorage.setItem(APP_CONFIG.storageKeys.currentPlaylist, this.currentPlaylist);
    } catch (e) {
      console.error('Failed to save current playlist:', e);
    }
  }

  /**
   * 再生状態の保存
   */
  savePlaybackState() {
    try {
      const state = {
        currentPlaylist: this.currentPlaylist,
        currentTrackIndex: this.currentTrackIndex,
        currentTime: this.audioElement.currentTime,
        isPlaying: this.isPlaying
      };
      
      localStorage.setItem(APP_CONFIG.storageKeys.playbackState, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save playback state:', e);
    }
  }

  /**
   * 再生状態の読み込み
   */
  loadPlaybackState() {
    try {
      console.log('Loading playback state from localStorage');
      const savedState = localStorage.getItem(APP_CONFIG.storageKeys.playbackState);
      if (!savedState) {
        console.log('No saved playback state found');
        return;
      }
      
      const state = JSON.parse(savedState);
      console.log('Playback state loaded:', state);
      
      // プレイリストの確認
      if (state.currentPlaylist && this.playlists[state.currentPlaylist]) {
        this.currentPlaylist = state.currentPlaylist;
        console.log(`Restored playlist: ${this.currentPlaylist}`);
      } else {
        console.log(`Saved playlist "${state.currentPlaylist}" not found`);
      }
      
      // トラックの確認
      if (state.currentTrackIndex >= 0 && 
          this.playlists[this.currentPlaylist] && 
          state.currentTrackIndex < this.playlists[this.currentPlaylist].length) {
        this.currentTrackIndex = state.currentTrackIndex;
        console.log(`Restored track index: ${this.currentTrackIndex}`);
        
        // ここではトラックのロードのみ行い、再生は行わない
        // これはユーザーアクションなしの自動再生を避けるため
        this.loadTrack(this.currentTrackIndex);
        
        // 再生位置の復元
        if (state.currentTime) {
          this.audioElement.currentTime = state.currentTime;
          console.log(`Restored playback position: ${this.formatTime(state.currentTime)}`);
        }
      } else {
        console.log('No valid track to restore');
      }
    } catch (e) {
      console.error('Failed to load playback state:', e);
    }
  }
}

// DOMがロードされたらプレイヤーを初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded, initializing player');
  window.player = new MP3Player();
});