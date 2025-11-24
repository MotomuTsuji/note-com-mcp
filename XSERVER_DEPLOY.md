# Xserver VPS (Docker) デプロイガイド

このガイドでは、Playwrightを活用したnote.comの操作（下書き投稿など）を可能にするための、Xserver VPSへのデプロイ手順を説明します。

## 🎯 構成の特徴

- **Docker + Playwright**: 完全なブラウザ環境をコンテナ内で実行
- **認証永続化**: 初回認証情報をボリュームで保持
- **高機能**: 単なるAPI操作だけでなく、実際のブラウザを使用した高度な操作が可能

## 📋 前提条件

- Xserver VPS（Ubuntu 22.04推奨）
- ローカルPCにDockerインストール済み
- ローカルPCで `npm install` 済み

## 🚀 デプロイ手順

### 1. ローカルで認証情報を取得

まず、ローカルPCのブラウザを使ってnote.comにログインし、認証情報を取得します。これが「初回ログイン」に相当します。

```bash
# ブラウザが起動し、ログインを求められます
npm run capture:session
```

これにより、`.env` ファイルに認証情報（Cookie, XSRF-TOKENなど）が自動的に保存されます。

### 2. サーバーへファイルを転送

取得した認証情報を含む `.env` と、必要なソースコードをサーバーに転送します。

```bash
# サーバーのIPアドレスとユーザー名を設定
export SERVER_IP="your-xserver-ip"
export SERVER_USER="root"

# ディレクトリ作成
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ~/note-mcp"

# ファイル転送
scp Dockerfile docker-compose.xserver.yml package.json package-lock.json tsconfig.json .env ${SERVER_USER}@${SERVER_IP}:~/note-mcp/
scp -r src ${SERVER_USER}@${SERVER_IP}:~/note-mcp/
```

### 3. サーバーで起動

```bash
# サーバーにログイン
ssh ${SERVER_USER}@${SERVER_IP}

# ディレクトリへ移動
cd ~/note-mcp

# Dockerコンテナをビルド＆起動
docker compose -f docker-compose.xserver.yml up -d --build
```

### 4. 動作確認

```bash
# ログを確認
docker compose -f docker-compose.xserver.yml logs -f

# ヘルスチェック
curl http://localhost:3001/health
```

## 🔗 n8nからの接続

n8n（クラウド版または別サーバー）から接続する場合：

1. **mcp-remote** 設定:
   ```
   http://<Xserver-IP>:3001/mcp
   ```

2. **ファイアウォール設定**:
   Xserverのパケットフィルター設定で、ポート `3001` へのアクセスを許可してください。
   （セキュリティのため、n8nのIPアドレスのみを許可することを推奨します）

## 🔄 認証の更新

認証が切れた場合（note.comのセッション有効期限切れなど）：

1. ローカルで再度 `npm run capture:session` を実行
2. `.env` をサーバーに再転送
   ```bash
   scp .env ${SERVER_USER}@${SERVER_IP}:~/note-mcp/
   ```
3. コンテナを再起動
   ```bash
   docker compose -f docker-compose.xserver.yml restart
   ```
