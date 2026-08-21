editor.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (!variableSuggestions.hidden) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveSuggestion(activeSuggestionIndex + (event.key === 'ArrowDown' ? 1 : -1));
            return;
        }
        if (event.key === 'Tab' || event.key === 'Enter') {
            event.preventDefault();
            applyVariableSuggestion(suggestionItems[activeSuggestionIndex]);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            hideVariableSuggestions();
            return;
        }
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        document.getElementById('run-btn').click();
        return;
    }
    if (event.key === 'Tab') {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.setRangeText('    ', start, end, 'end');
        updateLineNumbers();
        updateHighlight();
        updateCursorPosition();
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        const cursor = editor.selectionStart;
        const lineStart = editor.value.lastIndexOf('\n', cursor - 1) + 1;
        const currentLine = editor.value.slice(lineStart, cursor);
        const indentation = currentLine.match(/^[ \t]*/)?.[0] ?? '';
        const nextIndentation = indentation + (currentLine.trimEnd().endsWith(':') ? '    ' : '');
        editor.setRangeText(`\n${nextIndentation}`, editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        updateCursorPosition();
        return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const pairs = { '(': ')', '[': ']', '"': '"' };
    if (event.key === '"' && editor.selectionStart === editor.selectionEnd && editor.value[editor.selectionStart] === '"') {
        event.preventDefault();
        editor.setSelectionRange(editor.selectionStart + 1, editor.selectionStart + 1);
        updateCursorPosition();
        return;
    }
    const closingCharacter = pairs[event.key];
    if (closingCharacter) {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.slice(start, end);
        editor.setRangeText(`${event.key}${selectedText}${closingCharacter}`, start, end, 'end');
        editor.setSelectionRange(start + 1, selectedText ? end + 1 : start + 1);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        updateCursorPosition();
        return;
    }
    if ([')', ']'].includes(event.key) && editor.selectionStart === editor.selectionEnd && editor.value[editor.selectionStart] === event.key) {
        event.preventDefault();
        editor.setSelectionRange(editor.selectionStart + 1, editor.selectionStart + 1);
        updateCursorPosition();
    }
});
['click', 'keyup', 'select', 'input'].forEach((eventName) => {
    editor.addEventListener(eventName, updateCursorPosition);
});
editor.addEventListener('click', updateVariableSuggestions);
editor.addEventListener('blur', hideVariableSuggestions);

