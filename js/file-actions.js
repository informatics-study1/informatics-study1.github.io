openButton.addEventListener('click', () => {
    openFileInput.value = '';
    openFileInput.click();
});

openFileInput.addEventListener('change', async () => {
    const [file] = openFileInput.files;
    if (!file) return;

    try {
        const content = await file.text();
        const current = activeDocument();
        if (current && !editor.value) {
            current.name = file.name;
            current.content = content;
            editor.value = content;
            renderEditorTabs();
        } else {
            addDocument(file.name, content);
        }
        editor.dispatchEvent(new Event('input'));
        editor.focus();
        showButtonSuccess(openButton, '開きました');
    } catch (error) {
        console.error('コードを読み込めませんでした。', error);
        alert('コードを読み込めませんでした。');
    }
});

saveButton.addEventListener('click', () => {
    const file = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = activeDocument()?.name || 'program.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

    showButtonSuccess(saveButton, '保存しました');
});

const bytesToBase64Url = (bytes) => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

const base64UrlToBytes = (encoded) => {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encodeCode = async (text) => {
    const bytes = new TextEncoder().encode(text);
    const uncompressed = bytesToBase64Url(bytes);
    if (!('CompressionStream' in window) || !('DecompressionStream' in window)) {
        return `u.${uncompressed}`;
    }
    try {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
        const compressedText = bytesToBase64Url(compressed);
        return compressedText.length + 2 < uncompressed.length
            ? `z.${compressedText}`
            : `u.${uncompressed}`;
    } catch (error) {
        return `u.${uncompressed}`;
    }
};

const decodeCode = async (encoded) => {
    const isCompressed = encoded.startsWith('z.');
    const payload = encoded.startsWith('z.') || encoded.startsWith('u.')
        ? encoded.slice(2)
        : encoded;
    let bytes = base64UrlToBytes(payload);
    if (isCompressed) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return new TextDecoder().decode(bytes);
};

const createShareUrl = async () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = `code=${await encodeCode(editor.value)}`;
    return shareUrl.href;
};

const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const copyArea = document.createElement('textarea');
    copyArea.value = text;
    copyArea.style.position = 'fixed';
    copyArea.style.opacity = '0';
    document.body.appendChild(copyArea);
    copyArea.select();
    const copied = document.execCommand('copy');
    copyArea.remove();
    if (!copied) throw new Error('Clipboard copy failed');
};
outputCopyButton.addEventListener('click', async () => {
    const text = !outputArea.hidden
        ? outputArea.textContent
        : (pythonTabOutput.hidden ? javascriptTabOutput.textContent : pythonTabOutput.textContent);
    await copyText(text || '');
    showButtonSuccess(outputCopyButton, 'コピーしました');
});
editorCopyButton.addEventListener('click', async () => {
    await copyText(editor.value);
    showButtonSuccess(editorCopyButton, 'コピーしました');
});
const closeTemplateMenu = () => {
    templateMenu.hidden = true;
    templateButton.setAttribute('aria-expanded', 'false');
};
const openTemplateMenu = () => {
    templateMenu.hidden = false;
    templateButton.setAttribute('aria-expanded', 'true');
    const buttonBounds = templateButton.getBoundingClientRect();
    const left = Math.min(buttonBounds.left, window.innerWidth - templateMenu.offsetWidth - 8);
    const belowTop = buttonBounds.bottom + 6;
    const top = belowTop + templateMenu.offsetHeight <= window.innerHeight - 8
        ? belowTop
        : Math.max(8, buttonBounds.top - templateMenu.offsetHeight - 6);
    templateMenu.style.left = `${Math.max(8, left)}px`;
    templateMenu.style.top = `${top}px`;
    templateMenu.querySelector('.template-option')?.focus();
};
const insertSyntaxTemplate = (templateName) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
    const indentation = editor.value.slice(lineStart, start).match(/^[ \t]*/)?.[0] ?? '';
    const templates = {
        if: `もし 条件 ならば:\n${indentation}    処理`,
        'if-else': `もし 条件 ならば:\n${indentation}    処理\n${indentation}そうでなければ:\n${indentation}    処理`,
        'if-elif-else': `もし 条件1 ならば:\n${indentation}    処理1\n${indentation}そうでなくもし 条件2 ならば:\n${indentation}    処理2\n${indentation}そうでなければ:\n${indentation}    処理3`,
        for: `i を 0 から 終了値 まで 1 ずつ増やしながら繰り返す:\n${indentation}    処理`,
        while: `条件 の間繰り返す:\n${indentation}    処理`,
        print: '表示する(値)',
        input: '変数 = 【外部からの入力】'
    };
    const text = templates[templateName];
    if (!text) return;
    const placeholders = ['条件1', '条件2', '条件', '終了値', '変数', '値', '処理1', '処理2', '処理3', '処理'];
    const placeholder = placeholders
        .map((label) => ({ label, index: text.indexOf(label) }))
        .filter(({ index }) => index >= 0)
        .sort((left, right) => left.index - right.index)[0];
    editor.setRangeText(text, start, end, 'end');
    if (placeholder) {
        editor.setSelectionRange(start + placeholder.index, start + placeholder.index + placeholder.label.length);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    closeTemplateMenu();
    editor.focus();
    updateCursorPosition();
};
templateButton.addEventListener('click', () => {
    if (templateMenu.hidden) openTemplateMenu();
    else closeTemplateMenu();
});
templateMenu.addEventListener('click', (event) => {
    const option = event.target.closest('.template-option');
    if (option) insertSyntaxTemplate(option.dataset.template);
});
document.addEventListener('pointerdown', (event) => {
    if (!templateMenu.hidden && !templateMenu.contains(event.target) && event.target !== templateButton) closeTemplateMenu();
});
templateMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        closeTemplateMenu();
        templateButton.focus();
    }
});

