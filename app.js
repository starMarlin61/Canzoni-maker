import { parseChordPro, renderToHTML } from './chordpro.js';

// ==========================================================================
// CONFIGURAZIONI E MOMENTI LITURGICI
// ==========================================================================

const LITURGY_MOMENTS = [
  { id: 'ingresso', label: 'Ingresso', color: 'var(--moment-ingresso)' },
  { id: 'penitenziale', label: 'Kyrie / Penitenziale', color: 'var(--moment-penitenziale)' },
  { id: 'gloria', label: 'Gloria', color: 'var(--moment-gloria)' },
  { id: 'salmo', label: 'Salmo / Alleluia', color: 'var(--moment-salmo)' },
  { id: 'offertorio', label: 'Offertorio', color: 'var(--moment-offertorio)' },
  { id: 'santo', label: 'Santo', color: 'var(--moment-santo)' },
  { id: 'comunione', label: 'Comunione', color: 'var(--moment-comunione)' },
  { id: 'congedo', label: 'Congedo / Finale', color: 'var(--moment-congedo)' }
];

// Canti di esempio inseriti se il database è vuoto all'avvio
const SEED_SONGS = [
  {
    id: 'seed-1',
    title: 'Symbolum 77 (Tu sei la mia vita)',
    number: 77,
    desc: 'Andamento moderato. Molto conosciuto. Adatto per la Comunione.',
    moments: ['comunione'],
    lyrics: `{comment: Strofa 1}
[Mi-]Tu sei la mia [Re]vita, altro [Do]Dio non [Sol]ho.
[Do]Tu sei la mia [Re]strada, la mia [Sol]veri[Si7]tà.
[La-]Nella tua pa[Re]rola io cam[Sol]miine[Mi-]rò,
fin[La-]ché avrò re[Re]spiro, fino [Sol]a quando [Si7]Tu vorrai.
[La-]Non avrò pa[Re]ura, sai, se [Sol]Tu sei con [Mi-]me:
[Do]io Ti prego, [Re]resta con [Mi-]me.

{comment: Strofa 2}
[Mi-]Credo in Te, Si[Re]gnore, nato [Do]da Mari[Sol]a:
[Do]Figlio eterno e [Re]santo, uomo [Sol]come [Si7]noi.
[La-]Morto per a[Re]more, vivo [Sol]in mezzo a [Mi-]noi,
u[La-]na cosa [Re]sola con il [Sol]Padre e con [Si7]Te,
[La-]fino a quando, [Re]io lo so, Tu [Sol]ritorner[Mi-]ai
[Do]per aprirci il [Re]regno di [Mi-]Dio.`,
    sheetImage: null,
    isFavorite: true,
    createdAt: Date.now() - 3000
  },
  {
    id: 'seed-2',
    title: 'Alleluia (Irlandese)',
    number: 15,
    desc: 'Brillante e gioioso. Ottimo per l\'acclamazione al Vangelo.',
    moments: ['salmo'],
    lyrics: `{chorus}
[Sol]Al[Re]le[Do]lu[Sol]ia, [Do]al[Sol]le[La-]lu[Re]ia!
[Sol]Al[Re]le[Do]lu[Sol]ia, [Do]al[Sol]le[Re]lu[Sol]ia!
{eoc}

{comment: Strofa 1}
[Sol]Cantate al Si[Do]gnore un [La-]canto [Re]nuovo,
[Sol]tutta la [Do]terra [La-]canti al Si[Re]gnore.
[Mi-]A Lui la [Si-]gloria [Do]nei secoli dei [Sol]secoli!
[Do]Amen, [Sol]a[Re]men!`,
    sheetImage: null,
    isFavorite: false,
    createdAt: Date.now() - 2000
  },
  {
    id: 'seed-3',
    title: 'Santo (Bonfitto)',
    number: 102,
    desc: 'Solenne, ritmo incalzante. Canto liturgico classico ordinario.',
    moments: ['santo'],
    lyrics: `[Do]Santo, [Fa]Santo, [Do]Santo il Si[Sol]gnore,
[Do]Dio dell'u[Fa]niver[Sol]so.
[Fa]I cieli e la [Do]terra sono [Fa]pieni della tua [Sol]gloria.
[Do]Osanna [Fa]nell'alto dei [Sol]cieli.
[Do]Osanna [Fa]nell'alto dei [Sol]cieli.

[Do]Benedetto co[Fa]lui che [Do]viene nel [Sol]nome del Si[Do]gnore.
[Do]Osanna [Fa]nell'alto dei [Sol]cieli.
[Do]Osanna [Fa]nell'alto dei [Sol]cieli.`,
    sheetImage: null,
    isFavorite: false,
    createdAt: Date.now() - 1000
  }
];

// ==========================================================================
// DATABASE LOCALE INDEXEDDB
// ==========================================================================

