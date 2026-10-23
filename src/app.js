'use strict';

const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
};
const MODES = ['single', 'double', 'scroll'];
const FITS = ['screen', 'width', 'original'];
// Sorts "page2.jpg" before "page10.jpg".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const $ = (sel) => document.querySelector(sel);
const welcome = $('#welcome');
const reader = $('#reader');
const stage = $('#stage');
const titleEl = $('#title');
const modeSelect = $('#mode');
const fitSelect = $('#fit');
const rtlBtn = $('#btn-rtl');
const slider = $('#slider');
const counter = $('#counter');
const leftBtn = $('#btn-left');
const rightBtn = $('#btn-right');
const grid = $('#grid');
const thumbs = $('#thumbs');

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

const prefs = { mode: 'single', fit: 'screen', rtl: false, ...storage.get('cbz:prefs', {}) };
if (!MODES.includes(prefs.mode)) prefs.mode = 'single';
if (!FITS.includes(prefs.fit)) prefs.fit = 'screen';

const book = { pages: [], key: '', title: '' };
let index = 0;
let renderToken = 0;
let stripImgs = [];
let lazyObserver = null;
let thumbObserver = null;

// ---------- Opening & closing ----------

async function openFile(file, name = file?.name) {
  if (!file) return;
  showError('');
  setLoading(`Opening ${name}…`);
  try {
    const zip = await JSZip.loadAsync(file);
    const pages = [];
    zip.forEach((path, entry) => {
      const base = path.split('/').pop();
      if (entry.dir || path.startsWith('__MACOSX/') || base.startsWith('.') || !IMAGE_RE.test(base)) return;
      pages.push({ name: path, entry, load: null });
    });
    if (!pages.length) throw new Error('no images were found inside it.');
    pages.sort((a, b) => collator.compare(a.name, b.name));

    closeBook();
    book.pages = pages;
    book.key = `cbz:progress:${name}:${file.size}`;
    book.title = (await readComicInfoTitle(zip)) || name.replace(/\.(cbz|zip)$/i, '');
    document.title = `${book.title} · CBZ Reader`;
    titleEl.textContent = book.title;
    titleEl.title = book.title;
    slider.max = pages.length;
    welcome.hidden = true;
    reader.hidden = false;

    const saved = storage.get(book.key, 0);
    applyLayout(saved);
    if (saved > 0 && saved < pages.length) toast(`Resumed at page ${saved + 1}`);
    stage.focus();
  } catch (err) {
    console.error(err);
    showError(`Couldn't open “${name}”: ${err.message}`);
  } finally {
    setLoading(null);
  }
}

async function readComicInfoTitle(zip) {
  const info = Object.values(zip.files).find((f) => /(^|\/)comicinfo\.xml$/i.test(f.name));
  if (!info) return '';
  try {
    const xml = new DOMParser().parseFromString(await info.async('string'), 'application/xml');
    const field = (tag) => xml.querySelector(tag)?.textContent.trim() || '';
    const series = field('Series');
    const number = field('Number');
    const title = field('Title');
    if (series) return [series + (number ? ` #${number}` : ''), title].filter(Boolean).join(' – ');
    return title;
  } catch {
    return '';
  }
}

function closeBook() {
  lazyObserver?.disconnect();
  thumbObserver?.disconnect();
  lazyObserver = thumbObserver = null;
  for (const page of book.pages) {
    page.load?.then((url) => URL.revokeObjectURL(url)).catch(() => {});
  }
  book.pages = [];
  stripImgs = [];
  index = 0;
  renderToken++;
  stage.replaceChildren();
  thumbs.replaceChildren();
  grid.hidden = true;
}

function showWelcome() {
  closeBook();
  reader.hidden = true;
  welcome.hidden = false;
  document.title = 'CBZ Reader';
}

// Decompresses a page only when it is first needed.
function pageUrl(i) {
  const page = book.pages[i];
  if (!page.load) {
    const type = MIME[page.name.split('.').pop().toLowerCase()];
    page.load = page.entry.async('arraybuffer')
      .then((buf) => URL.createObjectURL(new Blob([buf], { type })));
  }
  return page.load;
}

// ---------- Layout & navigation ----------

function clampIndex(i) {
  return Math.max(0, Math.min(book.pages.length - 1, i | 0));
}

// In two-page mode the cover stands alone, then pages pair up: [0] [1,2] [3,4] …
function spreadStart(i) {
  if (prefs.mode !== 'double' || i === 0) return i;
  return i - ((i - 1) % 2);
}

function spreadPages(i) {
  const start = spreadStart(i);
  if (prefs.mode !== 'double' || start === 0 || start + 1 >= book.pages.length) return [start];
  return [start, start + 1];
}

