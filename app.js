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

// 編集パネル要素
const editPanel = document.getElementById('edit-panel');
const editPanelTitle = document.getElementById('edit-panel-title');
const editPanelClose = document.getElementById('edit-panel-close');
const editParticipantForm = document.getElementById('edit-participant-form');
const editMessageForm = document.getElementById('edit-message-form');
const editParticipantId = document.getElementById('edit-participant-id');
const editParticipantName = document.getElementById('edit-participant-name');
const editParticipantUpdateBtn = document.getElementById('edit-participant-update-btn');
const editParticipantDeleteBtn = document.getElementById('edit-participant-delete-btn');
const editMessageFrom = document.getElementById('edit-message-from');
const editMessageTo = document.getElementById('edit-message-to');
const editMessageType = document.getElementById('edit-message-type');
const editMessageText = document.getElementById('edit-message-text');
const editMessageUpdateBtn = document.getElementById('edit-message-update-btn');
const editMessageDeleteBtn = document.getElementById('edit-message-delete-btn');

// ダイアログ要素
const participantDialog = document.getElementById('participant-dialog');
const messageDialog = document.getElementById('message-dialog');
const participantIdInput = document.getElementById('participant-id');
const participantNameInput = document.getElementById('participant-name');
const participantPositionSelect = document.getElementById('participant-position');
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
let parsedElements = { participants: [], messages: [] };
let currentEditingElement = null;

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

        // パース結果を更新
        updateParsedElements();

        // SVG要素にクリックイベントを追加
        attachClickEventsToSvg();

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