class CanticoDB {
  constructor() {
    this.dbName = 'CanticoDB';
    this.dbVersion = 1;
    this.db = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('songs')) {
          const store = db.createObjectStore('songs', { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('number', 'number', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  getAllSongs() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  saveSong(song) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      const request = store.put(song);
      request.onsuccess = () => resolve(song.id);
      request.onerror = () => reject(request.error);
    });
  }

  deleteSong(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Instanza globale DB
const db = new CanticoDB();

// ==========================================================================
// STATO APPLICATIVO
// ==========================================================================

const state = {
  songs: [],
  currentSong: null,
  filters: {
    search: '',
    moment: null, // id del momento liturgico o null
    favoritesOnly: false
  },
  zoom: 18,
  transpose: 0,
  isScrolling: false,
  scrollSpeed: 3, // default
  scrollIntervalId: null,
  viewTab: 'lyrics', // 'lyrics' o 'sheet'
  twoColumns: false  // layout a due colonne
};

// Elementi DOM caricati
let el = {};

// ==========================================================================
// INIZIALIZZAZIONE
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Inizializza i selettori DOM
  initDOMReferences();

  try {
    await db.open();
    let loadedSongs = await db.getAllSongs();
    
    // Se il database è vuoto, inserisci i canti di esempio
    if (loadedSongs.length === 0) {
      for (let song of SEED_SONGS) {
        await db.saveSong(song);
      }
      loadedSongs = await db.getAllSongs();
    }
    
    state.songs = loadedSongs;
    
    // Inizializzazione UI
    renderMomentsFilters();
    renderMomentsEditSelectors();
    updateSongsList();
    initEventListeners();
    
  } catch (error) {
    console.error("Errore durante l'apertura del database IndexedDB:", error);
    alert("Impossibile caricare il database locale. Assicurati che il browser supporti IndexedDB.");
  }
});

function initDOMReferences() {
  el = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    btnNewSong: document.getElementById('btn-new-song'),
    searchInput: document.getElementById('search-input'),
    filterFavorites: document.getElementById('filter-favorites'),
    momentsFilterGrid: document.getElementById('moments-filter-grid'),
    songsList: document.getElementById('songs-list'),
    songsCount: document.getElementById('songs-count'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    btnBackupExport: document.getElementById('btn-backup-export'),
    btnBackupImportTrigger: document.getElementById('btn-backup-import-trigger'),
    backupImportFile: document.getElementById('backup-import-file'),
    
    // Backup welcome
    btnWelcomeImport: document.getElementById('btn-welcome-import'),
    btnWelcomeExport: document.getElementById('btn-welcome-export'),

    // View Panel (Leggio)
    viewPanel: document.getElementById('view-panel'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    viewSongNumber: document.getElementById('view-song-number'),
    viewSongTitle: document.getElementById('view-song-title'),
    btnToggleFavorite: document.getElementById('btn-toggle-favorite'),
    viewSongDesc: document.getElementById('view-song-desc'),
    viewSongMoments: document.getElementById('view-song-moments'),
    btnEditSong: document.getElementById('btn-edit-song'),
    btnToggleColumns: document.getElementById('btn-toggle-columns'),
    btnToolbarFullscreen: document.getElementById('btn-toolbar-fullscreen'),
    
    leggioToolbar: document.getElementById('leggio-toolbar'),
    tabLyrics: document.getElementById('tab-lyrics'),
    tabSheet: document.getElementById('tab-sheet'),
    
    btnTransposeDown: document.getElementById('btn-transpose-down'),
    transposeValue: document.getElementById('transpose-value'),
    btnTransposeUp: document.getElementById('btn-transpose-up'),
    
    btnZoomOut: document.getElementById('btn-zoom-out'),
    zoomSlider: document.getElementById('zoom-slider'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    
    btnAutoscrollPlay: document.getElementById('btn-autoscroll-play'),
    scrollSpeedSlider: document.getElementById('scroll-speed'),
    
    leggioViewport: document.getElementById('leggio-viewport'),
    songSheetLyrics: document.getElementById('song-sheet-lyrics'),
    lyricsRender: document.getElementById('lyrics-render'),
    songSheetImage: document.getElementById('song-sheet-image'),
    sheetZoomContainer: document.getElementById('sheet-zoom-container'),
    sheetImageElement: document.getElementById('sheet-image-element'),
    sheetNoImageMessage: document.getElementById('sheet-no-image-message'),
    btnGoEditUpload: document.getElementById('btn-go-edit-upload'),
    welcomeScreen: document.getElementById('welcome-screen'),
    btnWelcomeCreate: document.getElementById('btn-welcome-create'),

    // Edit Panel
    editPanel: document.getElementById('edit-panel'),
    editPanelTitle: document.getElementById('edit-panel-title'),
    btnEditCancel: document.getElementById('btn-edit-cancel'),
    btnEditSave: document.getElementById('btn-edit-save'),
    editForm: document.getElementById('edit-form'),
    editTitle: document.getElementById('edit-title'),
    editNumber: document.getElementById('edit-number'),
    editDesc: document.getElementById('edit-desc'),
    editMomentsSelector: document.getElementById('edit-moments-selector'),
    sheetUploadArea: document.getElementById('sheet-upload-area'),
    uploadPlaceholder: document.getElementById('upload-placeholder'),
    editSheetFile: document.getElementById('edit-sheet-file'),
    uploadPreview: document.getElementById('upload-preview'),
    uploadPreviewImg: document.getElementById('upload-preview-img'),
    btnRemoveSheet: document.getElementById('btn-remove-sheet'),
    chordsKeyboard: document.getElementById('chords-keyboard'),
    editLyrics: document.getElementById('edit-lyrics'),
    editorPreview: document.getElementById('editor-preview'),
    editFormFooter: document.getElementById('edit-form-footer'),
    btnDeleteSong: document.getElementById('btn-delete-song')
  };
}

// ==========================================================================
// ASSEGNAZIONE EVENT LISTENER
// ==========================================================================

function initEventListeners() {
  // Sidebar filtri e azioni
  el.btnNewSong.addEventListener('click', openCreateMode);
  el.btnWelcomeCreate.addEventListener('click', openCreateMode);
  el.searchInput.addEventListener('input', handleSearchInput);
  el.filterFavorites.addEventListener('click', toggleFavoritesFilter);
  el.btnResetFilters.addEventListener('click', resetFilters);
  
  // Backup
  el.btnBackupExport.addEventListener('click', exportBackup);
  el.btnBackupImportTrigger.addEventListener('click', () => el.backupImportFile.click());
  el.backupImportFile.addEventListener('change', importBackup);
  el.btnWelcomeImport.addEventListener('click', () => el.backupImportFile.click());
  el.btnWelcomeExport.addEventListener('click', exportBackup);

  // View Mode Actions
  el.btnToggleSidebar.addEventListener('click', toggleSidebarVisibility);
  el.btnToggleFavorite.addEventListener('click', toggleCurrentSongFavorite);
  el.btnEditSong.addEventListener('click', openEditMode);
  el.btnGoEditUpload.addEventListener('click', openEditMode);
  el.btnToggleColumns.addEventListener('click', toggleColumnsLayout);
  el.btnToolbarFullscreen.addEventListener('click', toggleFullscreen);

  // Tabs Leggio
  el.tabLyrics.addEventListener('click', () => selectViewTab('lyrics'));
  el.tabSheet.addEventListener('click', () => selectViewTab('sheet'));

  // Controlli Leggio
  el.btnTransposeDown.addEventListener('click', () => shiftTranspose(-1));
  el.btnTransposeUp.addEventListener('click', () => shiftTranspose(1));
  
  el.btnZoomOut.addEventListener('click', () => changeZoom(-1));
  el.btnZoomIn.addEventListener('click', () => changeZoom(1));
  el.zoomSlider.addEventListener('input', (e) => setZoomValue(parseInt(e.target.value)));
  
  el.btnAutoscrollPlay.addEventListener('click', toggleAutoscroll);
  el.scrollSpeedSlider.addEventListener('input', (e) => state.scrollSpeed = parseInt(e.target.value));

  // Edit Mode Actions
  el.btnEditCancel.addEventListener('click', closeEditMode);
  el.btnEditSave.addEventListener('click', saveSongFromForm);
  el.btnDeleteSong.addEventListener('click', deleteCurrentSong);

  // Gestione Upload file spartito
  el.uploadPlaceholder.addEventListener('click', () => el.editSheetFile.click());
  el.editSheetFile.addEventListener('change', handleSheetFileSelect);
  el.btnRemoveSheet.addEventListener('click', removeUploadedSheet);
  
  // Drag and Drop per area upload
  el.sheetUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.sheetUploadArea.classList.add('dragover');
  });
  el.sheetUploadArea.addEventListener('dragleave', () => {
    el.sheetUploadArea.classList.remove('dragover');
  });
  el.sheetUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    el.sheetUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  });

  // Editor ChordPro
  el.editLyrics.addEventListener('input', handleEditorLyricsInput);
  
  // Tastiera virtuale accordi
  el.chordsKeyboard.addEventListener('click', handleChordsKeyboardClick);

  // Chiudere sidebar su iPad con un tocco sullo schermo se aperta
  el.leggioViewport.addEventListener('click', () => {
    if (window.innerWidth <= 820 && !document.body.parentNode.classList.contains('sidebar-hidden')) {
      document.querySelector('.app-container').classList.add('sidebar-hidden');
    }
  });

  // Sincronizzazione Fullscreen nativo
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

