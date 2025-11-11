# Cloudflare Tunnel を使った note-mcp-server のセットアップ

## 概要

このガイドでは、Cloudflare Tunnelを使用してローカルのnote-mcp-serverをVPS上のn8nから安全にアクセスできるようにする方法を説明します。

### この構成のメリット

- ✅ **セキュリティ**: note.comの認証情報はローカルPCに保持
- ✅ **24時間アクセス**: VPS上のn8nからいつでもアクセス可能
- ✅ **無料**: Cloudflare Tunnelは無料で利用可能
- ✅ **簡単**: 複雑なファイアウォール設定不要
- ✅ **安全**: 外部からの直接アクセスは不可能

### アーキテクチャ

```
[ローカルPC]                    [Cloudflare]              [VPS]
note-mcp-server ←[Tunnel]→ Cloudflare Edge ←[HTTPS]→ n8n
(localhost:3000)                                      (セルフホスト)
```

## 前提条件

- ローカルPC（macOS/Linux/Windows）
- Cloudflareアカウント（無料）
- Cloudflareで管理しているドメイン（オプション）
- VPS上でn8nがセルフホスティングされている

## セットアップ手順

### Step 1: Cloudflared のインストール

#### macOS (Homebrew)
```bash
brew install cloudflare/cloudflare/cloudflared
```

#### Linux
```bash
# Debian/Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# RHEL/CentOS
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo rpm -i cloudflared-linux-x86_64.rpm
```

#### Windows
[公式サイト](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)からインストーラーをダウンロード

### Step 2: Cloudflareアカウントでログイン

```bash
cloudflared tunnel login
```

ブラウザが開き、Cloudflareアカウントでの認証を求められます。認証後、証明書がローカルに保存されます。

### Step 3: note-mcp-server のビルドと起動確認

```bash
cd /path/to/noteMCP
npm install
npm run build
npm run start:http
```

別のターミナルで動作確認：
```bash
curl http://localhost:3000/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "server": "note-api-mcp",
  "version": "2.0.0-http",
  "transport": "SSE",
  "authenticated": true
}
```

## 方法A: クイックトンネル（テスト用）

最も簡単な方法。一時的なURLが発行されます。

```bash
# note-mcp-serverが起動している状態で
cloudflared tunnel --url http://localhost:3000
```

出力例：
```
2024-01-01T12:00:00Z INF +--------------------------------------------------------------------------------------------+
2024-01-01T12:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2024-01-01T12:00:00Z INF |  https://random-words-1234.trycloudflare.com                                               |
2024-01-01T12:00:00Z INF +--------------------------------------------------------------------------------------------+
```

### n8nでの設定

**HTTP Stream URL:**
```
https://random-words-1234.trycloudflare.com/mcp
```

**注意:** このURLは起動ごとに変わります。テスト用途のみに使用してください。

## 方法B: 永続的なトンネル（推奨）

独自ドメインを使用した永続的なトンネルを作成します。

### Step 1: トンネルの作成

```bash
cloudflared tunnel create note-mcp
```

出力例：
```
Tunnel credentials written to /Users/yourname/.cloudflared/12345678-1234-1234-1234-123456789abc.json
Created tunnel note-mcp with id 12345678-1234-1234-1234-123456789abc
```

**重要:** トンネルIDとcredentialsファイルのパスをメモしてください。

### Step 2: 設定ファイルの作成

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

以下の内容を記述（トンネルIDとパスは実際の値に置き換えてください）：

```yaml
tunnel: 12345678-1234-1234-1234-123456789abc
credentials-file: /Users/yourname/.cloudflared/12345678-1234-1234-1234-123456789abc.json

ingress:
  - hostname: note-mcp.your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```

**設定項目の説明:**
- `tunnel`: Step 1で作成したトンネルID
- `credentials-file`: credentialsファイルの絶対パス
- `hostname`: 使用するサブドメイン（Cloudflareで管理しているドメイン）
- `service`: ローカルのnote-mcp-serverのURL

### Step 3: DNS設定

```bash
cloudflared tunnel route dns note-mcp note-mcp.your-domain.com
```

これにより、Cloudflareの DNS に自動的にCNAMEレコードが追加されます。

