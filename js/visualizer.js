window.showVariableDiagram = (jsonText) => {
    const data = JSON.parse(jsonText);

    const rowHeight = 34;
    const top = 38;
    const listX = 20;
    const listWidth = 220;
    const nameWidth = 160;
    const arrayX = 380;
    const cellWidth = 74;
    const arrays = data.arrays.map((array) => ({ ...array, values: array.values.slice(0, 20) }));
    const maxColumns = Math.max(1, ...arrays.map((array) => array.values.length));
    const width = Math.max(620, arrayX + maxColumns * cellWidth + 25);
    const height = Math.max(top + data.variables.length * rowHeight + 25, top + arrays.length * 96 + 25);
    const arrayPositions = new Map(arrays.map((array, index) => [array.id, top + index * 96]));

    const variableRows = data.variables.map((variable, index) => {
        const y = top + index * rowHeight;
        const value = variable.type === 'scalar' ? escapeHtml(variable.value) : '';
        const dot = variable.type === 'array'
            ? `<circle cx="${listX + listWidth}" cy="${y + rowHeight / 2}" r="3.5"/>`
            : '';
        return `<g><rect class="variable-cell" x="${listX}" y="${y}" width="${nameWidth}" height="${rowHeight}"/><rect class="variable-cell" x="${listX + nameWidth}" y="${y}" width="${listWidth - nameWidth}" height="${rowHeight}"/><text class="variable-name" x="${listX + nameWidth / 2}" y="${y + rowHeight / 2}">${escapeHtml(variable.name)}</text><text x="${listX + nameWidth + (listWidth - nameWidth) / 2}" y="${y + rowHeight / 2}">${value}</text>${dot}</g>`;
    }).join('');

    const arrows = data.variables.filter((variable) => variable.type === 'array').map((variable) => {
        const sourceIndex = data.variables.indexOf(variable);
        const sourceY = top + sourceIndex * rowHeight + rowHeight / 2;
        const targetY = arrayPositions.get(variable.arrayId) + 37;
        return `<path class="reference" d="M ${listX + listWidth + 4} ${sourceY} C ${listX + listWidth + 55} ${sourceY}, ${arrayX - 65} ${targetY}, ${arrayX} ${targetY}"/>`;
    }).join('');

    const arrayTables = arrays.map((array) => {
        const y = arrayPositions.get(array.id);
        const indices = array.values.map((_, index) => `<g><rect class="index-cell" x="${arrayX + index * cellWidth}" y="${y + 20}" width="${cellWidth}" height="24"/><text class="index" x="${arrayX + index * cellWidth + cellWidth / 2}" y="${y + 32}">${index}</text></g>`).join('');
        const values = array.values.map((value, index) => `<g><rect class="array-cell" x="${arrayX + index * cellWidth}" y="${y + 44}" width="${cellWidth}" height="34"/><text x="${arrayX + index * cellWidth + cellWidth / 2}" y="${y + 61}">${escapeHtml(value)}</text></g>`).join('');
        return `<g><text class="array-label" x="${arrayX}" y="${y + 11}">配列</text>${indices}${values}</g>`;
    }).join('');

    const svg = `<svg class="variable-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="変数と配列の対応図"><style>.variable-map text{font:15px Monaco,Menlo,Consolas,'Noto Sans JP',monospace;fill:#111;text-anchor:middle;dominant-baseline:middle}.variable-map .variable-cell{fill:#e5eef8;stroke:#999}.variable-map .variable-name{font-size:15px}.variable-map .index-cell,.variable-map .array-cell{fill:#fffec9;stroke:#999}.variable-map .index{font-size:12px;fill:#777}.variable-map .array-label{font:14px 'Noto Sans JP',Meiryo,sans-serif;fill:#777;text-anchor:start}.variable-map .reference{fill:none;stroke:#268cf2;stroke-width:2;marker-end:url(#variable-arrow)}.variable-map circle{fill:#111}</style><defs><marker id="variable-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#268cf2"/></marker></defs><text x="${listX}" y="18" style="font:17px 'Noto Sans JP',Meiryo,sans-serif;text-anchor:start">変数リスト</text>${arrows}${variableRows}${arrayTables}</svg>`;
    const executionRows = data.execution ?? [];
    const chartX = 245;
    const chartTop = 62;
    const chartRowHeight = 25;
    const maxTotal = Math.max(1, ...executionRows.map((row) => row.count + row.trueCount + row.falseCount));
    const chartWidth = Math.max(430, maxTotal * 20);
    const chartSvgWidth = chartX + chartWidth + 35;
    const chartSvgHeight = chartTop + executionRows.length * chartRowHeight + 58;
    const scale = chartWidth / maxTotal;
    const grid = Array.from({ length: maxTotal + 1 }, (_, value) => {
        const x = chartX + value * scale;
        const labelY = chartTop + executionRows.length * chartRowHeight + 6;
        return `<path class="grid" d="M${x} ${chartTop - 8}V${labelY - 6}"/><text class="axis" x="${x}" y="${labelY}" transform="rotate(45 ${x} ${labelY})">${value}</text>`;
    }).join('');
    const rowGrid = Array.from({ length: executionRows.length + 1 }, (_, index) => {
        const y = chartTop - 4 + index * chartRowHeight;
        return `<path class="grid" d="M${chartX} ${y}H${chartX + chartWidth}"/>`;
    }).join('');
    const bars = executionRows.map((row, index) => {
        const y = chartTop + index * chartRowHeight;
        const trueWidth = row.trueCount * scale;
        const falseWidth = row.falseCount * scale;
        const countWidth = row.count * scale;
        const label = row.label.length > 25 ? `${row.label.slice(0, 24)}…` : row.label;
        const safeRowLabel = escapeHtml(row.label);
        const dataAttributes = `data-label="${safeRowLabel}" data-true-count="${row.trueCount}" data-false-count="${row.falseCount}" data-count="${row.count}"`;
        return `<g><text class="chart-label" x="${chartX - 10}" y="${y + 8}">${escapeHtml(label)}</text><rect class="true-bar data-bar" ${dataAttributes} x="${chartX}" y="${y}" width="${trueWidth}" height="16"/><rect class="false-bar data-bar" ${dataAttributes} x="${chartX + trueWidth}" y="${y}" width="${falseWidth}" height="16"/><rect class="count-bar data-bar" ${dataAttributes} x="${chartX + trueWidth + falseWidth}" y="${y}" width="${countWidth}" height="16"/></g>`;
    }).join('');
    const executionSvg = executionRows.length
        ? `<svg class="execution-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartSvgWidth} ${chartSvgHeight}" width="${chartSvgWidth}" height="${chartSvgHeight}" role="img" aria-label="プログラム各行の実行回数"><style>.chart-title{font:17px 'Noto Sans JP',Meiryo,sans-serif;text-anchor:start;dominant-baseline:middle}.legend-label,.chart-label,.axis{font:12px 'Noto Sans JP',Meiryo,sans-serif;fill:#666;dominant-baseline:middle}.legend-label{text-anchor:start}.chart-label{text-anchor:end}.axis{text-anchor:start}.grid{stroke:#ddd;stroke-width:1}.true-bar{fill:#ffb545}.false-bar{fill:#a54c97}.count-bar{fill:#a4cf5a}.data-bar{cursor:default}.data-bar:hover{filter:brightness(.9);stroke:#555;stroke-width:1}</style><text class="chart-title" x="20" y="19">実行回数</text><g transform="translate(225 13)"><rect class="true-bar" width="34" height="14"/><text class="legend-label" x="44" y="7">真の回数</text><rect class="false-bar" x="112" width="34" height="14"/><text class="legend-label" x="156" y="7">偽の回数</text><rect class="count-bar" x="224" width="34" height="14"/><text class="legend-label" x="268" y="7">実行回数</text></g>${grid}${rowGrid}${bars}</svg>`
        : '';
    variableDiagram.innerHTML = svg + executionSvg;
    applyVariableZoom(variableZoom, false);
    selectAnalysisView('variables');
    variableDiagram.scrollTo({ top: 0, left: 0 });
};

