// ==========================================================================
// script.js - FULL VERSION (Halaman Utama Chrome / main.html)
// ==========================================================================

/* ── Element references ── */
const mainSearch    = document.getElementById('mainSearch');
const omniboxInput  = document.getElementById('omniboxInput');
const suggestionsEl = document.getElementById('suggestions');
const dropZone      = document.getElementById('dropZone');

/* ── Helpers ── */
function isURL(str) {
  return /^(https?:\/\/|www\.)|(\.[a-z]{2,})(\/|$)/i.test(str);
}

function doSearch(query) {
  if (!query.trim()) return;
  const url = isURL(query)
    ? (query.startsWith('http') ? query : 'https://' + query)
    : 'https://www.google.com/search?q=' + encodeURIComponent(query);
  window.open(url, '_blank');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Suggestions ── */
function renderSuggestions(query) {
  if (!query) { hideSuggestions(); return; }
  const items = [
    { text: query,                type: 'search' },
    { text: query + ' wikipedia', type: 'search' },
    { text: query + ' youtube',   type: 'search' },
    { text: query + '.com',       type: 'url'    },
  ];
  suggestionsEl.innerHTML = items.map(item => `
    <div class="suggestion-item" data-val="${escapeHtml(item.text)}">
      <svg width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2">
        ${item.type === 'url'
          ? '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
          : '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>'}
      </svg>
      ${escapeHtml(item.text)}
    </div>
  `).join('');
  suggestionsEl.classList.add('visible');
}

function hideSuggestions() {
  suggestionsEl.classList.remove('visible');
  suggestionsEl.innerHTML = '';
}

/* ── Main search bar ── */
mainSearch.addEventListener('input', () => {
  renderSuggestions(mainSearch.value);
  omniboxInput.value = mainSearch.value;
});
mainSearch.addEventListener('keydown', e => {
  if (e.key === 'Enter')  { doSearch(mainSearch.value); hideSuggestions(); }
  if (e.key === 'Escape') { hideSuggestions(); }
});
mainSearch.addEventListener('focus', () => {
  if (mainSearch.value) renderSuggestions(mainSearch.value);
});

/* ── Suggestions click ── */
suggestionsEl.addEventListener('click', e => {
  const item = e.target.closest('.suggestion-item');
  if (item) { doSearch(item.dataset.val); hideSuggestions(); }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) hideSuggestions();
});

/* ── Omnibox (toolbar) ── */
omniboxInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(omniboxInput.value);
});
omniboxInput.addEventListener('input', () => {
  mainSearch.value = omniboxInput.value;
});

/* ── Buttons ── */
document.getElementById('aiModeBtn').addEventListener('click', () => {
  const q = mainSearch.value || 'AI Mode';
  window.open('https://www.google.com/search?q=' + encodeURIComponent(q) + '&udm=50', '_blank');
});

document.getElementById('reloadBtn').addEventListener('click', () => {
  location.reload();
});

// Perbaikan tombol Web Store agar aman jika elemen ada di HTML
const webStoreBtn = document.getElementById('webStoreBtn');
if (webStoreBtn) {
  webStoreBtn.addEventListener('click', () => {
    window.open('https://chrome.google.com/webstore', '_blank');
  });
}

document.getElementById('addShortcut').addEventListener('click', () => {
  const name = prompt('Nama shortcut:');
  if (!name) return;
  const url = prompt('URL (contoh: https://example.com):');
  if (!url) return;
  alert('Shortcut "' + name + '" berhasil ditambahkan! (demo)');
});

document.getElementById('customizeBtn').addEventListener('click', () => {
  alert('Fitur Customize Chrome (demo).');
});


/* ── DRAG AND DROP GAMBAR SHORTCUT ── */
if (dropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => e.preventDefault(), false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.background = 'rgba(255, 255, 255, 0.2)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.background = 'transparent';
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      const file = files[0];
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(event) {
          dropZone.innerHTML = '';
          const img = document.createElement('img');
          img.src = event.target.result;
          dropZone.appendChild(img);
        };
        
        reader.readAsDataURL(file);
      } else {
        alert('Tolong drop file berformat gambar saja, bro!');
      }
    }
  });
}

/* ── LOGIKA OTOMATIS: MASUK MENU UTAMA HANYA 2 DETIK LALU BALIK KE LOGIN ── */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000); // 2000 ms = 2 detik
});