### Step 4: トンネルの起動

```bash
cloudflared tunnel run note-mcp
```

出力例：
```
2024-01-01T12:00:00Z INF Starting tunnel tunnelID=12345678-1234-1234-1234-123456789abc
2024-01-01T12:00:00Z INF Connection registered connIndex=0 location=NRT
2024-01-01T12:00:00Z INF Connection registered connIndex=1 location=NRT
```

### Step 5: 動作確認

```bash
curl https://note-mcp.your-domain.com/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "server": "note-api-mcp",
  "version": "2.0.0-http",
  "transport": "SSE",
  "authenticated": true
}
```

### n8nでの設定

**HTTP Stream URL:**
```
https://note-mcp.your-domain.com/mcp
```

または

```
https://note-mcp.your-domain.com/sse
```

**HTTP Connection Timeout:**
```
60000
```

**Messages Post Endpoint:** （空欄）

**Additional Headers:** （空欄）

## 自動起動設定

### macOS (LaunchAgent)

#### note-mcp-server の自動起動

```bash
# ログディレクトリ作成
mkdir -p ~/noteMCP/logs

# LaunchAgent作成
nano ~/Library/LaunchAgents/com.note-mcp-server.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.note-mcp-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/yourname/noteMCP/build/note-mcp-server-http.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/yourname/noteMCP</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/yourname/noteMCP/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/yourname/noteMCP/logs/stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

**重要:** `/usr/local/bin/node` と `/Users/yourname/noteMCP` は実際のパスに置き換えてください。

Node.jsのパスを確認：
```bash
which node
```

```bash
# サービス登録・起動
launchctl load ~/Library/LaunchAgents/com.note-mcp-server.plist
launchctl start com.note-mcp-server

# ステータス確認
launchctl list | grep note-mcp-server

# ログ確認
tail -f ~/noteMCP/logs/stdout.log
```

#### Cloudflare Tunnel の自動起動

```bash
nano ~/Library/LaunchAgents/com.cloudflared.note-mcp.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflared.note-mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>note-mcp</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/yourname/noteMCP/logs/cloudflared-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/yourname/noteMCP/logs/cloudflared-stderr.log</string>
</dict>
</plist>
```

**重要:** cloudflaredのパスを確認してください：
```bash
which cloudflared
```

Intel Macの場合は `/usr/local/bin/cloudflared` になる可能性があります。

```bash
# サービス登録・起動
launchctl load ~/Library/LaunchAgents/com.cloudflared.note-mcp.plist
launchctl start com.cloudflared.note-mcp

# ステータス確認
launchctl list | grep cloudflared

# ログ確認
tail -f ~/noteMCP/logs/cloudflared-stdout.log
```

### Linux (systemd)

#### note-mcp-server の自動起動

```bash
sudo nano /etc/systemd/system/note-mcp-server.service
```

```ini
[Unit]
Description=note MCP Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/noteMCP
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /home/youruser/noteMCP/build/note-mcp-server-http.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable note-mcp-server
sudo systemctl start note-mcp-server
sudo systemctl status note-mcp-server
```

#### Cloudflare Tunnel の自動起動

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

### Windows (タスクスケジューラ)

1. タスクスケジューラを開く
2. 「基本タスクの作成」を選択
3. トリガー: 「コンピューターの起動時」
4. 操作: 「プログラムの起動」
5. プログラム/スクリプト: `node.exe` のパス
6. 引数: `C:\path\to\noteMCP\build\note-mcp-server-http.js`
7. 開始: `C:\path\to\noteMCP`

Cloudflare Tunnelも同様に設定します。

## n8nワークフロー例

### 例1: 定期的な記事検索とSlack通知

```json
{
  "name": "Note記事検索 → Slack通知",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "hoursInterval": 6}]
        }
      },
      "name": "6時間ごと",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://note-mcp.your-domain.com/mcp",
        "transport": "sse",
        "tool": "search-notes",
        "toolParameters": {
          "query": "プログラミング",
          "size": 5,
          "sort": "new"
        }
      },
      "name": "Note記事検索",
      "type": "n8n-nodes-mcp.mcpClient",
      "position": [450, 300]
    },
    {
      "parameters": {
        "channel": "#note-updates",
        "text": "新着記事が見つかりました:\n{{ $json.notes }}"
      },
      "name": "Slack通知",
      "type": "n8n-nodes-base.slack",
      "position": [650, 300]
    }
  ]
}
```

### 例2: Webhook経由で記事投稿

```json
{
  "name": "Webhook → Note下書き投稿",
  "nodes": [
    {
      "parameters": {
        "path": "note-post"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://note-mcp.your-domain.com/mcp",
        "transport": "sse",
        "tool": "post-draft-note",
        "toolParameters": {
          "title": "={{ $json.body.title }}",
          "body": "={{ $json.body.content }}"
        }
      },
      "name": "Note下書き投稿",
      "type": "n8n-nodes-mcp.mcpClient",
      "position": [450, 300]
    }
  ]
}
```

## トラブルシューティング

### トンネルに接続できない

```bash
# トンネルのステータス確認
cloudflared tunnel info note-mcp

