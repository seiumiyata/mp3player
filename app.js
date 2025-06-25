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
    },
    indexedDB: {
        name: "MP3PlayerDB",
        version: 1,
        stores: {
            audioFiles: "audioFiles"
        }
    }
};

/**
 * IndexedDB管理クラス
 */
class AudioFileDB {
    constructor() {
        this.db = null;
        this.dbName = APP_CONFIG.indexedDB.name;
        this.dbVersion = APP_CONFIG.indexedDB.version;
        this.storeName = APP_CONFIG.indexedDB.stores.audioFiles;
    }

    /**
     * データベースを初期化
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB初期化エラー:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB初期化完了');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // オーディオファイルストアを作成
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('title', 'title', { unique: false });
                    console.log('AudioFilesストア作成完了');
                }
            };
        });
    }

    /**
     * ファイルを保存
     */
    async saveFile(id, file, metadata) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const fileData = {
                id: id,
                file: file,
                metadata: metadata,
                savedAt: new Date().toISOString()
            };

            const request = store.put(fileData);

            request.onsuccess = () => {
                console.log(`ファイル保存完了: ${id}`);
                resolve();
            };

            request.onerror = () => {
                console.error('ファイル保存エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * ファイルを取得
     */
    async getFile(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log(`ファイル取得完了: ${id}`);
                    resolve(result);
                } else {
                    console.warn(`ファイルが見つかりません: ${id}`);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('ファイル取得エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * ファイルを削除
     */
    async deleteFile(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`ファイル削除完了: ${id}`);
                resolve();
            };

            request.onerror = () => {
                console.error('ファイル削除エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 全ファイルIDを取得
     */
    async getAllFileIds() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('ファイルID取得エラー:', request.error);
                reject(request.error);
            };
        });
    }
}

/**
 * MP3プレイヤークラス
 * 音楽再生とプレイリスト管理を担当
 */
class MP3Player {
    constructor() {
        this.initDOMElements();
        this.initPlayerState();
        this.audioFileDB = new AudioFileDB();
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
        this.currentBlobUrls = new Map(); // 現在のBlobURLを管理
    }