const positionExecutionTooltip = (event) => {
    const gap = 14;
    const maxLeft = window.innerWidth - executionTooltip.offsetWidth - 10;
    const maxTop = window.innerHeight - executionTooltip.offsetHeight - 10;
    executionTooltip.style.left = `${Math.max(10, Math.min(event.clientX + gap, maxLeft))}px`;
    executionTooltip.style.top = `${Math.max(10, Math.min(event.clientY + gap, maxTop))}px`;
};

variableDiagram.addEventListener('pointermove', (event) => {
    const bar = event.target.closest?.('.data-bar');
    if (!bar) {
        executionTooltip.classList.remove('is-visible');
        executionTooltip.setAttribute('aria-hidden', 'true');
        return;
    }

    executionTooltip.innerHTML = `<div class="execution-tooltip-title">${escapeHtml(bar.dataset.label)}</div><div class="execution-tooltip-row"><span class="execution-tooltip-swatch is-true"></span><span>真の回数</span><b>${bar.dataset.trueCount}回</b></div><div class="execution-tooltip-row"><span class="execution-tooltip-swatch is-false"></span><span>偽の回数</span><b>${bar.dataset.falseCount}回</b></div><div class="execution-tooltip-row"><span class="execution-tooltip-swatch is-count"></span><span>実行回数</span><b>${bar.dataset.count}回</b></div>`;
    executionTooltip.classList.add('is-visible');
    executionTooltip.setAttribute('aria-hidden', 'false');
    positionExecutionTooltip(event);
});

