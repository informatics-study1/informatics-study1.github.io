const editor = document.getElementById('code-editor');
const outputArea = document.getElementById('output-area');
const outputTab = document.getElementById('output-tab');
const pythonTab = document.getElementById('python-tab');
const pythonTabOutput = document.getElementById('python-tab-output');
const javascriptTab = document.getElementById('javascript-tab');
const javascriptTabOutput = document.getElementById('javascript-tab-output');
const outputCopyButton = document.getElementById('output-copy-button');
const stepButton = document.getElementById('step-btn');
const autoStepButton = document.getElementById('auto-step-btn');
const mobileExplanationModeButton = document.getElementById('mobile-explanation-mode-btn');
const stepCounterStatus = document.getElementById('step-counter-status');
const syntaxErrorStatus = document.getElementById('syntax-error-status');
const lineNumbers = document.getElementById('line-numbers');
const currentLineHighlight = document.getElementById('current-line-highlight');
const sourceCorrespondenceHighlight = document.getElementById('source-correspondence-highlight');
const codeHighlight = document.getElementById('code-highlight');
const variableSuggestions = document.getElementById('variable-suggestions');
const cursorPosition = document.getElementById('cursor-position');
const variableDiagram = document.getElementById('variable-diagram');
const variablesTab = document.getElementById('variables-tab');
const flowchartTab = document.getElementById('flowchart-tab');
const flowchartView = document.getElementById('flowchart-view');
const variableZoomControls = document.getElementById('variable-zoom-controls');
const variableZoomOut = document.getElementById('variable-zoom-out');
const variableZoomReset = document.getElementById('variable-zoom-reset');
const variableZoomIn = document.getElementById('variable-zoom-in');
const variableDownload = document.getElementById('variable-download');
const flowchartZoomControls = document.getElementById('flowchart-zoom-controls');
const flowchartZoomOut = document.getElementById('flowchart-zoom-out');
const flowchartZoomReset = document.getElementById('flowchart-zoom-reset');
const flowchartZoomIn = document.getElementById('flowchart-zoom-in');
const flowchartDownload = document.getElementById('flowchart-download');
const executionTooltip = document.getElementById('execution-tooltip');
const lineExplanationTooltip = document.getElementById('line-explanation-tooltip');
const editorContainer = document.querySelector('.editor-container');
const editorShell = document.querySelector('.editor-shell');
const viewerPanel = document.querySelector('.viewer-panel');
const outputRowResizer = document.getElementById('output-row-resizer');
const paneResizer = document.getElementById('pane-resizer');
const undoButton = document.getElementById('undo-btn');
const openButton = document.getElementById('open-btn');
const openFileInput = document.getElementById('open-file-input');
const saveButton = document.getElementById('save-btn');
const editorCopyButton = document.getElementById('editor-copy-btn');
const editorPngButton = document.getElementById('editor-png-btn');
const templateButton = document.getElementById('template-btn');
const templateMenu = document.getElementById('template-menu');
const shareButton = document.getElementById('share-btn');
const qrDialog = document.getElementById('qr-dialog');
const qrCode = document.getElementById('qr-code');
const qrMessage = document.getElementById('qr-message');
const qrClose = document.getElementById('qr-close');
const shareUrlLink = document.getElementById('share-url-link');
const shareCopyButton = document.getElementById('share-copy-button');
const qrDownloadButton = document.getElementById('qr-download-button');
const settingsButton = document.getElementById('settings-btn');
const settingsDialog = document.getElementById('settings-dialog');
const settingsClose = document.getElementById('settings-close');
const fontSizeRange = document.getElementById('font-size-range');
const fontSizeOutput = document.getElementById('font-size-output');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const lineExplanationToggle = document.getElementById('line-explanation-toggle');
const editorTabs = document.getElementById('editor-tabs');
const editorTabAdd = document.getElementById('editor-tab-add');

