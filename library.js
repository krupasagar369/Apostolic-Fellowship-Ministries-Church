/* ============================================================
   Divine Dove Glow — Library JS
   Fetches real data from Google Apps Script API
   ============================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbxXBcWwaPhoPVg5f2zr518DHYgaVJp1qlcDLwwlYH40HPr3BZyBDWyT1TDUVHUut19P/exec';

const COVER_GRADS = [
  'linear-gradient(135deg,#1e3a8a,#fbbf24)',
  'linear-gradient(135deg,#0f172a,#3b82f6)',
  'linear-gradient(135deg,#1e1b4b,#c9a84c)',
  'linear-gradient(135deg,#0c2340,#2d8a9e)',
  'linear-gradient(135deg,#1a1a2e,#a78bfa)',
  'linear-gradient(135deg,#064e3b,#c9a84c)',
  'linear-gradient(135deg,#2d3748,#e2e8f0)',
  'linear-gradient(135deg,#3b0764,#f0d78c)',
  'linear-gradient(135deg,#1c1917,#d97706)',
  'linear-gradient(135deg,#14532d,#86efac)',
  'linear-gradient(135deg,#450a0a,#fca5a5)',
  'linear-gradient(135deg,#1e1b4b,#818cf8)',
];

const PER_PAGE = 24;

/* ---- State ---- */
let allBooks    = [];   // raw from API
let filtered    = [];   // after search + filter
let currentPage = 1;
let activeFilter= 'All';
let searchQuery = '';
let viewMode    = 'grid'; // 'grid' | 'table'

/* ---- Normalise a single row from the API ---- */
function normaliseBook(raw, index) {
  // API may return rows as objects or arrays — handle both
  let name, author, language, status;

  if (Array.isArray(raw)) {
    // sheet row: [language?, bookName, author, status]
    // From screenshot columns: Language | Book Name | Author/Publisher | Availability Status
    language = (raw[0] || '').toString().trim();
    name     = (raw[1] || raw[0] || '').toString().trim();
    author   = (raw[2] || '').toString().trim();
    status   = (raw[3] || '').toString().trim();
    // If first col looks like a book name (no language), shift
    if (!isLangWord(language) && language) {
      name     = language;
      language = '';
      author   = (raw[1] || '').toString().trim();
      status   = (raw[2] || '').toString().trim();
    }
  } else {
    // Object keys — try common names
    name     = raw['Book Name'] || raw['book_name'] || raw['title']    || raw['Title']    || raw['name'] || '';
    author   = raw['Author/Publisher'] || raw['author'] || raw['Author'] || raw['publisher'] || '';
    language = raw['Language'] || raw['language'] || '';
    status   = raw['Availability Status'] || raw['Status'] || raw['status'] || raw['availability'] || '';
  }

  // Normalise status string
  const statusNorm = normaliseStatus(status);

  // Determine language tag
  const langTag = normaliseLang(language);

  // Skip completely empty rows
  if (!name || name.toLowerCase() === 'book name' || name.toLowerCase() === 'available') return null;

  return {
    id:       index,
    name:     name,
    author:   author || '—',
    language: langTag,
    status:   statusNorm,
    cover:    COVER_GRADS[index % COVER_GRADS.length],
  };
}

function isLangWord(str) {
  const langs = ['tamil','telugu','english','hindi','kannada','malayalam'];
  return langs.includes(str.toLowerCase());
}

function normaliseLang(raw) {
  const r = (raw || '').toString().trim().toLowerCase();
  if (r.includes('tamil'))   return 'Tamil';
  if (r.includes('telugu'))  return 'Telugu';
  if (r.includes('hindi'))   return 'Hindi';
  if (r.includes('kannada')) return 'Kannada';
  if (r.includes('english') || r === '') return 'English';
  // Capitalise whatever is there
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normaliseStatus(raw) {
  const r = (raw || '').toString().trim().toLowerCase();
  if (!r || r === 'available' || r === 'yes' || r === 'y') return 'Available';
  if (r === 'borrowed' || r === 'no'  || r === 'n' || r === 'issued') return 'Borrowed';
  return 'Available'; // default
}

/* ---- Fetch from Google Apps Script ---- */
async function fetchBooks() {
  showSkeleton();
  hideError();
  hideContent();

  try {
    const res  = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // API might return { data: [...] } or just [...]
    const rows = Array.isArray(data) ? data : (data.data || data.books || data.rows || []);

    // Skip header rows (first 1–2 rows may be headers)
    const startIdx = detectHeaderRows(rows);
    const parsed   = rows
      .slice(startIdx)
      .map((row, i) => normaliseBook(row, i))
      .filter(Boolean);

    allBooks = parsed;
    hideSkeleton();
    applyFiltersAndRender();
    buildStats();
    buildFilterTabs();

  } catch (err) {
    hideSkeleton();
    showError('Failed to load: ' + err.message);
    console.error('Library fetch error:', err);
  }
}

/* Detect how many header rows to skip */
function detectHeaderRows(rows) {
  if (!rows.length) return 0;
  const first = rows[0];
  const str   = JSON.stringify(first).toLowerCase();
  if (str.includes('book name') || str.includes('language') || str.includes('author') || str.includes('availability')) {
    // Check second row too
    if (rows[1]) {
      const second = JSON.stringify(rows[1]).toLowerCase();
      if (second.includes('available') && !second.includes('book')) return 2;
    }
    return 1;
  }
  return 0;
}

/* ---- Stats ---- */
function buildStats() {
  const total     = allBooks.length;
  const available = allBooks.filter(b => b.status === 'Available').length;
  const borrowed  = allBooks.filter(b => b.status === 'Borrowed').length;
  const langs     = new Set(allBooks.map(b => b.language)).size;

  animateCount('stat-total',     total);
  animateCount('stat-available', available);
  animateCount('stat-borrowed',  borrowed);
  animateCount('stat-langs',     langs);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(timer);
  }, 30);
}

