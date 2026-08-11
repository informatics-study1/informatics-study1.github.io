const escapeHtml = (text) => text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
const escapeAttribute = (text) => escapeHtml(text).replaceAll('"', '&quot;');

const validateSyntax = (code) => {
    const lines = code.split('\n');
    const errors = new Map();
    const addError = (lineIndex, message) => {
        const previous = errors.get(lineIndex);
        if (!previous?.includes(message)) errors.set(lineIndex, previous ? `${previous}／${message}` : message);
    };
    const details = lines.map((raw) => {
        const whitespace = raw.match(/^[ \t]*/)?.[0] ?? '';
        return {
            raw,
            text: raw.trim(),
            indent: whitespace.replaceAll('\t', '    ').length,
            whitespace
        };
    });

    details.forEach((line, index) => {
        if (!line.text || line.text.startsWith('#') || line.text.startsWith('//')) return;
        if (line.whitespace.includes(' ') && line.indent % 4 !== 0) {
            addError(index, 'インデントは4文字単位にしてください');
        }
        if (line.text.startsWith('もし') && !/^もし\s+.+\s+ならば:$/.test(line.text)) {
            addError(index, '「もし 条件 ならば:」の形式で入力してください');
        }
        if (line.text.startsWith('そうでなくもし') && !/^そうでなくもし\s+.+\s+ならば:$/.test(line.text)) {
            addError(index, '「そうでなくもし 条件 ならば:」の形式で入力してください');
        }
        if (line.text.startsWith('そうでなければ') && line.text !== 'そうでなければ:') {
            addError(index, '「そうでなければ:」の末尾にコロンが必要です');
        }
        const validLoop = /^(?:.+\s+を\s+.+\s+から\s+.+\s+まで\s+.+\s+ずつ(?:増やし|減らし)ながら繰り返す|.+\s+の間繰り返す):$/.test(line.text);
        if (line.text.includes('繰り返す') && !validLoop) {
            addError(index, '繰り返し構文の形式または末尾のコロンを確認してください');
        }
    });

    const significantIndexes = details
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.text && !line.text.startsWith('#') && !line.text.startsWith('//'));
    significantIndexes.forEach(({ line, index }, position) => {
        const previous = significantIndexes[position - 1];
        if (previous && line.indent > previous.line.indent && !previous.line.text.endsWith(':')) {
            addError(index, 'コロンで終わらない行の次ではインデントを増やせません');
        }
        const next = significantIndexes[position + 1];
        if (line.text.endsWith(':') && (!next || next.line.indent <= line.indent)) {
            addError(index, 'この構文の次にはインデントされた処理が必要です');
        }
    });

    const openingFor = { ')': '(', ']': '[' };
    const stack = [];
    details.forEach((line, lineIndex) => {
        let quote = '';
        let escaped = false;
        for (let column = 0; column < line.raw.length; column += 1) {
            const character = line.raw[column];
            const nextCharacter = line.raw[column + 1];
            if (!quote && (character === '#' || (character === '/' && nextCharacter === '/'))) break;
            if (escaped) {
                escaped = false;
                continue;
            }
            if (quote && character === '\\') {
                escaped = true;
                continue;
            }
            if (character === '"' || character === "'") {
                if (!quote) quote = character;
                else if (quote === character) quote = '';
                continue;
            }
            if (quote) continue;
            if (character === '(' || character === '[') stack.push({ character, lineIndex });
            else if (character === ')' || character === ']') {
                const opening = stack.pop();
                if (!opening || opening.character !== openingFor[character]) {
                    addError(lineIndex, `対応する開き記号がない「${character}」があります`);
                }
            }
        }
        if (quote) addError(lineIndex, `文字列を閉じる「${quote}」が必要です`);
    });
    stack.forEach(({ character, lineIndex }) => addError(lineIndex, `「${character}」を閉じる記号が必要です`));
    return errors;
};

const tokenPattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|#[^\n]*|【外部からの入力】|\b\d+(?:\.\d+)?\b|そうでなくもし|そうでなければ|ずつ増やしながら繰り返す|ずつ減らしながら繰り返す|の間繰り返す|整数乱数|最大値|最小値|要素数|整数|乱数|表示する|もし|ならば|かつ|または|でない|から|まで|を|←|==|!=|<=|>=|=|[+\-*/%<>]=?)/g;

