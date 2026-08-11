window.showStepPosition = (lineNumber, finished, statsJson) => {
    lineNumbers.querySelector('.line-number.is-step')?.classList.remove('is-step');
    if (lineNumber) {
        const sourceLines = editor.value.split('\n');
        const safeLine = Math.min(sourceLines.length, Math.max(1, Number(lineNumber)));
        lineNumbers.children[safeLine - 1]?.classList.add('is-step');
        const position = sourceLines.slice(0, safeLine - 1)
            .reduce((total, line) => total + line.length + 1, 0);
        editor.setSelectionRange(position, position);
        const styles = getComputedStyle(editor);
        const lineHeight = parseFloat(styles.lineHeight);
        const paddingTop = parseFloat(styles.paddingTop);
        const targetTop = paddingTop + (safeLine - 1) * lineHeight;
        editor.scrollTop = Math.max(0, targetTop - editor.clientHeight / 2);
        updateCursorPosition();
    }
    const stats = statsJson ? JSON.parse(statsJson) : null;
    if (stats) {
        const conditionDetails = stats.trueCount || stats.falseCount
            ? `（真 ${stats.trueCount}回／偽 ${stats.falseCount}回）`
            : '';
        stepCounterStatus.textContent = `${finished ? '完了｜' : ''}${stats.label}：実行 ${stats.count}回${conditionDetails}`;
        stepCounterStatus.classList.add('is-active');
    }
    stepButton.textContent = finished ? '最初から ↺' : '次の行 ▷';
    if (finished) stopAutoStep();
};

window.clearStepPosition = () => {
    lineNumbers.querySelector('.line-number.is-step')?.classList.remove('is-step');
    stepButton.textContent = 'ステップ実行 ▷';
    stepCounterStatus.textContent = '';
    stepCounterStatus.classList.remove('is-active');
    stopAutoStep();
};