// ==========================================================================
// FILTRI E BARRA LATERALE (SIDEBAR)
// ==========================================================================

function renderMomentsFilters() {
  el.momentsFilterGrid.innerHTML = '';
  LITURGY_MOMENTS.forEach(moment => {
    const btn = document.createElement('button');
    btn.className = 'btn-moment-filter';
    btn.setAttribute('style', `--moment-color: ${moment.color}`);
    btn.setAttribute('data-id', moment.id);
    btn.textContent = moment.label;
    
    btn.addEventListener('click', () => selectMomentFilter(moment.id));
    el.momentsFilterGrid.appendChild(btn);
  });
}

function selectMomentFilter(momentId) {
  const buttons = el.momentsFilterGrid.querySelectorAll('.btn-moment-filter');
  
  if (state.filters.moment === momentId) {
    // Disattiva il filtro se cliccato di nuovo
    state.filters.moment = null;
    buttons.forEach(b => b.classList.remove('active'));
  } else {
    state.filters.moment = momentId;
    buttons.forEach(b => {
      if (b.getAttribute('data-id') === momentId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
  updateSongsList();
}

function handleSearchInput(e) {
  state.filters.search = e.target.value.toLowerCase().trim();
  updateSongsList();
}

function toggleFavoritesFilter() {
  state.filters.favoritesOnly = !state.filters.favoritesOnly;
  el.filterFavorites.classList.toggle('active', state.filters.favoritesOnly);
  updateSongsList();
}

function resetFilters() {
  state.filters.search = '';
  state.filters.moment = null;
  state.filters.favoritesOnly = false;
  
  el.searchInput.value = '';
  el.filterFavorites.classList.remove('active');
  const buttons = el.momentsFilterGrid.querySelectorAll('.btn-moment-filter');
  buttons.forEach(b => b.classList.remove('active'));
  
  updateSongsList();
}

/**
 * Filtra e ordina la lista dei canti, renderizzando le card nella sidebar.
 */
function updateSongsList() {
  const query = state.filters.search;
  const momentId = state.filters.moment;
  const favOnly = state.filters.favoritesOnly;

  // Filtra i brani
  const filtered = state.songs.filter(song => {
    // Filtro ricerca
    const matchQuery = !query || 
      song.title.toLowerCase().includes(query) || 
      (song.number && song.number.toString().includes(query)) ||
      (song.desc && song.desc.toLowerCase().includes(query));
      
    // Filtro momento liturgico
    const matchMoment = !momentId || song.moments.includes(momentId);
    
    // Filtro preferiti
    const matchFav = !favOnly || song.isFavorite;
    
    return matchQuery && matchMoment && matchFav;
  });

  // Ordina per numero del libretto, se non presente ordina per titolo
  filtered.sort((a, b) => {
    if (a.number && b.number) return a.number - b.number;
    if (a.number) return -1;
    if (b.number) return 1;
    return a.title.localeCompare(b.title);
  });

  // Aggiorna contatore
  el.songsCount.textContent = `${filtered.length} brani`;
  
  // Mostra o nascondi il pulsante reset filtri
  const filtersActive = query !== '' || momentId !== null || favOnly;
  el.btnResetFilters.style.display = filtersActive ? 'inline-block' : 'none';

  // Svuota lista
  el.songsList.innerHTML = '';

  if (filtered.length === 0) {
    el.songsList.innerHTML = '<div class="list-empty">Nessun brano trovato con questi filtri.</div>';
    return;
  }

  filtered.forEach(song => {
    const card = document.createElement('button');
    card.className = `song-card ${state.currentSong && state.currentSong.id === song.id ? 'active' : ''}`;
    
    // Trova i colori dei momenti associati per i puntini colorati
    const momentsBadges = song.moments.map(mId => {
      const moment = LITURGY_MOMENTS.find(m => m.id === mId);
      return moment ? `<span class="badge-dot" style="background-color: ${moment.color}" title="${moment.label}"></span>` : '';
    }).join('');

    card.innerHTML = `
      <div class="song-card-num">${song.number || '-'}</div>
      <div class="song-card-content">
        <div class="song-card-title-row">
          <span class="song-card-title">${escapeHTML(song.title)}</span>
          ${song.isFavorite ? `
            <svg class="icon-star-filled" viewBox="0 0 24 24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          ` : ''}
        </div>
        <div class="song-card-desc">${escapeHTML(song.desc || 'Nessuna descrizione')}</div>
        <div class="song-card-moments">
          ${momentsBadges}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectSong(song.id);
      
      // Su iPad, chiudi automaticamente la sidebar dopo aver toccato un brano per dare massimo spazio allo spartito
      if (window.innerWidth <= 820) {
        document.querySelector('.app-container').classList.add('sidebar-hidden');
      }
    });

    el.songsList.appendChild(card);
  });
}

function toggleSidebarVisibility() {
  const container = document.querySelector('.app-container');
  container.classList.toggle('sidebar-hidden');
}

// ==========================================================================
// VISUALIZZAZIONE DETTAGLIO BRANO (VIEW PANEL)
// ==========================================================================

async function selectSong(id) {
  // Ferma eventuale autoscroll attivo prima di cambiare canto
  stopAutoscroll();

  try {
    const song = state.songs.find(s => s.id === id);
    if (!song) return;

    state.currentSong = song;
    state.transpose = 0; // Resetta la trasposizione a ogni cambio canto
    
    // Evidenzia la card attiva nella sidebar
    const cards = el.songsList.querySelectorAll('.song-card');
    cards.forEach((c, idx) => {
      const associatedSong = state.songs.find(s => s.title === c.querySelector('.song-card-title').textContent || s.number?.toString() === c.querySelector('.song-card-num').textContent);
      // Più sicuro confrontare l'elemento cliccato tramite una classe o ricreando la lista
    });
    // Rinfreschiamo la lista per allineare le classi active velocemente
    updateSongsList();

    // Aggiorna dati principali
    el.viewSongNumber.textContent = song.number || '-';
    el.viewSongTitle.textContent = song.title;
    el.viewSongDesc.textContent = song.desc || 'Nessuna descrizione aggiuntiva.';
    
    // Stella preferito nello header
    el.btnToggleFavorite.disabled = false;
    el.btnToggleFavorite.classList.toggle('active', song.isFavorite);
    
    // Bottone modifica abilitato
    el.btnEditSong.disabled = false;
    el.btnToggleColumns.disabled = false;
    el.btnToolbarFullscreen.disabled = false;

    // Allinea lo stato delle colonne
    el.lyricsRender.classList.toggle('two-columns', state.twoColumns);
    el.btnToggleColumns.classList.toggle('active', state.twoColumns);
    const spanCol = el.btnToggleColumns.querySelector('span');
    if (spanCol) {
      spanCol.textContent = state.twoColumns ? '1 Colonna' : '2 Colonne';
    }

    // Badge dei momenti liturgici
    el.viewSongMoments.innerHTML = '';
    song.moments.forEach(mId => {
      const moment = LITURGY_MOMENTS.find(m => m.id === mId);
      if (moment) {
        const badge = document.createElement('span');
        badge.className = 'badge-moment';
        badge.setAttribute('style', `background-color: ${moment.color}`);
        badge.textContent = moment.label;
        el.viewSongMoments.appendChild(badge);
      }
    });

    // Nasconde welcome screen e mostra controlli leggio
    el.welcomeScreen.style.display = 'none';
    el.leggioToolbar.style.display = 'flex';
    
    // Renderizza il brano
    renderSongContent();

    // Ripristina l'ultimo tab visualizzato (Lyrics o Sheet)
    selectViewTab(state.viewTab);

  } catch (error) {
    console.error("Errore nel caricamento del brano:", error);
  }
}

function renderSongContent() {
  if (!state.currentSong) return;
  
  // Resetta trasposizione visiva
  el.transposeValue.textContent = (state.transpose > 0 ? '+' : '') + state.transpose;

  // Renderizza testo e accordi con ChordPro
  const parsed = parseChordPro(state.currentSong.lyrics, state.transpose);
  const html = renderToHTML(parsed);
  el.lyricsRender.innerHTML = html;

  // Gestione spartito (immagine)
  if (state.currentSong.sheetImage) {
    el.sheetImageElement.src = state.currentSong.sheetImage;
    el.sheetImageElement.style.display = 'block';
    el.sheetNoImageMessage.style.display = 'none';
  } else {
    el.sheetImageElement.src = '';
    el.sheetImageElement.style.display = 'none';
    el.sheetNoImageMessage.style.display = 'flex';
  }
}

function selectViewTab(tab) {
  state.viewTab = tab;
  el.tabLyrics.classList.toggle('active', tab === 'lyrics');
  el.tabSheet.classList.toggle('active', tab === 'sheet');

  if (tab === 'lyrics') {
    el.songSheetLyrics.style.display = 'block';
    el.songSheetImage.style.display = 'none';
    // Mostra/Nascondi controlli specifici della toolbar
    document.querySelector('.transpose-group').style.display = 'flex';
    document.querySelector('.zoom-group').style.display = 'flex';
    // Ripristina dimensione font
    applyZoom();
  } else {
    el.songSheetLyrics.style.display = 'none';
    el.songSheetImage.style.display = 'flex';
    // Nascondi trasposizione e zoom per la foto (la foto non ha zoom a slider ma tramite scroll)
    document.querySelector('.transpose-group').style.display = 'none';
    document.querySelector('.zoom-group').style.display = 'none';
  }
}

async function toggleCurrentSongFavorite() {
  if (!state.currentSong) return;

  state.currentSong.isFavorite = !state.currentSong.isFavorite;
  el.btnToggleFavorite.classList.toggle('active', state.currentSong.isFavorite);
  
  try {
    await db.saveSong(state.currentSong);
    // Aggiorna la sidebar per riflettere lo stato della stella
    updateSongsList();
  } catch (error) {
    console.error("Errore nel salvataggio dei preferiti:", error);
  }
}

// ==========================================================================
// CONTROLLI LEGGIO (TRANSPOSE, ZOOM, SCROLL)
// ==========================================================================

function shiftTranspose(semitones) {
  state.transpose += semitones;
  // Limiti pratici di trasposizione
  if (state.transpose < -11) state.transpose = 11;
  if (state.transpose > 11) state.transpose = -11;
  
  renderSongContent();
}

function changeZoom(delta) {
  let newZoom = state.zoom + delta * 2;
  if (newZoom < 12) newZoom = 12;
  if (newZoom > 32) newZoom = 32;
  setZoomValue(newZoom);
}

function setZoomValue(val) {
  state.zoom = val;
  el.zoomSlider.value = val;
  applyZoom();
}

function applyZoom() {
  document.documentElement.style.setProperty('--lyric-font-size', `${state.zoom}px`);
}

// ==========================================================================
// MODALITÀ SCHERMO INTERO (FULLSCREEN)
// ==========================================================================

// Rileva se il dispositivo corrente supporta il touch (tablet/mobile)
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function toggleFullscreen() {
  const isCurrentlyFullscreen = document.body.classList.contains('fullscreen-active');
  
  if (!isCurrentlyFullscreen) {
    document.body.classList.add('fullscreen-active');
    updateFullscreenUI(true);
    
    // Su desktop, avvia anche il fullscreen nativo del browser
    if (!isTouchDevice) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => {
          console.warn("Fullscreen nativo fallito o non consentito:", err);
        });
      } else if (docEl.webkitRequestFullscreen) { /* Safari */
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) { /* IE11 */
        docEl.msRequestFullscreen();
      }
    }
  } else {
    document.body.classList.remove('fullscreen-active');
    updateFullscreenUI(false);
    
    // Su desktop, esci dal fullscreen nativo del browser
    if (!isTouchDevice) {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("Errore durante l'uscita dal fullscreen nativo:", err);
        });
      } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen && document.msFullscreenElement) { /* IE11 */
        document.msExitFullscreen();
      }
    }
  }
}