const highlightSyntax = (source) => {
    let lastIndex = 0;
    let html = '';
    for (const match of source.matchAll(tokenPattern)) {
        html += escapeHtml(source.slice(lastIndex, match.index));
        const token = match[0];
        let tokenClass = 'token-keyword';
        if (token.startsWith('"') || token.startsWith("'")) tokenClass = 'token-string';
        else if (token.startsWith('//') || token.startsWith('#')) tokenClass = 'token-comment';
        else if (/^\d/.test(token)) tokenClass = 'token-number';
        else if (['表示する', '要素数', '整数', '乱数', '整数乱数', '最大値', '最小値', '【外部からの入力】'].includes(token)) tokenClass = 'token-function';
        else if (/^(←|==|!=|<=|>=|=|[+\-*/%<>]=?)$/.test(token)) tokenClass = 'token-operator';
        html += `<span class="${tokenClass}">${escapeHtml(token)}</span>`;
        lastIndex = match.index + token.length;
    }
    return html + escapeHtml(source.slice(lastIndex));
};

const saveEditorAsPng = () => {
    const lines = editor.value.split('\n');
    const styles = getComputedStyle(editor);
    const fontSize = parseFloat(styles.fontSize) || 16;
    const lineHeight = Math.max(parseFloat(styles.lineHeight) || 19, Math.ceil(fontSize * 1.35));
    const fontFamily = styles.fontFamily || 'monospace';
    const paddingX = 18;
    const paddingY = 14;
    const numberDigits = String(Math.max(1, lines.length)).length;
    const measureCanvas = document.createElement('canvas');
    const measureContext = measureCanvas.getContext('2d');
    measureContext.font = `${fontSize}px ${fontFamily}`;
    const gutterWidth = Math.ceil(measureContext.measureText('0'.repeat(numberDigits + 2)).width + 18);
    const lineWidths = lines.map((line) => measureContext.measureText(line.replaceAll('\t', '    ')).width);
    const contentWidth = Math.max(420, Math.ceil(Math.max(0, ...lineWidths) + paddingX * 2));
    const logicalWidth = gutterWidth + contentWidth;
    const logicalHeight = Math.max(90, paddingY * 2 + lines.length * lineHeight);
    const exportScale = Math.max(.5, Math.min(2, 16384 / logicalWidth, 16384 / logicalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(logicalWidth * exportScale);
    canvas.height = Math.ceil(logicalHeight * exportScale);
    const context = canvas.getContext('2d');
    context.scale(exportScale, exportScale);

    const dark = document.documentElement.dataset.theme === 'dark';
    const palette = dark
        ? { background: '#1d2127', gutter: '#242930', border: '#444b55', text: '#e1e5ea', number: '#828b97' }
        : { background: '#f8f9fa', gutter: '#f4f4f4', border: '#dddddd', text: '#212529', number: '#9a9a9a' };
    const tokenColors = {
        'token-keyword': '#8959a8',
        'token-function': '#4271ae',
        'token-string': '#718c00',
        'token-number': '#f5871f',
        'token-comment': '#8e908c',
        'token-operator': '#3e999f'
    };
    context.fillStyle = palette.background;
    context.fillRect(0, 0, logicalWidth, logicalHeight);
    context.fillStyle = palette.gutter;
    context.fillRect(0, 0, gutterWidth, logicalHeight);
    context.fillStyle = palette.border;
    context.fillRect(gutterWidth - 1, 0, 1, logicalHeight);
    context.font = `${fontSize}px ${fontFamily}`;
    context.textBaseline = 'top';

    const drawText = (text, x, y, color) => {
        const printable = text.replaceAll('\t', '    ');
        context.fillStyle = color;
        context.fillText(printable, x, y);
        return x + context.measureText(printable).width;
    };

    const lineInfos = lines.map((line) => {
        const indentation = line.match(/^(?: {4}|\t)+/)?.[0] ?? '';
        return {
            line,
            depth: indentation.match(/ {4}|\t/g)?.length ?? 0,
            hasCode: line.trim().length > 0
        };
    });
    const nextDepths = Array(lines.length).fill(null);
    const nextCodeLines = Array(lines.length).fill(null);
    let nextCodeDepth = null;
    let nextCodeLine = null;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        nextDepths[index] = nextCodeDepth;
        nextCodeLines[index] = nextCodeLine;
        if (lineInfos[index].hasCode) {
            nextCodeDepth = lineInfos[index].depth;
            nextCodeLine = lineInfos[index];
        }
    }
    const indentWidth = context.measureText('    ').width;

    lines.forEach((line, lineIndex) => {
        const y = paddingY + lineIndex * lineHeight;
        const number = String(lineIndex + 1);
        context.fillStyle = palette.number;
        context.fillText(number, gutterWidth - paddingX - context.measureText(number).width, y);
        const info = lineInfos[lineIndex];
        for (let guideIndex = 0; guideIndex < (info.hasCode ? info.depth : 0); guideIndex += 1) {
            const depth = guideIndex + 1;
            const nextInfo = nextCodeLines[lineIndex];
            const nextText = nextInfo?.line.trim() ?? '';
            const continuesConditional = nextInfo
                && nextInfo.depth === depth - 1
                && /^(?:そうでなくもし(?:\s|$)|そうでなければ(?:\s*[：:]?)?$)/.test(nextText);
            const isEnd = !continuesConditional
                && (nextDepths[lineIndex] === null || nextDepths[lineIndex] < depth);
            const guideX = gutterWidth + paddingX + guideIndex * indentWidth + .5;
            context.beginPath();
            context.strokeStyle = '#268cf2';
            context.lineWidth = 1.25;
            context.moveTo(guideX, y);
            if (isEnd) {
                const bendY = y + lineHeight * .72;
                context.lineTo(guideX, bendY);
                context.lineTo(guideX + indentWidth * .7, bendY);
            } else {
                context.lineTo(guideX, y + lineHeight);
            }
            context.stroke();
        }
        let x = gutterWidth + paddingX;
        let lastIndex = 0;
        for (const match of line.matchAll(tokenPattern)) {
            x = drawText(line.slice(lastIndex, match.index), x, y, palette.text);
            const token = match[0];
            let tokenClass = 'token-keyword';
            if (token.startsWith('"') || token.startsWith("'")) tokenClass = 'token-string';
            else if (token.startsWith('//') || token.startsWith('#')) tokenClass = 'token-comment';
            else if (/^\d/.test(token)) tokenClass = 'token-number';
            else if (['表示する', '要素数', '整数', '乱数', '整数乱数', '最大値', '最小値', '【外部からの入力】'].includes(token)) tokenClass = 'token-function';
            else if (/^(←|==|!=|<=|>=|=|[+\-*/%<>]=?)$/.test(token)) tokenClass = 'token-operator';
            x = drawText(token, x, y, tokenColors[tokenClass]);
            lastIndex = match.index + token.length;
        }
        drawText(line.slice(lastIndex), x, y, palette.text);
    });

    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const baseName = (activeDocument()?.name || 'program').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-');
        link.href = url;
        link.download = `${baseName}-editor.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showButtonSuccess(editorPngButton, 'PNGを保存しました');
    }, 'image/png');
};
editorPngButton.addEventListener('click', saveEditorAsPng);

const updateHighlight = () => {
    const syntaxErrors = validateSyntax(editor.value);
    syntaxErrorStatus.textContent = syntaxErrors.size ? `構文エラー ${syntaxErrors.size}件` : '';
    const guideColors = ['#268cf2'];
    const lines = editor.value.split('\n').map((line) => {
        const indentation = line.match(/^(?: {4}|\t)+/)?.[0] ?? '';
        return {
            line,
            indentation,
            depth: indentation.match(/ {4}|\t/g)?.length ?? 0,
            hasCode: line.trim().length > 0
        };
    });
    const nextDepths = Array(lines.length).fill(null);
    const nextCodeLines = Array(lines.length).fill(null);
    let nextCodeDepth = null;
    let nextCodeLine = null;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        nextDepths[index] = nextCodeDepth;
        nextCodeLines[index] = nextCodeLine;
        if (lines[index].hasCode) {
            nextCodeDepth = lines[index].depth;
            nextCodeLine = lines[index];
        }
    }
    const html = lines.map((info, lineIndex) => {
        const guides = Array.from({ length: info.hasCode ? info.depth : 0 }, (_, guideIndex) => {
            const depth = guideIndex + 1;
            const nextDepth = nextDepths[lineIndex];
            const nextInfo = nextCodeLines[lineIndex];
            const nextText = nextInfo?.line.trim() ?? '';
            const continuesConditional = nextInfo
                && nextInfo.depth === depth - 1
                && /^(?:そうでなくもし(?:\s|$)|そうでなければ(?:\s*[：:]?)?$)/.test(nextText);
            const isEnd = info.hasCode
                && !continuesConditional
                && (nextDepth === null || nextDepth < depth);
            const color = guideColors[guideIndex % guideColors.length];
            const className = isEnd ? ' is-end' : continuesConditional ? ' is-continuing-branch' : '';
            return `<span class="indent-guide${className}" style="--guide-color:${color}">    </span>`;
        }).join('');
        const content = guides + highlightSyntax(info.line.slice(info.indentation.length));
        const message = syntaxErrors.get(lineIndex);
        return message ? `<span class="syntax-error">${content || ' '}</span>` : content;
    }).join('\n');
    codeHighlight.innerHTML = html + (editor.value.endsWith('\n') ? ' ' : '');
};

const updateLineNumbers = () => {
    const lines = editor.value.split('\n');
    const syntaxErrors = validateSyntax(editor.value);
    lineNumbers.innerHTML = Array.from(
        { length: lines.length },
        (_, index) => {
            const message = syntaxErrors.get(index);
            return `<span class="line-number${message ? ' has-error' : ''}"${message ? ` title="${escapeAttribute(message)}"` : ''}>${index + 1}</span>`;
        }
    ).join('');
};

const explainCodeLine = (source, lineNumber) => {
    const text = source.trim();
    if (!text) return null;
    if (text.startsWith('#') || text.startsWith('//')) {
        return { title: `${lineNumber}行目：コメント`, description: 'プログラムを説明するための行であり，実行時の処理には影響しない。' };
    }

    let match = text.match(/^もし\s+(.+)\s+ならば:$/);
    if (match) return { title: `${lineNumber}行目：条件分岐`, description: `条件式「${match[1]}」が真の場合に，インデントされた処理を実行する。` };
    match = text.match(/^そうでなくもし\s+(.+)\s+ならば:$/);
    if (match) return { title: `${lineNumber}行目：追加の条件分岐`, description: `それまでの条件式が偽であり，条件「${match[1]}」が真の場合に処理を実行する。` };
    if (text === 'そうでなければ:') {
        return { title: `${lineNumber}行目：それ以外の分岐`, description: 'それまでの条件式がすべて偽だった場合に，インデントされた処理を実行する。' };
    }

    match = text.match(/^(.+)\s*を\s*(.+)\s*から\s*(.+)\s*まで\s*(.+)\s*ずつ増やしながら繰り返す:$/);
    if (match) return { title: `${lineNumber}行目：順次繰り返し`, description: `繰り返し変数「${match[1].trim()}」を${match[2]}から${match[3]}まで${match[4]}ずつ増やし，範囲内の処理を繰り返す。` };
    match = text.match(/^(.+)\s*を\s*(.+)\s*から\s*(.+)\s*まで\s*(.+)\s*ずつ減らしながら繰り返す:$/);
    if (match) return { title: `${lineNumber}行目：順次繰り返し`, description: `繰り返し変数「${match[1].trim()}」を${match[2]}から${match[3]}まで${match[4]}ずつ減らし，範囲内の処理を繰り返す。` };
    match = text.match(/^(.+)\s*の間繰り返す:$/);
    if (match) return { title: `${lineNumber}行目：条件繰り返し`, description: `条件式「${match[1]}」が真である間，インデントされた処理を繰り返す。` };

    match = text.match(/^表示する\((.*)\)$/);
    if (match) return { title: `${lineNumber}行目：表示`, description: `「${match[1]}」の値を実行結果へ表示する処理である。` };
    match = text.match(/^([^=!<>]+?)\s*(?:←|=)\s*【外部からの入力】$/);
    if (match) return { title: `${lineNumber}行目：外部入力`, description: `外部から入力された文字列を変数「${match[1].trim()}」へ代入する。` };
    match = text.match(/^([^=!<>]+?)\s*(?:←|=)\s*([^=].*)$/);
    if (match) {
        const target = match[1].trim();
        const expression = match[2].trim();
        const arrayElement = target.match(/^(.+?)\[(.+)\]$/);
        const isNumericLiteral = /^-?\d+(?:\.\d+)?$/.test(expression);
        const isStringLiteral = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/.test(expression);
        const isLiteral = isNumericLiteral
            || /^(?:true|false|True|False|None)$/.test(expression)
            || isStringLiteral;
        const requiresCalculation = !isLiteral && /(?:[+\-*/%()]|==|!=|<=|>=|<|>)/.test(expression);
        const valueType = isNumericLiteral ? '数値' : isStringLiteral ? '文字列' : '値';
        const displayedValue = isStringLiteral ? expression.slice(1, -1) : expression;
        const typeSuffix = isNumericLiteral ? '（数値）' : isStringLiteral ? '（文字列）' : '';
        if (arrayElement) {
            return {
                title: `${lineNumber}行目：配列要素への代入${typeSuffix}`,
                description: requiresCalculation
                    ? `式「${expression}」を計算し，その結果を配列「${arrayElement[1].trim()}」の添字「${arrayElement[2].trim()}」の要素へ代入する。`
                    : `${valueType}「${displayedValue}」を配列「${arrayElement[1].trim()}」の添字「${arrayElement[2].trim()}」の要素へ代入する。`
            };
        }
        if (expression.startsWith('[') && expression.endsWith(']')) {
            return {
                title: `${lineNumber}行目：配列への代入`,
                description: `配列「${expression}」を配列変数「${target}」へ代入する。`
            };
        }
        return {
            title: `${lineNumber}行目：変数への代入${typeSuffix}`,
            description: requiresCalculation
                ? `式「${expression}」を計算し，その結果を変数「${target}」へ代入する。`
                : `${valueType}「${displayedValue}」を変数「${target}」へ代入する。`
        };
    }

    return { title: `${lineNumber}行目：処理`, description: '式または関数呼び出しを実行する処理である。' };
};

const hideLineExplanation = () => {
    lineExplanationTooltip.classList.remove('is-visible');
    lineExplanationTooltip.setAttribute('aria-hidden', 'true');
};

let mobileExplanationMode = false;
const setMobileExplanationMode = (enabled, returnToEditor = false) => {
    mobileExplanationMode = enabled && window.matchMedia('(max-width: 700px)').matches;
    editor.readOnly = mobileExplanationMode;
    document.body.classList.toggle('is-mobile-explanation-mode', mobileExplanationMode);
    mobileExplanationModeButton.setAttribute('aria-pressed', String(mobileExplanationMode));
    mobileExplanationModeButton.textContent = mobileExplanationMode ? '編集に戻る' : '解説';
    hideLineExplanation();
    hideVariableSuggestions();
    if (mobileExplanationMode) editor.blur();
    else if (returnToEditor) editor.focus();
};
mobileExplanationModeButton.addEventListener('click', () => {
    setMobileExplanationMode(!mobileExplanationMode, mobileExplanationMode);
});

const showLineExplanationAt = (event) => {
    if (!lineExplanationEnabled) {
        hideLineExplanation();
        return;
    }
    const styles = getComputedStyle(editor);
    const lineHeight = parseFloat(styles.lineHeight);
    const paddingTop = parseFloat(styles.paddingTop);
    const bounds = editor.getBoundingClientRect();
    const lineIndex = Math.floor((event.clientY - bounds.top + editor.scrollTop - paddingTop) / lineHeight);
    const sourceLines = editor.value.split('\n');
    if (lineIndex < 0 || lineIndex >= sourceLines.length) {
        hideLineExplanation();
        return;
    }
    const syntaxError = validateSyntax(editor.value).get(lineIndex);
    const explanation = syntaxError
        ? { title: `${lineIndex + 1}行目：構文エラー`, description: syntaxError }
        : explainCodeLine(sourceLines[lineIndex], lineIndex + 1);
    if (!explanation) {
        hideLineExplanation();
        return;
    }

    lineExplanationTooltip.innerHTML = `<div class="line-explanation-title">${escapeHtml(explanation.title)}</div><div>${escapeHtml(explanation.description)}</div>`;
    lineExplanationTooltip.classList.add('is-visible');
    lineExplanationTooltip.setAttribute('aria-hidden', 'false');
    if (mobileExplanationMode) {
        lineExplanationTooltip.style.inset = 'auto 8px max(8px, env(safe-area-inset-bottom)) 8px';
        return;
    }
    lineExplanationTooltip.style.right = '';
    lineExplanationTooltip.style.bottom = '';
    const gap = 14;
    const maxLeft = window.innerWidth - lineExplanationTooltip.offsetWidth - 10;
    let top = event.clientY + gap;
    if (top + lineExplanationTooltip.offsetHeight > window.innerHeight - 10) {
        top = event.clientY - lineExplanationTooltip.offsetHeight - gap;
    }
    lineExplanationTooltip.style.left = `${Math.max(10, Math.min(event.clientX + gap, maxLeft))}px`;
    lineExplanationTooltip.style.top = `${Math.max(10, top)}px`;
};
editor.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') showLineExplanationAt(event);
});
editor.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse' && mobileExplanationMode) showLineExplanationAt(event);
});
editor.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') hideLineExplanation();
});
document.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' && event.target !== editor && event.target !== lineExplanationTooltip) hideLineExplanation();
});
window.matchMedia('(max-width: 700px)').addEventListener('change', (event) => {
    if (!event.matches && mobileExplanationMode) setMobileExplanationMode(false);
});
let suggestionItems = [];
let activeSuggestionIndex = 0;
let suggestionTokenStart = 0;
const hideVariableSuggestions = () => {
    variableSuggestions.hidden = true;
    variableSuggestions.replaceChildren();
    suggestionItems = [];
    editor.removeAttribute('aria-activedescendant');
};
const collectVariableNames = () => {
    const names = new Set();
    editor.value.split('\n').forEach((line) => {
        const assignment = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:←|=(?!=))/);
        const loopVariable = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s+を\s+.+\s+から\s+/);
        if (assignment) names.add(assignment[1]);
        if (loopVariable) names.add(loopVariable[1]);
    });
    return [...names];
};
const setActiveSuggestion = (index) => {
    if (!suggestionItems.length) return;
    activeSuggestionIndex = (index + suggestionItems.length) % suggestionItems.length;
    variableSuggestions.querySelectorAll('.variable-suggestion').forEach((item, itemIndex) => {
        item.classList.toggle('is-active', itemIndex === activeSuggestionIndex);
    });
    const activeItem = variableSuggestions.children[activeSuggestionIndex];
    editor.setAttribute('aria-activedescendant', activeItem.id);
    activeItem.scrollIntoView({ block: 'nearest' });
};
const applyVariableSuggestion = (name) => {
    editor.setRangeText(name, suggestionTokenStart, editor.selectionEnd, 'end');
    hideVariableSuggestions();
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
    updateCursorPosition();
};
const updateVariableSuggestions = () => {
    if (editor.selectionStart !== editor.selectionEnd) {
        hideVariableSuggestions();
        return;
    }
    const beforeCursor = editor.value.slice(0, editor.selectionStart);
    const tokenMatch = beforeCursor.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    if (!tokenMatch) {
        hideVariableSuggestions();
        return;
    }
    const token = tokenMatch[0];
    suggestionTokenStart = editor.selectionStart - token.length;
    suggestionItems = collectVariableNames()
        .filter((name) => name !== token && name.toLowerCase().startsWith(token.toLowerCase()))
        .sort((left, right) => left.localeCompare(right))
        .slice(0, 8);
    if (!suggestionItems.length) {
        hideVariableSuggestions();
        return;
    }
    variableSuggestions.innerHTML = suggestionItems.map((name, index) =>
        `<button id="variable-suggestion-${index}" class="variable-suggestion${index === 0 ? ' is-active' : ''}" type="button" role="option" data-name="${escapeAttribute(name)}">${escapeHtml(name)}</button>`
    ).join('');
    activeSuggestionIndex = 0;
    editor.setAttribute('aria-activedescendant', 'variable-suggestion-0');
    const styles = getComputedStyle(editor);
    const lineHeight = parseFloat(styles.lineHeight);
    const paddingLeft = parseFloat(styles.paddingLeft);
    const paddingTop = parseFloat(styles.paddingTop);
    const currentLine = beforeCursor.slice(beforeCursor.lastIndexOf('\n') + 1);
    const canvas = updateVariableSuggestions.measureCanvas ??= document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${styles.fontSize} ${styles.fontFamily}`;
    const letterSpacing = parseFloat(styles.letterSpacing) || 0;
    const textWidth = context.measureText(currentLine).width + Math.max(0, currentLine.length - 1) * letterSpacing;
    const lineIndex = beforeCursor.split('\n').length - 1;
    const desiredLeft = paddingLeft + textWidth - editor.scrollLeft;
    const desiredTop = paddingTop + (lineIndex + 1) * lineHeight - editor.scrollTop;
    variableSuggestions.hidden = false;
    const maxLeft = editor.clientWidth - variableSuggestions.offsetWidth - 8;
    const maxTop = editor.clientHeight - variableSuggestions.offsetHeight - 8;
    variableSuggestions.style.left = `${Math.max(8, Math.min(desiredLeft, maxLeft))}px`;
    variableSuggestions.style.top = `${Math.max(8, Math.min(desiredTop, maxTop))}px`;
};
variableSuggestions.addEventListener('pointerdown', (event) => {
    const item = event.target.closest('.variable-suggestion');
    if (!item) return;
    event.preventDefault();
    applyVariableSuggestion(item.dataset.name);
});

editor.addEventListener('input', (event) => {
    const current = activeDocument();
    if (current) current.content = editor.value;
    clearSourceCorrespondence();
    updateLineNumbers();
    updateHighlight();
    syncEditorOverlays();
    if (!event.isComposing) updateVariableSuggestions();
    hideLineExplanation();
    stepButton.textContent = 'ステップ実行 ▷';
    stepCounterStatus.textContent = '';
    stepCounterStatus.classList.remove('is-active');
    stopAutoStep();
});
editor.addEventListener('compositionend', updateVariableSuggestions);
const syncEditorOverlays = () => {
    const horizontalScrollbarHeight = Math.max(0, editor.offsetHeight - editor.clientHeight);
    const bottomPadding = 6 + horizontalScrollbarHeight;
    lineNumbers.style.paddingBottom = `${bottomPadding}px`;
    codeHighlight.style.paddingBottom = `${bottomPadding}px`;
    lineNumbers.scrollTop = editor.scrollTop;
    codeHighlight.scrollTop = editor.scrollTop;
    codeHighlight.scrollLeft = editor.scrollLeft;
};
editor.addEventListener('scroll', () => {
    hideLineExplanation();
    hideVariableSuggestions();
    clearSourceCorrespondence();
    syncEditorOverlays();
    updateActiveLine();
});
window.addEventListener('resize', syncEditorOverlays);

const updateActiveLine = () => {
    const currentLine = editor.value.slice(0, editor.selectionStart).split('\n').length - 1;
    lineNumbers.querySelector('.line-number.is-active')?.classList.remove('is-active');
    lineNumbers.children[currentLine]?.classList.add('is-active');
    const styles = getComputedStyle(editor);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = styles.lineHeight === 'normal'
        ? fontSize * 1.2
        : parseFloat(styles.lineHeight);
    const paddingTop = parseFloat(styles.paddingTop);
    currentLineHighlight.style.height = `${lineHeight}px`;
    currentLineHighlight.style.top = `${paddingTop + currentLine * lineHeight - editor.scrollTop}px`;
};

const updateCursorPosition = () => {
    const beforeCursor = editor.value.slice(0, editor.selectionStart);
    const lines = beforeCursor.split('\n');
    cursorPosition.textContent = `行 ${lines.length}，列 ${lines.at(-1).length + 1}`;
    updateActiveLine();
};

