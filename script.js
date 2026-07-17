// ============== NOTESOWNIK - MULTI-BOARD APP ==============

const BOARDS_KEY = 'notesownik_boards_v2';
const THEME_KEY = 'notesownik_theme_v2';

const COLUMN_COLORS = [
    { id: 'emerald', label: 'Szmaragd', value: 'linear-gradient(135deg,#10b981,#22c55e)' },
    { id: 'ocean',   label: 'Ocean',    value: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
    { id: 'sunset',  label: 'Zachód',   value: 'linear-gradient(135deg,#ff6b6b,#ffa94d)' },
    { id: 'cherry',  label: 'Wiśnia',   value: 'linear-gradient(135deg,#f43f5e,#fb7185)' },
    { id: 'gold',    label: 'Złoto',    value: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
    { id: 'violet',  label: 'Fiolet',   value: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
    { id: 'rose',    label: 'Róża',     value: 'linear-gradient(135deg,#ec4899,#d946ef)' },
    { id: 'slate',   label: 'Grafit',   value: 'linear-gradient(135deg,#475569,#64748b)' },
];

const THEME_BACKGROUNDS = {
    sunset:   'linear-gradient(135deg, #ff6b6b 0%, #ffa94d 50%, #fbbf24 100%)',
    ocean:    'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
    forest:   'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #84cc16 100%)',
    lavender: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%)',
    cherry:   'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fbbf24 100%)',
    gold:     'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ef4444 100%)',
};

let state = {
    boards: {},
    currentBoardId: null,
    filter: 'all',
    tagFilter: null,
    search: '',
    editingId: null,
    selectedType: 'text',
    selectedColor: 'yellow',
    selectedTheme: 'sunset',
    pendingFileData: null,
    pendingFileName: null,
    targetColumnId: null,   // when adding card from a column's + button
};

// ============== STORAGE ==============
function loadState() {
    try {
        const raw = localStorage.getItem(BOARDS_KEY);
        if (raw) state.boards = JSON.parse(raw);
    } catch (e) { state.boards = {}; }
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') document.body.setAttribute('data-theme', 'dark');
}

function saveBoards() {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(state.boards));
}

function uuid(prefix = 'b') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function currentBoard() {
    return state.boards[state.currentBoardId];
}

function ensureBoardDefaults(board) {
    if (!board.layout) board.layout = 'masonry';
    if (!board.columns) board.columns = [];
}

// ============== ROUTER ==============
function router() {
    const hash = location.hash || '#/';
    if (hash.startsWith('#/share/')) {
        const encoded = hash.slice('#/share/'.length);
        try {
            const json = decodeURIComponent(escape(atob(encoded)));
            const data = JSON.parse(json);
            if (!data.id || !Array.isArray(data.cards)) throw new Error('Niepoprawne dane');
            if (state.boards[data.id]) {
                if (confirm(`Tablica „${data.title}" już istnieje. Zastąpić jej zawartość?`)) {
                    state.boards[data.id] = data;
                    saveBoards();
                    toast('Tablica zaktualizowana', 'success');
                }
            } else {
                state.boards[data.id] = data;
                saveBoards();
                toast(`Tablica „${data.title}" dodana`, 'success');
            }
            location.hash = '#/board/' + data.id;
            return;
        } catch (err) {
            toast('Błąd linku: ' + err.message, 'error');
            location.hash = '#/';
            return;
        }
    }

    if (hash.startsWith('#/board/')) {
        const id = hash.slice('#/board/'.length);
        if (!state.boards[id]) { toast('Tablica nie istnieje', 'error'); location.hash = '#/'; return; }
        state.currentBoardId = id;
        ensureBoardDefaults(state.boards[id]);
        showView('board');
        renderBoard();
        return;
    }

    state.currentBoardId = null;
    showView('home');
    renderBoardsGrid();
}

function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    window.scrollTo(0, 0);
}

// ============== HOME VIEW ==============
function renderBoardsGrid() {
    const grid = document.getElementById('boardsGrid');
    const empty = document.getElementById('boardsEmpty');
    grid.innerHTML = '';
    const boards = Object.values(state.boards).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    if (boards.length === 0) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
    grid.style.display = ''; empty.style.display = 'none';

    const newTile = document.createElement('div');
    newTile.className = 'board-tile new';
    newTile.innerHTML = `
        <div class="plus-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
        <strong>Nowa tablica</strong><small>Zacznij od zera</small>
    `;
    newTile.onclick = openNewBoardModal;
    grid.appendChild(newTile);

    boards.forEach(board => grid.appendChild(buildBoardTile(board)));
}

function buildBoardTile(board) {
    const tile = document.createElement('div');
    tile.className = 'board-tile';
    tile.onclick = () => { location.hash = '#/board/' + board.id; };
    const initial = (board.title || 'Tablica').slice(0, 24);
    const cardCount = (board.cards || []).length;
    const dateStr = formatDate(board.updatedAt || board.createdAt);

    tile.innerHTML = `
        <div class="board-tile-cover theme-${board.themeColor || 'sunset'}">
            <div class="board-tile-cover-text">${escapeHtml(initial)}</div>
        </div>
        <div class="board-tile-actions">
            <button class="board-tile-action share" title="Udostępnij"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="board-tile-action delete" title="Usuń"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
        <div class="board-tile-body">
            <div class="board-tile-title">${escapeHtml(board.title || 'Tablica bez nazwy')}</div>
            <div class="board-tile-desc">${escapeHtml(board.desc || 'Bez opisu')}</div>
            <div class="board-tile-meta">
                <span>${cardCount} ${cardCount === 1 ? 'karta' : (cardCount >= 2 && cardCount <= 4 ? 'karty' : 'kart')}</span>
                <span>${dateStr}</span>
            </div>
        </div>
    `;
    tile.querySelector('.share').onclick = (e) => { e.stopPropagation(); state.currentBoardId = board.id; openShareModal(); };
    tile.querySelector('.delete').onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Usunąć tablicę „${board.title}"?`)) return;
        delete state.boards[board.id];
        saveBoards();
        renderBoardsGrid();
        toast('Tablica usunięta', 'success');
    };
    return tile;
}

// ============== BOARD CREATION ==============
function openNewBoardModal() {
    state.selectedTheme = 'sunset';
    document.getElementById('newBoardTitle').value = '';
    document.getElementById('newBoardDesc').value = '';
    document.getElementById('seedDemo').checked = false;
    document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b.dataset.themeColor === 'sunset'));
    document.getElementById('newBoardModal').classList.add('active');
    setTimeout(() => document.getElementById('newBoardTitle').focus(), 100);
}

