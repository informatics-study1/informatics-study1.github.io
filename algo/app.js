const elements = {
  bars: document.querySelector('#bars'),
  play: document.querySelector('#playButton'),
  playLabel: document.querySelector('#playLabel'),
  step: document.querySelector('#stepButton'),
  reset: document.querySelector('#resetButton'),
  arrayInput: document.querySelector('#arrayInput'),
  applyArray: document.querySelector('#applyArrayButton'),
  arrayError: document.querySelector('#arrayInputError'),
  algorithms: document.querySelectorAll('input[name="algorithm"]'),
  algorithmTitle: document.querySelector('#algorithmTitle'),
  algorithmTipTitle: document.querySelector('#algorithmTipTitle'),
  algorithmTipText: document.querySelector('#algorithmTipText'),
  directions: document.querySelectorAll('input[name="direction"]'),
  displayModes: document.querySelectorAll('input[name="displayMode"]'),
  speed: document.querySelector('#speedRange'),
  speedOutput: document.querySelector('#speedOutput'),
  comparison: document.querySelector('#comparisonCount'),
  swaps: document.querySelector('#swapCount'),
  secondaryStatLabel: document.querySelector('#secondaryStatLabel'),
  message: document.querySelector('#processMessage'),
  variableMessage: document.querySelector('#variableMessage'),
  codePanel: document.querySelector('#codePanel'),
  pythonCode: document.querySelector('#pythonCode'),
  searchTargetGroup: document.querySelector('#searchTargetGroup'),
  searchTargetInput: document.querySelector('#searchTargetInput'),
  sortedLegendLabel: document.querySelector('#sortedLegendLabel'),
};

let values = [];
let originalValues = [];
let steps = [];
let stepIndex = 0;
let comparisonCount = 0;
let swapCount = 0;
let searchResult = null;
let timer = null;
let visualState = { active: [], sorted: [], swapping: false, variables: {} };

const speedNames = ['とても遅い', 'ゆっくり', 'ふつう', 'はやい', '最速'];
const speedDelays = [1200, 850, 520, 280, 120];

function randomValues(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 76) + 18);
}

function buildBubbleSteps(source, direction) {
  const work = [...source];
  const result = [];
  if (direction === 'rtl') {
    for (let i = 0; i < work.length - 1; i++) {
      let changed = false;
      const sorted = Array.from({ length: i }, (_, index) => index);
      for (let j = work.length - 2; j >= i; j--) {
        const variables = { i, j };
        result.push({ type: 'compare', indices: [j, j + 1], values: [...work], sorted, variables, codeLines: [6] });
        if (work[j] > work[j + 1]) {
          [work[j], work[j + 1]] = [work[j + 1], work[j]];
          changed = true;
          result.push({ type: 'swap', indices: [j, j + 1], values: [...work], sorted, variables, codeLines: [7, 8, 9] });
        }
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [...sorted, i], settledIndex: i, variables: { i }, codeLines: [4] });
      if (!changed) {
        result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
        return result;
      }
    }
  } else {
    for (let end = work.length - 1; end > 0; end--) {
      let changed = false;
      const sorted = Array.from({ length: work.length - end - 1 }, (_, i) => end + 1 + i);
      for (let i = 0; i < end; i++) {
        const variables = { i: end, j: i };
        result.push({ type: 'compare', indices: [i, i + 1], values: [...work], sorted, variables, codeLines: [6] });
        if (work[i] > work[i + 1]) {
          [work[i], work[i + 1]] = [work[i + 1], work[i]];
          changed = true;
          result.push({ type: 'swap', indices: [i, i + 1], values: [...work], sorted, variables, codeLines: [7, 8, 9] });
        }
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [end, ...sorted], settledIndex: end, variables: { i: end }, codeLines: [4] });
      if (!changed) {
        result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
        return result;
      }
    }
  }
  result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
  return result;
}

