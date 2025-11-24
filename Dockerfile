# Playwright公式イメージを使用（ブラウザと依存関係が含まれています）
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 環境変数を設定
ENV NODE_ENV=production
ENV MCP_HTTP_PORT=3001
# Playwright用の設定（ヘッドレスモード）
ENV PLAYWRIGHT_HEADLESS=true

# ポートを公開
EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# サーバーを起動
CMD ["npm", "run", "start:http"]