function closeNewBoardModal() { document.getElementById('newBoardModal').classList.remove('active'); }

function createBoard() {
    const title = document.getElementById('newBoardTitle').value.trim() || 'Moja tablica';
    const desc = document.getElementById('newBoardDesc').value.trim();
    const seedDemo = document.getElementById('seedDemo').checked;
    const id = uuid('b');

    // Default starter columns for the columns (kanban) layout
    const starterColumns = [
        { id: uuid('col'), title: 'Do zrobienia', color: 'ocean' },
        { id: uuid('col'), title: 'W trakcie',    color: 'gold' },
        { id: uuid('col'), title: 'Gotowe',       color: 'emerald' },
    ];

    const cards = seedDemo ? generateDemoCards(starterColumns) : [];

    const board = {
        id, title, desc,
        themeColor: state.selectedTheme,
        layout: 'columns',
        columns: starterColumns,
        cards,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    state.boards[id] = board;
    saveBoards();
    closeNewBoardModal();
    location.hash = '#/board/' + id;
    setTimeout(() => toast('Tablica utworzona!', 'success'), 200);
}

function generateDemoCards(cols) {
    const now = Date.now();
    const c1 = cols[0].id, c2 = cols[1].id, c3 = cols[2].id;
    return [
        { id: uuid('c'), type: 'text', color: 'yellow', columnId: c1,
          title: 'Witaj w nowej tablicy!',
          content: 'To Twoja wizualna tablica.\n\n✏️ Edytuj tytuł u góry\n🎨 Każda karta ma swój kolor\n🖱️ Przeciągaj karty między kolumnami\n🗂️ Układ możesz zmienić w prawym górnym rogu',
          tags: ['start'], createdAt: now - 1200 },
        { id: uuid('c'), type: 'image', color: 'pink', columnId: c1,
          title: 'Inspiracja wizualna',
          content: 'Dodawaj zdjęcia z URL lub z dysku.',
          url: 'https://images.unsplash.com/photo-1499336315816-097655dcfbda?w=600&q=80',
          tags: ['inspiracja'], createdAt: now - 1000 },
        { id: uuid('c'), type: 'video', color: 'blue', columnId: c2,
          title: 'Film osadzany',
          content: 'Wklej link z YouTube - osadzi się automatycznie.',
          url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
          tags: ['film'], createdAt: now - 800 },
        { id: uuid('c'), type: 'link', color: 'mint', columnId: c2,
          title: 'Przykładowy link',
          content: 'Przydatne źródło zewnętrzne.',
          url: 'https://pl.wikipedia.org',
          tags: ['źródła'], createdAt: now - 600 },
        { id: uuid('c'), type: 'text', color: 'green', columnId: c3,
          title: 'Pierwsza karta gotowa ✓',
          content: 'Karty możesz oznaczać jako zrobione, przeciągając je do kolumny „Gotowe".',
          tags: ['done'], createdAt: now - 400 },
    ];
}

// ============== BOARD VIEW ==============
function renderBoard() {
    const board = currentBoard();
    if (!board) return;
    document.getElementById('boardTitle').textContent = board.title || 'Moja tablica';
    document.getElementById('boardSubtitle').textContent = board.desc || '';
    state.filter = 'all'; state.tagFilter = null; state.search = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-item').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));

    // Set themed background for columns mode
    const boardArea = document.querySelector('.board-area');
    if (board.layout === 'columns') {
        boardArea.classList.add('themed-bg');
        boardArea.style.setProperty('--board-bg', THEME_BACKGROUNDS[board.themeColor] || THEME_BACKGROUNDS.sunset);
    } else {
        boardArea.classList.remove('themed-bg');
        boardArea.style.removeProperty('--board-bg');
    }

    // Update layout menu active state
    document.querySelectorAll('.layout-option').forEach(b =>
        b.classList.toggle('active', b.dataset.layout === board.layout)
    );

    renderCards();
}

function renderCards() {
    const board = currentBoard();
    if (!board) return;
    const boardEl = document.getElementById('board');
    const colsEl = document.getElementById('columnsBoard');
    const emptyState = document.getElementById('emptyState');
    boardEl.innerHTML = '';
    colsEl.innerHTML = '';

    if (board.layout === 'columns') {
        boardEl.style.display = 'none';
        colsEl.style.display = '';
        renderColumnsView();
        emptyState.style.display = (board.columns.length === 0 && board.cards.length === 0) ? 'block' : 'none';
        if (board.columns.length === 0 && board.cards.length === 0) {
            emptyState.querySelector('h3').textContent = 'Ta tablica jest pusta';
            emptyState.querySelector('p').innerHTML = 'Kliknij <strong>Dodaj kolumnę</strong> lub <strong>Dodaj kartę</strong>, by zacząć.';
        }
        updateCounts(); updateTagCloud(); updateFilterBadge();
        return;
    }

    // Masonry / Grid
    colsEl.style.display = 'none';
    boardEl.style.display = '';
    boardEl.className = 'board' + (board.layout === 'grid' ? ' grid-mode' : '');

    let filtered = board.cards.slice();
    if (state.filter !== 'all') filtered = filtered.filter(c => c.type === state.filter);
    if (state.tagFilter) filtered = filtered.filter(c => (c.tags || []).includes(state.tagFilter));
    if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(c =>
            (c.title || '').toLowerCase().includes(q) ||
            (c.content || '').toLowerCase().includes(q) ||
            (c.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        boardEl.style.display = 'none';
        emptyState.style.display = 'block';
        if (board.cards.length > 0) {
            emptyState.querySelector('h3').textContent = 'Nic nie znaleziono';
            emptyState.querySelector('p').textContent = 'Spróbuj zmienić filtry.';
        } else {
            emptyState.querySelector('h3').textContent = 'Ta tablica jest pusta';
            emptyState.querySelector('p').innerHTML = 'Kliknij <strong>Dodaj kartę</strong>, by zacząć.';
        }
    } else {
        emptyState.style.display = 'none';
        filtered.forEach((c, idx) => boardEl.appendChild(buildCard(c, idx, true)));
    }

    updateCounts(); updateTagCloud(); updateFilterBadge();
}

// ============== COLUMNS VIEW ==============
function renderColumnsView() {
    const board = currentBoard();
    if (!board) return;
    const colsEl = document.getElementById('columnsBoard');

    // filter cards
    let filtered = board.cards.slice();
    if (state.filter !== 'all') filtered = filtered.filter(c => c.type === state.filter);
    if (state.tagFilter) filtered = filtered.filter(c => (c.tags || []).includes(state.tagFilter));
    if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(c =>
            (c.title || '').toLowerCase().includes(q) ||
            (c.content || '').toLowerCase().includes(q) ||
            (c.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }
    const filteredIds = new Set(filtered.map(c => c.id));

    // Render each column
    board.columns.forEach(col => colsEl.appendChild(buildColumn(col, filteredIds)));

    // Orphan cards (no columnId or removed column) shown in "Bez kategorii" column at end
    const validColIds = new Set(board.columns.map(c => c.id));
    const orphans = board.cards.filter(c => !c.columnId || !validColIds.has(c.columnId));
    if (orphans.length > 0) {
        const orphanCol = { id: '__orphan__', title: 'Bez kategorii', color: 'slate', _virtual: true };
        colsEl.appendChild(buildColumn(orphanCol, filteredIds));
    }

    // Add column button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-column-btn';
    addBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Dodaj kolumnę
    `;
    addBtn.onclick = () => addColumn();
    colsEl.appendChild(addBtn);
}

function buildColumn(col, filteredIds) {
    const board = currentBoard();
    const el = document.createElement('div');
    el.className = 'column';
    el.dataset.colId = col.id;

    // Get cards in this column
    let cardsInCol;
    if (col._virtual) {
        const validColIds = new Set(board.columns.map(c => c.id));
        cardsInCol = board.cards.filter(c => !c.columnId || !validColIds.has(c.columnId));
    } else {
        cardsInCol = board.cards.filter(c => c.columnId === col.id);
    }
    const filteredCards = filteredIds ? cardsInCol.filter(c => filteredIds.has(c.id)) : cardsInCol;

    const colorObj = COLUMN_COLORS.find(c => c.id === (col.color || 'emerald')) || COLUMN_COLORS[0];
    const headerStyle = `--col-color: ${colorObj.value}; background: ${colorObj.value};`;

    // Header
    const headerWrap = document.createElement('div');
    headerWrap.className = 'column-header-wrap';
    headerWrap.innerHTML = `
        <div class="column-header" style="${headerStyle}" ${col._virtual ? '' : 'draggable="true"'}>
            <div class="column-title" ${col._virtual ? '' : 'contenteditable="true"'} spellcheck="false">${escapeHtml(col.title)}</div>
            <span class="column-count">${cardsInCol.length}</span>
            ${col._virtual ? '' : `<button class="column-menu-btn" title="Opcje kolumny">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>`}
        </div>
        ${col._virtual ? '' : `<div class="column-menu">
            <button class="column-menu-item" data-action="rename">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                Zmień nazwę
            </button>
            <div class="column-menu-divider"></div>
            <div style="font-size:11px;color:var(--text-faint);padding:6px 10px 2px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Kolor</div>
            <div class="col-color-picker">
                ${COLUMN_COLORS.map(c => `<div class="col-color-dot${c.id === (col.color || 'emerald') ? ' active' : ''}" data-col-color="${c.id}" style="background:${c.value}" title="${c.label}"></div>`).join('')}
            </div>
            <div class="column-menu-divider"></div>
            <button class="column-menu-item" data-action="moveLeft">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Przesuń w lewo
            </button>
            <button class="column-menu-item" data-action="moveRight">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                Przesuń w prawo
            </button>
            <div class="column-menu-divider"></div>
            <button class="column-menu-item danger" data-action="delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                Usuń kolumnę
            </button>
        </div>`}
    `;
    el.appendChild(headerWrap);

    // Add card button
    if (!col._virtual) {
        const addCard = document.createElement('button');
        addCard.className = 'column-add-card';
        addCard.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Dodaj kartę`;
        addCard.onclick = () => {
            state.targetColumnId = col.id;
            openAddModal();
        };
        el.appendChild(addCard);
    }

    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards empty-drop';
    cardsContainer.dataset.colId = col.id;
    if (filteredCards.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'text-align:center;padding:14px;color:var(--text-faint);font-size:12px;font-style:italic;';
        placeholder.textContent = 'Brak kart';
        cardsContainer.appendChild(placeholder);
    } else {
        filteredCards.forEach((card, idx) => {
            const c = buildCard(card, idx, false);
            cardsContainer.appendChild(c);
        });
    }
    el.appendChild(cardsContainer);

    // Wire up column drag/drop
    if (!col._virtual) attachColumnHandlers(el, col, headerWrap);
    attachColumnCardDropZone(cardsContainer, col);

    return el;
}

// ============== COLUMN OPERATIONS ==============
function addColumn(title = null, color = null) {
    const board = currentBoard();
    if (!board) return;
    const t = title || prompt('Nazwa nowej kolumny:', 'Nowa kolumna');
    if (!t) return;
    const col = {
        id: uuid('col'),
        title: t.trim() || 'Kolumna',
        color: color || COLUMN_COLORS[board.columns.length % COLUMN_COLORS.length].id,
    };
    board.columns.push(col);
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
    toast('Kolumna dodana', 'success');
}

function deleteColumn(colId) {
    const board = currentBoard();
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (!col) return;
    const cardsInCol = board.cards.filter(c => c.columnId === colId);

    let mode = 'orphan'; // default: move to "Bez kategorii"
    if (cardsInCol.length > 0) {
        const choice = confirm(`Kolumna „${col.title}" zawiera ${cardsInCol.length} kart. Usunąć też karty?\n\nOK = usuń kolumnę i karty\nAnuluj = usuń tylko kolumnę (karty trafią do „Bez kategorii")`);
        if (choice) mode = 'delete';
    }

    board.columns = board.columns.filter(c => c.id !== colId);
    if (mode === 'delete') {
        board.cards = board.cards.filter(c => c.columnId !== colId);
    } else {
        board.cards.forEach(c => { if (c.columnId === colId) c.columnId = null; });
    }
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
    toast('Kolumna usunięta', 'success');
}

function renameColumn(colId, newTitle) {
    const board = currentBoard();
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (!col) return;
    col.title = newTitle.trim() || col.title;
    board.updatedAt = Date.now();
    saveBoards();
}

function recolorColumn(colId, colorId) {
    const board = currentBoard();
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (!col) return;
    col.color = colorId;
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
}

function moveColumn(colId, direction) {
    const board = currentBoard();
    if (!board) return;
    const idx = board.columns.findIndex(c => c.id === colId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= board.columns.length) return;
    const [col] = board.columns.splice(idx, 1);
    board.columns.splice(newIdx, 0, col);
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
}

function moveColumnBefore(srcColId, targetColId) {
    const board = currentBoard();
    if (!board || srcColId === targetColId) return;
    const srcIdx = board.columns.findIndex(c => c.id === srcColId);
    if (srcIdx === -1) return;
    const [col] = board.columns.splice(srcIdx, 1);
    const tgtIdx = board.columns.findIndex(c => c.id === targetColId);
    if (tgtIdx === -1) board.columns.push(col);
    else board.columns.splice(tgtIdx, 0, col);
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
}

// ============== DRAG STATE ==============
let dragData = null; // { type: 'card'|'column', id }

function attachColumnHandlers(colEl, col, headerWrap) {
    const header = headerWrap.querySelector('.column-header');
    const menuBtn = headerWrap.querySelector('.column-menu-btn');
    const menu = headerWrap.querySelector('.column-menu');
    const titleEl = headerWrap.querySelector('.column-title');

    // Column drag
    header.addEventListener('dragstart', (e) => {
        // Avoid dragging when editing title
        if (document.activeElement === titleEl) { e.preventDefault(); return; }
        dragData = { type: 'column', id: col.id };
        colEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', col.id); } catch (err) {}
    });
    header.addEventListener('dragend', () => {
        colEl.classList.remove('dragging');
        document.querySelectorAll('.column.col-drag-over').forEach(c => c.classList.remove('col-drag-over'));
    });
    colEl.addEventListener('dragover', (e) => {
        if (!dragData || dragData.type !== 'column') return;
        if (dragData.id === col.id) return;
        e.preventDefault();
        colEl.classList.add('col-drag-over');
    });
    colEl.addEventListener('dragleave', (e) => {
        if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('col-drag-over');
    });
    colEl.addEventListener('drop', (e) => {
        if (!dragData || dragData.type !== 'column') return;
        e.preventDefault();
        colEl.classList.remove('col-drag-over');
        moveColumnBefore(dragData.id, col.id);
        dragData = null;
    });

    // Title rename
    titleEl.addEventListener('blur', () => {
        if (col._virtual) return;
        renameColumn(col.id, titleEl.textContent);
    });
    titleEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });
    // Prevent drag while editing title
    titleEl.addEventListener('mousedown', (e) => e.stopPropagation());

    // Menu
    if (menuBtn && menu) {
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.column-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
            menu.classList.toggle('open');
        };
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('[data-action]');
            const dot = e.target.closest('[data-col-color]');
            if (dot) {
                recolorColumn(col.id, dot.dataset.colColor);
                menu.classList.remove('open');
                return;
            }
            if (!item) return;
            const action = item.dataset.action;
            if (action === 'rename') {
                titleEl.focus();
                // Select all
                const range = document.createRange();
                range.selectNodeContents(titleEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (action === 'moveLeft') { moveColumn(col.id, -1); }
            else if (action === 'moveRight') { moveColumn(col.id, 1); }
            else if (action === 'delete') {
                if (confirm(`Usunąć kolumnę „${col.title}"?`)) deleteColumn(col.id);
            }
            menu.classList.remove('open');
        });
    }
}