// SVG要素にクリックイベントを追加
function attachClickEventsToSvg() {
    const svg = diagramContainer.querySelector('svg');
    if (!svg) {
        console.log('SVGが見つかりません');
        return;
    }

    console.log('=== SVG構造調査 ===');
    console.log('SVG要素:', svg);
    console.log('パース済み参加者:', parsedElements.participants);
    console.log('パース済みメッセージ:', parsedElements.messages);

    // SVG内のすべてのg要素を取得してログ出力
    const allGroups = svg.querySelectorAll('g');
    console.log('SVG内の全g要素数:', allGroups.length);
    allGroups.forEach((g, idx) => {
        if (idx < 10) { // 最初の10個だけログ出力
            console.log(`g[${idx}] class="${g.getAttribute('class')}" id="${g.getAttribute('id')}"`);
        }
    });

    // 参加者ボックスを見つけてクリックイベントを追加
    // 複数のセレクタを順番に試す
    let actorGroups = [];

    // パターン1: g.actor
    actorGroups = svg.querySelectorAll('g.actor');
    console.log('g.actor で見つかった要素数:', actorGroups.length);

    // パターン2: rect.actor の親要素
    if (actorGroups.length === 0) {
        const actorRects = svg.querySelectorAll('rect.actor');
        console.log('rect.actor で見つかった要素数:', actorRects.length);
        actorGroups = Array.from(actorRects).map(rect => rect.parentElement);
        console.log('rect.actorの親要素数:', actorGroups.length);
    }

    // パターン3: text要素のtspan内容から参加者名を検索
    if (actorGroups.length === 0) {
        const allTexts = svg.querySelectorAll('text');
        console.log('text要素数:', allTexts.length);
        const participantTexts = [];
        allTexts.forEach(text => {
            const content = text.textContent.trim();
            console.log('text内容:', content);
            // 参加者名と一致するテキストを探す
            const matchingParticipant = parsedElements.participants.find(p =>
                content === p.name || content === p.id
            );
            if (matchingParticipant) {
                console.log('参加者テキスト発見:', content, matchingParticipant);
                // text要素の祖父母要素（通常はグループ）を取得
                let parent = text.parentElement;
                while (parent && parent.tagName.toLowerCase() !== 'g') {
                    parent = parent.parentElement;
                }
                if (parent && parent.tagName.toLowerCase() === 'g') {
                    participantTexts.push(parent);
                }
            }
        });
        if (participantTexts.length > 0) {
            actorGroups = participantTexts;
            console.log('テキストから見つかった参加者グループ数:', actorGroups.length);
        }
    }

    // クリックイベントを追加
    if (actorGroups.length > 0) {
        actorGroups.forEach((group, index) => {
            console.log(`参加者グループ ${index} にイベント追加:`, group);
            if (index < parsedElements.participants.length) {
                const participant = parsedElements.participants[index];
                group.classList.add('clickable-element');
                group.style.cursor = 'pointer';

                group.addEventListener('click', (e) => {
                    console.log('参加者がクリックされました:', participant);
                    e.stopPropagation();
                    showEditParticipantPanel(participant);
                });
            }
        });
    } else {
        console.warn('参加者グループが見つかりませんでした');
    }

    // メッセージ（矢印とテキスト）を見つけてクリックイベントを追加
    let messageGroups = [];

    // パターン1: テキスト内容からメッセージを検索（最も確実）
    const allTexts = svg.querySelectorAll('text');
    const foundMessageGroups = [];
    const usedMessages = new Set();

    console.log('=== メッセージ検索開始 ===');
    console.log('text要素総数:', allTexts.length);

    allTexts.forEach((text, textIndex) => {
        const content = text.textContent.trim();

        // 参加者名は除外
        const isParticipant = parsedElements.participants.some(p =>
            content === p.name || content === p.id
        );

        if (!isParticipant && content) {
            // メッセージテキストと一致するか確認
            parsedElements.messages.forEach((msg, msgIndex) => {
                if (content === msg.text && !usedMessages.has(msgIndex)) {
                    console.log(`メッセージ発見 [${msgIndex}]: "${content}"`, msg);
                    usedMessages.add(msgIndex);

                    // text要素から親グループを探す
                    let messageGroup = null;
                    let currentParent = text.parentElement;

                    // 方法1: 親階層を遡ってline/path要素を含むグループを探す
                    for (let i = 0; i < 10 && currentParent && currentParent !== svg; i++) {
                        if (currentParent.tagName.toLowerCase() === 'g') {
                            const hasLine = currentParent.querySelector('line');
                            const hasPath = currentParent.querySelector('path[d*="M"]');

                            if (hasLine || hasPath) {
                                messageGroup = currentParent;
                                console.log(`  → 方法1: グループ発見（階層${i}）:`, messageGroup);
                                break;
                            }
                        }
                        currentParent = currentParent.parentElement;
                    }

                    // 方法2: 見つからない場合、text要素に最も近いg要素を使用
                    if (!messageGroup) {
                        currentParent = text.parentElement;
                        while (currentParent && currentParent !== svg) {
                            if (currentParent.tagName.toLowerCase() === 'g') {
                                messageGroup = currentParent;
                                console.log(`  → 方法2: 最も近いグループを使用:`, messageGroup);
                                break;
                            }
                            currentParent = currentParent.parentElement;
                        }
                    }

                    // 方法3: それでも見つからない場合、text要素自体の親の親を使用
                    if (!messageGroup && text.parentElement && text.parentElement.parentElement) {
                        messageGroup = text.parentElement.parentElement.tagName.toLowerCase() === 'g'
                            ? text.parentElement.parentElement
                            : text.parentElement;
                        console.log(`  → 方法3: 親の親要素を使用:`, messageGroup);
                    }

                    if (messageGroup) {
                        foundMessageGroups.push({ group: messageGroup, message: msg, index: msgIndex });
                    } else {
                        console.warn(`  → すべての方法で見つかりませんでした`);
                    }
                }
            });
        }
    });

    // メッセージのインデックス順にソート
    foundMessageGroups.sort((a, b) => a.index - b.index);
    messageGroups = foundMessageGroups.map(item => item.group);

    console.log('見つかったメッセージグループ数:', messageGroups.length);

    // パターン2: 見つからない場合はクラス名で検索
    if (messageGroups.length === 0) {
        messageGroups = svg.querySelectorAll('g.messageLine0, g.messageLine1');
        console.log('g.messageLine0, g.messageLine1 で見つかった要素数:', messageGroups.length);
    }

    // パターン3: それでも見つからない場合はline要素の親グループ
    if (messageGroups.length === 0) {
        const lines = svg.querySelectorAll('line');
        console.log('line要素数:', lines.length);
        const uniqueGroups = new Set();
        lines.forEach(line => {
            let parent = line.parentElement;
            if (parent && parent.tagName.toLowerCase() === 'g') {
                uniqueGroups.add(parent);
            }
        });
        messageGroups = Array.from(uniqueGroups);
        console.log('line要素の親グループ数:', messageGroups.length);
    }

    // クリックイベントを追加
    if (messageGroups.length > 0 || foundMessageGroups.length > 0) {
        // foundMessageGroupsがある場合はそちらを優先（メッセージ情報が紐付いている）
        if (foundMessageGroups.length > 0) {
            foundMessageGroups.forEach((item, index) => {
                console.log(`メッセージグループ ${index} にイベント追加:`, item.group, item.message);
                item.group.classList.add('clickable-element');
                item.group.style.cursor = 'pointer';

                item.group.addEventListener('click', (e) => {
                    console.log('メッセージがクリックされました:', item.message);
                    e.stopPropagation();
                    showEditMessagePanel(item.message);
                });
            });
        } else {
            // メッセージグループのみの場合（インデックスで対応付け）
            messageGroups.forEach((group, index) => {
                console.log(`メッセージグループ ${index} にイベント追加:`, group);
                if (index < parsedElements.messages.length) {
                    const message = parsedElements.messages[index];
                    group.classList.add('clickable-element');
                    group.style.cursor = 'pointer';

                    group.addEventListener('click', (e) => {
                        console.log('メッセージがクリックされました:', message);
                        e.stopPropagation();
                        showEditMessagePanel(message);
                    });
                }
            });
        }
    } else {
        console.warn('メッセージグループが見つかりませんでした');
    }

    console.log('=== イベント追加完了 ===');
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

// 既存の参加者リストを取得
function getExistingParticipants() {
    const code = mermaidCodeTextarea.value.trim();
    const lines = code.split('\n');
    const participants = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('participant')) {
            const match = line.match(/participant\s+(\S+)(?:\s+as\s+(.+))?/);
            if (match) {
                const id = match[1];
                const name = match[2] || id;
                participants.push({ id, name, lineIndex: i });
            }
        }
    }

    return participants;
}