function updateFullscreenUI(isFullscreen) {
  const btns = [el.btnToolbarFullscreen];
  
  btns.forEach(btn => {
    if (!btn) return;
    const span = btn.querySelector('span');
    const svg = btn.querySelector('svg');
    if (isFullscreen) {
      if (span) span.textContent = 'Schermo Normale';
      btn.title = 'Esci da Schermo Intero';
      if (svg) {
        svg.innerHTML = '<path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"></path>';
      }
    } else {
      if (span) span.textContent = 'Schermo Intero';
      btn.title = 'Schermo Intero';
      if (svg) {
        svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>';
      }
    }
  });
}

function toggleColumnsLayout() {
  if (!state.currentSong) return;
  state.twoColumns = !state.twoColumns;
  el.btnToggleColumns.classList.toggle('active', state.twoColumns);
  el.lyricsRender.classList.toggle('two-columns', state.twoColumns);
  
  const span = el.btnToggleColumns.querySelector('span');
  if (state.twoColumns) {
    el.btnToggleColumns.title = 'Visualizza su colonna singola';
    if (span) span.textContent = '1 Colonna';
  } else {
    el.btnToggleColumns.title = 'Visualizza su due colonne';
    if (span) span.textContent = '2 Colonne';
  }
}

function handleFullscreenChange() {
  // Su dispositivi touch ignoriamo l'evento nativo per evitare che lo scroll verso l'alto 
  // (che richiama la barra indirizzi del browser ed esce dal fullscreen nativo) chiuda la modalità virtuale.
  if (isTouchDevice) return;

  const isNativeFs = !!(document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.mozFullScreenElement || 
                        document.msFullscreenElement);
  
  if (isNativeFs) {
    document.body.classList.add('fullscreen-active');
    updateFullscreenUI(true);
  } else {
    document.body.classList.remove('fullscreen-active');
    updateFullscreenUI(false);
  }
}