function attachColumnCardDropZone(cardsContainer, col) {
    cardsContainer.addEventListener('dragover', (e) => {
        if (!dragData || dragData.type !== 'card') return;
        e.preventDefault();
        cardsContainer.classList.add('col-drop-zone');
    });
    cardsContainer.addEventListener('dragleave', (e) => {
        if (!cardsContainer.contains(e.relatedTarget)) cardsContainer.classList.remove('col-drop-zone');
    });
    cardsContainer.addEventListener('drop', (e) => {
        if (!dragData || dragData.type !== 'card') return;
        e.preventDefault();
        cardsContainer.classList.remove('col-drop-zone');
        // If dropped on container empty area, move card to end of this column
        moveCardToColumn(dragData.id, col._virtual ? null : col.id, null);
        dragData = null;
    });
}

function moveCardToColumn(cardId, targetColId, beforeCardId) {
    const board = currentBoard();
    if (!board) return;
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return;
    card.columnId = targetColId;
    // Reorder in cards array
    const idx = board.cards.indexOf(card);
    board.cards.splice(idx, 1);
    if (beforeCardId) {
        const tgtIdx = board.cards.findIndex(c => c.id === beforeCardId);
        if (tgtIdx === -1) board.cards.push(card);
        else board.cards.splice(tgtIdx, 0, card);
    } else {
        // append after last card with the same columnId
        let lastIdx = -1;
        for (let i = board.cards.length - 1; i >= 0; i--) {
            if (board.cards[i].columnId === targetColId) { lastIdx = i; break; }
        }
        if (lastIdx === -1) board.cards.push(card);
        else board.cards.splice(lastIdx + 1, 0, card);
    }
    board.updatedAt = Date.now();
    saveBoards();
    renderCards();
}

