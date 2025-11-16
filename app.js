// Mermaid初期化
mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default'
});

// DOM要素の取得
const mermaidCodeTextarea = document.getElementById('mermaid-code');
const renderBtn = document.getElementById('render-btn');
const downloadPngBtn = document.getElementById('download-png-btn');
const downloadHtmlBtn = document.getElementById('download-html-btn');
const diagramContainer = document.getElementById('diagram-container');
const statusMessage = document.getElementById('status-message');
const htmlDownloadTitle = document.getElementById('html-download-title');

// ダイアログ要素
const participantDialog = document.getElementById('participant-dialog');
const messageDialog = document.getElementById('message-dialog');
const participantIdInput = document.getElementById('participant-id');
const participantNameInput = document.getElementById('participant-name');
const participantAddBtn = document.getElementById('participant-add-btn');
const participantCancelBtn = document.getElementById('participant-cancel-btn');
const messageFromInput = document.getElementById('message-from');
const messageToInput = document.getElementById('message-to');
const messageTypeSelect = document.getElementById('message-type');
const messageTextInput = document.getElementById('message-text');
const messageAddBtn = document.getElementById('message-add-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');

// パレット要素
const paletteItems = document.querySelectorAll('.palette-item');
const editorPanel = document.querySelector('.editor-panel');
const dragDropArea = document.querySelector('.drag-drop-area');

// 状態管理
let lastSuccessfulSvg = null;
let currentMermaidCode = '';

// ステータスメッセージ更新
function updateStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

// Mermaid描画処理
async function renderDiagram() {
    const code = mermaidCodeTextarea.value.trim();
    currentMermaidCode = code;

    if (!code) {
        updateStatus('Mermaidコードを入力してください', 'error');
        return;
    }

    try {
        // 既存のSVGをクリア
        diagramContainer.innerHTML = '';

        // MermaidでSVGを生成
        const { svg } = await mermaid.render('diagram-svg', code);
        
        // SVGをDOMに挿入
        diagramContainer.innerHTML = svg;
        lastSuccessfulSvg = svg;

        // ダウンロードボタンを有効化
        downloadPngBtn.disabled = false;

        updateStatus('描画に成功しました', 'success');
    } catch (error) {
        console.error('Mermaid描画エラー:', error);
        updateStatus(`描画エラー: ${error.message}`, 'error');
        
        // 最後に成功したSVGを再表示
        if (lastSuccessfulSvg) {
            diagramContainer.innerHTML = lastSuccessfulSvg;
        }
    }
}

// SVGをPNGに変換してダウンロード
function downloadDiagramAsPng() {
    const svgElement = diagramContainer.querySelector('svg');
    
    if (!svgElement) {
        updateStatus('描画された図がありません', 'error');
        return;
    }

    try {
        // SVGをクローン
        const svgClone = svgElement.cloneNode(true);
        
        // SVGを文字列化
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        // Imageオブジェクトを作成してCanvasに描画
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            
            // 背景を白で塗りつぶし
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // SVGを描画
            ctx.drawImage(img, 0, 0);
            
            // PNGデータURLを生成
            const pngDataUrl = canvas.toDataURL('image/png');
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.download = 'diagram.png';
            link.href = pngDataUrl;
            link.click();
            
            URL.revokeObjectURL(url);
            updateStatus('PNGファイルをダウンロードしました', 'success');
        };
        
        img.onerror = function() {
            updateStatus('PNG変換に失敗しました', 'error');
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    } catch (error) {
        console.error('PNG変換エラー:', error);
        updateStatus(`PNG変換エラー: ${error.message}`, 'error');
    }
}

