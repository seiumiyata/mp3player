---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #222831
color: #00adb5
---

# 🎵 PWA MP3プレイヤー  
## シンプル × モダン × オフライン

---

## 🚀 特長

- PWA対応（ホーム画面追加・オフラインOK）
- 直感的なUI・ダーク/ライトテーマ
- プレイリスト管理・再生コントロール
- MediaSession API連携  
  （ロック画面/通知から操作）

---

## 📁 ファイル構成

```

/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── sw.js
└── icons/
├── icon-192.png
└── icon-512.png

```

---

## 🛠️ 使い方

1. サイトにアクセス
2. 「ファイルを選択」でMP3追加
3. プレイリストから曲を選択
4. 再生・停止・曲送り・シャッフル・リピート
5. テーマ切替やボリューム調整もOK

---

## 📱 PWA機能

- オフライン再生（Service Worker）
- ホーム画面追加（manifest.json）
- アイコン・テーマカラー対応
- スマホ/PC両対応レスポンシブ

---

## 💡 技術ポイント

- HTML5 Audio API
- MediaSession API
- Service Worker
- モダンCSS（ダーク/ライト対応）

---

## 📝 注意・ヒント

- MP3はローカルで安全に再生
- ファイルはブラウザ内のみで管理
- エラー時は画面下部に通知
- コード品質・アクセシビリティ重視

---

## 🧑‍💻 カスタマイズ例

- アイコン画像は`icons/`に配置
- テーマカラーは`manifest.json`とCSSで調整
- Service Workerのキャッシュリストに静的ファイルを追加

---

## 🌟 Enjoy Your Music Life!

###  
PWA MP3プレイヤーで  
自分だけの音楽体験を。