// ============== CARD BUILDING ==============
function buildCard(card, idx, applyRotation) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card.id;
    el.dataset.color = card.color || 'yellow';
    el.draggable = true;
    if (applyRotation) {
        el.style.setProperty('--rotate', (Math.random() * 2 - 1).toFixed(2) + 'deg');
    }
    el.style.animationDelay = (Math.min(idx, 12) * 0.04) + 's';

    const typeBadge = document.createElement('div');
    typeBadge.className = 'card-type-badge';
    typeBadge.innerHTML = getTypeIcon(card.type);
    el.appendChild(typeBadge);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.innerHTML = `
        <button class="card-action edit" title="Edytuj"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="card-action delete" title="Usuń"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
    `;
    el.appendChild(actions);
    actions.querySelector('.edit').onclick = (e) => { e.stopPropagation(); openEditModal(card.id); };
    actions.querySelector('.delete').onclick = (e) => { e.stopPropagation(); deleteCard(card.id); };

    const media = renderMedia(card);
    if (media) el.appendChild(media);

    const content = document.createElement('div');
    content.className = 'card-content' + (media ? ' with-media' : '');

    if (card.title) {
        const h = document.createElement('div');
        h.className = 'card-title';
        h.textContent = card.title;
        content.appendChild(h);
    }
    if (card.content) {
        const t = document.createElement('div');
        t.className = 'card-text';
        t.textContent = card.content;
        content.appendChild(t);
    }
    if (card.type === 'audio' && card.url) {
        const aw = document.createElement('div');
        aw.className = 'card-audio';
        aw.innerHTML = `<audio controls src="${escapeHtml(card.url)}"></audio>`;
        content.appendChild(aw);
    }
    if ((card.type === 'link' || card.type === 'file') && card.url) {
        const link = document.createElement('a');
        link.className = 'card-link';
        link.href = card.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (card.type === 'file' && card.fileName) link.download = card.fileName;
        link.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>${escapeHtml(card.fileName || card.url)}</span>`;
        link.onclick = (e) => e.stopPropagation();
        content.appendChild(link);
    }
    if (card.tags && card.tags.length) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'card-tags';
        card.tags.forEach(tag => {
            const t = document.createElement('span'); t.className = 'card-tag'; t.textContent = '#' + tag; tagsWrap.appendChild(t);
        });
        content.appendChild(tagsWrap);
    }
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `<span class="card-date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${formatDate(card.createdAt)}</span><span>${getTypeLabel(card.type)}</span>`;
    content.appendChild(footer);
    el.appendChild(content);

    if (card.type === 'image' || card.type === 'video') {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            if (e.target.closest('.card-action') || e.target.closest('iframe') || e.target.closest('audio') || e.target.closest('video') || e.target.closest('a')) return;
            openLightbox(card);
        });
    }

    attachCardDragHandlers(el, card);
    return el;
}

