import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { noteApiRequest } from "../utils/api-client.js";
import { hasAuth } from "../utils/auth.js";
import fs from "fs";
import path from "path";

/**
 * 画像関連のツールを登録する
 * @param server MCPサーバーインスタンス
 */
export function registerImageTools(server: McpServer): void {
    /**
     * 画像をアップロードするツール
     */
    server.tool(
        "upload-image",
        "note.comに画像をアップロード（記事に使用可能な画像URLを取得）",
        {
            imagePath: z.string().optional().describe("アップロードする画像ファイルのパス"),
            imageUrl: z.string().optional().describe("アップロードする画像のURL（imagePathの代わりに使用可能）"),
            imageBase64: z.string().optional().describe("Base64エンコードされた画像データ（imagePathの代わりに使用可能）"),
        },
        async ({ imagePath, imageUrl, imageBase64 }) => {
            // 認証チェック
            if (!hasAuth()) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "認証が必要です",
                                message: "画像アップロード機能を使用するには、.envファイルに認証情報を設定してください"
                            }, null, 2)
                        }
                    ]
                };
            }

            try {
                let imageBuffer: Buffer;
                let fileName: string;
                let mimeType: string;

                // 最大ファイルサイズ（10MB）
                const MAX_FILE_SIZE = 10 * 1024 * 1024;

                // 画像データの取得方法を判定
                if (imagePath) {
                    // ファイルパスから画像を読み込み
                    if (!fs.existsSync(imagePath)) {
                        throw new Error(`画像ファイルが見つかりません: ${imagePath}`);
                    }

                    // ファイルサイズをチェック
                    const stats = fs.statSync(imagePath);
                    if (stats.size > MAX_FILE_SIZE) {
                        throw new Error(`画像ファイルが大きすぎます: ${(stats.size / 1024 / 1024).toFixed(2)}MB（最大10MB）`);
                    }

                    imageBuffer = fs.readFileSync(imagePath);
                    fileName = path.basename(imagePath);

                    // MIMEタイプを拡張子から判定
                    const ext = path.extname(imagePath).toLowerCase();
                    const mimeTypes: { [key: string]: string } = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                        '.gif': 'image/gif',
                        '.webp': 'image/webp',
                        '.svg': 'image/svg+xml'
                    };
                    mimeType = mimeTypes[ext];

                    if (!mimeType) {
                        throw new Error(`サポートされていない画像形式です: ${ext}（対応形式: jpg, png, gif, webp, svg）`);
                    }

                } else if (imageUrl) {
                    // URLから画像をダウンロード
                    const response = await fetch(imageUrl);
                    if (!response.ok) {
                        throw new Error(`画像のダウンロードに失敗しました: ${response.statusText}`);
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    imageBuffer = Buffer.from(arrayBuffer);

                    // ファイルサイズをチェック
                    if (imageBuffer.length > MAX_FILE_SIZE) {
                        throw new Error(`画像ファイルが大きすぎます: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB（最大10MB）`);
                    }

                    // URLからファイル名を取得
                    const urlPath = new URL(imageUrl).pathname;
                    fileName = path.basename(urlPath) || 'image.jpg';

                    // Content-Typeから判定
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.startsWith('image/')) {
                        mimeType = contentType;
                    } else {
                        throw new Error(`URLから取得したファイルが画像ではありません: ${contentType}`);
                    }

                } else if (imageBase64) {
                    // Base64データから画像を復元
                    imageBuffer = Buffer.from(imageBase64, 'base64');

                    // ファイルサイズをチェック
                    if (imageBuffer.length > MAX_FILE_SIZE) {
                        throw new Error(`画像ファイルが大きすぎます: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB（最大10MB）`);
                    }

                    fileName = 'image.jpg';
                    mimeType = 'image/jpeg';

                } else {
                    throw new Error('imagePath、imageUrl、またはimageBase64のいずれかを指定してください');
                }

                // FormDataの構築（multipart/form-data）
                const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
                const formDataParts: Buffer[] = [];

                // 画像ファイルパート
                formDataParts.push(Buffer.from(
                    `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="image"; filename="${fileName}"\r\n` +
                    `Content-Type: ${mimeType}\r\n\r\n`
                ));
                formDataParts.push(imageBuffer);
                formDataParts.push(Buffer.from('\r\n'));

                // 終了境界
                formDataParts.push(Buffer.from(`--${boundary}--\r\n`));

                // FormDataを結合
                const formData = Buffer.concat(formDataParts);

                // note APIにアップロード
                const data = await noteApiRequest(
                    '/api/v1/upload_image',
                    'POST',
                    formData,
                    true,
                    {
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                        'Content-Length': formData.length.toString()
                    }
                );

                // レスポンスから画像URLを取得（複数のパターンに対応）
                let uploadedImageUrl: string | undefined;
                if (data.data && typeof data.data === 'object') {
                    uploadedImageUrl = data.data.url || data.data.image_url || data.data.imageUrl;
                }
                if (!uploadedImageUrl) {
                    uploadedImageUrl = data.url || data.image_url || data.imageUrl;
                }

                if (!uploadedImageUrl) {
                    console.error("画像URLがレスポンスに含まれていません:", JSON.stringify(data));
                    throw new Error("画像のアップロードは成功しましたが、画像URLを取得できませんでした");
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: "画像のアップロードに成功しました",
                                imageUrl: uploadedImageUrl,
                                fileName: fileName,
                                fileSize: imageBuffer.length,
                                fileSizeMB: (imageBuffer.length / 1024 / 1024).toFixed(2),
                                mimeType: mimeType,
                                // デバッグ用に元のレスポンスも含める
                                _debug: {
                                    apiResponse: data
                                }
                            }, null, 2)
                        }
                    ]
                };

            } catch (error: any) {
                console.error("画像アップロードエラー:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "画像アップロードに失敗しました",
                                message: error.message,
                                details: error.toString()
                            }, null, 2)
                        }
                    ]
                };
            }
        }
    );

    /**
     * 複数の画像を一括アップロードするツール
     */
    server.tool(
        "upload-images-batch",
        "note.comに複数の画像を一括アップロード",
        {
            imagePaths: z.array(z.string()).describe("アップロードする画像ファイルのパスの配列"),
        },
        async ({ imagePaths }) => {
            // 認証チェック
            if (!hasAuth()) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "認証が必要です",
                                message: "画像アップロード機能を使用するには、.envファイルに認証情報を設定してください"
                            }, null, 2)
                        }
                    ]
                };
            }

            const results = [];
            const errors = [];
            const MAX_FILE_SIZE = 10 * 1024 * 1024;

            for (const imagePath of imagePaths) {
                try {
                    if (!fs.existsSync(imagePath)) {
                        errors.push({
                            path: imagePath,
                            error: "ファイルが見つかりません"
                        });
                        continue;
                    }

                    // ファイルサイズをチェック
                    const stats = fs.statSync(imagePath);
                    if (stats.size > MAX_FILE_SIZE) {
                        errors.push({
                            path: imagePath,
                            error: `ファイルが大きすぎます: ${(stats.size / 1024 / 1024).toFixed(2)}MB（最大10MB）`
                        });
                        continue;
                    }

                    const imageBuffer = fs.readFileSync(imagePath);
                    const fileName = path.basename(imagePath);

                    const ext = path.extname(imagePath).toLowerCase();
                    const mimeTypes: { [key: string]: string } = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                        '.gif': 'image/gif',
                        '.webp': 'image/webp',
                        '.svg': 'image/svg+xml'
                    };
                    const mimeType = mimeTypes[ext];

                    if (!mimeType) {
                        errors.push({
                            path: imagePath,
                            error: `サポートされていない画像形式: ${ext}`
                        });
                        continue;
                    }

                    // FormDataの構築
                    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
                    const formDataParts: Buffer[] = [];

                    formDataParts.push(Buffer.from(
                        `--${boundary}\r\n` +
                        `Content-Disposition: form-data; name="image"; filename="${fileName}"\r\n` +
                        `Content-Type: ${mimeType}\r\n\r\n`
                    ));
                    formDataParts.push(imageBuffer);
                    formDataParts.push(Buffer.from('\r\n'));
                    formDataParts.push(Buffer.from(`--${boundary}--\r\n`));

                    const formData = Buffer.concat(formDataParts);

                    // note APIにアップロード
                    const data = await noteApiRequest(
                        '/api/v1/upload_image',
                        'POST',
                        formData,
                        true,
                        {
                            'Content-Type': `multipart/form-data; boundary=${boundary}`,
                            'Content-Length': formData.length.toString()
                        }
                    );

                    // レスポンスから画像URLを取得
                    let uploadedImageUrl: string | undefined;
                    if (data.data && typeof data.data === 'object') {
                        uploadedImageUrl = data.data.url || data.data.image_url || data.data.imageUrl;
                    }
                    if (!uploadedImageUrl) {
                        uploadedImageUrl = data.url || data.image_url || data.imageUrl;
                    }

                    if (!uploadedImageUrl) {
                        throw new Error("画像URLを取得できませんでした");
                    }

                    results.push({
                        path: imagePath,
                        fileName: fileName,
                        imageUrl: uploadedImageUrl,
                        fileSize: imageBuffer.length,
                        fileSizeMB: (imageBuffer.length / 1024 / 1024).toFixed(2),
                        mimeType: mimeType,
                        success: true
                    });

                } catch (error: any) {
                    errors.push({
                        path: imagePath,
                        error: error.message
                    });
                }
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: errors.length === 0,
                            totalImages: imagePaths.length,
                            successCount: results.length,
                            errorCount: errors.length,
                            results: results,
                            errors: errors
                        }, null, 2)
                    }
                ]
            };
        }
    );
}