function toggleAutoscroll() {
  if (state.isScrolling) {
    stopAutoscroll();
  } else {
    startAutoscroll();
  }
}

function startAutoscroll() {
  state.isScrolling = true;
  el.btnAutoscrollPlay.classList.add('scrolling');
  el.btnAutoscrollPlay.querySelector('.icon-play').style.display = 'none';
  el.btnAutoscrollPlay.querySelector('.icon-pause').style.display = 'block';

  // Rimuovi smooth scroll per permettere l'autoscroll millimetrico preciso su Safari
  el.leggioViewport.classList.add('autoscrolling');

  // Formula per calcolare il ritardo: velocità più alta -> intervallo più breve
  // Velocità 1: ~120ms
  // Velocità 10: ~15ms
  const getDelay = () => 130 - (state.scrollSpeed * 11);

  const scrollStep = () => {
    if (!state.isScrolling) return;
    
    const viewport = el.leggioViewport;
    const currentScroll = viewport.scrollTop;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;

    // Se è arrivato alla fine, ferma lo scroll
    if (currentScroll >= maxScroll - 1) {
      stopAutoscroll();
      return;
    }

    viewport.scrollTop = currentScroll + 1;
    
    // Ricalcola il timer nel caso in cui la velocità sia cambiata
    state.scrollIntervalId = setTimeout(scrollStep, getDelay());
  };

  state.scrollIntervalId = setTimeout(scrollStep, getDelay());
}