function renderMedia(card) {
    if (card.type === 'image' && card.url) {
        const w = document.createElement('div'); w.className = 'card-media';
        const img = document.createElement('img');
        img.src = card.url; img.alt = card.title || ''; img.loading = 'lazy';
        img.onerror = () => { img.style.display = 'none'; };
        w.appendChild(img); return w;
    }
    if (card.type === 'video' && card.url) {
        const w = document.createElement('div'); w.className = 'card-media';
        const wrap = document.createElement('div'); wrap.className = 'video-wrap';
        const yt = parseYouTube(card.url); const vimeo = parseVimeo(card.url);
        if (yt) wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt}" allowfullscreen allow="encrypted-media"></iframe>`;
        else if (vimeo) wrap.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimeo}" allowfullscreen></iframe>`;
        else wrap.innerHTML = `<video controls src="${escapeHtml(card.url)}"></video>`;
        w.appendChild(wrap); return w;
    }
    if (card.type === 'worksheet') {
        const w = document.createElement('div'); w.className = 'card-media';
        const wrap = document.createElement('div'); wrap.className = 'pdf-wrap';
        wrap.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            <div class="pdf-name">${escapeHtml(card.fileName || card.url || 'Karta pracy')}</div>
        `;
        if (card.url) {
            wrap.style.cursor = 'pointer';
            wrap.onclick = (e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = card.url; a.target = '_blank'; if (card.fileName) a.download = card.fileName; a.click(); };
        }
        w.appendChild(wrap); return w;
    }
    return null;
}

function parseYouTube(url) { const m = (url || '').match(/(?:youtube\.com\/(?:.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; }
function parseVimeo(url) { const m = (url || '').match(/vimeo\.com\/(\d+)/); return m ? m[1] : null; }

function getTypeIcon(type) {
    const icons = {
        text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
        worksheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    };
    return icons[type] || icons.text;
}
function getTypeLabel(type) { const labels = { text: 'Notatka', image: 'Obraz', video: 'Film', audio: 'Muzyka', file: 'Plik', worksheet: 'Karta pracy', link: 'Link' }; return labels[type] || type; }
function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts); const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Dziś ' + d.toTimeString().slice(0, 5);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Wczoraj';
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}
function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ============== COUNTS / TAGS / BADGE ==============
function updateCounts() {
    const board = currentBoard(); if (!board) return;
    document.getElementById('countAll').textContent = board.cards.length;
    ['text', 'image', 'video', 'audio', 'file', 'worksheet', 'link'].forEach(t => {
        const el = document.getElementById('count' + t.charAt(0).toUpperCase() + t.slice(1));
        if (el) el.textContent = board.cards.filter(c => c.type === t).length;
    });
    document.getElementById('statTotal').textContent = board.cards.length;
    const allTags = new Set();
    board.cards.forEach(c => (c.tags || []).forEach(t => allTags.add(t)));
    document.getElementById('statTags').textContent = allTags.size;
}
function updateTagCloud() {
    const board = currentBoard(); if (!board) return;
    const cloud = document.getElementById('tagCloud');
    const tagCounts = {};
    board.cards.forEach(c => (c.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (tags.length === 0) { cloud.innerHTML = '<span class="empty-info">Brak tagów</span>'; return; }
    cloud.innerHTML = '';
    tags.forEach(([tag, count]) => {
        const p = document.createElement('span');
        p.className = 'tag-pill' + (state.tagFilter === tag ? ' active' : '');
        p.textContent = `#${tag} · ${count}`;
        p.onclick = () => { state.tagFilter = (state.tagFilter === tag) ? null : tag; renderCards(); };
        cloud.appendChild(p);
    });
}
function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    const parts = [];
    if (state.filter !== 'all') parts.push(getTypeLabel(state.filter)); else parts.push('Wszystkie karty');
    if (state.tagFilter) parts.push('#' + state.tagFilter);
    if (state.search) parts.push(`„${state.search}"`);
    badge.textContent = parts.join(' · ');
}

// ============== CARD OPERATIONS ==============
function deleteCard(id) {
    if (!confirm('Usunąć tę kartę?')) return;
    const board = currentBoard(); if (!board) return;
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) { el.style.transition = 'transform 0.3s, opacity 0.3s'; el.style.transform = 'scale(0.8) rotate(8deg)'; el.style.opacity = '0'; }
    setTimeout(() => {
        board.cards = board.cards.filter(c => c.id !== id);
        board.updatedAt = Date.now();
        saveBoards();
        renderCards();
        toast('Karta usunięta', 'success');
    }, 250);
}

function openEditModal(id) {
    const board = currentBoard(); if (!board) return;
    const card = board.cards.find(c => c.id === id); if (!card) return;
    state.editingId = id;
    state.selectedType = card.type;
    state.selectedColor = card.color || 'yellow';
    state.pendingFileData = null;
    state.pendingFileName = card.fileName || null;
    state.targetColumnId = null;
    document.getElementById('modalTitle').textContent = 'Edytuj kartę';
    document.getElementById('cardTitle').value = card.title || '';
    document.getElementById('cardContent').value = card.content || '';
    document.getElementById('cardUrl').value = card.url || '';
    document.getElementById('cardTags').value = (card.tags || []).join(', ');
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === card.type));
    document.querySelectorAll('.color-swatch').forEach(b => b.classList.toggle('active', b.dataset.color === (card.color || 'yellow')));
    updateModalFields();
    document.getElementById('modalOverlay').classList.add('active');
}