// HTML出力を生成してダウンロード
function buildHtmlExportDocument() {
    const title = htmlDownloadTitle.value.trim() || 'シーケンス図';
    const mermaidCode = currentMermaidCode || mermaidCodeTextarea.value.trim();
    
    if (!mermaidCode) {
        updateStatus('Mermaidコードがありません', 'error');
        return;
    }

    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f5f5f5;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 2rem;
        }
        #diagram {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    <div id="diagram"></div>
    <script>
        mermaid.initialize({
            startOnLoad: true,
            securityLevel: 'strict',
            theme: 'default'
        });
        document.getElementById('diagram').innerHTML = \`<div class="mermaid">${escapeHtml(mermaidCode)}</div>\`;
    </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${title.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    updateStatus('HTMLファイルをダウンロードしました', 'success');
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ドラッグ＆ドロップ設定
function setupDragAndDrop() {
    let dragCounter = 0;

    editorPanel.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dragDropArea.classList.add('drag-active');
    });

    editorPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    editorPanel.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dragDropArea.classList.remove('drag-active');
        }
    });

    editorPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dragDropArea.classList.remove('drag-active');

        const files = Array.from(e.dataTransfer.files);
        const textFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['mmd', 'mermaid', 'txt', 'md'].includes(ext) || file.type.startsWith('text/');
        });

        if (textFiles.length === 0) {
            updateStatus('テキストファイル（.mmd, .mermaid, .txt, .md）をドロップしてください', 'error');
            return;
        }

        const file = textFiles[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            mermaidCodeTextarea.value = content;
            updateStatus(`ファイル「${file.name}」を読み込みました`, 'success');
            renderDiagram();
        };
        
        reader.onerror = function() {
            updateStatus('ファイルの読み込みに失敗しました', 'error');
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

// 参加者追加処理
function addParticipant(id, name) {
    const code = mermaidCodeTextarea.value.trim();
    const idValue = id.trim() || 'A';
    const nameValue = name.trim() || idValue;
    
    let newCode = code;
    
    // sequenceDiagramがなければ追加
    if (!code.includes('sequenceDiagram')) {
        newCode = 'sequenceDiagram\n';
    }
    
    // 参加者行を追加
    const participantLine = `    participant ${idValue} as ${nameValue}`;
    
    if (newCode === 'sequenceDiagram\n' || newCode === 'sequenceDiagram') {
        newCode += participantLine;
    } else {
        // 最後のメッセージ行の後に追加
        const lines = newCode.split('\n');
        let insertIndex = lines.length;
        
        // participant行の後に挿入
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('participant')) {
                insertIndex = i + 1;
                break;
            }
        }
        
        lines.splice(insertIndex, 0, participantLine);
        newCode = lines.join('\n');
    }
    
    mermaidCodeTextarea.value = newCode;
    updateStatus(`参加者「${nameValue}」を追加しました`, 'success');
    renderDiagram();
}

// メッセージ追加処理
function addMessage(from, to, type, text) {
    const code = mermaidCodeTextarea.value.trim();
    
    let newCode = code;
    
    // sequenceDiagramがなければ追加
    if (!code.includes('sequenceDiagram')) {
        newCode = 'sequenceDiagram\n';
    }
    
    // メッセージ行を追加
    const messageLine = `    ${from}${type}${to}: ${text}`;
    
    if (newCode === 'sequenceDiagram\n' || newCode === 'sequenceDiagram') {
        newCode += messageLine;
    } else {
        newCode += '\n' + messageLine;
    }
    
    mermaidCodeTextarea.value = newCode;
    updateStatus(`メッセージ「${text}」を追加しました`, 'success');
    renderDiagram();
}

// ダイアログ制御
function showParticipantDialog() {
    participantDialog.style.display = 'flex';
    participantIdInput.value = '';
    participantNameInput.value = '';
    participantIdInput.focus();
}

function hideParticipantDialog() {
    participantDialog.style.display = 'none';
}

function showMessageDialog() {
    messageDialog.style.display = 'flex';
    messageFromInput.value = '';
    messageToInput.value = '';
    messageTextInput.value = '';
    messageFromInput.focus();
}

function hideMessageDialog() {
    messageDialog.style.display = 'none';
}

// イベントリスナー設定
renderBtn.addEventListener('click', renderDiagram);
downloadPngBtn.addEventListener('click', downloadDiagramAsPng);
downloadHtmlBtn.addEventListener('click', buildHtmlExportDocument);

// ショートカットキー（Ctrl+Enter / ⌘+Enter）
mermaidCodeTextarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        renderDiagram();
    }
});

// パレットアイテムのクリック処理
paletteItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const type = item.dataset.type;
        if (type === 'participant') {
            showParticipantDialog();
        } else if (type === 'message') {
            showMessageDialog();
        }
    });
});

// パレットアイテムのドラッグ処理
paletteItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.type);
    });
});

// プレビューパネルへのドロップ処理
diagramContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
});

diagramContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (type === 'participant') {
        showParticipantDialog();
    } else if (type === 'message') {
        showMessageDialog();
    }
});

// ダイアログボタンのイベント
participantAddBtn.addEventListener('click', () => {
    const id = participantIdInput.value.trim();
    const name = participantNameInput.value.trim();
    addParticipant(id, name);
    hideParticipantDialog();
});

participantCancelBtn.addEventListener('click', hideParticipantDialog);

messageAddBtn.addEventListener('click', () => {
    const from = messageFromInput.value.trim();
    const to = messageToInput.value.trim();
    const type = messageTypeSelect.value;
    const text = messageTextInput.value.trim();
    
    if (!from || !to || !text) {
        updateStatus('すべての項目を入力してください', 'error');
        return;
    }
    
    addMessage(from, to, type, text);
    hideMessageDialog();
});

messageCancelBtn.addEventListener('click', hideMessageDialog);

// ダイアログ外クリックで閉じる
participantDialog.addEventListener('click', (e) => {
    if (e.target === participantDialog) {
        hideParticipantDialog();
    }
});

messageDialog.addEventListener('click', (e) => {
    if (e.target === messageDialog) {
        hideMessageDialog();
    }
});

// Enterキーでダイアログの追加ボタンを実行
participantIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        participantAddBtn.click();
    }
});

participantNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        participantAddBtn.click();
    }
});

messageTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        messageAddBtn.click();
    }
});

// 初期化
setupDragAndDrop();

// エディタトグル機能
const toggleEditorBtn = document.getElementById('toggle-editor-btn');
const mainElement = document.querySelector('main');

toggleEditorBtn.addEventListener('click', () => {
    editorPanel.classList.toggle('hidden');
    mainElement.classList.toggle('editor-hidden');
    
    // ボタンのタイトルを変更
    if (editorPanel.classList.contains('hidden')) {
        toggleEditorBtn.title = 'エディタを表示';
    } else {
        toggleEditorBtn.title = 'エディタを非表示';
    }
    
    // プレビューパネルのサイズ調整をトリガー
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300);
});

// 初期描画（サンプルコードがあれば）
const sampleCode = `sequenceDiagram
    participant A as 参加者A
    participant B as 参加者B
    A->>B: Hello
    B-->>A: Hi`;
mermaidCodeTextarea.value = sampleCode;
renderDiagram();


