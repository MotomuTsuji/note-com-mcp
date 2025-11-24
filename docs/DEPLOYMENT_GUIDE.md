# note-mcp-server デプロイメントガイド

## 目次
1. [トランスポート方式の比較](#トランスポート方式の比較)
2. [セットアップ手順](#セットアップ手順)
3. [n8n連携設定](#n8n連携設定)
4. [セキュリティ対策](#セキュリティ対策)
5. [トラブルシューティング](#トラブルシューティング)

## トランスポート方式の比較

### stdioトランスポート（推奨：Windsurf・ローカル利用）

**特徴:**
- ✅ MCPプロトコルの標準実装
- ✅ Windsurf/CursorなどのIDEと直接連携
- ✅ 認証情報がローカルに閉じている（最も安全）
- ✅ ネットワーク遅延なし
- ✅ 設定が簡単

**起動方法:**
```bash
# stdioサーバー起動
npm run start:refactored

# または直接実行
node build/note-mcp-server-refactored.js
```

**Windsurf設定:**
```json
{
  "mcpServers": {
    "note-api": {
      "command": "node",
      "args": ["/path/to/noteMCP/build/note-mcp-server-refactored.js"],
      "env": {
        "NOTE_EMAIL": "your_email@example.com",
        "NOTE_PASSWORD": "your_password",
        "NOTE_USER_ID": "your_user_id",
        "NOTE_SESSION_V5": "your_session_cookie",
        "NOTE_XSRF_TOKEN": "your_xsrf_token"
      }
    }
  }
}
```

**推奨ケース:**
- Windsurf/Cursorでの利用
- 個人開発・テスト環境
- セキュリティ最優先

### HTTP/SSEトランスポート（推奨：n8n・リモート利用）

**特徴:**
- ✅ HTTP APIとして利用可能
- ✅ n8nなどの自動化ツールとの統合が容易
- ✅ 24時間稼働可能
- ✅ どこからでもアクセス可能
- ✅ 複数デバイス・チームで共有可能

**起動方法:**
```bash
# HTTPサーバー起動（ポート3002）
MCP_HTTP_PORT=3002 npm run start:http

# または
node build/note-mcp-server-http.js
```

**APIエンドポイント:**
- 健康チェック: `GET http://localhost:3002/health`
- MCP呼び出し: `POST http://localhost:3002/mcp/call`

**推奨ケース:**
- n8nでの自動化
- チームでの共有利用
- リモートサーバーでの稼働

## セットアップ手順

### 共通セットアップ

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd noteMCP
```

2. **依存関係のインストール**
```bash
npm install
```

3. **TypeScriptのビルド**
```bash
npm run build
```

4. **認証情報の設定**
```bash
cp .env.example .env
# .envファイルに認証情報を設定
```

### stdioトランスポートのセットアップ

1. **WindsurfのMCP設定ファイルを編集**
   - 設定ファイルの場所: `~/.codeium/windsurf/mcp_config.json`
   - 上記の「Windsurf設定」を参考にnote-apiを追加

2. **Windsurfを再起動**
   - MCPサーバーが自動的に読み込まれる

### HTTPトランスポートのセットアップ

1. **HTTPサーバーを起動**
```bash
MCP_HTTP_PORT=3002 npm run start:http
```

2. **動作確認**
```bash
curl http://localhost:3002/health
```

3. **API呼び出しテスト**
```bash
curl -X POST http://localhost:3002/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "post-draft-note",
      "arguments": {
        "title": "テスト記事",
        "body": "これはテストです"
      }
    }
  }'
```

## n8n連携設定

### n8n HTTP Requestノード設定

**基本設定:**
- **Method**: POST
- **URL**: `http://localhost:3002/mcp/call`
- **Headers**: 
  - Content-Type: application/json

**Body (JSON):**
```json
{
  "method": "tools/call",
  "params": {
    "name": "post-draft-note",
    "arguments": {
      "title": "{{$json.title}}",
      "body": "{{$json.body}}"
    }
  }
}
```

### n8nワークフロー例

1. **記事データの準備**
   - トリガーノードで記事データを受信

2. **note.comに投稿**
   - HTTP Requestノードでpost-draft-noteを呼び出し

3. **レスポンス処理**
   - 成功: editUrlを取得して保存
   - 失敗: エラーハンドリング

### リモートサーバーでのn8n連携

1. **サーバーでHTTPサーバーを起動**
```bash
# バックグラウンドで実行
nohup npm run start:http > server.log 2>&1 &
```

2. **Cloudflare Tunnelで公開**
```bash
cloudflared tunnel --url http://localhost:3002
```

3. **n8nでHTTPSエンドポイントを使用**
```
https://<tunnel-url>/mcp/call
```

## セキュリティ対策

### 認証情報の保護

1. **.envファイルの管理**
```bash
# .envファイルを.gitignoreに追加
echo ".env" >> .gitignore

# ファイル権限を制限
chmod 600 .env
```

2. **環境変数の使用**
```bash
# 本番環境では環境変数を直接設定
export NOTE_EMAIL="your_email@example.com"
export NOTE_PASSWORD="your_password"
```

### ネットワークセキュリティ

1. **ファイアウォール設定**
```bash
# 特定のIPアドレスのみ許可
ufw allow from <n8n-server-ip> to any port 3002
```

2. **HTTPSの使用**
```bash
# Cloudflare TunnelまたはnginxでHTTPS終端
```

### トークンの有効期限管理

1. **セッションCookieの更新**
- 有効期限: 約1〜2週間
- 定期的な更新が必要

2. **自動更新スクリプト**
```bash
#!/bin/bash
# update_session.sh
npm run capture:session
# サーバーを再起動
systemctl restart note-mcp
```

## トラブルシューティング

### 一般的なエラー

#### 1. stdioトランスポートが起動しない

**エラー例:**
```
Error: Cannot find module 'build/note-mcp-server-refactored.js'
```

**解決策:**
```bash
# TypeScriptをビルド
npm run build

# 依存関係を再インストール
npm install
```

#### 2. HTTPサーバーが起動しない

**エラー例:**
```
Error: listen EADDRINUSE :::3002
```

**解決策:**
```bash
# ポートを使用中のプロセスを特定
lsof -i :3002

# プロセスを終了
kill -9 <PID>

# 別のポートで起動
MCP_HTTP_PORT=3003 npm run start:http
```

#### 3. 認証エラー

**エラー例:**
```
{"error": "認証が必要です"}
```

**解決策:**
```bash
# セッションCookieを更新
npm run capture:session

# .envファイルを確認
cat .env | grep NOTE_
```

#### 4. n8n連携エラー

**エラー例:**
```
Connection refused
```

**解決策:**
1. HTTPサーバーが起動しているか確認
2. ファイアウォール設定を確認
3. ネットワーク接続を確認

### デバッグ方法

#### 1. 詳細ログの有効化
```bash
# デバッグモードで起動
DEBUG=true npm run start:http
```

#### 2. APIレスポンスの確認
```bash
curl -v http://localhost:3002/health
```

#### 3. MCPツールの一覧確認
```bash
curl -X POST http://localhost:3002/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## 利用可能なツール

### 共通ツール

| ツール名          | 説明           | stdio | HTTP |
| ----------------- | -------------- | ----- | ---- |
| `post-draft-note` | 下書き記事作成 | ✅     | ✅    |
| `get-my-notes`    | 記事一覧取得   | ✅     | ✅    |
| `get-note`        | 記事詳細取得   | ✅     | ✅    |
| `search-notes`    | 記事検索       | ✅     | ✅    |
| `edit-note`       | 記事編集       | ✅     | ✅    |
| `publish-note`    | 記事公開       | ✅     | ✅    |

### HTTPトランスポート限定機能

| 機能              | 説明               |
| ----------------- | ------------------ |
| 健康チェック      | サーバー状態の確認 |
| SSEストリーミング | リアルタイム通信   |

---

## まとめ

noteMCPは2つのトランスポート方式をサポートしています：

- **stdioトランスポート**: WindsurfなどのIDEとの連携に最適
- **HTTP/SSEトランスポート**: n8nなどの自動化ツールとの連携に最適

用途に応じて適切な方式を選択してください。

---

*最終更新: 2025-11-16*
