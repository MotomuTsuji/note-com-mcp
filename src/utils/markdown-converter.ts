/**
 * シンプルなMarkdownからHTMLへの変換ユーティリティ
 * note.comのHTML形式に最適化（UUID属性付き）
 */

/**
 * UUID v4を生成する
 * @returns UUID文字列
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * HTML要素にUUID属性を追加する
 * @param html HTML文字列
 * @returns UUID属性付きのHTML
 */
function addUUIDAttributes(html: string): string {
    // 各HTML要素にUUID属性を追加
    return html.replace(/<(\w+)([^>]*)>/g, (match, tag, attrs) => {
        // hrタグと既に属性がある要素をスキップ（brタグはUUIDを付与する）
        if (tag === 'hr' || tag.includes('/')) {
            return match;
        }

        const uuid = generateUUID();
        return `<${tag}${attrs} name="${uuid}" id="${uuid}">`;
    });
}

/**
 * MarkdownをHTMLに変換する
 * @param markdown Markdown形式のテキスト
 * @returns HTML形式のテキスト
 */
export function convertMarkdownToHtml(markdown: string): string {
    if (!markdown) return "";

    let html = markdown;

    // 改行を正規化
    html = html.replace(/\r\n/g, '\n');
    html = html.replace(/\r/g, '\n');

    // 見出しの変換 (#, ##, ### など)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 太字の変換 (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 斜体の変換 (*text*)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // コードブロックの変換 (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // インラインコードの変換 (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // リンクの変換 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 番号付きリストの変換
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

    // 箇条書きリストの変換
    html = html.replace(/^[\-\*] (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // 引用の変換 (> text)
    html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

    // 水平線の変換 (---)
    html = html.replace(/^---$/gim, '<hr>');

    // 段落の変換（改行を段落区切りとして処理）
    // 単一改行も段落区切りとして扱う（note.comのHTML構造に合わせる）
    html = html.replace(/\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // 連続する空の段落タグを削除
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ol>)/g, '$1');
    html = html.replace(/(<\/ol>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');

    // 連続する改行を単一の改行に
    html = html.replace(/\n{3,}/g, '\n\n');

    return html.trim();
}

/**
 * HTMLをnote.com用にサニタイズする
 * @param html HTML文字列
 * @returns サニタイズされたHTML
 */
export function sanitizeHtmlForNote(html: string): string {
    if (!html) return "";

    // 危険なタグを削除
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gis');
        html = html.replace(regex, '');
    });

    // 危険な属性を削除
    const dangerousAttributes = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'];
    dangerousAttributes.forEach(attr => {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gis');
        html = html.replace(regex, '');
    });

    return html;
}

/**
 * Markdownをnote.com用のHTMLに変換する
 * @param markdown Markdown形式のテキスト
 * @returns note.com用のHTML（UUID属性付き）
 */
export function convertMarkdownToNoteHtml(markdown: string): string {
    const html = convertMarkdownToHtml(markdown);
    const htmlWithUUID = addUUIDAttributes(html);
    return sanitizeHtmlForNote(htmlWithUUID);
}