function stopAutoscroll() {
  state.isScrolling = false;
  el.btnAutoscrollPlay.classList.remove('scrolling');
  el.btnAutoscrollPlay.querySelector('.icon-play').style.display = 'block';
  el.btnAutoscrollPlay.querySelector('.icon-pause').style.display = 'none';
  
  // Ripristina smooth scroll
  el.leggioViewport.classList.remove('autoscrolling');
  
  if (state.scrollIntervalId) {
    clearTimeout(state.scrollIntervalId);
    state.scrollIntervalId = null;
  }
}

// ==========================================================================
// CREAZIONE E MODIFICA CANTO (EDIT PANEL)
// ==========================================================================

function renderMomentsEditSelectors() {
  el.editMomentsSelector.innerHTML = '';
  LITURGY_MOMENTS.forEach(moment => {
    const label = document.createElement('label');
    label.className = 'moment-checkbox-label';
    label.setAttribute('style', `--moment-color: ${moment.color}`);
    
    label.innerHTML = `
      <input type="checkbox" name="edit-moments" value="${moment.id}">
      <span class="moment-color-indicator"></span>
      <span>${moment.label}</span>
    `;
    el.editMomentsSelector.appendChild(label);
  });
}

let editingSongId = null; // null per nuovo brano, altrimenti stringa id
let uploadedSheetImageBase64 = null; // Immagine caricata in memoria temporanea

function openCreateMode() {
  stopAutoscroll();
  editingSongId = null;
  uploadedSheetImageBase64 = null;

  // Pulisci e prepara il form
  el.editPanelTitle.textContent = "Nuovo Brano";
  el.editForm.reset();
  
  // Deseleziona tutte le checkbox dei momenti
  const checkboxes = el.editMomentsSelector.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);

  // Resetta area upload foto
  removeUploadedSheet();

  // Inizializza lyrics vuote e preview vuota
  el.editLyrics.value = '';
  el.editorPreview.innerHTML = '<p class="preview-empty">Inizia a scrivere per vedere l\'anteprima...</p>';

  // Nascondi il footer di cancellazione per i nuovi canti
  el.editFormFooter.style.display = 'none';

  // Cambia pannello visibile
  el.viewPanel.style.display = 'none';
  el.editPanel.style.display = 'flex';

  el.editTitle.focus();
}

function openEditMode() {
  if (!state.currentSong) return;
  stopAutoscroll();
  
  const song = state.currentSong;
  editingSongId = song.id;
  uploadedSheetImageBase64 = song.sheetImage;

  el.editPanelTitle.textContent = "Modifica Brano";
  
  // Riempi campi
  el.editTitle.value = song.title;
  el.editNumber.value = song.number || '';
  el.editDesc.value = song.desc || '';
  el.editLyrics.value = song.lyrics;

  // Checkbox dei momenti
  const checkboxes = el.editMomentsSelector.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = song.moments.includes(cb.value);
  });

  // Immagine spartito
  if (song.sheetImage) {
    el.uploadPreviewImg.src = song.sheetImage;
    el.uploadPreview.style.display = 'block';
    el.uploadPlaceholder.style.display = 'none';
  } else {
    removeUploadedSheet();
  }

  // Genera preview iniziale dell'editor
  updateEditorPreview();

  // Mostra il footer con il tasto di eliminazione
  el.editFormFooter.style.display = 'flex';

  // Cambia pannello visibile
  el.viewPanel.style.display = 'none';
  el.editPanel.style.display = 'flex';
}

function closeEditMode() {
  el.editPanel.style.display = 'none';
  el.viewPanel.style.display = 'flex';
  
  if (state.currentSong) {
    // Se c'era un canto attivo, torna su di esso
    selectSong(state.currentSong.id);
  } else {
    // Altrimenti mostra la welcome screen
    el.welcomeScreen.style.display = 'flex';
    el.leggioToolbar.style.display = 'none';
    el.btnToggleFavorite.disabled = true;
    el.btnEditSong.disabled = true;
    el.btnToggleColumns.disabled = true;
    el.btnToolbarFullscreen.disabled = true;
  }
}

// Gestione dell'immagine dello spartito
function handleSheetFileSelect(e) {
  if (e.target.files.length > 0) {
    processSelectedFile(e.target.files[0]);
  }
}