function openAddModal() {
    state.editingId = null;
    state.selectedType = 'text';
    state.selectedColor = 'yellow';
    state.pendingFileData = null;
    state.pendingFileName = null;
    const board = currentBoard();
    let titleText = 'Dodaj nową kartę';
    if (state.targetColumnId && board) {
        const col = board.columns.find(c => c.id === state.targetColumnId);
        if (col) titleText = `Nowa karta w „${col.title}"`;
    }
    document.getElementById('modalTitle').textContent = titleText;
    document.getElementById('cardTitle').value = '';
    document.getElementById('cardContent').value = '';
    document.getElementById('cardUrl').value = '';
    document.getElementById('cardTags').value = '';
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'text'));
    document.querySelectorAll('.color-swatch').forEach(b => b.classList.toggle('active', b.dataset.color === 'yellow'));
    updateModalFields();
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('cardTitle').focus(), 100);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    state.editingId = null;
    state.pendingFileData = null;
    state.pendingFileName = null;
    state.targetColumnId = null;
}

function updateModalFields() {
    const type = state.selectedType;
    const urlField = document.getElementById('urlField');
    const fileField = document.getElementById('fileField');
    const contentLabel = document.getElementById('contentLabel');
    const urlLabel = document.getElementById('urlLabel');
    const urlHint = document.getElementById('urlHint');
    const cardContent = document.getElementById('cardContent');
    const config = {
        text: { showUrl: false, showFile: false, contentLabel: 'Treść notatki', placeholder: 'Wpisz treść notatki...' },
        image: { showUrl: true, showFile: true, contentLabel: 'Opis (opcjonalnie)', urlLabel: 'URL obrazu', urlHint: 'np. https://example.com/zdjecie.jpg', placeholder: 'Krótki opis obrazu...', accept: 'image/*' },
        video: { showUrl: true, showFile: false, contentLabel: 'Opis (opcjonalnie)', urlLabel: 'URL filmu', urlHint: 'YouTube, Vimeo lub bezpośredni link do MP4', placeholder: 'O czym jest ten film?' },
        audio: { showUrl: true, showFile: true, contentLabel: 'Opis (opcjonalnie)', urlLabel: 'URL pliku audio', urlHint: 'Link do MP3, OGG, WAV...', placeholder: 'Opis utworu...', accept: 'audio/*' },
        file: { showUrl: true, showFile: true, contentLabel: 'Opis (opcjonalnie)', urlLabel: 'URL pliku', urlHint: 'Link do pobrania lub wgraj plik z dysku', placeholder: 'O czym jest ten plik?', accept: '*' },
        worksheet: { showUrl: true, showFile: true, contentLabel: 'Opis karty pracy', urlLabel: 'URL pliku PDF', urlHint: 'Link do karty pracy lub wgraj PDF', placeholder: 'Czego dotyczy karta pracy?', accept: '.pdf,application/pdf' },
        link: { showUrl: true, showFile: false, contentLabel: 'Opis linku', urlLabel: 'Adres URL', urlHint: 'np. https://wikipedia.org', placeholder: 'Co znajduje się pod tym linkiem?' },
    };
    const cfg = config[type] || config.text;
    urlField.style.display = cfg.showUrl ? '' : 'none';
    fileField.style.display = cfg.showFile ? '' : 'none';
    contentLabel.textContent = cfg.contentLabel;
    cardContent.placeholder = cfg.placeholder;
    if (cfg.urlLabel) urlLabel.textContent = cfg.urlLabel;
    if (cfg.urlHint) urlHint.textContent = cfg.urlHint;
    if (cfg.accept) document.getElementById('fileInput').setAttribute('accept', cfg.accept);
}

function saveCard() {
    const board = currentBoard(); if (!board) return;
    const title = document.getElementById('cardTitle').value.trim();
    const content = document.getElementById('cardContent').value.trim();
    let url = document.getElementById('cardUrl').value.trim();
    const tagsRaw = document.getElementById('cardTags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean) : [];
    if (state.pendingFileData) url = state.pendingFileData;
    if (!title && !content && !url) { toast('Wypełnij przynajmniej jedno pole', 'error'); return; }

    if (state.editingId) {
        const card = board.cards.find(c => c.id === state.editingId);
        if (card) {
            card.type = state.selectedType;
            card.color = state.selectedColor;
            card.title = title; card.content = content;
            card.url = url || card.url;
            card.fileName = state.pendingFileName || card.fileName;
            card.tags = tags;
            card.updatedAt = Date.now();
        }
        toast('Karta zaktualizowana', 'success');
    } else {
        const card = {
            id: uuid('c'),
            type: state.selectedType,
            color: state.selectedColor,
            title, content, url,
            fileName: state.pendingFileName,
            tags,
            createdAt: Date.now(),
        };
        if (board.layout === 'columns' && state.targetColumnId) {
            card.columnId = state.targetColumnId;
        }
        board.cards.unshift(card);
        toast('Karta dodana!', 'success');
    }
    board.updatedAt = Date.now();
    saveBoards();
    closeModal();
    renderCards();
}

// ============== CARD DRAG & DROP ==============
function attachCardDragHandlers(el, card) {
    el.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        dragData = { type: 'card', id: card.id };
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.id); } catch (err) {}
    });
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.card.drag-over').forEach(c => c.classList.remove('drag-over'));
        document.querySelectorAll('.column-cards.col-drop-zone').forEach(c => c.classList.remove('col-drop-zone'));
    });
    el.addEventListener('dragover', (e) => {
        if (!dragData || dragData.type !== 'card') return;
        if (dragData.id === card.id) return;
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
        if (!dragData || dragData.type !== 'card') return;
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('drag-over');
        document.querySelectorAll('.column-cards.col-drop-zone').forEach(c => c.classList.remove('col-drop-zone'));
        const board = currentBoard(); if (!board) { dragData = null; return; }
        if (board.layout === 'columns') {
            // Card-to-card: place dragged card BEFORE target card and assign target column
            const targetCard = board.cards.find(c => c.id === card.id);
            if (targetCard) moveCardToColumn(dragData.id, targetCard.columnId || null, card.id);
        } else {
            // Plain reorder
            const srcIdx = board.cards.findIndex(c => c.id === dragData.id);
            const tgtIdx = board.cards.findIndex(c => c.id === card.id);
            if (srcIdx !== -1 && tgtIdx !== -1 && srcIdx !== tgtIdx) {
                const [moved] = board.cards.splice(srcIdx, 1);
                const newTgtIdx = board.cards.findIndex(c => c.id === card.id);
                board.cards.splice(newTgtIdx, 0, moved);
                board.updatedAt = Date.now();
                saveBoards();
                renderCards();
            }
        }
        dragData = null;
    });
}