function applyLayout(at = index) {
  stage.className = `fit-${prefs.fit} mode-${prefs.mode}`;
  modeSelect.value = prefs.mode;
  fitSelect.value = prefs.fit;
  rtlBtn.setAttribute('aria-pressed', prefs.rtl);
  slider.style.direction = prefs.rtl ? 'rtl' : 'ltr';
  thumbs.dir = prefs.rtl ? 'rtl' : 'ltr';
  storage.set('cbz:prefs', prefs);

  lazyObserver?.disconnect();
  lazyObserver = null;
  stripImgs = [];
  index = clampIndex(at);
  if (prefs.mode === 'scroll') {
    buildStrip();
  } else {
    index = spreadStart(index);
    renderPage();
  }
}

function goTo(i) {
  if (!book.pages.length) return;
  i = clampIndex(i);
  if (prefs.mode === 'scroll') {
    index = i;
    stripImgs[i]?.scrollIntoView({ block: 'start' });
    updateBar();
    return;
  }
  i = spreadStart(i);
  if (i === index && stage.firstChild) return;
  index = i;
  renderPage();
}

function next() {
  goTo(prefs.mode === 'scroll' ? index + 1 : spreadPages(index).at(-1) + 1);
}

function prev() {
  goTo(prefs.mode === 'scroll' ? index - 1 : spreadStart(index) - 1);
}

// "Left" and "right" swap meaning in right-to-left (manga) mode.
function goLeft() { prefs.rtl ? next() : prev(); }
function goRight() { prefs.rtl ? prev() : next(); }

// Space / PageDown: scroll within a tall page first, then turn the page.
function pageStep(dir) {
  const { scrollTop, scrollHeight, clientHeight } = stage;
  const atEdge = dir > 0 ? scrollTop + clientHeight >= scrollHeight - 2 : scrollTop <= 1;
  if (prefs.mode === 'scroll' || !atEdge) {
    stage.scrollBy({ top: dir * clientHeight * 0.9, behavior: 'smooth' });
  } else if (dir > 0) {
    next();
  } else {
    prev();
  }
}

async function renderPage() {
  const token = ++renderToken;
  const pages = spreadPages(index);
  updateBar();

  let imgs;
  try {
    const urls = await Promise.all(pages.map(pageUrl));
    imgs = urls.map((url, n) => {
      const img = new Image();
      img.src = url;
      img.alt = `Page ${pages[n] + 1}`;
      img.draggable = false;
      return img;
    });
    // Swap pages only once the new images are ready, so turning a page never flashes blank.
    await Promise.all(imgs.map((img) => new Promise((resolve) => {
      img.onload = img.onerror = resolve;
    })));
  } catch (err) {
    console.error(err);
    if (token !== renderToken) return;
    const msg = document.createElement('p');
    msg.className = 'stage-msg';
    msg.textContent = `Page ${index + 1} could not be read.`;
    stage.replaceChildren(msg);
    return;
  }
  if (token !== renderToken) return;

  const spread = document.createElement('div');
  spread.className = 'spread';
  spread.style.setProperty('--n', imgs.length);
  spread.append(...(prefs.rtl ? imgs.reverse() : imgs));
  stage.replaceChildren(spread);
  stage.scrollTo(0, 0);
  storage.set(book.key, index);

  // Warm up the neighbours so page turns feel instant.
  const last = pages.at(-1);
  for (const n of [last + 1, last + 2, pages[0] - 1]) {
    if (n >= 0 && n < book.pages.length) pageUrl(n).catch(() => {});
  }
}

function buildStrip() {
  renderToken++;
  const strip = document.createElement('div');
  strip.className = 'strip';
  lazyObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const img = entry.target;
      lazyObserver.unobserve(img);
      pageUrl(+img.dataset.index).then((url) => { img.src = url; }).catch(console.error);
    }
  }, { root: stage, rootMargin: '150% 0px' });

  stripImgs = book.pages.map((_, i) => {
    const img = new Image();
    img.dataset.index = i;
    img.alt = `Page ${i + 1}`;
    img.draggable = false;
    img.className = 'pending';
    img.addEventListener('load', () => img.classList.remove('pending'), { once: true });
    lazyObserver.observe(img);
    return img;
  });
  strip.append(...stripImgs);
  stage.replaceChildren(strip);
  updateBar();
  requestAnimationFrame(() => stripImgs[index]?.scrollIntoView({ block: 'start' }));
}

// In scroll mode, the current page is the one crossing 40% of the viewport height.
function trackScroll() {
  if (!stripImgs.length) return;
  const line = stage.getBoundingClientRect().top + stage.clientHeight * 0.4;
  let lo = 0;
  let hi = stripImgs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (stripImgs[mid].getBoundingClientRect().top <= line) lo = mid;
    else hi = mid - 1;
  }
  if (lo !== index) {
    index = lo;
    updateBar();
    storage.set(book.key, index);
  }
}

function updateBar() {
  const total = book.pages.length;
  const pages = prefs.mode === 'scroll' ? [index] : spreadPages(index);
  counter.textContent = pages.length > 1
    ? `${pages[0] + 1}–${pages[1] + 1} / ${total}`
    : `${pages[0] + 1} / ${total}`;
  slider.value = index + 1;
  const atStart = pages[0] <= 0;
  const atEnd = pages.at(-1) >= total - 1;
  leftBtn.disabled = prefs.rtl ? atEnd : atStart;
  rightBtn.disabled = prefs.rtl ? atStart : atEnd;
}