function buildSelectionSteps(source, direction) {
  const work = [...source];
  const result = [];

  if (direction === 'rtl') {
    for (let end = work.length - 1; end > 0; end--) {
      let selected = end;
      const sorted = Array.from({ length: work.length - end - 1 }, (_, i) => end + 1 + i);
      for (let i = end - 1; i >= 0; i--) {
        result.push({ type: 'compare', indices: [selected, i], values: [...work], sorted, variables: { i: end, j: i, max_index: selected }, codeLines: [7] });
        if (work[i] > work[selected]) selected = i;
      }
      if (selected !== end) {
        [work[selected], work[end]] = [work[end], work[selected]];
        result.push({ type: 'swap', indices: [selected, end], values: [...work], sorted, variables: { i: end, max_index: selected }, codeLines: [9, 10, 11] });
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [end, ...sorted], settledIndex: end, variables: { i: end }, codeLines: [4] });
    }
  } else {
    for (let start = 0; start < work.length - 1; start++) {
      let selected = start;
      const sorted = Array.from({ length: start }, (_, i) => i);
      for (let i = start + 1; i < work.length; i++) {
        result.push({ type: 'compare', indices: [selected, i], values: [...work], sorted, variables: { i: start, j: i, min_index: selected }, codeLines: [7] });
        if (work[i] < work[selected]) selected = i;
      }
      if (selected !== start) {
        [work[selected], work[start]] = [work[start], work[selected]];
        result.push({ type: 'swap', indices: [selected, start], values: [...work], sorted, variables: { i: start, min_index: selected }, codeLines: [9, 10, 11] });
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [...sorted, start], settledIndex: start, variables: { i: start }, codeLines: [4] });
    }
  }

  result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
  return result;
}

function buildInsertionSteps(source, direction) {
  const work = [...source];
  const result = [];

  if (direction === 'rtl') {
    for (let start = work.length - 2; start >= 0; start--) {
      const insertedValue = work[start];
      const sorted = Array.from({ length: work.length - start - 1 }, (_, i) => start + 1 + i);
      let index = start;
      while (index < work.length - 1) {
        const variables = { i: start, j: index };
        result.push({ type: 'compare', indices: [index, index + 1], values: [...work], sorted, variables, codeLines: [6] });
        if (work[index] <= work[index + 1]) break;
        [work[index], work[index + 1]] = [work[index + 1], work[index]];
        result.push({ type: 'swap', indices: [index, index + 1], values: [...work], sorted, variables, codeLines: [7, 8, 9] });
        index++;
      }
      result.push({
        type: 'settle',
        indices: [],
        values: [...work],
        sorted: [start, ...sorted],
        settledIndex: index,
        variables: { i: start, j: index },
        codeLines: [4],
        message: `${insertedValue} を右側の整列済み部分に挿入しました。`,
      });
    }
  } else {
    for (let end = 1; end < work.length; end++) {
      const insertedValue = work[end];
      const sorted = Array.from({ length: end }, (_, i) => i);
      let index = end;
      while (index > 0) {
        const variables = { i: end, j: index, 'j-1': index - 1 };
        result.push({ type: 'compare', indices: [index - 1, index], values: [...work], sorted, variables, codeLines: [6] });
        if (work[index - 1] <= work[index]) break;
        [work[index - 1], work[index]] = [work[index], work[index - 1]];
        result.push({ type: 'swap', indices: [index - 1, index], values: [...work], sorted, variables, codeLines: [7, 8, 9] });
        index--;
      }
      result.push({
        type: 'settle',
        indices: [],
        values: [...work],
        sorted: [...sorted, end],
        settledIndex: index,
        variables: { i: end, j: index },
        codeLines: [4],
        message: `${insertedValue} を左側の整列済み部分に挿入しました。`,
      });
    }
  }

  result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
  return result;
}

function buildLinearSearchSteps(source, direction, target) {
  const result = [];
  const indices = direction === 'rtl'
    ? Array.from({ length: source.length }, (_, index) => source.length - 1 - index)
    : source.map((_, index) => index);
  const checked = [];

  for (const i of indices) {
    const variables = { i };
    result.push({ type: 'compare', indices: [i], values: [...source], sorted: [...checked], variables, codeLines: [6], target });
    if (source[i] === target) {
      result.push({ type: 'found', indices: [i], values: [...source], sorted: [...checked, i], variables, codeLines: [7, 8], target });
      return result;
    }
    checked.push(i);
  }

  result.push({ type: 'not-found', indices: [], values: [...source], sorted: [...checked], variables: {}, codeLines: [9], target });
  return result;
}

