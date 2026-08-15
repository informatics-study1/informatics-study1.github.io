(async () => {
    const sharedCode = new URLSearchParams(window.location.hash.slice(1)).get('code');
    if (sharedCode) {
        try {
            editor.value = await decodeCode(sharedCode);
            activeDocument().content = editor.value;
        } catch (error) {
            console.warn('共有URLからプログラムを読み込めませんでした。', error);
        }
    }
    applyEditorFontSize(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
    applyDarkMode(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true');
    lineExplanationEnabled = localStorage.getItem(LINE_EXPLANATION_STORAGE_KEY) !== 'false';
    lineExplanationToggle.checked = lineExplanationEnabled;
    updateLineNumbers();
    updateHighlight();
    syncEditorOverlays();
    updateCursorPosition();
})();