    /**
     * プレイヤーの初期化
     */
    async init() {
        try {
            // IndexedDBの初期化
            await this.audioFileDB.init();
            
            // 設定の読み込み
            this.loadSettings();
            
            // プレイリストの読み込み
            await this.loadPlaylists();
            
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
        } catch (error) {
            console.error('プレイヤー初期化エラー:', error);
            // エラー時もUI要素は初期化する
            this.setupEventListeners();
            this.updatePlaylistUI();
            this.updateVolumeUI();
            this.updateShuffleUI();
            this.updateRepeatUI();
        }
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
    async addTracksToPlaylist(files) {
        const tracks = [];
        
        for (const file of files) {
            const fileName = file.name;
            const fileNameParts = fileName.split('.');
            fileNameParts.pop(); // 拡張子を削除
            const title = fileNameParts.join('.');
            const trackId = this.generateUniqueId();

            const track = {
                id: trackId,
                title: title,
                artist: 'Unknown Artist',
                duration: 0,
                fileName: fileName,
                fileSize: file.size,
                fileType: file.type
            };

            tracks.push(track);

            // ファイルをIndexedDBに保存
            try {
                await this.audioFileDB.saveFile(trackId, file, {
                    title: title,
                    artist: 'Unknown Artist',
                    fileName: fileName,
                    fileSize: file.size,
                    fileType: file.type
                });
            } catch (error) {
                console.error(`ファイル保存エラー (${fileName}):`, error);
                // エラーが発生してもトラックは追加する（フォールバック）
            }
        }

        if (!this.playlists[this.currentPlaylist]) {
            this.playlists[this.currentPlaylist] = [];
        }

        this.playlists[this.currentPlaylist] = [...this.playlists[this.currentPlaylist], ...tracks];

        // プレイリストが空だった場合は最初の曲を選択
        if (this.currentTrackIndex === -1 && this.playlists[this.currentPlaylist].length > 0) {
            this.currentTrackIndex = 0;
            await this.loadTrack(0);
        }

        this.updatePlaylistUI();
        this.savePlaylists();
    }

    /**
     * BlobURLを取得または作成
     */
    async getBlobUrl(trackId) {
        // 既存のBlobURLがある場合はそれを返す
        if (this.currentBlobUrls.has(trackId)) {
            return this.currentBlobUrls.get(trackId);
        }

        try {
            // IndexedDBからファイルを取得
            const fileData = await this.audioFileDB.getFile(trackId);
            if (!fileData || !fileData.file) {
                throw new Error(`ファイルが見つかりません: ${trackId}`);
            }

            // BlobURLを作成
            const blobUrl = URL.createObjectURL(fileData.file);
            this.currentBlobUrls.set(trackId, blobUrl);
            
            console.log(`BlobURL作成完了: ${trackId}`);
            return blobUrl;
        } catch (error) {
            console.error(`BlobURL作成エラー (${trackId}):`, error);
            throw error;
        }
    }

    /**
     * 使用済みBlobURLを解放
     */
    revokeBlobUrl(trackId) {
        if (this.currentBlobUrls.has(trackId)) {
            const blobUrl = this.currentBlobUrls.get(trackId);
            URL.revokeObjectURL(blobUrl);
            this.currentBlobUrls.delete(trackId);
            console.log(`BlobURL解放完了: ${trackId}`);
        }
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
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${this.formatTime(track.duration)}</div>
                <button class="btn btn--sm btn--outline track-remove" title="トラックを削除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m18 6-12 12"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            `;

            // トラック選択イベント
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.track-remove')) {
                    this.selectTrack(index);
                }
            });

            // トラック削除イベント
            const removeBtn = li.querySelector('.track-remove');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrack(index);
            });

            this.playlistItems.appendChild(li);
        });
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 時間をフォーマット
     */
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) {
            return '0:00';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * トラックを選択
     */
    async selectTrack(index) {
        if (index >= 0 && index < this.playlists[this.currentPlaylist].length) {
            this.currentTrackIndex = index;
            await this.loadTrack(index);
            this.updateTrackListUI();
        }
    }

    /**
     * トラックを削除
     */
    async removeTrack(index) {
        const tracks = this.playlists[this.currentPlaylist];
        if (index >= 0 && index < tracks.length) {
            const track = tracks[index];
            
            // IndexedDBからファイルを削除
            try {
                await this.audioFileDB.deleteFile(track.id);
            } catch (error) {
                console.error(`ファイル削除エラー (${track.id}):`, error);
            }

            // BlobURLを解放
            this.revokeBlobUrl(track.id);

            // プレイリストから削除
            tracks.splice(index, 1);

            // 現在のトラックのインデックスを調整
            if (index === this.currentTrackIndex) {
                // 削除されたトラックが現在再生中の場合
                this.audioElement.pause();
                this.isPlaying = false;
                this.updatePlayPauseButton();
                
                if (tracks.length === 0) {
                    this.currentTrackIndex = -1;
                    this.clearTrackDisplay();
                } else if (index >= tracks.length) {
                    this.currentTrackIndex = tracks.length - 1;
                    await this.loadTrack(this.currentTrackIndex);
                } else {
                    await this.loadTrack(this.currentTrackIndex);
                }
            } else if (index < this.currentTrackIndex) {
                this.currentTrackIndex--;
            }

            this.updatePlaylistUI();
            this.savePlaylists();
        }
    }

    /**
     * トラック表示をクリア
     */
    clearTrackDisplay() {
        this.currentTrackTitle.textContent = '選択された曲はありません';
        this.currentTrackArtist.textContent = 'アーティスト情報';
        this.currentTimeDisplay.textContent = '0:00';
        this.durationDisplay.textContent = '0:00';
        this.seekBar.value = 0;
        this.audioElement.src = '';
    }

    /**
     * トラックを読み込み
     */
    async loadTrack(index) {
        const tracks = this.playlists[this.currentPlaylist];
        if (!tracks || index < 0 || index >= tracks.length) {
            console.error('無効なトラックインデックス:', index);
            return;
        }

        const track = tracks[index];
        console.log('Loading track:', track.title);

        try {
            // BlobURLを取得
            const blobUrl = await this.getBlobUrl(track.id);
            
            // オーディオ要素に設定
            this.audioElement.src = blobUrl;
            
            // UI更新
            this.currentTrackTitle.textContent = track.title;
            this.currentTrackArtist.textContent = track.artist;
            
            console.log('Track loaded successfully:', track.title);
        } catch (error) {
            console.error('トラック読み込みエラー:', error);
            this.handleTrackLoadError(track);
        }
    }

    /**
     * トラック読み込みエラーハンドラー
     */
    handleTrackLoadError(track) {
        this.currentTrackTitle.textContent = `エラー: ${track.title}`;
        this.currentTrackArtist.textContent = 'ファイルを読み込めません';
        
        // エラー時は次のトラックに進む
        if (this.settings.autoplayNext && this.playlists[this.currentPlaylist].length > 1) {
            setTimeout(() => {
                this.playNextTrack();
            }, 2000);
        }
    }

    /**
     * 再生/一時停止の切り替え
     */
    async togglePlayPause() {
        if (this.currentTrackIndex === -1 || !this.playlists[this.currentPlaylist] || this.playlists[this.currentPlaylist].length === 0) {
            console.log('再生可能なトラックがありません');
            return;
        }

        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            try {
                await this.audioElement.play();
                this.isPlaying = true;
            } catch (error) {
                console.error('再生エラー:', error);
                this.isPlaying = false;
                this.handleTrackLoadError(this.playlists[this.currentPlaylist][this.currentTrackIndex]);
            }
        }
        
        this.updatePlayPauseButton();
        this.savePlaybackState();
    }

    /**
     * 再生/一時停止ボタンの更新
     */
    updatePlayPauseButton() {
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
    async playPreviousTrack() {
        const tracks = this.playlists[this.currentPlaylist];
        if (!tracks || tracks.length === 0) return;

        let newIndex;
        if (this.settings.shuffle) {
            newIndex = Math.floor(Math.random() * tracks.length);
        } else {
            newIndex = this.currentTrackIndex - 1;
            if (newIndex < 0) {
                newIndex = tracks.length - 1;
            }
        }

        this.currentTrackIndex = newIndex;
        await this.loadTrack(newIndex);
        this.updateTrackListUI();
        
        if (this.isPlaying) {
            try {
                await this.audioElement.play();
            } catch (error) {
                console.error('前のトラック再生エラー:', error);
                this.handleTrackLoadError(tracks[newIndex]);
            }
        }
        
        this.savePlaybackState();
    }

    /**
     * 次のトラックを再生
     */
    async playNextTrack() {
        const tracks = this.playlists[this.currentPlaylist];
        if (!tracks || tracks.length === 0) return;

        let newIndex;
        if (this.settings.shuffle) {
            newIndex = Math.floor(Math.random() * tracks.length);
        } else {
            newIndex = this.currentTrackIndex + 1;
            if (newIndex >= tracks.length) {
                newIndex = 0;
            }
        }

        this.currentTrackIndex = newIndex;
        await this.loadTrack(newIndex);
        this.updateTrackListUI();
        
        if (this.isPlaying) {
            try {
                await this.audioElement.play();
            } catch (error) {
                console.error('次のトラック再生エラー:', error);
                this.handleTrackLoadError(tracks[newIndex]);
            }
        }
        
        this.savePlaybackState();
    }

    /**
     * トラック終了時の処理
     */
    async onTrackEnded() {
        console.log('Track ended');
        
        switch (this.settings.repeatMode) {
            case 'one':
                // 1曲リピート
                this.audioElement.currentTime = 0;
                if (this.isPlaying) {
                    try {
                        await this.audioElement.play();
                    } catch (error) {
                        console.error('リピート再生エラー:', error);
                    }
                }
                break;
                
            case 'all':
                // 全曲リピート
                await this.playNextTrack();
                break;
                
            default:
                // リピートなし
                if (this.settings.autoplayNext) {
                    const tracks = this.playlists[this.currentPlaylist];
                    if (this.currentTrackIndex < tracks.length - 1 || this.settings.shuffle) {
                        await this.playNextTrack();
                    } else {
                        // 最後の曲の場合は停止
                        this.isPlaying = false;
                        this.updatePlayPauseButton();
                    }
                } else {
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                }
                break;
        }
        
        this.savePlaybackState();
    }

    /**
     * オーディオエラーハンドラー
     */
    handleAudioError(e) {
        console.error('Audio error:', e);
        const tracks = this.playlists[this.currentPlaylist];
        if (tracks && this.currentTrackIndex >= 0 && this.currentTrackIndex < tracks.length) {
            this.handleTrackLoadError(tracks[this.currentTrackIndex]);
        }
    }

    /**
     * トラック読み込み完了時の処理
     */
    onTrackLoaded() {
        const duration = this.audioElement.duration;
        if (isFinite(duration)) {
            this.durationDisplay.textContent = this.formatTime(duration);
            this.seekBar.max = duration;
            
            // トラックの長さを保存
            const tracks = this.playlists[this.currentPlaylist];
            if (tracks && this.currentTrackIndex >= 0 && this.currentTrackIndex < tracks.length) {
                tracks[this.currentTrackIndex].duration = duration;
                this.savePlaylists();
            }
        }
    }

    /**
     * 時間表示の更新
     */
    updateTimeDisplay() {
        if (!this.isSeeking && isFinite(this.audioElement.currentTime)) {
            this.currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
            this.seekBar.value = this.audioElement.currentTime;
        }
    }

    /**
     * シークバー操作中
     */
    seeking() {
        this.isSeeking = true;
        this.currentTimeDisplay.textContent = this.formatTime(this.seekBar.value);
    }

    /**
     * シークバー操作完了
     */
    seeked() {
        this.audioElement.currentTime = this.seekBar.value;
        this.isSeeking = false;
    }

    /**
     * シャッフルの切り替え
     */
    toggleShuffle() {
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
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(this.settings.repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.settings.repeatMode = modes[nextIndex];
        
        this.updateRepeatUI();
        this.saveSettings();
    }

    /**
     * リピートUIの更新
     */
    updateRepeatUI() {
        this.repeatBtn.classList.remove('active');
        
        switch (this.settings.repeatMode) {
            case 'all':
                this.repeatBtn.classList.add('active');
                this.repeatBtn.title = 'リピート: 全曲';
                break;
            case 'one':
                this.repeatBtn.classList.add('active');
                this.repeatBtn.title = 'リピート: 1曲';
                break;
            default:
                this.repeatBtn.title = 'リピート: オフ';
                break;
        }
    }

    /**
     * ミュートの切り替え
     */
    toggleMute() {
        this.audioElement.muted = !this.audioElement.muted;
        this.updateVolumeUI();
    }

    /**
     * ボリューム変更
     */
    changeVolume() {
        const volume = parseFloat(this.volumeSlider.value);
        this.audioElement.volume = volume;
        this.settings.volume = volume;
        this.updateVolumeUI();
        this.saveSettings();
    }

    /**
     * ボリュームUIの更新
     */
    updateVolumeUI() {
        this.volumeSlider.value = this.settings.volume;
        this.audioElement.volume = this.settings.volume;
        
        if (this.audioElement.muted || this.settings.volume === 0) {
            this.volumeIcon.classList.add('hidden');
            this.muteIcon.classList.remove('hidden');
        } else {
            this.volumeIcon.classList.remove('hidden');
            this.muteIcon.classList.add('hidden');
        }
    }

    /**
     * プレイリストの切り替え
     */
    async switchPlaylist() {
        const newPlaylist = this.playlistSelect.value;
        if (newPlaylist !== this.currentPlaylist) {
            // 現在の再生を停止
            this.audioElement.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton();
            
            // 現在のBlobURLを全て解放
            for (const [trackId, blobUrl] of this.currentBlobUrls) {
                URL.revokeObjectURL(blobUrl);
            }
            this.currentBlobUrls.clear();
            
            this.currentPlaylist = newPlaylist;
            this.currentTrackIndex = -1;
            
            // 新しいプレイリストのトラックを読み込み
            const tracks = this.playlists[this.currentPlaylist];
            if (tracks && tracks.length > 0) {
                this.currentTrackIndex = 0;
                await this.loadTrack(0);
            } else {
                this.clearTrackDisplay();
            }
            
            this.updateTrackListUI();
            this.savePlaybackState();
        }
    }

    /**
     * プレイリスト作成ダイアログの表示
     */
    showCreatePlaylistDialog() {
        this.dialogMode = 'create';
        this.dialogTitle.textContent = '新しいプレイリスト';
        this.playlistNameInput.value = '';
        this.playlistDialog.classList.remove('hidden');
        this.playlistNameInput.focus();
    }

    /**
     * プレイリスト名前変更ダイアログの表示
     */
    showRenamePlaylistDialog() {
        this.dialogMode = 'rename';
        this.dialogTitle.textContent = 'プレイリスト名変更';
        this.playlistNameInput.value = this.currentPlaylist;
        this.playlistDialog.classList.remove('hidden');
        this.playlistNameInput.focus();
        this.playlistNameInput.select();
    }

    /**
     * ダイアログを非表示
     */
    hideDialog() {
        this.playlistDialog.classList.add('hidden');
    }

    /**
     * ダイアログ確認処理
     */
    async confirmDialog() {
        const playlistName = this.playlistNameInput.value.trim();
        
        if (!playlistName) {
            alert('プレイリスト名を入力してください。');
            return;
        }

        if (this.dialogMode === 'create') {
            if (this.playlists[playlistName]) {
                alert('そのプレイリスト名は既に存在します。');
                return;
            }
            
            this.playlists[playlistName] = [];
            this.currentPlaylist = playlistName;
            this.currentTrackIndex = -1;
            this.clearTrackDisplay();
        } else if (this.dialogMode === 'rename') {
            if (playlistName === this.currentPlaylist) {
                this.hideDialog();
                return;
            }
            
            if (this.playlists[playlistName]) {
                alert('そのプレイリスト名は既に存在します。');
                return;
            }
            
            this.playlists[playlistName] = this.playlists[this.currentPlaylist];
            delete this.playlists[this.currentPlaylist];
            this.currentPlaylist = playlistName;
        }

        this.updatePlaylistUI();
        this.savePlaylists();
        this.savePlaybackState();
        this.hideDialog();
    }

    /**
     * 現在のプレイリストを削除
     */
    async deleteCurrentPlaylist() {
        if (Object.keys(this.playlists).length <= 1) {
            alert('最後のプレイリストは削除できません。');
            return;
        }

        if (confirm(`プレイリスト "${this.currentPlaylist}" を削除しますか？`)) {
            const tracks = this.playlists[this.currentPlaylist] || [];
            
            // 削除するプレイリストのファイルをIndexedDBから削除
            for (const track of tracks) {
                try {
                    await this.audioFileDB.deleteFile(track.id);
                    this.revokeBlobUrl(track.id);
                } catch (error) {
                    console.error(`ファイル削除エラー (${track.id}):`, error);
                }
            }

            delete this.playlists[this.currentPlaylist];
            
            // 別のプレイリストに切り替え
            const remainingPlaylists = Object.keys(this.playlists);
            this.currentPlaylist = remainingPlaylists[0];
            this.currentTrackIndex = -1;
            
            const newTracks = this.playlists[this.currentPlaylist];
            if (newTracks && newTracks.length > 0) {
                this.currentTrackIndex = 0;
                await this.loadTrack(0);
            } else {
                this.clearTrackDisplay();
            }

            this.updatePlaylistUI();
            this.savePlaylists();
            this.savePlaybackState();
        }
    }

    /**
     * プレイリストのエクスポート
     */
    exportPlaylist() {
        const tracks = this.playlists[this.currentPlaylist] || [];
        if (tracks.length === 0) {
            alert('エクスポートするトラックがありません。');
            return;
        }

        const exportData = {
            name: this.currentPlaylist,
            tracks: tracks.map(track => ({
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                fileName: track.fileName,
                fileSize: track.fileSize,
                fileType: track.fileType
            })),
            exportedAt: new Date().toISOString(),
            version: '2.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentPlaylist}_playlist.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * プレイリストのインポート
     */
    async importPlaylist(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.name || !Array.isArray(importData.tracks)) {
                throw new Error('無効なプレイリストファイル形式です。');
            }

            let playlistName = importData.name;
            let counter = 1;
            
            // 同名のプレイリストがある場合は番号を付与
            while (this.playlists[playlistName]) {
                playlistName = `${importData.name} (${counter})`;
                counter++;
            }

            this.playlists[playlistName] = importData.tracks.map(track => ({
                id: this.generateUniqueId(),
                title: track.title || 'Unknown Title',
                artist: track.artist || 'Unknown Artist',
                duration: track.duration || 0,
                fileName: track.fileName || 'Unknown File',
                fileSize: track.fileSize || 0,
                fileType: track.fileType || 'audio/mpeg'
            }));

            this.currentPlaylist = playlistName;
            this.currentTrackIndex = -1;
            this.clearTrackDisplay();

            this.updatePlaylistUI();
            this.savePlaylists();
            this.savePlaybackState();

            alert(`プレイリスト "${playlistName}" をインポートしました。\n注意: 実際の音声ファイルは含まれていません。`);
        } catch (error) {
            console.error('プレイリストインポートエラー:', error);
            alert('プレイリストファイルの読み込みに失敗しました。');
        }

        this.importFileInput.value = '';
    }

    /**
     * テーマの切り替え
     */
    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.settings.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.settings.theme = themes[nextIndex];
        
        this.applyTheme();
        this.saveSettings();
    }

    /**
     * テーマの適用
     */
    applyTheme() {
        const html = document.documentElement;
        
        if (this.settings.theme === 'dark') {
            html.setAttribute('data-color-scheme', 'dark');
        } else if (this.settings.theme === 'light') {
            html.setAttribute('data-color-scheme', 'light');
        } else {
            html.removeAttribute('data-color-scheme');
        }
    }

    /**
     * キーボードショートカット
     */
    handleKeyboardShortcuts(e) {
        // ダイアログが開いている場合はスキップ
        if (!this.playlistDialog.classList.contains('hidden')) {
            if (e.key === 'Enter') {
                this.confirmDialog();
            } else if (e.key === 'Escape') {
                this.hideDialog();
            }
            return;
        }

        // 入力フィールドにフォーカスがある場合はスキップ
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.playPreviousTrack();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.playNextTrack();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.volumeSlider.value = Math.min(1, parseFloat(this.volumeSlider.value) + 0.1);
                this.changeVolume();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.volumeSlider.value = Math.max(0, parseFloat(this.volumeSlider.value) - 0.1);
                this.changeVolume();
                break;
            case 'm':
            case 'M':
                this.toggleMute();
                break;
            case 's':
            case 'S':
                this.toggleShuffle();
                break;
            case 'r':
            case 'R':
                this.toggleRepeat();
                break;
        }
    }

    /**
     * 設定の保存
     */
    saveSettings() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(this.settings));
        } catch (error) {
            console.error('設定保存エラー:', error);
        }
    }

    /**
     * 設定の読み込み
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.settings);
            if (saved) {
                const settings = JSON.parse(saved);
                this.settings = { ...APP_CONFIG.defaultSettings, ...settings };
            }
        } catch (error) {
            console.error('設定読み込みエラー:', error);
            this.settings = { ...APP_CONFIG.defaultSettings };
        }
    }

    /**
     * プレイリストの保存
     */
    savePlaylists() {
        try {
            // ファイル情報を除いてメタデータのみ保存
            const playlistsToSave = {};
            for (const [name, tracks] of Object.entries(this.playlists)) {
                playlistsToSave[name] = tracks.map(track => ({
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    duration: track.duration,
                    fileName: track.fileName,
                    fileSize: track.fileSize,
                    fileType: track.fileType
                }));
            }
            
            localStorage.setItem(APP_CONFIG.storageKeys.playlists, JSON.stringify(playlistsToSave));
            localStorage.setItem(APP_CONFIG.storageKeys.currentPlaylist, this.currentPlaylist);
        } catch (error) {
            console.error('プレイリスト保存エラー:', error);
        }
    }

    /**
     * プレイリストの読み込み
     */
    async loadPlaylists() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.playlists);
            const currentPlaylist = localStorage.getItem(APP_CONFIG.storageKeys.currentPlaylist);
            
            if (saved) {
                this.playlists = JSON.parse(saved);
                
                // 存在しないファイルのトラックを除去
                for (const [playlistName, tracks] of Object.entries(this.playlists)) {
                    const validTracks = [];
                    for (const track of tracks) {
                        try {
                            const fileData = await this.audioFileDB.getFile(track.id);
                            if (fileData) {
                                validTracks.push(track);
                            } else {
                                console.warn(`ファイルが見つかりません: ${track.fileName} (${track.id})`);
                            }
                        } catch (error) {
                            console.warn(`ファイル確認エラー: ${track.fileName} (${track.id})`, error);
                        }
                    }
                    this.playlists[playlistName] = validTracks;
                }
                
                if (currentPlaylist && this.playlists[currentPlaylist]) {
                    this.currentPlaylist = currentPlaylist;
                } else {
                    this.currentPlaylist = Object.keys(this.playlists)[0] || 'default';
                }
            }
            
            // デフォルトプレイリストが存在しない場合は作成
            if (Object.keys(this.playlists).length === 0) {
                this.playlists['default'] = [];
                this.currentPlaylist = 'default';
            }
        } catch (error) {
            console.error('プレイリスト読み込みエラー:', error);
            this.playlists = { 'default': [] };
            this.currentPlaylist = 'default';
        }
    }

    /**
     * 再生状態の保存
     */
    savePlaybackState() {
        try {
            const state = {
                currentTrackIndex: this.currentTrackIndex,
                currentTime: this.audioElement.currentTime,
                isPlaying: this.isPlaying,
                volume: this.settings.volume
            };
            localStorage.setItem(APP_CONFIG.storageKeys.playbackState, JSON.stringify(state));
        } catch (error) {
            console.error('再生状態保存エラー:', error);
        }
    }

    /**
     * 再生状態の復元
     */
    loadPlaybackState() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.playbackState);
            if (saved) {
                const state = JSON.parse(saved);
                
                if (state.currentTrackIndex >= 0 &&
                    this.playlists[this.currentPlaylist] &&
                    state.currentTrackIndex < this.playlists[this.currentPlaylist].length) {
                    
                    this.currentTrackIndex = state.currentTrackIndex;
                    this.loadTrack(this.currentTrackIndex).then(() => {
                        if (state.currentTime && isFinite(state.currentTime)) {
                            this.audioElement.currentTime = state.currentTime;
                        }
                    });
                }
                
                if (state.volume !== undefined) {
                    this.settings.volume = state.volume;
                }
            }
        } catch (error) {
            console.error('再生状態復元エラー:', error);
        }
    }
}

// アプリケーション開始時の処理
document.addEventListener('DOMContentLoaded', () => {
    // サービスワーカーの登録
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }

    // MP3プレイヤーの初期化
    window.mp3Player = new MP3Player();
});

// PWA関連の処理
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt triggered');
    e.preventDefault();
    deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
});