// Mermaidコードをパースして要素情報を抽出
function parseMermaidCode() {
    const code = mermaidCodeTextarea.value.trim();
    const lines = code.split('\n');
    const participants = [];
    const messages = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 参加者行のパース
        if (line.startsWith('participant')) {
            const match = line.match(/participant\s+(\S+)(?:\s+as\s+(.+))?/);
            if (match) {
                participants.push({
                    type: 'participant',
                    id: match[1],
                    name: match[2] || match[1],
                    lineIndex: i,
                    originalId: match[1]
                });
            }
        }

        // メッセージ行のパース (様々な矢印タイプに対応)
        const messageMatch = line.match(/(\S+)\s*(->|-->|->>|-->>)\s*(\S+):\s*(.+)/);
        if (messageMatch) {
            messages.push({
                type: 'message',
                from: messageMatch[1],
                to: messageMatch[3],
                arrowType: messageMatch[2],
                text: messageMatch[4],
                lineIndex: i
            });
        }
    }

    return { participants, messages };
}

// パース結果を更新
function updateParsedElements() {
    parsedElements = parseMermaidCode();
}

// 参加者追加処理
function addParticipant(id, name, position) {
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
        const lines = newCode.split('\n');
        let insertIndex = lines.length;

        // 挿入位置を決定
        if (position === 'first') {
            // 最初に追加（sequenceDiagramの直後）
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === 'sequenceDiagram') {
                    insertIndex = i + 1;
                    break;
                }
            }
        } else if (position === 'last') {
            // 最後に追加（最後のparticipant行の後）
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('participant')) {
                    insertIndex = i + 1;
                    break;
                }
            }
        } else if (position.startsWith('before-')) {
            // 指定された参加者の前に追加
            const targetId = position.replace('before-', '');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('participant')) {
                    const match = line.match(/participant\s+(\S+)/);
                    if (match && match[1] === targetId) {
                        insertIndex = i;
                        break;
                    }
                }
            }
        } else if (position.startsWith('after-')) {
            // 指定された参加者の後に追加
            const targetId = position.replace('after-', '');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('participant')) {
                    const match = line.match(/participant\s+(\S+)/);
                    if (match && match[1] === targetId) {
                        insertIndex = i + 1;
                        break;
                    }
                }
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

    // 既存の参加者リストを取得して挿入位置の選択肢を更新
    const participants = getExistingParticipants();
    participantPositionSelect.innerHTML = '';

    // 最初に追加オプション
    const firstOption = document.createElement('option');
    firstOption.value = 'first';
    firstOption.textContent = '最初に追加';
    participantPositionSelect.appendChild(firstOption);

    // 各参加者の前後にオプションを追加
    participants.forEach((participant, index) => {
        // 「〜の前」オプション
        const beforeOption = document.createElement('option');
        beforeOption.value = `before-${participant.id}`;
        beforeOption.textContent = `${participant.name} の前`;
        participantPositionSelect.appendChild(beforeOption);

        // 「〜の後」オプション
        const afterOption = document.createElement('option');
        afterOption.value = `after-${participant.id}`;
        afterOption.textContent = `${participant.name} の後`;
        participantPositionSelect.appendChild(afterOption);
    });

    // 最後に追加オプション
    const lastOption = document.createElement('option');
    lastOption.value = 'last';
    lastOption.textContent = '最後に追加';
    lastOption.selected = true;
    participantPositionSelect.appendChild(lastOption);

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
    const position = participantPositionSelect.value;
    addParticipant(id, name, position);
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