// ============== LIGHTBOX ==============
function openLightbox(card) {
    const lb = document.getElementById('lightbox');
    const c = document.getElementById('lightboxContent');
    c.innerHTML = '';
    if (card.type === 'image') { const img = document.createElement('img'); img.src = card.url; c.appendChild(img); }
    else if (card.type === 'video') {
        const yt = parseYouTube(card.url); const vimeo = parseVimeo(card.url);
        if (yt) c.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt}?autoplay=1" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
        else if (vimeo) c.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimeo}?autoplay=1" allowfullscreen allow="autoplay"></iframe>`;
        else c.innerHTML = `<video controls autoplay src="${escapeHtml(card.url)}"></video>`;
    }
    lb.classList.add('active');
}
function closeLightbox() { const lb = document.getElementById('lightbox'); lb.classList.remove('active'); document.getElementById('lightboxContent').innerHTML = ''; }

// ============== TOAST ==============
let toastTimer = null;
function toast(msg, kind = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + kind; }, 2600);
}

// ============== SHARE ==============
function openShareModal() {
    const board = state.boards[state.currentBoardId]; if (!board) return;
    const baseUrl = location.origin + location.pathname;
    const localLink = baseUrl + '#/board/' + board.id;
    const json = JSON.stringify(board);
    let encoded = ''; let sizeKb = 0;
    try { encoded = btoa(unescape(encodeURIComponent(json))); sizeKb = Math.round(encoded.length / 1024 * 10) / 10; } catch (e) {}
    const fullLink = baseUrl + '#/share/' + encoded;
    document.getElementById('shareLocalLink').value = localLink;
    document.getElementById('shareFullLink').value = fullLink;
    const hint = document.getElementById('shareSizeHint');
    if (sizeKb > 0) {
        let warn = '';
        if (sizeKb > 30) warn = ' ⚠️ Duży link.';
        if (sizeKb > 100) warn = ' ⚠️ Bardzo duży link - rozważ eksport JSON.';
        hint.textContent = `Wielkość linku: ${sizeKb} KB.${warn}`;
    } else hint.textContent = '';
    document.querySelectorAll('.share-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'local'));
    document.querySelectorAll('.share-tab-content').forEach(c => c.style.display = c.dataset.tabContent === 'local' ? '' : 'none');
    document.getElementById('shareModal').classList.add('active');
}
function closeShareModal() { document.getElementById('shareModal').classList.remove('active'); }
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('Skopiowano!', 'success'), () => fallbackCopy(text));
    } else fallbackCopy(text);
}
function fallbackCopy(text) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Skopiowano!', 'success'); } catch (e) { toast('Nie udało się skopiować', 'error'); }
    document.body.removeChild(ta);
}