# トンネル一覧表示
cloudflared tunnel list

# DNS設定確認
dig note-mcp.your-domain.com
```

### note-mcp-serverが起動しない

```bash
# macOS: ログ確認
tail -f ~/noteMCP/logs/stderr.log

# Linux: ログ確認
sudo journalctl -u note-mcp-server -f

# 手動起動でテスト
cd ~/noteMCP
npm run start:http
```

### n8nから接続できない

1. ローカルでヘルスチェック：
```bash
curl http://localhost:3000/health
```

2. Cloudflare Tunnel経由でヘルスチェック：
```bash
curl https://note-mcp.your-domain.com/health
```

3. n8nのログを確認：
```bash
# n8nのログ確認（VPS上で）
docker logs -f n8n  # Dockerの場合
pm2 logs n8n        # PM2の場合
```

### 自動起動が動作しない（macOS）

```bash
# サービスのステータス確認
launchctl list | grep note-mcp
launchctl list | grep cloudflared

# サービスの再起動
launchctl stop com.note-mcp-server
launchctl start com.note-mcp-server

# サービスの削除と再登録
launchctl unload ~/Library/LaunchAgents/com.note-mcp-server.plist
launchctl load ~/Library/LaunchAgents/com.note-mcp-server.plist
```

### Cloudflareダッシュボードでの確認

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) にログイン
2. 「Access」→「Tunnels」でトンネルのステータスを確認
3. 「Healthy」と表示されていればOK

## セキュリティに関する注意

### メリット
- ✅ 認証情報はローカルPCに保持
- ✅ 外部からの直接アクセスは不可能
- ✅ Cloudflareの保護下で動作
- ✅ DDoS攻撃からの保護

### 追加の保護（オプション）

#### Cloudflare Access でIP制限

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) にログイン
2. 「Access」→「Applications」→「Add an application」
3. 「Self-hosted」を選択
4. Application domain: `note-mcp.your-domain.com`
5. Policy: VPSのIPアドレスのみ許可

```
Policy name: n8n VPS Only
Action: Allow
Include: IP ranges → VPSのIPアドレス
```

これにより、VPS以外からのアクセスをブロックできます。

## まとめ

### 推奨構成

```
[ローカルPC]
├── note-mcp-server (自動起動)
│   └── localhost:3000
└── Cloudflare Tunnel (自動起動)
    └── note-mcp.your-domain.com
         ↓
    [Cloudflare Edge]
         ↓
    [VPS: n8n]
```

### チェックリスト

- [ ] Cloudflaredインストール完了
- [ ] Cloudflareアカウントでログイン完了
- [ ] トンネル作成完了
- [ ] 設定ファイル作成完了
- [ ] DNS設定完了
- [ ] note-mcp-server自動起動設定完了
- [ ] Cloudflare Tunnel自動起動設定完了
- [ ] ヘルスチェック成功
- [ ] n8nから接続成功

### サポート

問題が発生した場合は、以下を確認してください：

1. [Cloudflare Tunnel ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
2. [note-mcp-server GitHub Issues](https://github.com/note-mcp-developer/note-mcp-server/issues)
3. ログファイル（`~/noteMCP/logs/`）

この構成により、セキュアで安定したnote自動化環境が構築できます！
