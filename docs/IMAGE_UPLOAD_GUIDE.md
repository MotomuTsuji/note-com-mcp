# 画像アップロード機能ガイド

note.com MCP Serverの画像アップロード機能の使い方を説明します。

## 概要

画像アップロード機能を使用すると、note.comに画像をアップロードし、記事で使用可能な画像URLを取得できます。

**エンドポイント**: `POST /api/v1/upload_image`

## 利用可能なツール

### 1. upload-image

単一の画像をアップロードします。

**パラメータ**:
- `imagePath` (string, optional): ローカルファイルパス
- `imageUrl` (string, optional): 画像のURL
- `imageBase64` (string, optional): Base64エンコードされた画像データ

**注意**: `imagePath`、`imageUrl`、`imageBase64`のいずれか1つを指定してください。

**対応画像形式**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### 2. upload-images-batch

複数の画像を一括アップロードします。

**パラメータ**:
- `imagePaths` (array of strings): ローカルファイルパスの配列

## 使用例

### 例1: ローカルファイルからアップロード

```typescript
// Claude DesktopやCursorで使用
"画像ファイル /Users/username/Pictures/sample.jpg をnoteにアップロードして"
```

**レスポンス例**:
```json
{
  "success": true,
  "message": "画像のアップロードに成功しました",
  "imageUrl": "https://assets.st-note.com/img/1234567890abcdef.jpg",
  "fileName": "sample.jpg",
  "fileSize": 245678,
  "mimeType": "image/jpeg"
}
```

### 例2: URLから画像をアップロード

```typescript
"この画像URL https://example.com/image.png をnoteにアップロードして"
```

**レスポンス例**:
```json
{
  "success": true,
  "message": "画像のアップロードに成功しました",
  "imageUrl": "https://assets.st-note.com/img/abcdef1234567890.png",
  "fileName": "image.png",
  "fileSize": 123456,
  "mimeType": "image/png"
}
```

### 例3: 複数の画像を一括アップロード

```typescript
"これらの画像をnoteにアップロードして: /path/to/image1.jpg, /path/to/image2.png, /path/to/image3.gif"
```

**レスポンス例**:
```json
{
  "success": true,
  "totalImages": 3,
  "successCount": 3,
  "errorCount": 0,
  "results": [
    {
      "path": "/path/to/image1.jpg",
      "fileName": "image1.jpg",
      "imageUrl": "https://assets.st-note.com/img/xxx1.jpg",
      "fileSize": 245678,
      "mimeType": "image/jpeg",
      "success": true
    },
    {
      "path": "/path/to/image2.png",
      "fileName": "image2.png",
      "imageUrl": "https://assets.st-note.com/img/xxx2.png",
      "fileSize": 123456,
      "mimeType": "image/png",
      "success": true
    },
    {
      "path": "/path/to/image3.gif",
      "fileName": "image3.gif",
      "imageUrl": "https://assets.st-note.com/img/xxx3.gif",
      "fileSize": 567890,
      "mimeType": "image/gif",
      "success": true
    }
  ],
  "errors": []
}
```

### 例4: Base64データからアップロード

```typescript
// Base64エンコードされた画像データをアップロード
{
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

## 記事での使用方法

アップロードした画像URLを使用して、記事に画像を挿入できます。

### Markdown形式での挿入

```markdown
![画像の説明](https://assets.st-note.com/img/1234567890abcdef.jpg)
```

### HTML形式での挿入

```html
<img src="https://assets.st-note.com/img/1234567890abcdef.jpg" alt="画像の説明">
```

## ワークフロー例

### 画像付き記事を作成する完全なワークフロー

1. **画像をアップロード**
```
"画像 /path/to/hero-image.jpg をnoteにアップロードして"
```

2. **取得した画像URLをメモ**
```
imageUrl: "https://assets.st-note.com/img/xxx.jpg"
```

3. **画像URLを含む記事を作成**
```
"タイトル『新しい記事』、本文に以下の内容で下書き記事を作成して:

# はじめに

![ヒーロー画像](https://assets.st-note.com/img/xxx.jpg)

記事の本文がここに入ります...
"
```

## 認証について

画像アップロード機能を使用するには、note.comの認証情報が必要です。

`.env`ファイルに以下を設定してください:

```env
NOTE_EMAIL=your_email@example.com
NOTE_PASSWORD=your_password
NOTE_USER_ID=your_note_user_id
```

または

```env
NOTE_SESSION_V5=your_session_cookie
NOTE_XSRF_TOKEN=your_xsrf_token
NOTE_USER_ID=your_note_user_id
```

## エラーハンドリング

### 認証エラー

```json
{
  "error": "認証が必要です",
  "message": "画像アップロード機能を使用するには、.envファイルに認証情報を設定してください"
}
```

**解決方法**: `.env`ファイルに正しい認証情報を設定してください。

### ファイルが見つからない

```json
{
  "error": "画像アップロードに失敗しました",
  "message": "画像ファイルが見つかりません: /path/to/image.jpg"
}
```

**解決方法**: ファイルパスが正しいか確認してください。

### 画像形式エラー

```json
{
  "error": "画像アップロードに失敗しました",
  "message": "サポートされていない画像形式です"
}
```

**解決方法**: JPEG、PNG、GIF、WebP、SVGのいずれかの形式を使用してください。

## 制限事項

- **ファイルサイズ**: note.comのAPI制限に従います（通常は10MB程度）
- **対応形式**: JPEG、PNG、GIF、WebP、SVG
- **認証**: 画像アップロードには認証が必須です
- **レート制限**: note.comのAPI制限に従います

## トラブルシューティング

### アップロードが失敗する

1. **認証情報を確認**
   - `.env`ファイルに正しい認証情報が設定されているか確認
   - セッションCookieが期限切れでないか確認

2. **ファイルサイズを確認**
   - 画像ファイルが大きすぎないか確認（10MB以下を推奨）

3. **画像形式を確認**
   - 対応形式（JPEG、PNG、GIF、WebP、SVG）であることを確認

4. **ネットワーク接続を確認**
   - インターネット接続が正常か確認
   - note.comにアクセスできるか確認

### デバッグモード

デバッグ情報を表示するには、`.env`ファイルに以下を追加:

```env
DEBUG=true
```

これにより、詳細なログが出力され、問題の特定が容易になります。

## サポート

問題が発生した場合は、GitHubのIssueで報告してください:
https://github.com/shimayuz/note-com-mcp/issues
