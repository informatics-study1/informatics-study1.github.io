const elements = {
  bars: document.querySelector('#bars'),
  play: document.querySelector('#playButton'),
  playLabel: document.querySelector('#playLabel'),
  step: document.querySelector('#stepButton'),
  reset: document.querySelector('#resetButton'),
  arrayInput: document.querySelector('#arrayInput'),
  applyArray: document.querySelector('#applyArrayButton'),
  arrayError: document.querySelector('#arrayInputError'),
  directions: document.querySelectorAll('input[name="direction"]'),
  directionHint: document.querySelector('#directionHint'),
  speed: document.querySelector('#speedRange'),
  speedOutput: document.querySelector('#speedOutput'),
  comparison: document.querySelector('#comparisonCount'),
  swaps: document.querySelector('#swapCount'),
  message: document.querySelector('#processMessage'),
};

let values = [];
let originalValues = [];
let steps = [];
let stepIndex = 0;
let comparisonCount = 0;
let swapCount = 0;
let timer = null;
let visualState = { active: [], sorted: [], swapping: false };

const speedNames = ['とても遅い', 'ゆっくり', 'ふつう', 'はやい', '最速'];
const speedDelays = [1200, 850, 520, 280, 120];

function randomValues(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 76) + 18);
}

function buildSteps(source, direction) {
  const work = [...source];
  const result = [];
  if (direction === 'rtl') {
    for (let start = 0; start < work.length - 1; start++) {
      let changed = false;
      const sorted = Array.from({ length: start }, (_, i) => i);
      for (let i = work.length - 1; i > start; i--) {
        result.push({ type: 'compare', indices: [i - 1, i], values: [...work], sorted });
        if (work[i - 1] > work[i]) {
          [work[i - 1], work[i]] = [work[i], work[i - 1]];
          changed = true;
          result.push({ type: 'swap', indices: [i - 1, i], values: [...work], sorted });
        }
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [...sorted, start], settledIndex: start });
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
        result.push({ type: 'compare', indices: [i, i + 1], values: [...work], sorted });
        if (work[i] > work[i + 1]) {
          [work[i], work[i + 1]] = [work[i + 1], work[i]];
          changed = true;
          result.push({ type: 'swap', indices: [i, i + 1], values: [...work], sorted });
        }
      }
      result.push({ type: 'settle', indices: [], values: [...work], sorted: [end, ...sorted], settledIndex: end });
      if (!changed) {
        result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
        return result;
      }
    }
  }
  result.push({ type: 'done', indices: [], values: [...work], sorted: work.map((_, i) => i) });
  return result;
}

function selectedDirection() {
  return document.querySelector('input[name="direction"]:checked').value;
}

function render() {
  const max = Math.max(...values);
  elements.bars.replaceChildren(...values.map((value, index) => {
    const item = document.createElement('div');
    item.className = 'bar-item';
    if (visualState.active.includes(index)) item.classList.add(visualState.swapping ? 'swapping' : 'comparing');
    if (visualState.sorted.includes(index)) item.classList.add('sorted');
    const label = document.createElement('span');
    label.className = 'bar-value';
    label.textContent = value;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(12, (value / max) * 88)}%`;
    item.append(label, bar);
    return item;
  }));
  elements.bars.setAttribute('aria-label', `現在の配列: ${values.join(', ')}`);
}

function updateStats() {
  elements.comparison.textContent = comparisonCount;
  elements.swaps.textContent = swapCount;
}

function applyNextStep() {
  if (stepIndex >= steps.length) return finish();
  const step = steps[stepIndex++];
  values = [...step.values];
  visualState = {
    active: step.indices,
    sorted: step.sorted,
    swapping: step.type === 'swap',
  };

  if (step.type === 'compare') {
    comparisonCount++;
    const [a, b] = step.indices;
    elements.message.textContent = `${values[a]} と ${values[b]} を比較します。`;
  } else if (step.type === 'swap') {
    swapCount++;
    const [a, b] = step.indices;
    elements.message.textContent = `順番を交換：${values[a]} ←→ ${values[b]}`;
  } else if (step.type === 'settle') {
    elements.message.textContent = `${values[step.settledIndex]} の位置が確定しました。`;
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
  visualState = { active: [], sorted: values.map((_, i) => i), swapping: false };
  elements.message.textContent = '並べ替えが完了しました！';
  render();
}

function reset() {
  pause();
  values = [...originalValues];
  steps = buildSteps(values, selectedDirection());
  stepIndex = 0;
  comparisonCount = 0;
  swapCount = 0;
  visualState = { active: [], sorted: [], swapping: false };
  elements.message.textContent = '「実行」を押すと、並べ替えを開始します。';
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
elements.directions.forEach(input => input.addEventListener('change', () => {
  elements.directionHint.textContent = input.value === 'ltr'
    ? '最大値を右端へ移動します'
    : '最小値を左端へ移動します';
  reset();
}));

elements.speed.addEventListener('input', () => {
  elements.speedOutput.textContent = speedNames[Number(elements.speed.value) - 1];
  paintRange(elements.speed);
  if (elements.play.classList.contains('playing')) scheduleNext();
});

paintRange(elements.speed);
newArray();
