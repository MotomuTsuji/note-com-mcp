#!/bin/bash

# VPS初期セットアップスクリプト
# 使用方法: curl -sSL https://raw.githubusercontent.com/shimayuz/note-com-mcp/main/scripts/setup-vps.sh | bash

set -e

echo "🚀 VPSの初期セットアップを開始します..."

# システム更新
echo "📦 システムを更新..."
apt update && apt upgrade -y

# 必要なパッケージをインストール
echo "📦 必要なパッケージをインストール..."
apt install -y curl wget git nginx ufw rsync

# Node.js 18.xをインストール
echo "📦 Node.jsをインストール..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2をインストール
echo "📦 PM2をインストール..."
npm install -g pm2

# ユーザーを作成（オプション）
if ! id "nodeapp" &>/dev/null; then
    echo "👤 nodeappユーザーを作成..."
    useradd -m -s /bin/bash nodeapp
fi

# アプリケーションディレクトリを作成
echo "📁 アプリケーションディレクトリを作成..."
mkdir -p /opt/note-mcp-server
chown nodeapp:nodeapp /opt/note-mcp-server

# Nginx設定
echo "⚙️ Nginxを設定..."
# ここで手動でNginx設定をコピーする必要あり
echo "⚠️  手動でNginx設定をコピーしてください:"
echo "   sudo cp /opt/note-mcp-server/config/nginx-note-mcp.conf /etc/nginx/sites-available/"
echo "   sudo ln -s /etc/nginx/sites-available/nginx-note-mcp.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"

# ファイアウォール設定
echo "🔥 ファイアウォールを設定..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

echo "✅ VPSの初期セットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "1. nodeappユーザーでログイン: su - nodeapp"
echo "2. リポジトリをクローン: git clone https://github.com/shimayuz/note-com-mcp.git"
echo "3. セットアップ: cd note-com-mcp && npm install && npm run build"
echo "4. .envを設定: cp .env.vps .env && nano .env"
echo "5. PM2で起動: pm2 start build/note-mcp-server-http.js --name note-mcp-server"