// ============== EXPORT / IMPORT ==============
function exportBoard() {
    const board = currentBoard(); if (!board) return;
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const safeTitle = (board.title || 'notesownik').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    a.download = `${safeTitle}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Tablica wyeksportowana', 'success');
}
function importBoard(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.cards)) throw new Error('Niepoprawny format pliku');
            if (!data.id) data.id = uuid('b');
            if (!data.title) data.title = 'Zaimportowana tablica';
            if (!data.themeColor) data.themeColor = 'sunset';
            if (!data.layout) data.layout = 'masonry';
            if (!data.columns) data.columns = [];
            data.createdAt = data.createdAt || Date.now();
            data.updatedAt = Date.now();
            if (state.boards[data.id]) {
                if (!confirm(`Tablica „${data.title}" już istnieje. Zastąpić?`)) data.id = uuid('b');
            }
            state.boards[data.id] = data;
            saveBoards();
            toast('Tablica zaimportowana', 'success');
            location.hash = '#/board/' + data.id;
        } catch (err) { toast('Błąd importu: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
}

// ============== FILE UPLOAD ==============
function handleFileUpload(file) {
    if (file.size > 5 * 1024 * 1024) { toast('Plik za duży (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        state.pendingFileData = e.target.result;
        state.pendingFileName = file.name;
        document.getElementById('cardUrl').value = file.name + ' (wgrany lokalnie)';
        toast('Plik załadowany: ' + file.name, 'success');
    };
    reader.readAsDataURL(file);
}

// ============== LAYOUT SWITCHING ==============
function setLayout(newLayout) {
    const board = currentBoard(); if (!board) return;
    if (board.layout === newLayout) return;

    // Auto-migrate to columns
    if (newLayout === 'columns' && board.columns.length === 0 && board.cards.length > 0) {
        const defaultCol = { id: uuid('col'), title: 'Materiały', color: COLUMN_COLORS[0].id };
        board.columns.push(defaultCol);
        board.cards.forEach(c => { if (!c.columnId) c.columnId = defaultCol.id; });
        toast('Utworzono kolumnę „Materiały"', 'success');
    }

    board.layout = newLayout;
    board.updatedAt = Date.now();
    saveBoards();
    renderBoard();

    const labels = { masonry: 'Układ: swobodny', grid: 'Układ: siatka', columns: 'Układ: kolumny' };
    toast(labels[newLayout]);
}

// ============== EVENT BINDINGS ==============
function bindEvents() {
    document.getElementById('heroCreateBtn').onclick = openNewBoardModal;
    document.getElementById('ctaCreateBtn').onclick = openNewBoardModal;
    document.getElementById('footerCreateBtn').onclick = openNewBoardModal;
    document.getElementById('emptyCreateBtn').onclick = openNewBoardModal;

    const toggleTheme = () => {
        const cur = document.body.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        toast(next === 'dark' ? 'Tryb ciemny' : 'Tryb jasny');
    };
    document.getElementById('themeBtnHome').onclick = toggleTheme;
    document.getElementById('themeBtn').onclick = toggleTheme;

    // New board modal
    document.getElementById('closeNewBoard').onclick = closeNewBoardModal;
    document.getElementById('cancelNewBoard').onclick = closeNewBoardModal;
    document.getElementById('createBoardBtn').onclick = createBoard;
    document.getElementById('newBoardModal').onclick = (e) => { if (e.target.id === 'newBoardModal') closeNewBoardModal(); };
    document.getElementById('themePicker').addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-swatch');
        if (!btn) return;
        document.querySelectorAll('.theme-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedTheme = btn.dataset.themeColor;
    });
    document.getElementById('newBoardTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createBoard(); } });

    // Card modal
    document.getElementById('openAddModal').onclick = () => { state.targetColumnId = null; openAddModal(); };
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('cancelModal').onclick = closeModal;
    document.getElementById('modalOverlay').onclick = (e) => { if (e.target.id === 'modalOverlay') closeModal(); };
    document.getElementById('saveCard').onclick = saveCard;
    document.getElementById('typeSelector').addEventListener('click', (e) => {
        const btn = e.target.closest('.type-btn'); if (!btn) return;
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedType = btn.dataset.type;
        updateModalFields();
    });
    document.getElementById('colorPicker').addEventListener('click', (e) => {
        const btn = e.target.closest('.color-swatch'); if (!btn) return;
        document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedColor = btn.dataset.color;
    });

    // Filters / search
    document.getElementById('categoryFilters').addEventListener('click', (e) => {
        const item = e.target.closest('.filter-item'); if (!item) return;
        document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
        item.classList.add('active');
        state.filter = item.dataset.filter;
        renderCards();
    });
    document.getElementById('searchInput').addEventListener('input', (e) => { state.search = e.target.value.trim(); renderCards(); });

    // Board title/desc
    document.getElementById('boardTitle').addEventListener('blur', (e) => {
        const board = currentBoard(); if (!board) return;
        const t = e.target.textContent.trim() || 'Moja tablica';
        e.target.textContent = t; board.title = t; board.updatedAt = Date.now(); saveBoards();
    });
    document.getElementById('boardTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    document.getElementById('boardSubtitle').addEventListener('blur', (e) => {
        const board = currentBoard(); if (!board) return;
        board.desc = e.target.textContent.trim(); board.updatedAt = Date.now(); saveBoards();
    });
    document.getElementById('boardSubtitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

    // Layout dropdown
    const layoutDropdown = document.querySelector('.layout-dropdown');
    document.getElementById('layoutBtn').onclick = (e) => {
        e.stopPropagation();
        layoutDropdown.classList.toggle('open');
    };
    document.getElementById('layoutMenu').addEventListener('click', (e) => {
        const btn = e.target.closest('.layout-option');
        if (!btn) return;
        setLayout(btn.dataset.layout);
        layoutDropdown.classList.remove('open');
    });
    document.addEventListener('click', (e) => {
        if (!layoutDropdown.contains(e.target)) layoutDropdown.classList.remove('open');
        // close all column menus
        document.querySelectorAll('.column-menu.open').forEach(m => {
            if (!m.parentElement.contains(e.target)) m.classList.remove('open');
        });
    });

    document.getElementById('exportBtn').onclick = exportBoard;
    document.getElementById('importFile').onchange = (e) => { if (e.target.files[0]) importBoard(e.target.files[0]); e.target.value = ''; };

    document.getElementById('shareBtn').onclick = openShareModal;
    document.getElementById('closeShare').onclick = closeShareModal;
    document.getElementById('shareModal').onclick = (e) => { if (e.target.id === 'shareModal') closeShareModal(); };
    document.querySelectorAll('.share-tab').forEach(t => {
        t.onclick = () => {
            document.querySelectorAll('.share-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const target = t.dataset.tab;
            document.querySelectorAll('.share-tab-content').forEach(c => c.style.display = c.dataset.tabContent === target ? '' : 'none');
        };
    });
    document.getElementById('copyLocalBtn').onclick = () => copyToClipboard(document.getElementById('shareLocalLink').value);
    document.getElementById('copyFullBtn').onclick = () => copyToClipboard(document.getElementById('shareFullLink').value);

    document.getElementById('clearAllBtn').onclick = () => {
        const board = currentBoard(); if (!board || board.cards.length === 0) { toast('Tablica jest już pusta'); return; }
        if (!confirm(`Usunąć wszystkie ${board.cards.length} kart?`)) return;
        board.cards = []; board.updatedAt = Date.now(); saveBoards(); renderCards();
        toast('Karty usunięte', 'success');
    };
    document.getElementById('deleteBoardBtn').onclick = () => {
        const board = currentBoard(); if (!board) return;
        if (!confirm(`Usunąć tablicę „${board.title}"?`)) return;
        delete state.boards[board.id]; saveBoards(); toast('Tablica usunięta', 'success'); location.hash = '#/';
    };

    document.getElementById('lightboxClose').onclick = closeLightbox;
    document.getElementById('lightbox').onclick = (e) => { if (e.target.id === 'lightbox') closeLightbox(); };

    const fileDrop = document.getElementById('fileDrop');
    const fileInput = document.getElementById('fileInput');
    fileDrop.onclick = () => fileInput.click();
    fileDrop.ondragover = (e) => { e.preventDefault(); fileDrop.classList.add('drag'); };
    fileDrop.ondragleave = () => fileDrop.classList.remove('drag');
    fileDrop.ondrop = (e) => { e.preventDefault(); fileDrop.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); };
    fileInput.onchange = (e) => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('lightbox').classList.contains('active')) closeLightbox();
            else if (document.getElementById('modalOverlay').classList.contains('active')) closeModal();
            else if (document.getElementById('newBoardModal').classList.contains('active')) closeNewBoardModal();
            else if (document.getElementById('shareModal').classList.contains('active')) closeShareModal();
        }
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
            if (state.currentBoardId) { e.preventDefault(); document.getElementById('searchInput').focus(); }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (state.currentBoardId) { state.targetColumnId = null; openAddModal(); }
            else openNewBoardModal();
        }
    });

    window.addEventListener('hashchange', router);
}

// ============== PWA ==============
let deferredInstallPrompt = null;
const PWA_DISMISS_KEY = 'notesownik_pwa_dismissed_v1';

function initPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.warn('SW registration failed:', err);
            });
        });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (!localStorage.getItem(PWA_DISMISS_KEY)) {
            setTimeout(() => showPWABanner(), 4000);
        }
    });

    // Detect installed state
    window.addEventListener('appinstalled', () => {
        hidePWABanner();
        deferredInstallPrompt = null;
        toast('Notesownik zainstalowany!', 'success');
    });

    // Bind banner buttons
    document.getElementById('pwaBannerInstall').onclick = async () => {
        if (!deferredInstallPrompt) { hidePWABanner(); return; }
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') toast('Instalowanie...', 'success');
        else localStorage.setItem(PWA_DISMISS_KEY, '1');
        deferredInstallPrompt = null;
        hidePWABanner();
    };
    document.getElementById('pwaBannerDismiss').onclick = () => {
        localStorage.setItem(PWA_DISMISS_KEY, '1');
        hidePWABanner();
    };
}

function showPWABanner() {
    document.getElementById('pwaBanner').classList.add('show');
}
function hidePWABanner() {
    document.getElementById('pwaBanner').classList.remove('show');
}

// ============== INIT ==============
function init() {
    loadState();
    bindEvents();
    router();
    initPWA();
}

document.addEventListener('DOMContentLoaded', init);
