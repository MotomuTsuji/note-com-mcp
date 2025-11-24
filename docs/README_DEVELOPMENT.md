# note-mcp開発ガイド

## 🎯 概要

note.comの下書き作成を自動化するMCPサーバーです。HTTP Streamable機能により、n8nなどのWebツールからリモートで利用できます。

## 🏗️ アーキテクチャ

```
[n8n/クライアント] → [HTTP/SSE] → [Cloudflare Tunnel] → [MCPサーバー] → [note.com API]
```

## 🚀 クイックスタート

### 1. 環境設定

```bash
# クローン
git clone https://github.com/shimayuz/note-mcp-server.git
cd note-mcp-server

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envに認証情報を設定
```

### 2. ローカル実行

```bash
# ビルド
npm run build

# HTTPサーバー起動
MCP_HTTP_PORT=3000 MCP_HTTP_HOST=0.0.0.0 node build/note-mcp-server-http.js
```

### 3. Cloudflare Tunnelで公開

```bash
# トンネル作成
cloudflared tunnel create note-mcp

# DNS設定
cloudflared tunnel route dns note-mcp your-domain.com

# 設定ファイル作成
cat > ~/.cloudflared/config.yml << EOF
tunnel: YOUR_TUNNEL_ID
credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# 起動
cloudflared tunnel run note-mcp
```

## 🔧 n8n連携

### HTTP Requestノード設定

```json
{
  "method": "POST",
  "url": "https://your-domain.com/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "post-draft-note",
      "arguments": {
        "title": "記事タイトル",
        "body": "記事本文"
      }
    }
  }
}
```

## 🛠️ 利用可能なツール

| ツール名          | 機能             | 必須パラメータ  |
| ----------------- | ---------------- | --------------- |
| `post-draft-note` | 下書き作成・更新 | `title`, `body` |
| `get-user-info`   | ユーザー情報取得 | `username`      |
| `get-note`        | 記事詳細取得     | `id`            |
| `upload-image`    | 画像アップロード | `image`         |

## 📊 エンドポイント

| エンドポイント | 用途              |
| -------------- | ----------------- |
| `/health`      | ヘルスチェック    |
| `/mcp`         | MCP JSON-RPC      |
| `/sse`         | SSEストリーミング |

## 🔒 セキュリティ

- 認証情報は環境変数で管理
- Cloudflare TunnelによるHTTPS通信
- セッションCookieとXSRFトークンによる認証

## 📝 詳細ドキュメント

完全な実装ガイドはプライベートドキュメントとして別途管理されています。

## 🤝 貢献

1. Fork
2. Feature branch
3. Pull request

## 📄 ライセンス

MIT License