let nextDocumentNumber = 2;
let activeDocumentId = 1;
const documents = [{ id: 1, name: 'untitled.txt', content: '' }];
const AUTOSAVE_STORAGE_KEY = 'editor-autosave-v1';
let autosaveTimer = null;
const activeDocument = () => documents.find((item) => item.id === activeDocumentId);
const saveWorkspace = () => {
    const current = activeDocument();
    if (current) current.content = editor.value;
    try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify({
            documents: documents.map(({ id, name, content }) => ({ id, name, content })),
            activeDocumentId,
            nextDocumentNumber
        }));
    } catch (error) {
        console.warn('自動保存に失敗しました。', error);
    }
};
const scheduleWorkspaceSave = () => {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveWorkspace, 200);
};
const restoreWorkspace = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(AUTOSAVE_STORAGE_KEY) || 'null');
        if (!saved || !Array.isArray(saved.documents) || !saved.documents.length) return false;
        const restored = saved.documents.filter((item) =>
            item && Number.isFinite(Number(item.id)) && typeof item.name === 'string' && typeof item.content === 'string'
        );
        if (!restored.length) return false;
        documents.splice(0, documents.length, ...restored.map((item) => ({
            id: Number(item.id),
            name: item.name,
            content: item.content
        })));
        activeDocumentId = documents.some((item) => item.id === Number(saved.activeDocumentId))
            ? Number(saved.activeDocumentId)
            : documents[0].id;
        nextDocumentNumber = Math.max(2, Number(saved.nextDocumentNumber) || 2);
        editor.value = activeDocument().content;
        renderEditorTabs();
        return true;
    } catch (error) {
        console.warn('自動保存データを復元できませんでした。', error);
        return false;
    }
};
const renderEditorTabs = () => {
    editorTabs.querySelectorAll('.editor-tab').forEach((tab) => tab.remove());
    documents.forEach((item) => {
        const tab = document.createElement('button');
        tab.className = `editor-tab${item.id === activeDocumentId ? ' is-active' : ''}`;
        tab.type = 'button';
        tab.dataset.documentId = String(item.id);
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(item.id === activeDocumentId));
        tab.innerHTML = '<span class="editor-tab-name"></span><span class="editor-tab-close" role="button" title="閉じる">×</span>';
        tab.querySelector('.editor-tab-name').textContent = item.name;
        tab.querySelector('.editor-tab-close').setAttribute('aria-label', `${item.name}を閉じる`);
        editorTabs.insertBefore(tab, editorTabAdd);
    });
    editorTabs.querySelector('.editor-tab.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};
const loadDocument = (documentId) => {
    const item = documents.find((candidate) => candidate.id === documentId);
    if (!item) return;
    const current = activeDocument();
    if (current) current.content = editor.value;
    activeDocumentId = documentId;
    editor.value = item.content;
    renderEditorTabs();
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    scheduleWorkspaceSave();
    editor.focus();
};
const addDocument = (name = `untitled-${nextDocumentNumber++}.txt`, content = '') => {
    const current = activeDocument();
    if (current) current.content = editor.value;
    const item = { id: Date.now() + Math.random(), name, content };
    documents.push(item);
    activeDocumentId = item.id;
    editor.value = content;
    renderEditorTabs();
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    scheduleWorkspaceSave();
    editor.focus();
};
const closeDocument = (documentId) => {
    const index = documents.findIndex((item) => item.id === documentId);
    if (index < 0) return;
    const wasActive = documentId === activeDocumentId;
    documents.splice(index, 1);
    if (!documents.length) documents.push({ id: Date.now(), name: `untitled-${nextDocumentNumber++}.txt`, content: '' });
    if (wasActive) {
        const replacement = documents[Math.min(index, documents.length - 1)];
        activeDocumentId = replacement.id;
        editor.value = replacement.content;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.focus();
    }
    renderEditorTabs();
    scheduleWorkspaceSave();
};
editorTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.editor-tab');
    if (!tab) return;
    const documentId = Number(tab.dataset.documentId);
    if (event.target.closest('.editor-tab-close')) closeDocument(documentId);
    else if (documentId !== activeDocumentId) loadDocument(documentId);
});
editorTabAdd.addEventListener('click', () => addDocument());
renderEditorTabs();
window.addEventListener('pagehide', saveWorkspace);

const FONT_SIZE_STORAGE_KEY = 'editor-font-size';
const DARK_MODE_STORAGE_KEY = 'dark-mode-enabled';
const LINE_EXPLANATION_STORAGE_KEY = 'line-explanation-enabled';
let lineExplanationEnabled = true;
const applyDarkMode = (enabled) => {
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
    darkModeToggle.checked = enabled;
};
const applyEditorFontSize = (size) => {
    const safeSize = Math.min(28, Math.max(12, Number(size) || 16));
    document.documentElement.style.setProperty('--editor-font-size', `${safeSize}px`);
    document.documentElement.style.setProperty('--editor-line-height', `${Math.round(safeSize * 1.2)}px`);
    fontSizeRange.value = String(safeSize);
    fontSizeOutput.value = `${safeSize} px`;
};
const closeSettings = () => {
    settingsDialog.classList.remove('is-open');
    settingsDialog.setAttribute('aria-hidden', 'true');
    settingsButton.focus();
};
settingsButton.addEventListener('click', () => {
    settingsDialog.classList.add('is-open');
    settingsDialog.setAttribute('aria-hidden', 'false');
    fontSizeRange.focus();
});
settingsClose.addEventListener('click', closeSettings);
settingsDialog.addEventListener('click', (event) => {
    if (event.target === settingsDialog) closeSettings();
});
settingsDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettings();
});
fontSizeRange.addEventListener('input', () => {
    applyEditorFontSize(fontSizeRange.value);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSizeRange.value);
    updateActiveLine();
});
darkModeToggle.addEventListener('change', () => {
    applyDarkMode(darkModeToggle.checked);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkModeToggle.checked));
});
lineExplanationToggle.addEventListener('change', () => {
    lineExplanationEnabled = lineExplanationToggle.checked;
    localStorage.setItem(LINE_EXPLANATION_STORAGE_KEY, String(lineExplanationEnabled));
    if (!lineExplanationEnabled) hideLineExplanation();
});
undoButton.addEventListener('click', () => {
    editor.focus();
    document.execCommand('undo');
});

const showButtonSuccess = (button, message) => {
    const originalLabel = button.getAttribute('aria-label');
    const originalTitle = button.title;
    button.classList.add('is-success');
    button.setAttribute('aria-label', message);
    button.title = message;
    window.setTimeout(() => {
        button.classList.remove('is-success');
        button.setAttribute('aria-label', originalLabel);
        button.title = originalTitle;
    }, 1500);
};

