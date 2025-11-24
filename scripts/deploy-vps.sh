#!/bin/bash

# VPSデプロイスクリプト
# 使用方法: ./scripts/deploy-vps.sh [VPS_IP] [SSH_USER]

set -e

VPS_IP=${1:-"your-vps-ip"}
SSH_USER=${2:-"root"}
DOMAIN="note-mcp.composition2940.com"

echo "🚀 VPSへのデプロイを開始します..."
echo "VPS IP: $VPS_IP"
echo "ドメイン: $DOMAIN"

# 1. ビルド
echo "📦 ビルド中..."
npm run build

# 2. SSH接続テスト
echo "🔍 SSH接続を確認..."
SSH_CMD="ssh -o ConnectTimeout=5 -p 2222 -i ~/.ssh/xserver_vps_rsa $SSH_USER@$VPS_IP"
$SSH_CMD "echo 'SSH接続成功'"

# 3. ファイル転送
echo "📁 ファイルを転送中..."
rsync -avz -e "ssh -p 2222 -i ~/.ssh/xserver_vps_rsa" --exclude='.git' --exclude='node_modules' --exclude='logs' --exclude='.env' \
  ./ $SSH_USER@$VPS_IP:/opt/note-mcp-server/

# 4. VPSでセットアップ
echo "⚙️ VPSでセットアップ中..."
ssh -p 2222 -i ~/.ssh/xserver_vps_rsa $SSH_USER@$VPS_IP << 'EOF'
cd /opt/note-mcp-server

# Node.jsのインストール（必要な場合）
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PM2のインストール
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 依存関係のインストール
npm install

# .envファイルの設定（手動で設定する必要あり）
if [ ! -f .env ]; then
    cp .env.vps .env
    echo "⚠️  .envファイルを編集して認証情報を設定してください"
fi

# PM2で起動
pm2 delete note-mcp-server 2>/dev/null || true
pm2 start build/note-mcp-server-http.js --name "note-mcp-server"
pm2 save
pm2 startup

echo "✅ VPSでのセットアップ完了"
echo "🌐 http://$DOMAIN/mcp でアクセスできます"
EOF

echo "🎉 デプロイ完了！"
echo "📋 次のステップ:"
echo "1. VPSにSSHで接続: ssh $SSH_USER@$VPS_IP"
echo "2. .envファイルを編集: cd /opt/note-mcp-server && nano .env"
echo "3. PM2再起動: pm2 restart note-mcp-server"
echo "4. ブラウザで確認: http://$DOMAIN/health"