// リサイズ機能
const resizeHandle = document.getElementById('resize-handle');
let isResizing = false;
let startX = 0;
let startWidth = 0;

// localStorageから保存された幅を復元
function restoreEditorWidth() {
    const savedWidth = localStorage.getItem('editorWidth');
    if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= 300 && width <= window.innerWidth * 0.8) {
            editorPanel.style.width = width + 'px';
        }
    }
}

// 幅をlocalStorageに保存
function saveEditorWidth(width) {
    localStorage.setItem('editorWidth', width.toString());
}

// マウスダウンイベント - リサイズ開始
resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = editorPanel.offsetWidth;
    resizeHandle.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

// マウスムーブイベント - リサイズ中
document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;

    // 最小幅と最大幅の制限
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.8;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
        editorPanel.style.width = newWidth + 'px';
    }
});

// マウスアップイベント - リサイズ終了
document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // 幅を保存
        saveEditorWidth(editorPanel.offsetWidth);
    }
});

// ページ読み込み時に幅を復元
restoreEditorWidth();

// 編集パネル表示・非表示
function showEditPanel() {
    editPanel.style.display = 'flex';
    setTimeout(() => {
        editPanel.classList.add('show');
    }, 10);
}

function hideEditPanel() {
    editPanel.classList.remove('show');
    setTimeout(() => {
        editPanel.style.display = 'none';
        currentEditingElement = null;
        // 選択状態を解除
        const selectedElements = diagramContainer.querySelectorAll('.selected-element');
        selectedElements.forEach(el => el.classList.remove('selected-element'));
    }, 300);
}

// 参加者編集パネルを表示
function showEditParticipantPanel(participant) {
    currentEditingElement = participant;

    // フォームをリセット
    editParticipantForm.style.display = 'block';
    editMessageForm.style.display = 'none';

    // タイトル設定
    editPanelTitle.textContent = '参加者を編集';

    // フォームに値をセット
    editParticipantId.value = participant.id;
    editParticipantName.value = participant.name;

    // 選択状態を設定
    highlightSelectedElement(participant);

    showEditPanel();
}

// メッセージ編集パネルを表示
function showEditMessagePanel(message) {
    currentEditingElement = message;

    // フォームをリセット
    editParticipantForm.style.display = 'none';
    editMessageForm.style.display = 'block';

    // タイトル設定
    editPanelTitle.textContent = 'メッセージを編集';

    // 参加者のドロップダウンを更新
    updateParticipantDropdowns();

    // フォームに値をセット
    editMessageFrom.value = message.from;
    editMessageTo.value = message.to;
    editMessageType.value = message.arrowType;
    editMessageText.value = message.text;

    // 選択状態を設定
    highlightSelectedElement(message);

    showEditPanel();
}

// 参加者のドロップダウンを更新
function updateParticipantDropdowns() {
    const fromOptions = '<option value="">選択してください</option>' +
        parsedElements.participants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const toOptions = '<option value="">選択してください</option>' +
        parsedElements.participants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    editMessageFrom.innerHTML = fromOptions;
    editMessageTo.innerHTML = toOptions;
}

// 選択した要素をハイライト
function highlightSelectedElement(element) {
    // 既存の選択を解除
    const selectedElements = diagramContainer.querySelectorAll('.selected-element');
    selectedElements.forEach(el => el.classList.remove('selected-element'));

    // 新しい要素を選択
    const svg = diagramContainer.querySelector('svg');
    if (!svg) return;

    if (element.type === 'participant') {
        const actorGroups = svg.querySelectorAll('g.actor');
        const index = parsedElements.participants.indexOf(element);
        if (index >= 0 && index < actorGroups.length) {
            actorGroups[index].classList.add('selected-element');
        }
    } else if (element.type === 'message') {
        const messageGroups = svg.querySelectorAll('g.messageLine0, g.messageLine1');
        const index = parsedElements.messages.indexOf(element);
        if (index >= 0 && index < messageGroups.length) {
            messageGroups[index].classList.add('selected-element');
        }
    }
}