function buildBinarySearchSteps(source, direction, target) {
  const result = [];
  const checked = new Set();
  let low = 0;
  let high = source.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const variables = { low, mid, high };
    result.push({ type: 'compare', indices: [mid], values: [...source], sorted: [...checked], variables, codeLines: [7, 8, 9], target });

    if (source[mid] === target) {
      result.push({ type: 'found', indices: [mid], values: [...source], sorted: [...checked, mid], variables, codeLines: [10, 11], target });
      return result;
    }

    const moveLow = direction === 'rtl' ? source[mid] > target : source[mid] < target;
    if (moveLow) {
      for (let index = low; index <= mid; index++) checked.add(index);
      low = mid + 1;
      result.push({ type: 'narrow', indices: [], values: [...source], sorted: [...checked], variables: low <= high ? { low, high } : {}, codeLines: [12, 13], target });
    } else {
      for (let index = mid; index <= high; index++) checked.add(index);
      high = mid - 1;
      result.push({ type: 'narrow', indices: [], values: [...source], sorted: [...checked], variables: low <= high ? { low, high } : {}, codeLines: [14, 15], target });
    }
  }

  result.push({ type: 'not-found', indices: [], values: [...source], sorted: [...checked], variables: {}, codeLines: [16], target });
  return result;
}

function selectedAlgorithm() {
  return document.querySelector('input[name="algorithm"]:checked').value;
}

function buildSteps(source, direction) {
  const algorithm = selectedAlgorithm();
  if (algorithm === 'linear') return buildLinearSearchSteps(source, direction, Number(elements.searchTargetInput.value));
  if (algorithm === 'binary') return buildBinarySearchSteps(source, direction, Number(elements.searchTargetInput.value));
  if (algorithm === 'selection') return buildSelectionSteps(source, direction);
  if (algorithm === 'insertion') return buildInsertionSteps(source, direction);
  return buildBubbleSteps(source, direction);
}

function updateAlgorithmDescription() {
  const algorithm = selectedAlgorithm();
  const descriptions = {
    bubble: {
      englishName: 'Bubble',
      name: 'バブルソート',
      text: '隣り合う2つの値を順に比較し、左の値が大きければ入れ替える整列方法です。左から走査すると最大値が右端へ、右から走査すると最小値が左端へ確定します。この処理を交換がなくなるまで繰り返します。',
    },
    selection: {
      englishName: 'Selection',
      name: '選択ソート',
      text: '未整列の範囲から最小値または最大値を探し、端の値と交換する整列方法です。左から走査すると最小値が左端へ、右から走査すると最大値が右端へ順に確定します。',
    },
    insertion: {
      englishName: 'Insertion',
      name: '挿入ソート',
      text: '値を1つずつ取り出し、すでに整列した範囲の適切な位置へ挿入する整列方法です。左から走査すると左側へ、右から走査すると右側へ整列済みの範囲を広げます。',
    },
    linear: {
      englishName: 'Linear Search',
      name: '線形探索',
      text: '配列の先頭または末尾から値を1つずつ調べ、目的の値と一致する要素を探す方法です。目的の値が見つかった時点で探索を終了します。',
    },
    binary: {
      englishName: 'Binary Search',
      name: '二分探索',
      text: '整列済みの配列の中央を調べ、目的の値がある可能性のない半分を除外しながら探索する方法です。探索範囲がステップごとに約半分になります。',
    },
  };
  const description = descriptions[algorithm];
  elements.algorithmTitle.textContent = description.name;
  elements.algorithmTipTitle.textContent = `${description.name}とは？`;
  elements.algorithmTipText.textContent = description.text;
  const isSearch = algorithm === 'linear' || algorithm === 'binary';
  elements.searchTargetGroup.hidden = !isSearch;
  elements.secondaryStatLabel.textContent = isSearch ? '発見位置' : '交換回数';
  elements.sortedLegendLabel.textContent = isSearch ? '探索対象外' : '整列済み';
  document.title = 'アルゴリズム図鑑';
}

function selectedDirection() {
  return document.querySelector('input[name="direction"]:checked').value;
}

function selectedDisplayMode() {
  return document.querySelector('input[name="displayMode"]:checked').value;
}