variableDiagram.addEventListener('pointerleave', () => {
    executionTooltip.classList.remove('is-visible');
    executionTooltip.setAttribute('aria-hidden', 'true');
});

const createFlowchartSvg = (code) => {
    const sourceLines = code.split('\n')
        .map((raw) => ({
            text: raw.trim(),
            indent: Math.floor((raw.match(/^[ \t]*/)[0].replaceAll('\t', '    ').length) / 4)
        }))
        .filter((line) => line.text && !line.text.startsWith('#') && !line.text.startsWith('//'));
    const isLoop = (text) => /(?:の間繰り返す:|ずつ(?:増やし|減らし)ながら繰り返す:)$/.test(text);
    const isCondition = (text) => /^(もし\s|そうでなくもし)/.test(text);
    const blockEnd = (start) => {
        let end = start;
        for (let index = start + 1; index < sourceLines.length; index += 1) {
            if (sourceLines[index].indent <= sourceLines[start].indent) break;
            end = index;
        }
        return end;
    };
    const loopEnds = new Map();
    sourceLines.forEach((line, index) => {
        if (!isLoop(line.text)) return;
        const end = blockEnd(index);
        const endings = loopEnds.get(end) ?? [];
        endings.unshift(index);
        loopEnds.set(end, endings);
    });
    const displayNodes = [{ text: 'はじめ', type: 'terminal' }];
    const sourceNodeIndexes = new Map();
    sourceLines.forEach((line, sourceIndex) => {
        let type = 'process';
        if (isCondition(line.text)) type = 'condition';
        else if (isLoop(line.text)) type = 'loopStart';
        else if (line.text === 'そうでなければ:') type = 'branch';
        else if (/^表示する\s*\(/.test(line.text)) type = 'output';
        else if (line.text.includes('【外部からの入力】') || /(?:入力|input)\s*\(/i.test(line.text)) type = 'input';
        sourceNodeIndexes.set(sourceIndex, displayNodes.length);
        displayNodes.push({ ...line, type, sourceIndex });
        (loopEnds.get(sourceIndex) ?? []).forEach(() => {
            displayNodes.push({ text: 'ループ', type: 'loopEnd' });
        });
    });
    displayNodes.push({ text: 'おわり', type: 'terminal' });
    const width = 900;
    const center = width / 2;
    const nodes = displayNodes.map((node, index) => ({
        ...node,
        x: center,
        y: 55 + index * 100
    }));
    const processLineLength = 28;
    const processNodeWidth = 420;
    const height = nodes.at(-1).y + 55;
    const connectors = nodes.slice(0, -1).map((node, index) => {
        const next = nodes[index + 1];
        const startY = node.y + (node.type === 'condition' ? 34 : 32);
        const endY = next.y - (next.type === 'condition' ? 34 : 32);
        const yes = node.type === 'condition' ? `<text class="edge-label" x="${center + 15}" y="${startY + 18}">Yes</text>` : '';
        return `<path class="connector" d="M ${center} ${startY} V ${endY}"/>${yes}`;
    }).join('');
    const sideConnectors = [];
    sourceLines.forEach((line, sourceIndex) => {
        if (!isCondition(line.text)) return;
        const fromIndex = sourceNodeIndexes.get(sourceIndex);
        const nextSourceIndex = blockEnd(sourceIndex) + 1;
        const targetIndex = nextSourceIndex < sourceLines.length
            ? sourceNodeIndexes.get(nextSourceIndex)
            : nodes.length - 1;
        if (targetIndex <= fromIndex + 1) return;
        const from = nodes[fromIndex];
        const target = nodes[targetIndex];
        const sideX = center + 285;
        sideConnectors.push(`<path class="branch-connector" d="M ${center + 210} ${from.y} H ${sideX} V ${target.y - 50} H ${center}"/><text class="edge-label" x="${center + 225}" y="${from.y - 10}">No</text>`);
    });
    const textElement = (label, x, y, maxCharacters = 28) => {
        const normalized = label.replace(/:$/, '');
        const lines = normalized.length > maxCharacters
            ? [normalized.slice(0, maxCharacters), `${normalized.slice(maxCharacters, maxCharacters * 2 - 1)}${normalized.length > maxCharacters * 2 - 1 ? '…' : ''}`]
            : [normalized];
        const firstY = y - ((lines.length - 1) * 10);
        return `<text x="${x}" y="${firstY}">${lines.map((part, index) => `<tspan x="${x}" dy="${index ? 20 : 0}">${escapeHtml(part)}</tspan>`).join('')}</text>`;
    };
    const shapes = nodes.map((node) => {
        if (node.type === 'condition') {
            return `<g><polygon points="${center},${node.y - 34} ${center + 210},${node.y} ${center},${node.y + 34} ${center - 210},${node.y}"/>${textElement(node.text.replace(/^もし\s+/, '').replace(/\s+ならば:$/, ''), center, node.y)}</g>`;
        }
        if (node.type === 'loopStart') {
            return `<g><polygon points="${center - 190},${node.y - 32} ${center + 190},${node.y - 32} ${center + 210},${node.y - 12} ${center + 210},${node.y + 32} ${center - 210},${node.y + 32} ${center - 210},${node.y - 12}"/>${textElement(node.text, center, node.y)}</g>`;
        }
        if (node.type === 'loopEnd') {
            return `<g><polygon points="${center - 210},${node.y - 32} ${center + 210},${node.y - 32} ${center + 210},${node.y + 12} ${center + 190},${node.y + 32} ${center - 190},${node.y + 32} ${center - 210},${node.y + 12}"/>${textElement(node.text, center, node.y)}</g>`;
        }
        if (node.type === 'input') {
            return `<g><polygon points="${center - 190},${node.y - 32} ${center + 200},${node.y - 32} ${center + 180},${node.y + 32} ${center - 210},${node.y + 32}"/>${textElement(node.text, center, node.y)}</g>`;
        }
        if (node.type === 'output') {
            return `<g><path d="M ${center - 210} ${node.y} L ${center - 170} ${node.y - 32} H ${center + 165} A 32 32 0 0 1 ${center + 165} ${node.y + 32} H ${center - 170} Z"/>${textElement(node.text, center + 10, node.y)}</g>`;
        }
        const nodeWidth = node.type === 'terminal' ? 150 : processNodeWidth;
        const radius = node.type === 'terminal' ? 32 : 0;
        return `<g><rect x="${center - nodeWidth / 2}" y="${node.y - 32}" width="${nodeWidth}" height="64" rx="${radius}"/>${textElement(node.text, center, node.y, processLineLength)}</g>`;
    }).join('');
    return `<svg id="flowchart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="プログラムのフローチャート"><style>#flowchart .connector,#flowchart .branch-connector{fill:none;stroke:#268cf2;stroke-width:1;marker-end:url(#arrow)}#flowchart rect{fill:#e5eef8;stroke:#999;stroke-width:1.2}#flowchart polygon,#flowchart path:not(.connector):not(.branch-connector):not(.arrow-head){fill:#fffec9;stroke:#999;stroke-width:1.2}#flowchart .arrow-head{fill:#268cf2;stroke:none}#flowchart text{font:15px Monaco,Menlo,Consolas,'Noto Sans JP',monospace;text-anchor:middle;dominant-baseline:middle;fill:#111}#flowchart .edge-label{font-size:13px;fill:#666;text-anchor:start;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="arrow-head" d="M0,0 L8,4 L0,8 z"/></marker></defs>${connectors}${sideConnectors.join('')}${shapes}</svg>`;
};

const showFlowchart = () => {
    flowchartView.innerHTML = createFlowchartSvg(editor.value);
    applyFlowchartZoom(flowchartZoom, false);
    selectAnalysisView('flowchart');
    flowchartView.scrollTo({ top: 0, left: 0 });
};
flowchartTab.addEventListener('click', showFlowchart);

let variableZoom = 1;
const applyVariableZoom = (zoom, preserveCenter = true) => {
    const svgs = [...variableDiagram.querySelectorAll('svg')];
    variableZoom = Math.min(2, Math.max(.5, zoom));
    variableZoomReset.textContent = `${Math.round(variableZoom * 100)}%`;
    variableZoomOut.disabled = variableZoom <= .5;
    variableZoomIn.disabled = variableZoom >= 2;
    if (!svgs.length) return;
    const previousWidth = variableDiagram.scrollWidth;
    const previousHeight = variableDiagram.scrollHeight;
    const centerX = variableDiagram.scrollLeft + variableDiagram.clientWidth / 2;
    const centerY = variableDiagram.scrollTop + variableDiagram.clientHeight / 2;
    svgs.forEach((svg) => {
        svg.style.width = `${svg.viewBox.baseVal.width * variableZoom}px`;
        svg.style.height = `${svg.viewBox.baseVal.height * variableZoom}px`;
    });
    if (preserveCenter && previousWidth && previousHeight) {
        const ratioX = centerX / previousWidth;
        const ratioY = centerY / previousHeight;
        requestAnimationFrame(() => variableDiagram.scrollTo({
            left: ratioX * variableDiagram.scrollWidth - variableDiagram.clientWidth / 2,
            top: ratioY * variableDiagram.scrollHeight - variableDiagram.clientHeight / 2
        }));
    }
};
variableZoomOut.addEventListener('click', () => applyVariableZoom(variableZoom - .25));
variableZoomIn.addEventListener('click', () => applyVariableZoom(variableZoom + .25));
variableZoomReset.addEventListener('click', () => applyVariableZoom(1));
variableDownload.addEventListener('click', async () => {
    const svgs = [...variableDiagram.querySelectorAll('svg')];
    if (!svgs.length) return;
    const exportScale = 2;
    const sources = svgs.map((svg) => ({
        width: svg.viewBox.baseVal.width,
        height: svg.viewBox.baseVal.height,
        url: URL.createObjectURL(new Blob(
            [new XMLSerializer().serializeToString(svg)],
            { type: 'image/svg+xml;charset=utf-8' }
        ))
    }));
    try {
        const images = await Promise.all(sources.map((source) => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source.url;
        })));
        const width = Math.max(...sources.map((source) => source.width));
        const height = sources.reduce((total, source) => total + source.height, 0);
        const canvas = document.createElement('canvas');
        canvas.width = width * exportScale;
        canvas.height = height * exportScale;
        const context = canvas.getContext('2d');
        context.scale(exportScale, exportScale);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        let top = 0;
        images.forEach((image, index) => {
            context.drawImage(image, 0, top, sources[index].width, sources[index].height);
            top += sources[index].height;
        });
        canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const downloadUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'variables.png';
            link.click();
            URL.revokeObjectURL(downloadUrl);
            showButtonSuccess(variableDownload, 'PNGを保存しました');
        }, 'image/png');
    } finally {
        sources.forEach((source) => URL.revokeObjectURL(source.url));
    }
});

