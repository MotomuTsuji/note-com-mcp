# note-mcp-server デプロイメントガイド

## 目次
1. [デプロイオプションの比較](#デプロイオプションの比較)
2. [n8n統合パターン](#n8n統合パターン)
3. [リモートデプロイ手順](#リモートデプロイ手順)
4. [セキュリティ対策](#セキュリティ対策)
5. [トラブルシューティング](#トラブルシューティング)

## デプロイオプションの比較

### ローカル実行（推奨：個人利用）

**メリット:**
- ✅ 認証情報がローカルに閉じている（最も安全）
- ✅ ネットワーク遅延なし
- ✅ サーバー費用不要
- ✅ 設定が簡単

**デメリット:**
- ❌ PCを起動している必要がある
- ❌ 外出先からアクセス不可

**推奨ケース:**
- 個人での利用
- 開発・テスト環境
- セキュリティ最優先

### リモートサーバー（推奨：チーム利用・自動化）

**メリット:**
- ✅ 24時間稼働可能
- ✅ どこからでもアクセス可能
- ✅ 複数デバイス・チームで共有可能
- ✅ n8nなどの自動化ツールとの統合が容易

**デメリット:**
- ❌ セキュリティリスク（認証情報をサーバーに配置）
- ❌ サーバー費用が発生
- ❌ HTTPS・ファイアウォール設定が必要

**推奨ケース:**
- チームでの共有利用
- n8nなどでの自動化
- 24時間稼働が必要

## n8n統合パターン

### パターンA: 両方ローカル（最も安全）

```
[ローカルPC]
├── note-mcp-server (localhost:3000)
└── n8n (localhost:5678)
```

**起動手順:**
```bash
# Terminal 1: note-mcp-server起動
cd /path/to/noteMCP
npm run start:http

# Terminal 2: n8n起動
npx n8n
```

**n8nでの設定:**
- MCP Server URL: `http://localhost:3000/mcp`
- Transport: `sse`

**セキュリティレベル:** ⭐⭐⭐⭐⭐（最高）

---

### パターンB: n8nクラウド + MCPローカル（トンネル経由）

```
[ローカルPC]                    [クラウド]
note-mcp-server ←[ngrok/cloudflared]← n8n
(localhost:3000)                      (cloud)
```

#### ngrokを使用する場合

**1. ngrokのインストール:**
```bash
# Homebrewでインストール（macOS）
brew install ngrok

# または公式サイトからダウンロード
# https://ngrok.com/download
```

**2. ngrokアカウント作成とトークン設定:**
```bash
# ngrokにサインアップして認証トークンを取得
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

**3. note-mcp-server起動:**
```bash
npm run start:http
```

**4. ngrokトンネル作成:**
```bash
ngrok http 3000
```

出力例：
```
Forwarding  https://xxxx-xx-xx-xxx-xxx.ngrok-free.app -> http://localhost:3000
```

**5. n8nでの設定:**
- MCP Server URL: `https://xxxx-xx-xx-xxx-xxx.ngrok-free.app/mcp`
- Transport: `sse`

**セキュリティレベル:** ⭐⭐⭐（中）

**注意点:**
- ngrok無料版はURLが起動ごとに変わる
- 有料版（$8/月〜）で固定URLを取得可能
- Basic認証の追加を推奨

#### Cloudflare Tunnelを使用する場合（推奨）

**1. Cloudflare Tunnelのインストール:**
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**2. Cloudflareアカウントでログイン:**
```bash
cloudflared tunnel login
```

**3. トンネル作成:**
```bash
cloudflared tunnel create note-mcp
```

**4. 設定ファイル作成（~/.cloudflared/config.yml）:**
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/YOUR_TUNNEL_ID.json

ingress:
  - hostname: note-mcp.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**5. DNS設定:**
```bash
cloudflared tunnel route dns note-mcp note-mcp.yourdomain.com
```

**6. トンネル起動:**
```bash
cloudflared tunnel run note-mcp
```

**セキュリティレベル:** ⭐⭐⭐⭐（高）

---

### パターンC: 両方リモート（要セキュリティ対策）

```
[VPS/クラウド]
├── note-mcp-server (HTTPS + 認証)
└── n8n (同一VPC内)
```

## リモートデプロイ手順

### 前提条件
- Ubuntu 22.04 LTS（推奨）
- Node.js 18以上
- ドメイン（HTTPS用）
- ファイアウォール設定権限

### 1. サーバーセットアップ

```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# Node.js 18インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Gitインストール
sudo apt install -y git

# プロジェクトクローン
cd /opt
sudo git clone https://github.com/note-mcp-developer/note-mcp-server.git
cd note-mcp-server
sudo npm install
sudo npm run build
```

### 2. 環境変数設定

```bash
# .envファイル作成
sudo nano .env
```

```env
# 認証情報
NOTE_EMAIL=your_email@example.com
NOTE_PASSWORD=your_password
NOTE_USER_ID=your_user_id

# HTTPサーバー設定
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0  # すべてのインターフェースでリッスン

# デバッグ（本番環境ではfalse推奨）
DEBUG=false
```

### 3. systemdサービス作成

```bash
sudo nano /etc/systemd/system/note-mcp-server.service
```

```ini
[Unit]
Description=note MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/note-mcp-server
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/note-mcp-server/build/note-mcp-server-http.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# サービス有効化と起動
sudo systemctl daemon-reload
sudo systemctl enable note-mcp-server
sudo systemctl start note-mcp-server

# ステータス確認
sudo systemctl status note-mcp-server
```

### 4. Nginx + HTTPS設定

#### Nginxインストール
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### Nginx設定
```bash
sudo nano /etc/nginx/sites-available/note-mcp-server
```

```nginx
# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL証明書（Let's Encryptで自動取得）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Basic認証（推奨）
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # プロキシ設定
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE用タイムアウト設定
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
```

#### Basic認証設定
```bash
# htpasswdツールインストール
sudo apt install -y apache2-utils

# ユーザー作成（パスワードを求められます）
sudo htpasswd -c /etc/nginx/.htpasswd mcpuser
```

#### SSL証明書取得
```bash
# Let's Encrypt証明書取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo certbot renew --dry-run
```

#### Nginx有効化
```bash
sudo ln -s /etc/nginx/sites-available/note-mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. ファイアウォール設定

```bash
# UFWインストール・有効化
sudo apt install -y ufw

# SSH許可（重要！）
sudo ufw allow 22/tcp

# HTTP/HTTPS許可
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ファイアウォール有効化
sudo ufw enable

# ステータス確認
sudo ufw status
```

### 6. 動作確認

```bash
# ヘルスチェック
curl https://your-domain.com/health

# Basic認証付き
curl -u mcpuser:password https://your-domain.com/health
```

## セキュリティ対策

### 必須対策

#### 1. HTTPS化
```bash
# Let's Encryptで無料SSL証明書取得
sudo certbot --nginx -d your-domain.com
```

#### 2. Basic認証
```nginx
# Nginx設定に追加
auth_basic "Restricted Access";
auth_basic_user_file /etc/nginx/.htpasswd;
```

#### 3. IP制限（オプション）
```nginx
# 特定IPのみ許可
location / {
    allow 203.0.113.0/24;  # あなたのIPレンジ
    deny all;
    
    proxy_pass http://localhost:3000;
    # ... 他の設定
}
```

#### 4. レート制限
```nginx
# Nginx設定に追加
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;

server {
    # ...
    location / {
        limit_req zone=mcp_limit burst=20 nodelay;
        # ... 他の設定
    }
}
```

#### 5. 環境変数の保護
```bash
# .envファイルのパーミッション設定
sudo chmod 600 /opt/note-mcp-server/.env
sudo chown www-data:www-data /opt/note-mcp-server/.env
```

### 推奨対策

#### 1. fail2ban導入
```bash
# インストール
sudo apt install -y fail2ban

# 設定
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl restart fail2ban
```

#### 2. ログ監視
```bash
# note-mcp-serverログ
sudo journalctl -u note-mcp-server -f

# Nginxアクセスログ
sudo tail -f /var/log/nginx/access.log

# Nginxエラーログ
sudo tail -f /var/log/nginx/error.log
```

#### 3. 自動バックアップ
```bash
# バックアップスクリプト作成
sudo nano /opt/backup-note-mcp.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/note-mcp-$DATE.tar.gz \
    /opt/note-mcp-server/.env \
    /opt/note-mcp-server/build

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "note-mcp-*.tar.gz" -mtime +7 -delete
```

```bash
# 実行権限付与
sudo chmod +x /opt/backup-note-mcp.sh

# cronで毎日実行
sudo crontab -e
# 以下を追加
0 2 * * * /opt/backup-note-mcp.sh
```

## n8nとの統合例

### n8nワークフロー設定

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "https://your-domain.com/mcp",
        "transport": "sse",
        "authentication": "basicAuth",
        "basicAuth": {
          "user": "mcpuser",
          "password": "your_password"
        }
      },
      "name": "note MCP Server",
      "type": "n8n-nodes-mcp.mcpClient",
      "position": [250, 300]
    }
  ]
}
```

### 使用例：定期的な記事検索

```json
{
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "hoursInterval": 6
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "tool": "search-notes",
        "parameters": {
          "query": "プログラミング",
          "size": 10,
          "sort": "new"
        }
      },
      "name": "Search Notes",
      "type": "n8n-nodes-mcp.mcpClient",
      "position": [450, 300]
    },
    {
      "parameters": {
        "channel": "C1234567890",
        "text": "新着記事: {{$json.notes}}"
      },
      "name": "Post to Slack",
      "type": "n8n-nodes-base.slack",
      "position": [650, 300]
    }
  ]
}
```

## トラブルシューティング

### サービスが起動しない

```bash
# ログ確認
sudo journalctl -u note-mcp-server -n 50

# ポート使用状況確認
sudo netstat -tlnp | grep 3000

# 手動起動テスト
cd /opt/note-mcp-server
node build/note-mcp-server-http.js
```

### 接続できない

```bash
# ファイアウォール確認
sudo ufw status

# Nginxステータス確認
sudo systemctl status nginx

# SSL証明書確認
sudo certbot certificates

# ポート疎通確認
curl -v https://your-domain.com/health
```

### パフォーマンス問題

```bash
# リソース使用状況確認
htop

# Node.jsプロセス確認
ps aux | grep node

# メモリ使用量確認
free -h
```

## 推奨VPS/クラウドプロバイダー

### 低コスト（個人利用）
- **Vultr**: $6/月〜（1GB RAM）
- **DigitalOcean**: $6/月〜（1GB RAM）
- **Linode**: $5/月〜（1GB RAM）

### 日本リージョン
- **さくらのVPS**: 880円/月〜（1GB RAM）
- **ConoHa VPS**: 682円/月〜（1GB RAM）
- **AWS Lightsail**: $5/月〜（512MB RAM）

### 推奨スペック
- **最小**: 1GB RAM, 1 vCPU, 25GB SSD
- **推奨**: 2GB RAM, 2 vCPU, 50GB SSD

## まとめ

### セキュリティレベル別推奨構成

| レベル | 構成 | 推奨用途 |
|--------|------|----------|
| ⭐⭐⭐⭐⭐ | 両方ローカル | 個人利用、開発環境 |
| ⭐⭐⭐⭐ | ローカル+トンネル（Cloudflare） | 一時的なリモートアクセス |
| ⭐⭐⭐ | ローカル+トンネル（ngrok） | テスト、デモ |
| ⭐⭐ | リモート（HTTPS+Basic認証） | チーム利用、自動化 |
| ⭐ | リモート（HTTP） | 非推奨 |

### チェックリスト

リモートデプロイ前に確認：
- [ ] HTTPS化完了
- [ ] Basic認証設定
- [ ] ファイアウォール設定
- [ ] .envファイルのパーミッション設定
- [ ] systemdサービス登録
- [ ] ログ監視設定
- [ ] バックアップ設定
- [ ] fail2ban設定（推奨）
- [ ] レート制限設定（推奨）