/* ---- Filter tabs ---- */
function buildFilterTabs() {
  const container = document.getElementById('filter-tabs');
  if (!container) return;

  const langs = ['All', ...new Set(allBooks.map(b => b.language).filter(Boolean))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  // Add status filters too
  const filters = [...langs, 'Available', 'Borrowed'];

  container.innerHTML = filters.map(f => `
    <button class="ftab${f === activeFilter ? ' active' : ''}" onclick="setFilter('${escAttr(f)}')">${escHtml(f)}</button>
  `).join('');
}

function setFilter(f) {
  activeFilter = f;
  currentPage  = 1;
  buildFilterTabs();
  applyFiltersAndRender();
}

/* ---- Search ---- */
document.addEventListener('DOMContentLoaded', () => {
  const input    = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-btn');

  if (input) {
    input.addEventListener('input', () => {
      searchQuery = input.value.trim();
      clearBtn.style.display = searchQuery ? 'inline-flex' : 'none';
      currentPage = 1;
      applyFiltersAndRender();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // Build skeleton
  buildSkeleton();
  buildParticles();
  fetchBooks();
});

function resetAll() {
  activeFilter = 'All';
  searchQuery  = '';
  currentPage  = 1;
  const input  = document.getElementById('search-input');
  if (input) input.value = '';
  const cb = document.getElementById('clear-btn');
  if (cb) cb.style.display = 'none';
  buildFilterTabs();
  applyFiltersAndRender();
}

/* ---- Apply filters + render ---- */
function applyFiltersAndRender() {
  const q = searchQuery.toLowerCase();

  filtered = allBooks.filter(b => {
    // Language / status filter
    const matchFilter =
      activeFilter === 'All'       ? true :
      activeFilter === 'Available' ? b.status === 'Available' :
      activeFilter === 'Borrowed'  ? b.status === 'Borrowed'  :
      b.language === activeFilter;

    // Search
    const matchSearch = !q ||
      b.name.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.language.toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });

  renderContent();
}

/* ---- Render ---- */
function renderContent() {
  const total = filtered.length;
  const pages = Math.ceil(total / PER_PAGE);
  const slice = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Results bar
  const rb   = document.getElementById('results-bar');
  const info = document.getElementById('results-info');
  if (rb)   rb.style.display   = 'flex';
  if (info) info.textContent   =
    total === 0 ? 'No results' :
    `Showing ${(currentPage-1)*PER_PAGE + 1}–${Math.min(currentPage*PER_PAGE, total)} of ${total} books`;

  if (total === 0) {
    document.getElementById('grid-view').style.display  = 'none';
    document.getElementById('table-view').style.display = 'none';
    document.getElementById('empty-wrap').style.display = 'block';
    document.getElementById('pagination').innerHTML      = '';
    return;
  }

  document.getElementById('empty-wrap').style.display = 'none';

  if (viewMode === 'grid') {
    document.getElementById('grid-view').style.display  = 'grid';
    document.getElementById('table-view').style.display = 'none';
    renderGrid(slice);
  } else {
    document.getElementById('grid-view').style.display  = 'none';
    document.getElementById('table-view').style.display = 'block';
    renderTable(slice);
  }

  renderPagination(pages);
}

/* ---- Grid ---- */
function renderGrid(books) {
  document.getElementById('grid-view').innerHTML = books.map((b, i) => {
    const avail  = b.status === 'Available';
    const bdg    = avail ? 'badge-available' : 'badge-borrowed';
    return `
      <div class="book-card reveal" style="animation-delay:${i * 0.035}s">
        <div class="book-cover" style="background:${b.cover}">
          <div class="book-cover-inner">
            <i class="bi bi-book-fill"></i>
            <div class="book-title-cover">${escHtml(b.name)}</div>
          </div>
          <span class="cover-badge ${bdg}">${b.status}</span>
        </div>
        <div class="book-info">
          <div class="book-name" title="${escHtml(b.name)}">${escHtml(b.name)}</div>
          <div class="book-author" title="${escHtml(b.author)}">${escHtml(b.author)}</div>
          <div class="book-tags">
            <span class="btag btag-lang">${escHtml(b.language)}</span>
            <span class="btag ${avail ? 'btag-avail' : 'btag-borrow'}">${b.status}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  // Re-observe new reveal elements
  document.querySelectorAll('#grid-view .reveal').forEach(el => {
    el.classList.add('visible');
  });
}

/* ---- Table ---- */
function renderTable(books) {
  const offset = (currentPage - 1) * PER_PAGE;
  document.getElementById('table-body').innerHTML = books.map((b, i) => {
    const avail   = b.status === 'Available';
    const pillCls = avail ? 'spill-available' : 'spill-borrowed';
    return `
      <tr>
        <td class="row-num">${offset + i + 1}</td>
        <td><span style="font-weight:500">${escHtml(b.name)}</span></td>
        <td style="color:var(--muted-foreground)">${escHtml(b.author)}</td>
        <td><span class="btag btag-lang">${escHtml(b.language)}</span></td>
        <td><span class="spill ${pillCls}">${escHtml(b.status)}</span></td>
      </tr>`;
  }).join('');
}

/* ---- Pagination ---- */
function renderPagination(pages) {
  const pag = document.getElementById('pagination');
  if (!pag || pages <= 1) { if (pag) pag.innerHTML = ''; return; }

  const makeBtn = (label, p, disabled = false, active = false) =>
    `<button class="pag-btn${active ? ' active' : ''}" onclick="goPage(${p})" ${disabled ? 'disabled' : ''}>${label}</button>`;

  let html = makeBtn('<i class="bi bi-chevron-left"></i>', currentPage - 1, currentPage === 1);

  // Smart page range
  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= currentPage - 1 && i <= currentPage + 1)) range.push(i);
    else if (range[range.length - 1] !== '…') range.push('…');
  }

  range.forEach(r => {
    if (r === '…') html += `<span class="pag-ellipsis">…</span>`;
    else html += makeBtn(r, r, false, r === currentPage);
  });

  html += makeBtn('<i class="bi bi-chevron-right"></i>', currentPage + 1, currentPage === pages);
  pag.innerHTML = html;
}

function goPage(p) {
  const pages = Math.ceil(filtered.length / PER_PAGE);
  if (p < 1 || p > pages) return;
  currentPage = p;
  renderContent();
  const toolbar = document.querySelector('.lib-toolbar');
  if (toolbar) window.scrollTo({ top: toolbar.offsetTop - 20, behavior: 'smooth' });
}

/* ---- View toggle ---- */
function setView(mode) {
  viewMode = mode;
  document.getElementById('btn-grid').classList.toggle('active',  mode === 'grid');
  document.getElementById('btn-table').classList.toggle('active', mode === 'table');
  renderContent();
}

/* ---- Skeleton loader ---- */
function buildSkeleton() {
  const wrap = document.getElementById('skeleton-wrap');
  if (!wrap) return;
  wrap.innerHTML = Array.from({length: 12}, () => `
    <div class="skel-card">
      <div class="skel-cover"></div>
      <div class="skel-line"></div>
      <div class="skel-line short"></div>
      <div class="skel-line shorter"></div>
    </div>`).join('');
}

function showSkeleton()   { document.getElementById('skeleton-wrap').style.display = 'grid'; }
function hideSkeleton()   { document.getElementById('skeleton-wrap').style.display = 'none'; }
function hideContent()    {
  document.getElementById('grid-view').style.display   = 'none';
  document.getElementById('table-view').style.display  = 'none';
  document.getElementById('empty-wrap').style.display  = 'none';
  document.getElementById('results-bar').style.display = 'none';
  document.getElementById('pagination').innerHTML       = '';
}
function hideError()      { document.getElementById('error-wrap').style.display = 'none'; }
function showError(msg)   {
  hideContent();
  document.getElementById('error-wrap').style.display = 'block';
  const el = document.getElementById('error-msg');
  if (el) el.textContent = msg;
}

/* ---- Particles ---- */
function buildParticles() {
  const c = document.getElementById('particles-container');
  if (!c) return;
  for (let i = 0; i < 20; i++) {
    const s = document.createElement('span');
    s.className = 'particle';
    s.style.cssText = `
      left:${(i * 37 + 5) % 100}%;
      top:${(i * 53 + 10) % 100}%;
      animation-delay:${(i * 0.22).toFixed(2)}s;
      animation-duration:${4 + (i % 4)}s;
      width:${4 + (i % 4)}px;
      height:${4 + (i % 4)}px;
      opacity:${0.1 + (i % 5) * 0.12};
    `;
    c.appendChild(s);
  }
}

/* ---- Helpers ---- */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/'/g,"\\'");
}