let flowchartZoom = 1;
const applyFlowchartZoom = (zoom, preserveCenter = true) => {
    const svg = flowchartView.querySelector('svg');
    flowchartZoom = Math.min(2, Math.max(.5, zoom));
    flowchartZoomReset.textContent = `${Math.round(flowchartZoom * 100)}%`;
    flowchartZoomOut.disabled = flowchartZoom <= .5;
    flowchartZoomIn.disabled = flowchartZoom >= 2;
    if (!svg) return;
    const centerX = preserveCenter ? flowchartView.scrollLeft + flowchartView.clientWidth / 2 : 0;
    const centerY = preserveCenter ? flowchartView.scrollTop + flowchartView.clientHeight / 2 : 0;
    const previousWidth = svg.getBoundingClientRect().width || Number(svg.getAttribute('width'));
    const previousHeight = svg.getBoundingClientRect().height || Number(svg.getAttribute('height'));
    const baseWidth = svg.viewBox.baseVal.width;
    const baseHeight = svg.viewBox.baseVal.height;
    svg.style.width = `${baseWidth * flowchartZoom}px`;
    svg.style.height = `${baseHeight * flowchartZoom}px`;
    if (preserveCenter && previousWidth && previousHeight) {
        const ratioX = centerX / previousWidth;
        const ratioY = centerY / previousHeight;
        requestAnimationFrame(() => flowchartView.scrollTo({
            left: ratioX * baseWidth * flowchartZoom - flowchartView.clientWidth / 2,
            top: ratioY * baseHeight * flowchartZoom - flowchartView.clientHeight / 2
        }));
    }
};
flowchartZoomOut.addEventListener('click', () => applyFlowchartZoom(flowchartZoom - .25));
flowchartZoomIn.addEventListener('click', () => applyFlowchartZoom(flowchartZoom + .25));
flowchartZoomReset.addEventListener('click', () => applyFlowchartZoom(1));
flowchartDownload.addEventListener('click', () => {
    const svg = flowchartView.querySelector('svg');
    if (!svg) return;
    const exportScale = 2;
    const width = svg.viewBox.baseVal.width;
    const height = svg.viewBox.baseVal.height;
    const source = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * exportScale;
        canvas.height = height * exportScale;
        const context = canvas.getContext('2d');
        context.scale(exportScale, exportScale);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const downloadUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'flowchart.png';
            link.click();
            URL.revokeObjectURL(downloadUrl);
            showButtonSuccess(flowchartDownload, 'PNGを保存しました');
        }, 'image/png');
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
});

