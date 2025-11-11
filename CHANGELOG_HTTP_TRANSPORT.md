# Streamable HTTP トランスポート対応 - 変更ログ

## 概要

note-mcp-serverにStreamable HTTPトランスポート（SSE）対応を追加しました。これにより、Cursor、ChatGPT、OpenAI Responses APIなどからリモートMCPサーバーとして接続できるようになりました。

## 主な変更点

### 1. 新規ファイル

#### `src/note-mcp-server-http.ts`
- HTTPトランスポート版のメインサーバーファイル
- SSE (Server-Sent Events) を使用したストリーミング対応
- 既存のstdioトランスポート版と同じツール・プロンプトを提供
- CORS対応、ヘルスチェックエンドポイント実装

### 2. 環境設定の更新

#### `src/config/environment.ts`
- `MCP_HTTP_PORT`: HTTPサーバーのポート（デフォルト: 3000）
- `MCP_HTTP_HOST`: HTTPサーバーのホスト（デフォルト: 127.0.0.1）

#### `.env.example`
- HTTPトランスポート設定のサンプルを追加
- デバッグモード設定を追加

### 3. ビルドスクリプトの追加

#### `package.json`
新しいスクリプトを追加：
- `npm run start:http`: HTTPトランスポート版サーバー起動
- `npm run dev:http`: 開発用（ビルド＋起動、HTTP）
- `npm run dev:http:ts`: TypeScript直接実行（開発用、HTTP）

### 4. ドキュメントの更新

#### `README.md`
以下のセクションを追加：
- リモートMCP接続（HTTP/SSE トランスポート）
- HTTPサーバーの起動方法
- 利用可能なエンドポイント
- Cursorでのリモート接続設定
- ChatGPT / OpenAI Responses APIでの接続方法
- セキュリティに関する注意事項

## 利用可能なエンドポイント

### ヘルスチェック
```
GET http://127.0.0.1:3000/health
```

レスポンス例：
```json
{
  "status": "ok",
  "server": "note-api-mcp",
  "version": "2.0.0-http",
  "transport": "SSE",
  "authenticated": true
}
```

### MCPエンドポイント
```
GET http://127.0.0.1:3000/mcp
GET http://127.0.0.1:3000/sse
```

SSE接続を確立し、MCPプロトコルでの通信を開始します。

## 使用方法

### 1. HTTPサーバーの起動

```bash
# ビルドして起動
npm run build && npm run start:http

# または開発モードで起動
npm run dev:http
```

### 2. Cursorでの接続設定

`~/.cursor/mcp.json` に以下を追加：

```json
{
  "mcpServers": {
    "note-api-remote": {
      "url": "http://127.0.0.1:3000/mcp",
      "transport": "sse"
    }
  }
}
```

### 3. ポート・ホストの変更

`.env` ファイルに以下を追加：

```env
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=127.0.0.1
```

## 技術詳細

### トランスポート方式

- **stdio**: 標準入出力を使用（従来の方式、Claude Desktop等）
- **HTTP/SSE**: Server-Sent Eventsを使用したストリーミング（新方式、リモート接続対応）

### アーキテクチャ

HTTPトランスポート版は、既存のstdio版と同じツール・プロンプト登録機構を共有しています：

```
src/
├── config/          # 環境設定（HTTP設定を追加）
├── types/           # 型定義（変更なし）
├── utils/           # ユーティリティ（変更なし）
├── tools/           # MCPツール（変更なし）
├── prompts/         # プロンプト（変更なし）
├── note-mcp-server-refactored.ts  # stdio版
└── note-mcp-server-http.ts        # HTTP/SSE版（新規）
```

### セキュリティ

- デフォルトで `127.0.0.1` (localhost) のみアクセス可能
- CORS設定により、すべてのオリジンからのアクセスを許可（開発用）
- 本番環境では適切な認証・認可機構の実装を推奨

## 互換性

- 既存のstdioトランスポート版は引き続き利用可能
- すべてのツールとプロンプトは両方のトランスポートで動作
- 環境変数による認証設定は共通

## 今後の拡張予定

- HTTPS対応
- 認証・認可機構の実装
- WebSocket対応の検討
- パフォーマンス最適化

## 参考資料

- [Model Context Protocol (MCP) 仕様](https://modelcontextprotocol.io/)
- [SSE (Server-Sent Events) 仕様](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MCP SDK ドキュメント](https://github.com/modelcontextprotocol/typescript-sdk)