function appendHighlightedPython(container, source) {
  const tokenPattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+\b|\b(?:for|in|if|while|and|or|not|else|elif|break|continue)\b|\b(?:print|len|range)\b|(?:==|!=|<=|>=|\/\/|\+|-|\*|\/|%|=|<|>))/g;
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    if (match.index > cursor) container.append(document.createTextNode(source.slice(cursor, match.index)));
    const token = match[0];
    const span = document.createElement('span');
    if (token.startsWith('#')) span.className = 'token-comment';
    else if (token.startsWith('"') || token.startsWith("'")) span.className = 'token-string';
    else if (/^\d+$/.test(token)) span.className = 'token-number';
    else if (/^(?:for|in|if|while|and|or|not|else|elif|break|continue)$/.test(token)) span.className = 'token-keyword';
    else if (/^(?:print|len|range)$/.test(token)) span.className = 'token-function';
    else span.className = 'token-operator';
    span.textContent = token;
    container.append(span);
    cursor = match.index + token.length;
  }

  if (cursor < source.length) container.append(document.createTextNode(source.slice(cursor)));
}

function renderPythonCode(activeLines = []) {
  const algorithm = selectedAlgorithm();
  const rightToLeft = selectedDirection() === 'rtl';
  const baseSource = originalValues.length ? originalValues : values;
  const source = algorithm === 'binary'
    ? [...baseSource].sort((a, b) => rightToLeft ? b - a : a - b)
    : baseSource;
  const commonStart = [
    `Data = [${source.join(', ')}]`,
    'n = len(Data)',
    'print("整列前", Data)',
  ];
  let lines;

  if (algorithm === 'binary') {
    const target = Number(elements.searchTargetInput.value);
    lines = [
      `Data = [${source.join(', ')}]`,
      'n = len(Data)',
      `target = ${target}`,
      'low = 0',
      'high = n - 1',
      'found = -1',
      'while low <= high:',
      '    mid = (low + high) // 2',
      '    if Data[mid] == target:',
      '        found = mid',
      '        break',
      `    if Data[mid] ${rightToLeft ? '>' : '<'} target:`,
      '        low = mid + 1',
      '    else:',
      '        high = mid - 1',
      'print(found)',
    ];
  } else if (algorithm === 'linear') {
    const target = Number(elements.searchTargetInput.value);
    lines = [
      `Data = [${source.join(', ')}]`,
      'n = len(Data)',
      `target = ${target}`,
      'found = -1',
      rightToLeft ? 'for i in range(n - 1, -1, -1):' : 'for i in range(0, n, 1):',
      '    if Data[i] == target:',
      '        found = i',
      '        break',
      'print(found)',
    ];
  } else if (algorithm === 'selection') {
    const target = rightToLeft ? 'max_index' : 'min_index';
    lines = [
      ...commonStart,
      rightToLeft ? 'for i in range(n - 1, 0, -1):' : 'for i in range(0, n - 1, 1):',
      `    ${target} = i`,
      rightToLeft ? '    for j in range(i - 1, -1, -1):' : '    for j in range(i + 1, n, 1):',
      `        if Data[j] ${rightToLeft ? '>' : '<'} Data[${target}]:`,
      `            ${target} = j`,
      `    tmp = Data[${target}]`,
      `    Data[${target}] = Data[i]`,
      `    Data[i] = tmp`,
      'print("整列後", Data)',
    ];
  } else if (algorithm === 'insertion') {
    lines = [
      ...commonStart,
      rightToLeft ? 'for i in range(n - 2, -1, -1):' : 'for i in range(1, n, 1):',
      '    j = i',
      rightToLeft ? '    while j < n - 1 and Data[j] > Data[j + 1]:' : '    while j > 0 and Data[j - 1] > Data[j]:',
      rightToLeft ? '        tmp = Data[j]' : '        tmp = Data[j - 1]',
      rightToLeft ? '        Data[j] = Data[j + 1]' : '        Data[j - 1] = Data[j]',
      rightToLeft ? '        Data[j + 1] = tmp' : '        Data[j] = tmp',
      rightToLeft ? '        j += 1' : '        j = j - 1',
      'print("整列後", Data)',
    ];
  } else {
    lines = [
      ...commonStart,
      rightToLeft ? 'for i in range(0, n - 1, 1):' : 'for i in range(n - 1, 0, -1):',
      rightToLeft ? '    for j in range(n - 2, i - 1, -1):' : '    for j in range(0, i, 1):',
      '        if Data[j] > Data[j + 1]:',
      '            tmp = Data[j]',
      '            Data[j] = Data[j + 1]',
      '            Data[j + 1] = tmp',
      'print("整列後", Data)',
    ];
  }

  const highlightedLines = activeLines.includes(10)
    && visualState.active.length === 0
    && visualState.sorted.length === values.length
    ? [lines.length]
    : activeLines;

  elements.pythonCode.replaceChildren(...lines.map((text, index) => {
    const lineNumber = index + 1;
    const line = document.createElement('li');
    line.dataset.line = lineNumber;
    appendHighlightedPython(line, text);
    line.classList.toggle('active', highlightedLines.includes(lineNumber));
    return line;
  }));
}