const setEditorWidth = (percent) => {
    const safePercent = Math.min(80, Math.max(20, percent));
    editorShell.style.flex = `0 0 calc(${safePercent}% - 5px)`;
    paneResizer.setAttribute('aria-valuenow', Math.round(safePercent));
};

const resizeFromPointer = (clientX) => {
    const bounds = editorContainer.getBoundingClientRect();
    setEditorWidth(((clientX - bounds.left) / bounds.width) * 100);
};

paneResizer.addEventListener('pointerdown', (event) => {
    paneResizer.setPointerCapture(event.pointerId);
    paneResizer.classList.add('is-dragging');
    document.body.classList.add('is-resizing');
    resizeFromPointer(event.clientX);
});
paneResizer.addEventListener('pointermove', (event) => {
    if (paneResizer.hasPointerCapture(event.pointerId)) resizeFromPointer(event.clientX);
});
paneResizer.addEventListener('pointerup', (event) => {
    paneResizer.releasePointerCapture(event.pointerId);
    paneResizer.classList.remove('is-dragging');
    document.body.classList.remove('is-resizing');
});
paneResizer.addEventListener('pointercancel', () => {
    paneResizer.classList.remove('is-dragging');
    document.body.classList.remove('is-resizing');
});
paneResizer.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(paneResizer.getAttribute('aria-valuenow'));
    if (event.key === 'Home') setEditorWidth(50);
    else setEditorWidth(current + (event.key === 'ArrowRight' ? 5 : -5));
});