// ---------- Page grid ----------

function openGrid() {
  if (!thumbs.children.length) buildGrid();
  grid.hidden = false;
  const visible = new Set(prefs.mode === 'scroll' ? [index] : spreadPages(index));
  for (const btn of thumbs.children) btn.classList.toggle('current', visible.has(+btn.dataset.index));
  thumbs.children[index]?.scrollIntoView({ block: 'center' });
  thumbs.children[index]?.focus();
}

function closeGrid() {
  grid.hidden = true;
  stage.focus();
}

function buildGrid() {
  thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const btn = entry.target;
      thumbObserver.unobserve(btn);
      pageUrl(+btn.dataset.index).then((url) => { btn.firstChild.src = url; }).catch(console.error);
    }
  }, { root: thumbs, rootMargin: '400px 0px' });

  book.pages.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.dataset.index = i;
    btn.title = `Page ${i + 1}`;
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('span');
    label.textContent = i + 1;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      closeGrid();
      goTo(i);
    });
    thumbs.append(btn);
    thumbObserver.observe(btn);
  });
}

// ---------- UI helpers ----------

function showError(message) {
  $('#error').textContent = message;
  if (message && !reader.hidden) alert(message);
}

function setLoading(message) {
  const el = $('#loading');
  el.hidden = !message;
  el.querySelector('span').textContent = message || '';
}

let toastTimer = 0;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// ---------- Events ----------

// window.cbz is provided by the desktop app (electron/preload.js).
cbz.onOpenFile(({ name, data }) => openFile(new Blob([data]), name));
cbz.onCloseBook(() => {
  if (!reader.hidden) showWelcome();
});
$('#btn-open-welcome').addEventListener('click', cbz.openDialog);
$('#btn-open').addEventListener('click', cbz.openDialog);
$('#btn-sample').addEventListener('click', cbz.openSample);

$('#btn-close').addEventListener('click', showWelcome);
$('#btn-grid').addEventListener('click', openGrid);
$('#btn-grid-close').addEventListener('click', closeGrid);
$('#btn-full').addEventListener('click', toggleFullscreen);
if (!document.fullscreenEnabled) $('#btn-full').hidden = true;
leftBtn.addEventListener('click', goLeft);
rightBtn.addEventListener('click', goRight);
slider.addEventListener('input', () => goTo(slider.value - 1));

modeSelect.addEventListener('change', () => {
  prefs.mode = modeSelect.value;
  applyLayout();
});
fitSelect.addEventListener('change', () => {
  prefs.fit = fitSelect.value;
  applyLayout();
});
rtlBtn.addEventListener('click', () => {
  prefs.rtl = !prefs.rtl;
  applyLayout();
});

// Tap the left or right third of the page to turn it; tap the middle to hide the bars.
stage.addEventListener('click', (e) => {
  const rect = stage.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  if (prefs.mode !== 'scroll' && x < 0.3) goLeft();
  else if (prefs.mode !== 'scroll' && x > 0.7) goRight();
  else reader.classList.toggle('hide-ui');
});

let scrollFrame = 0;
stage.addEventListener('scroll', () => {
  if (prefs.mode !== 'scroll' || scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    trackScroll();
  });
});

let touchStart = null;
stage.addEventListener('touchstart', (e) => {
  touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (!touchStart || prefs.mode === 'scroll' || window.visualViewport?.scale > 1) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) goRight();
    else goLeft();
  }
});

document.addEventListener('keydown', (e) => {
  if (reader.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!grid.hidden) {
    if (e.key === 'Escape' || e.key === 'g') {
      e.preventDefault();
      closeGrid();
    }
    return;
  }
  if (e.target instanceof Element && e.target.matches('input, select')) return;
  switch (e.key) {
    case 'ArrowLeft': case 'a': goLeft(); break;
    case 'ArrowRight': case 'd': goRight(); break;
    case 'ArrowDown': case 's': stage.scrollBy({ top: 120 }); break;
    case 'ArrowUp': case 'w': stage.scrollBy({ top: -120 }); break;
    case ' ': pageStep(e.shiftKey ? -1 : 1); break;
    case 'PageDown': pageStep(1); break;
    case 'PageUp': pageStep(-1); break;
    case 'Home': goTo(0); break;
    case 'End': goTo(book.pages.length - 1); break;
    case 'f': toggleFullscreen(); break;
    case 'g': openGrid(); break;
    case 'h': reader.classList.toggle('hide-ui'); break;
    default: return;
  }
  e.preventDefault();
});

// Drag and drop a file anywhere on the page.
let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer?.types.includes('Files');
window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  document.body.classList.add('dragging');
});
window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('dragging');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  openFile(e.dataTransfer.files[0]);
});