function render() {
  renderPythonCode(visualState.codeLines || []);
  const displayMode = selectedDisplayMode();
  const max = Math.max(...values);
  elements.bars.classList.toggle('view-cards', displayMode === 'cards');
  elements.bars.classList.toggle('view-bars', displayMode === 'bars');
  elements.bars.replaceChildren(...values.map((value, index) => {
    const item = document.createElement('div');
    item.className = 'bar-item';
    if (visualState.active.includes(index)) item.classList.add(visualState.swapping ? 'swapping' : 'comparing');
    if (visualState.sorted.includes(index)) {
      const algorithm = selectedAlgorithm();
      item.classList.add(algorithm === 'linear' || algorithm === 'binary' ? 'excluded' : 'sorted');
    }
    const label = document.createElement('span');
    label.className = 'bar-value';
    label.textContent = value;
    const variableBadges = document.createElement('span');
    variableBadges.className = 'variable-badges';
    Object.entries(visualState.variables)
      .filter(([, position]) => position === index)
      .forEach(([name]) => {
        const badge = document.createElement('code');
        badge.textContent = name;
        variableBadges.append(badge);
      });
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--bar-height', `${Math.max(12, (value / max) * 88)}%`);
    bar.append(variableBadges, label);
    const indexLabel = document.createElement('code');
    indexLabel.className = 'index-label';
    indexLabel.textContent = `[${index}]`;
    item.append(bar, indexLabel);
    return item;
  }));
  elements.bars.setAttribute('aria-label', `現在の配列（${displayMode === 'cards' ? 'カード' : '棒グラフ'}表示）: ${values.join(', ')}`);
}

function updateStats() {
  elements.comparison.textContent = comparisonCount;
  const algorithm = selectedAlgorithm();
  const isSearch = algorithm === 'linear' || algorithm === 'binary';
  elements.swaps.textContent = isSearch ? (searchResult ?? '—') : swapCount;
}

function applyNextStep() {
  if (stepIndex >= steps.length) return finish();
  const step = steps[stepIndex++];
  values = [...step.values];
  visualState = {
    active: step.indices,
    sorted: step.sorted,
    swapping: step.type === 'swap',
    variables: step.variables || {},
    codeLines: step.codeLines || [],
  };
  const variableEntries = Object.entries(visualState.variables);
  elements.variableMessage.textContent = variableEntries.length
    ? variableEntries.map(([name, index]) => `${name} = ${index}`).join('　')
    : 'ループ処理が完了しました。';

  if (step.type === 'compare') {
    comparisonCount++;
    const [a, b] = step.indices;
    const algorithm = selectedAlgorithm();
    elements.message.textContent = algorithm === 'linear' || algorithm === 'binary'
      ? `${values[a]} と探索値 ${step.target} を比較します。`
      : `${values[a]} と ${values[b]} を比較します。`;
  } else if (step.type === 'swap') {
    swapCount++;
    const [a, b] = step.indices;
    elements.message.textContent = `順番を交換：${values[a]} ←→ ${values[b]}`;
  } else if (step.type === 'settle') {
    elements.message.textContent = step.message || `${values[step.settledIndex]} の位置が確定しました。`;
  } else if (step.type === 'narrow') {
    elements.message.textContent = visualState.variables.low === undefined
      ? '探索範囲がなくなりました。'
      : `探索範囲を [${visualState.variables.low}] から [${visualState.variables.high}] に絞ります。`;
  } else if (step.type === 'found') {
    searchResult = step.indices[0];
    elements.message.textContent = `探索値 ${step.target} が添字 [${searchResult}] で見つかりました。`;
    pause();
  } else if (step.type === 'not-found') {
    searchResult = 'なし';
    elements.message.textContent = `探索値 ${step.target} は配列内に見つかりませんでした。`;
    pause();
  } else {
    finish();
    return;
  }
  updateStats();
  render();
}

function scheduleNext() {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    applyNextStep();
    if (elements.play.classList.contains('playing')) scheduleNext();
  }, speedDelays[Number(elements.speed.value) - 1]);
}