function processSelectedFile(file) {
  if (!file.type.startsWith('image/')) {
    alert("Per favore, seleziona un file immagine valido (JPG o PNG).");
    return;
  }

  // Mostra caricamento
  el.uploadPlaceholder.querySelector('p').innerHTML = 'Compressione e caricamento...';

  // Comprimi e converti l'immagine
  compressAndLoadImage(file).then(dataUrl => {
    uploadedSheetImageBase64 = dataUrl;
    el.uploadPreviewImg.src = dataUrl;
    el.uploadPreview.style.display = 'block';
    el.uploadPlaceholder.style.display = 'none';
    // Ripristina testo placeholder
    el.uploadPlaceholder.querySelector('p').innerHTML = 'Trascina un\'immagine dello spartito qui o <span>sfoglia i file</span>';
  }).catch(err => {
    console.error("Errore compressione immagine:", err);
    alert("Errore durante l'elaborazione dell'immagine dello spartito.");
    el.uploadPlaceholder.querySelector('p').innerHTML = 'Trascina un\'immagine dello spartito qui o <span>sfoglia i file</span>';
  });
}

function removeUploadedSheet() {
  uploadedSheetImageBase64 = null;
  el.editSheetFile.value = '';
  el.uploadPreview.style.display = 'none';
  el.uploadPlaceholder.style.display = 'flex';
}

/**
 * Ridimensiona e comprime un'immagine lato client per ridurre l'impatto sul DB locale.
 * Max larghezza/altezza: 1600px. Formato JPEG 0.75 qualità.
 */
function compressAndLoadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Esporta in formato JPEG leggero
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Gestione input lyrics per la live preview
function handleEditorLyricsInput() {
  updateEditorPreview();
}

function updateEditorPreview() {
  const lyrics = el.editLyrics.value;
  if (!lyrics.trim()) {
    el.editorPreview.innerHTML = '<p class="preview-empty">Inizia a scrivere per vedere l\'anteprima...</p>';
    return;
  }
  const parsed = parseChordPro(lyrics, 0); // Nessuna trasposizione in preview
  el.editorPreview.innerHTML = renderToHTML(parsed);
}

// Inserimento accordi rapidi
function handleChordsKeyboardClick(e) {
  const btn = e.target.closest('.kbd-btn');
  if (!btn) return;
  
  const textarea = el.editLyrics;
  
  // Strumenti speciali
  if (btn.id === 'btn-kbd-clear') {
    if (confirm("Sei sicuro di voler cancellare tutto il testo dell'editor?")) {
      textarea.value = '';
      updateEditorPreview();
      textarea.focus();
    }
    return;
  }
  
  if (btn.id === 'btn-kbd-brackets') {
    insertAtCursor(textarea, '[]');
    // Posiziona il cursore dentro le parentesi: es. [|]
    const pos = textarea.selectionStart - 1;
    textarea.selectionStart = textarea.selectionEnd = pos;
    textarea.focus();
    return;
  }
  
  if (btn.id === 'btn-kbd-chorus') {
    const chorusTemplate = '\n{chorus}\n[Do]Ritornello qui...\n{eoc}\n';
    insertAtCursor(textarea, chorusTemplate);
    return;
  }

  const valToInsert = btn.getAttribute('data-val');
  
  if (btn.classList.contains('modifier')) {
    // Per i modificatori (m, 7, maj7, /) facciamo un posizionamento intelligente
    const start = textarea.selectionStart;
    const val = textarea.value;
    
    // Controlla se il cursore è subito dopo la chiusura di un accordo: es. [Do]|
    if (start > 0 && val[start - 1] === ']') {
      // Inserisci il modificatore *dentro* le parentesi quadre
      textarea.selectionStart = textarea.selectionEnd = start - 1;
      insertAtCursor(textarea, valToInsert);
      // Riposiziona il cursore dopo la parentesi quadra chiusa
      textarea.selectionStart = textarea.selectionEnd = textarea.selectionStart + 1;
    } else {
      // Altrimenti inserisci come accordo completo
      insertAtCursor(textarea, `[${valToInsert}]`);
    }
  } else {
    // Accordo di base (Do, Re, Mi...)
    insertAtCursor(textarea, `[${valToInsert}]`);
  }
}

function insertAtCursor(textarea, textToInsert) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.substring(0, start);
  const after = text.substring(end, text.length);
  
  textarea.value = before + textToInsert + after;
  textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
  textarea.focus();
  
  // Aggiorna l'anteprima
  updateEditorPreview();
}

/**
 * Legge il form ed effettua il salvataggio o l'aggiunta del brano a IndexedDB.
 */
async function saveSongFromForm() {
  const title = el.editTitle.value.trim();
  const numberVal = el.editNumber.value.trim();
  const desc = el.editDesc.value.trim();
  const lyrics = el.editLyrics.value;
  
  if (!title) {
    alert("Il titolo del brano è obbligatorio.");
    el.editTitle.focus();
    return;
  }

  // Raccogli i momenti liturgici selezionati
  const moments = [];
  const checkedMoments = el.editMomentsSelector.querySelectorAll('input[type="checkbox"]:checked');
  checkedMoments.forEach(cb => moments.push(cb.value));

  const number = numberVal ? parseInt(numberVal) : null;

  // Crea l'oggetto canto
  let song;
  if (editingSongId) {
    // Modifica
    const existing = state.songs.find(s => s.id === editingSongId);
    song = {
      ...existing,
      title,
      number,
      desc,
      moments,
      lyrics,
      sheetImage: uploadedSheetImageBase64, // base64 jpeg o null
    };
  } else {
    // Nuovo
    song = {
      id: 'song-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title,
      number,
      desc,
      moments,
      lyrics,
      sheetImage: uploadedSheetImageBase64,
      isFavorite: false,
      createdAt: Date.now()
    };
  }

  try {
    await db.saveSong(song);
    
    // Aggiorna stato locale
    if (editingSongId) {
      const idx = state.songs.findIndex(s => s.id === editingSongId);
      state.songs[idx] = song;
    } else {
      state.songs.push(song);
    }

    // Chiudi modalità edit e visualizza il brano salvato
    el.editPanel.style.display = 'none';
    el.viewPanel.style.display = 'flex';
    
    selectSong(song.id);
    
  } catch (error) {
    console.error("Errore durante il salvataggio del brano:", error);
    alert("Impossibile salvare il brano nel database locale.");
  }
}