// 編集パネルを閉じるボタン
editPanelClose.addEventListener('click', hideEditPanel);

// 参加者の更新処理
editParticipantUpdateBtn.addEventListener('click', () => {
    if (!currentEditingElement || currentEditingElement.type !== 'participant') return;

    const newId = editParticipantId.value.trim();
    const newName = editParticipantName.value.trim();

    if (!newId) {
        updateStatus('IDを入力してください', 'error');
        return;
    }

    const code = mermaidCodeTextarea.value;
    const lines = code.split('\n');
    const oldId = currentEditingElement.id;
    const lineIndex = currentEditingElement.lineIndex;

    // 参加者行を更新
    lines[lineIndex] = `    participant ${newId} as ${newName || newId}`;

    // IDが変更された場合、関連するメッセージも更新
    if (oldId !== newId) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // メッセージ行を検索して、送信元または送信先がoldIdの場合は更新
            const messageMatch = line.match(/(\S+)\s*(->|-->|->>|-->>)\s*(\S+):\s*(.+)/);
            if (messageMatch) {
                let from = messageMatch[1];
                let to = messageMatch[3];
                const arrowType = messageMatch[2];
                const text = messageMatch[4];

                if (from === oldId) from = newId;
                if (to === oldId) to = newId;

                lines[i] = `    ${from}${arrowType}${to}: ${text}`;
            }
        }
    }

    mermaidCodeTextarea.value = lines.join('\n');
    updateStatus('参加者を更新しました', 'success');
    renderDiagram();
    hideEditPanel();
});

// 参加者の削除処理
editParticipantDeleteBtn.addEventListener('click', () => {
    if (!currentEditingElement || currentEditingElement.type !== 'participant') return;

    if (!confirm('この参加者を削除しますか？\n関連するメッセージも削除されます。')) {
        return;
    }

    const code = mermaidCodeTextarea.value;
    const lines = code.split('\n');
    const participantId = currentEditingElement.id;
    const lineIndex = currentEditingElement.lineIndex;

    // 参加者行を削除
    lines.splice(lineIndex, 1);

    // 関連するメッセージも削除
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        const messageMatch = line.match(/(\S+)\s*(->|-->|->>|-->>)\s*(\S+):\s*(.+)/);
        if (messageMatch) {
            const from = messageMatch[1];
            const to = messageMatch[3];
            if (from === participantId || to === participantId) {
                lines.splice(i, 1);
            }
        }
    }

    mermaidCodeTextarea.value = lines.join('\n');
    updateStatus('参加者を削除しました', 'success');
    renderDiagram();
    hideEditPanel();
});

// メッセージの更新処理
editMessageUpdateBtn.addEventListener('click', () => {
    if (!currentEditingElement || currentEditingElement.type !== 'message') return;

    const from = editMessageFrom.value.trim();
    const to = editMessageTo.value.trim();
    const arrowType = editMessageType.value;
    const text = editMessageText.value.trim();

    if (!from || !to || !text) {
        updateStatus('すべての項目を入力してください', 'error');
        return;
    }

    const code = mermaidCodeTextarea.value;
    const lines = code.split('\n');
    const lineIndex = currentEditingElement.lineIndex;

    // メッセージ行を更新
    lines[lineIndex] = `    ${from}${arrowType}${to}: ${text}`;

    mermaidCodeTextarea.value = lines.join('\n');
    updateStatus('メッセージを更新しました', 'success');
    renderDiagram();
    hideEditPanel();
});

// メッセージの削除処理
editMessageDeleteBtn.addEventListener('click', () => {
    if (!currentEditingElement || currentEditingElement.type !== 'message') return;

    if (!confirm('このメッセージを削除しますか?')) {
        return;
    }

    const code = mermaidCodeTextarea.value;
    const lines = code.split('\n');
    const lineIndex = currentEditingElement.lineIndex;

    // メッセージ行を削除
    lines.splice(lineIndex, 1);

    mermaidCodeTextarea.value = lines.join('\n');
    updateStatus('メッセージを削除しました', 'success');
    renderDiagram();
    hideEditPanel();
});


