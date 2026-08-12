const selectOutputView = (view) => {
    sourceCorrespondenceHighlight.hidden = true;
    lineNumbers.querySelector('.line-number.is-corresponding')?.classList.remove('is-corresponding');
    const showPython = view === 'python';
    const showJavaScript = view === 'javascript';
    outputArea.hidden = showPython || showJavaScript;
    pythonTabOutput.hidden = !showPython;
    javascriptTabOutput.hidden = !showJavaScript;
    outputTab.classList.toggle('is-active', !showPython && !showJavaScript);
    pythonTab.classList.toggle('is-active', showPython);
    javascriptTab.classList.toggle('is-active', showJavaScript);
    outputTab.setAttribute('aria-selected', String(!showPython && !showJavaScript));
    pythonTab.setAttribute('aria-selected', String(showPython));
    javascriptTab.setAttribute('aria-selected', String(showJavaScript));
    const copyLabel = showPython || showJavaScript ? '変換結果をコピー' : '実行結果をコピー';
    outputCopyButton.hidden = false;
    outputCopyButton.setAttribute('aria-label', `${copyLabel}してクリップボードに保存`);
    outputCopyButton.title = copyLabel;
};

window.showOutputTab = () => selectOutputView('output');
const renderConvertedCode = (panel, code, sourceMapJson) => {
    let sourceMap = [];
    try {
        sourceMap = JSON.parse(String(sourceMapJson || '[]'));
    } catch (error) {
        console.warn('変換コードの行対応情報を読み込めませんでした。', error);
    }
    panel.innerHTML = String(code).split('\n').map((line, index) => {
        const sourceLine = Number(sourceMap[index]);
        const attribute = sourceLine > 0 ? ` data-source-line="${sourceLine}"` : '';
        return `<span class="converted-code-line"${attribute}>${escapeHtml(line)}</span>`;
    }).join('\n');
};
window.showPythonTab = (pythonCode, sourceMapJson) => {
    renderConvertedCode(pythonTabOutput, pythonCode, sourceMapJson);
    selectOutputView('python');
    pythonTabOutput.scrollTop = 0;
    pythonTabOutput.scrollLeft = 0;
};
window.showJavaScriptTab = (javascriptCode, sourceMapJson) => {
    renderConvertedCode(javascriptTabOutput, javascriptCode, sourceMapJson);
    selectOutputView('javascript');
    javascriptTabOutput.scrollTop = 0;
    javascriptTabOutput.scrollLeft = 0;
};
const clearSourceCorrespondence = () => {
    sourceCorrespondenceHighlight.hidden = true;
    lineNumbers.querySelector('.line-number.is-corresponding')?.classList.remove('is-corresponding');
    document.querySelector('.converted-code-line.is-corresponding')?.classList.remove('is-corresponding');
};
const showSourceCorrespondence = (convertedLine, scrollToLine = false) => {
    const sourceLine = Number(convertedLine?.dataset.sourceLine);
    if (!sourceLine) {
        clearSourceCorrespondence();
        return;
    }
    clearSourceCorrespondence();
    convertedLine.classList.add('is-corresponding');
    const styles = getComputedStyle(editor);
    const lineHeight = parseFloat(styles.lineHeight);
    const paddingTop = parseFloat(styles.paddingTop);
    if (scrollToLine) {
        editor.scrollTop = Math.max(0, paddingTop + (sourceLine - 1) * lineHeight - editor.clientHeight / 2);
        syncEditorOverlays();
    }
    sourceCorrespondenceHighlight.style.height = `${lineHeight}px`;
    sourceCorrespondenceHighlight.style.top = `${paddingTop + (sourceLine - 1) * lineHeight - editor.scrollTop}px`;
    sourceCorrespondenceHighlight.hidden = false;
    lineNumbers.children[sourceLine - 1]?.classList.add('is-corresponding');
};
[pythonTabOutput, javascriptTabOutput].forEach((panel) => {
    panel.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'mouse') showSourceCorrespondence(event.target.closest('.converted-code-line'));
    });
    panel.addEventListener('pointerup', (event) => {
        if (event.pointerType !== 'mouse') showSourceCorrespondence(event.target.closest('.converted-code-line'), true);
    });
    panel.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse') clearSourceCorrespondence();
    });
});
outputTab.addEventListener('click', () => selectOutputView('output'));

const selectAnalysisView = (view) => {
    const showFlowchart = view === 'flowchart';
    variableDiagram.hidden = showFlowchart;
    flowchartView.hidden = !showFlowchart;
    variablesTab.classList.toggle('is-active', !showFlowchart);
    flowchartTab.classList.toggle('is-active', showFlowchart);
    variablesTab.setAttribute('aria-selected', String(!showFlowchart));
    flowchartTab.setAttribute('aria-selected', String(showFlowchart));
    variableZoomControls.hidden = showFlowchart;
    flowchartZoomControls.hidden = !showFlowchart;
};
variablesTab.addEventListener('click', () => selectAnalysisView('variables'));

let autoStepTimer = null;
let isAutoStepRunning = false;

const stopAutoStep = () => {
    isAutoStepRunning = false;
    if (autoStepTimer !== null) {
        window.clearTimeout(autoStepTimer);
        autoStepTimer = null;
    }
    autoStepButton.textContent = '自動再生 ▶';
    autoStepButton.classList.remove('is-running');
};

const runAutoStep = () => {
    if (!isAutoStepRunning) return;
    stepButton.click();
    if (isAutoStepRunning) {
        autoStepTimer = window.setTimeout(runAutoStep, 700);
    }
};

autoStepButton.addEventListener('click', () => {
    if (isAutoStepRunning) {
        stopAutoStep();
        return;
    }
    isAutoStepRunning = true;
    autoStepButton.textContent = '停止 ■';
    autoStepButton.classList.add('is-running');
    runAutoStep();
});