async function deleteCurrentSong() {
  if (!editingSongId) return;

  const song = state.songs.find(s => s.id === editingSongId);
  if (!song) return;

  if (!confirm(`Sei sicuro di voler eliminare permanentemente il brano "${song.title}"?`)) {
    return;
  }

  try {
    await db.deleteSong(song.id);
    
    // Rimuovi dallo stato locale
    state.songs = state.songs.filter(s => s.id !== song.id);
    
    // Pulisci canto corrente
    state.currentSong = null;
    editingSongId = null;

    // Chiudi pannello edit
    el.editPanel.style.display = 'none';
    el.viewPanel.style.display = 'flex';

    // Ricarica lista e mostra welcome screen
    updateSongsList();
    
    el.welcomeScreen.style.display = 'flex';
    el.leggioToolbar.style.display = 'none';
    el.btnToggleFavorite.disabled = true;
    el.btnEditSong.disabled = true;
    el.btnToggleColumns.disabled = true;
    el.btnToolbarFullscreen.disabled = true;

  } catch (error) {
    console.error("Errore durante l'eliminazione del brano:", error);
    alert("Impossibile eliminare il brano.");
  }
}

// ==========================================================================
// ESPORTAZIONE / IMPORTAZIONE BACKUP (JSON OFFLINE)
// ==========================================================================

function exportBackup() {
  if (state.songs.length === 0) {
    alert("Non ci sono brani da esportare.");
    return;
  }

  try {
    const zip = new JSZip();
    const songsToExport = [];
    const imagesFolder = zip.folder("spartiti");

    for (let song of state.songs) {
      const songCopy = { ...song };
      if (song.sheetImage) {
        // Salva le foto come file immagine separati dentro la cartella /spartiti
        const filename = `${song.id}.jpg`;
        songCopy.sheetImageFilename = filename;
        delete songCopy.sheetImage; // Rimuove il Base64 pesante dal JSON
        
        // Estrae la parte base64 pura (dopo la virgola della Data URL)
        const base64Data = song.sheetImage.split(',')[1];
        imagesFolder.file(filename, base64Data, { base64: true });
      }
      songsToExport.push(songCopy);
    }

    const backupData = {
      appName: 'Cantico - Leggio Liturgico',
      exportDate: new Date().toISOString(),
      version: 2,
      songs: songsToExport
    };

    zip.file("songs.json", JSON.stringify(backupData, null, 2));

    zip.generateAsync({ type: "blob" }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `cantico_backup_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Pulizia
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(err => {
      console.error("Errore generazione ZIP:", err);
      alert("Errore durante la creazione dell'archivio ZIP.");
    });

  } catch (error) {
    console.error("Errore durante l'esportazione del backup:", error);
    alert("Errore durante la generazione del backup.");
  }
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const arrayBuffer = event.target.result;
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      const songsJsonFile = zip.file("songs.json");
      if (!songsJsonFile) {
        alert("Il file ZIP non contiene il database dei canti (songs.json).");
        return;
      }
      
      const songsJsonText = await songsJsonFile.async("text");
      const data = JSON.parse(songsJsonText);
      
      // Validazione minima
      if (!data || data.appName !== 'Cantico - Leggio Liturgico' || !Array.isArray(data.songs)) {
        alert("Il file caricato non sembra essere un backup valido di Cantico.");
        return;
      }

      if (!confirm(`Trovati ${data.songs.length} brani nel backup ZIP. Vuoi importarli? I brani con lo stesso identificativo verranno sovrascritti.`)) {
        el.backupImportFile.value = '';
        return;
      }

      // Importa nel database locale e ricompone i base64 per IndexedDB
      for (let song of data.songs) {
        if (song.id && song.title && Array.isArray(song.moments)) {
          
          // Se il brano ha una foto dello spartito referenziata
          if (song.sheetImageFilename) {
            const imageFile = zip.file(`spartiti/${song.sheetImageFilename}`);
            if (imageFile) {
              const base64Data = await imageFile.async("base64");
              song.sheetImage = `data:image/jpeg;base64,${base64Data}`;
            }
            delete song.sheetImageFilename; // Rimuove il puntamento temporaneo
          } else {
            song.sheetImage = song.sheetImage || null;
          }

          // Aggiungi al database IndexedDB
          await db.saveSong(song);
          
          // Aggiorna stato locale (rimpiazza se esiste, altrimenti aggiungi)
          const idx = state.songs.findIndex(s => s.id === song.id);
          if (idx !== -1) {
            state.songs[idx] = song;
          } else {
            state.songs.push(song);
          }
        }
      }

      alert("Backup ZIP importato con successo!");
      updateSongsList();
      
      if (state.currentSong) {
        // Ricarica il brano attivo per aggiornare l'eventuale spartito caricato
        selectSong(state.currentSong.id);
      }

    } catch (err) {
      console.error("Errore nel parsing del file di backup ZIP:", err);
      alert("Impossibile leggere il file ZIP. Assicurati che sia un archivio valido generato da Cantico.");
    } finally {
      el.backupImportFile.value = '';
    }
  };

  reader.onerror = () => {
    alert("Errore durante la lettura del file.");
    el.backupImportFile.value = '';
  };

  reader.readAsArrayBuffer(file);
}

// Helper per escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