function play() {
  if (stepIndex >= steps.length) reset();
  elements.play.classList.add('playing');
  elements.playLabel.textContent = '停止 ■';
  elements.step.disabled = true;
  scheduleNext();
}

function pause() {
  clearTimeout(timer);
  timer = null;
  elements.play.classList.remove('playing');
  elements.playLabel.textContent = '実行 ▶';
  elements.step.disabled = false;
}

function finish() {
  pause();
  visualState = { active: [], sorted: values.map((_, i) => i), swapping: false, variables: {}, codeLines: [10] };
  elements.message.textContent = '並べ替えが完了しました！';
  elements.variableMessage.textContent = 'すべての要素が整列済みです。';
  render();
}

function reset() {
  pause();
  const algorithm = selectedAlgorithm();
  values = algorithm === 'binary'
    ? [...originalValues].sort((a, b) => selectedDirection() === 'rtl' ? b - a : a - b)
    : [...originalValues];
  steps = buildSteps(values, selectedDirection());
  stepIndex = 0;
  comparisonCount = 0;
  swapCount = 0;
  searchResult = null;
  visualState = { active: [], sorted: [], swapping: false, variables: {} };
  const isSearch = algorithm === 'linear' || algorithm === 'binary';
  elements.message.textContent = isSearch
    ? '「実行」を押すと、探索を開始します。'
    : '「実行」を押すと、並べ替えを開始します。';
  elements.variableMessage.textContent = isSearch
    ? (algorithm === 'binary' ? '変数 low・mid・high の位置を表示します。' : '変数 i の位置を各要素の上に表示します。')
    : '添字は各要素の下に表示されます。';
  updateStats();
  render();
}

function newArray() {
  originalValues = randomValues(originalValues.length || 8);
  elements.arrayInput.value = originalValues.join(', ');
  clearArrayError();
  reset();
}

function clearArrayError() {
  elements.arrayError.textContent = '';
  elements.arrayInput.classList.remove('invalid');
  elements.arrayInput.removeAttribute('aria-invalid');
}

function showArrayError(message) {
  elements.arrayError.textContent = message;
  elements.arrayInput.classList.add('invalid');
  elements.arrayInput.setAttribute('aria-invalid', 'true');
}

function applyCustomArray() {
  const rawItems = elements.arrayInput.value.split(/[,、\s]+/).filter(Boolean);
  if (rawItems.length < 5 || rawItems.length > 14) {
    showArrayError('数値は5〜14個入力してください。');
    return;
  }
  if (rawItems.some(item => !/^\d+$/.test(item))) {
    showArrayError('半角の整数だけを入力してください。');
    return;
  }
  const parsed = rawItems.map(Number);
  if (parsed.some(value => value < 1 || value > 99)) {
    showArrayError('各数値は1〜99の範囲で入力してください。');
    return;
  }

  clearArrayError();
  originalValues = parsed;
  elements.arrayInput.value = parsed.join(', ');
  reset();
}

function paintRange(input) {
  const percent = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.background = `linear-gradient(to right, var(--blue) 0 ${percent}%, #d9dde1 ${percent}% 100%)`;
}

elements.play.addEventListener('click', () => elements.play.classList.contains('playing') ? pause() : play());
elements.step.addEventListener('click', () => {
  if (stepIndex >= steps.length) reset();
  applyNextStep();
});
elements.reset.addEventListener('click', reset);
elements.applyArray.addEventListener('click', applyCustomArray);
elements.arrayInput.addEventListener('input', clearArrayError);
elements.arrayInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') applyCustomArray();
});
elements.searchTargetInput.addEventListener('change', () => {
  const value = Math.min(99, Math.max(1, Number(elements.searchTargetInput.value) || 1));
  elements.searchTargetInput.value = value;
  reset();
});
elements.directions.forEach(input => input.addEventListener('change', () => {
  reset();
}));
elements.displayModes.forEach(input => input.addEventListener('change', render));
elements.algorithms.forEach(input => input.addEventListener('change', () => {
  updateAlgorithmDescription();
  reset();
}));

elements.speed.addEventListener('input', () => {
  elements.speedOutput.textContent = speedNames[Number(elements.speed.value) - 1];
  paintRange(elements.speed);
  if (elements.play.classList.contains('playing')) scheduleNext();
});

paintRange(elements.speed);
updateAlgorithmDescription();
newArray();