const setOutputHeight = (percent) => {
    const safePercent = Math.min(75, Math.max(15, percent));
    const resizableHeight = Math.max(180, viewerPanel.clientHeight - 88);
    const outputHeight = Math.round(resizableHeight * safePercent / 100);
    viewerPanel.style.gridTemplateRows = `38px ${outputHeight}px 12px 38px minmax(0, 1fr)`;
    outputRowResizer.setAttribute('aria-valuenow', Math.round(safePercent));
};

const resizeOutputFromPointer = (clientY) => {
    const bounds = viewerPanel.getBoundingClientRect();
    const resizableHeight = Math.max(180, viewerPanel.clientHeight - 88);
    setOutputHeight(((clientY - bounds.top - 38) / resizableHeight) * 100);
};

outputRowResizer.addEventListener('pointerdown', (event) => {
    outputRowResizer.setPointerCapture(event.pointerId);
    outputRowResizer.classList.add('is-dragging');
    document.body.classList.add('is-row-resizing');
    resizeOutputFromPointer(event.clientY);
});
outputRowResizer.addEventListener('pointermove', (event) => {
    if (outputRowResizer.hasPointerCapture(event.pointerId)) resizeOutputFromPointer(event.clientY);
});
outputRowResizer.addEventListener('pointerup', (event) => {
    outputRowResizer.releasePointerCapture(event.pointerId);
    outputRowResizer.classList.remove('is-dragging');
    document.body.classList.remove('is-row-resizing');
});
outputRowResizer.addEventListener('pointercancel', () => {
    outputRowResizer.classList.remove('is-dragging');
    document.body.classList.remove('is-row-resizing');
});
outputRowResizer.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(outputRowResizer.getAttribute('aria-valuenow'));
    if (event.key === 'Home') setOutputHeight(32);
    else setOutputHeight(current + (event.key === 'ArrowDown' ? 5 : -5));
});
window.addEventListener('resize', () => {
    if (viewerPanel.style.gridTemplateRows) setOutputHeight(Number(outputRowResizer.getAttribute('aria-valuenow')));
});

