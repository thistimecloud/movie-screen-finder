// ========================================
// CineScope Tokyo — Frontend Logic
// ========================================

const API_BASE = '/api';

// State
let staticDataCache = null;
let currentMovieTitle = '';
let currentScheduleData = [];
let allDates = [];
let selectedDate = 'all';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchSuggestions = document.getElementById('search-suggestions');
const loadingSection = document.getElementById('loading-section');
const loadingText = document.getElementById('loading-text');
const loadingSub = document.getElementById('loading-sub');
const movieSelectSection = document.getElementById('movie-select-section');
const movieList = document.getElementById('movie-list');
const resultsSection = document.getElementById('results-section');
const resultsMovieTitle = document.getElementById('results-movie-title');
const dateTabs = document.getElementById('date-tabs');
const futureToggle = document.getElementById('future-toggle');
const resultsStats = document.getElementById('results-stats');
const theaterCards = document.getElementById('theater-cards');
const backBtn = document.getElementById('back-btn');
const emptySection = document.getElementById('empty-section');
const emptyBackBtn = document.getElementById('empty-back-btn');

// ========================================
// Event Listeners
// ========================================

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

backBtn.addEventListener('click', resetToSearch);
emptyBackBtn.addEventListener('click', resetToSearch);

futureToggle.addEventListener('change', () => {
  renderSchedule();
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    searchSuggestions.classList.add('hidden');
  }
});

// ========================================
// Search Flow
// ========================================

async function loadStaticData() {
  if (staticDataCache) return staticDataCache;
  const res = await fetch(import.meta.env.BASE_URL + 'data.json');
  staticDataCache = await res.json();
  return staticDataCache;
}

async function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    // If empty query, maybe show all currently playing movies?
    // Let's just require a search or show all. For now, if empty, show all.
  }

  hideAllSections();
  showLoading('データを読み込み中...', '最新の上映スケジュールを取得しています');

  try {
    const allData = await loadStaticData();
    hideLoading();

    const matchedItems = allData.filter(d => 
      !query || d.movie.title.toLowerCase().includes(query)
    );

    const movies = matchedItems.map(d => d.movie);

    if (movies.length === 0) {
      showEmpty('映画が見つかりません', `"${query}" に一致する公開中の映画が見つかりませんでした。（※データは自動取得された人気上位作品のみ対象です）`);
      return;
    }

    if (movies.length === 1) {
      selectMovie(movies[0]);
    } else {
      showMovieSelect(movies);
    }
  } catch (err) {
    hideLoading();
    console.error('Data load error:', err);
    showEmpty('エラー', 'データの読み込みに失敗しました。');
  }
}

function showMovieSelect(movies) {
  movieList.innerHTML = '';

  movies.forEach((movie, idx) => {
    const item = document.createElement('div');
    item.className = 'movie-item fade-in';
    item.style.animationDelay = `${idx * 0.05}s`;
    item.innerHTML = `
      <div class="movie-item-icon">🎬</div>
      <div class="movie-item-title">${escapeHtml(movie.title)}</div>
      <div class="movie-item-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `;
    item.addEventListener('click', () => selectMovie(movie));
    movieList.appendChild(item);
  });

  movieSelectSection.classList.remove('hidden');
}

function selectMovie(movie) {
  currentMovieTitle = movie.title;
  hideAllSections();
  
  const allData = staticDataCache || [];
  const movieData = allData.find(d => d.movie.id === movie.id);

  if (!movieData || !movieData.schedules || movieData.schedules.length === 0) {
    showEmpty(
      '上映情報が見つかりません',
      `"${movie.title}" のスケジュールデータがありません。`
    );
    return;
  }

  currentScheduleData = movieData.schedules;
  showResults();
}

// ========================================
// Results Rendering
// ========================================

function showResults() {
  resultsMovieTitle.textContent = currentMovieTitle;

  // Collect all unique dates
  const dateSet = new Set();
  currentScheduleData.forEach((item) => {
    item.schedule.forEach((s) => {
      dateSet.add(s.date);
    });
  });
  allDates = [...dateSet].sort();
  selectedDate = 'all';

  renderDateTabs();
  renderSchedule();

  resultsSection.classList.remove('hidden');
}

function renderDateTabs() {
  dateTabs.innerHTML = '';

  // "All" tab
  const allTab = document.createElement('button');
  allTab.className = `date-tab ${selectedDate === 'all' ? 'active' : ''}`;
  allTab.textContent = 'すべて';
  allTab.addEventListener('click', () => {
    selectedDate = 'all';
    renderDateTabs();
    renderSchedule();
  });
  dateTabs.appendChild(allTab);

  // Date tabs
  allDates.forEach((date) => {
    const tab = document.createElement('button');
    tab.className = `date-tab ${selectedDate === date ? 'active' : ''}`;
    tab.textContent = formatDateShort(date);
    tab.addEventListener('click', () => {
      selectedDate = date;
      renderDateTabs();
      renderSchedule();
    });
    dateTabs.appendChild(tab);
  });
}

function renderSchedule() {
  const futureOnly = futureToggle.checked;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Find max seats across all theaters for the bar chart scale
  const maxSeatsGlobal = Math.max(...currentScheduleData.map(d => d.theater.maxSeats));

  // Filter and prepare data
  const filteredData = currentScheduleData
    .map((item) => {
      const filteredSchedule = item.schedule
        .filter((s) => selectedDate === 'all' || s.date === selectedDate)
        .map((s) => {
          let times = s.times;
          if (futureOnly && s.date === todayStr) {
            times = times.filter((t) => {
              const [h, m] = t.start.split(':').map(Number);
              const showTime = new Date(now);
              showTime.setHours(h, m, 0, 0);
              return showTime > now;
            });
          }
          return { ...s, times };
        })
        .filter((s) => s.times.length > 0);

      if (filteredSchedule.length === 0) return null;

      return { ...item, schedule: filteredSchedule };
    })
    .filter(Boolean);

  // Stats
  const totalShowings = filteredData.reduce(
    (sum, item) => sum + item.schedule.reduce((s, sch) => s + sch.times.length, 0),
    0
  );

  resultsStats.innerHTML = `
    <span class="stat-item"><span class="stat-dot gold"></span>${filteredData.length} 映画館</span>
    <span class="stat-item"><span class="stat-dot blue"></span>${totalShowings} 上映回</span>
  `;

  // Render cards
  theaterCards.innerHTML = '';

  if (filteredData.length === 0) {
    theaterCards.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 12px;">🎬</div>
        <p>選択した条件に一致する上映がありません</p>
        <p style="font-size: 0.82rem; margin-top: 4px;">日付フィルターや時間フィルターを変更してみてください</p>
      </div>
    `;
    return;
  }

  filteredData.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'theater-card';
    card.style.animationDelay = `${idx * 0.08}s`;

    // Determine special screen types
    const specialScreens = item.theater.screens
      .filter(s => s.type !== '通常')
      .slice(0, 3);

    const badges = specialScreens.map(s => {
      let cls = 'premium';
      if (s.type.toLowerCase().includes('imax')) cls = 'imax';
      else if (s.type.toLowerCase().includes('dolby')) cls = 'dolby';
      return `<span class="screen-badge ${cls}">${escapeHtml(s.type)}</span>`;
    }).join('');

    const seatBarWidth = (item.theater.maxSeats / maxSeatsGlobal * 100).toFixed(1);

    // Build schedule HTML
    let scheduleHtml = '';
    item.schedule.forEach((sch) => {
      // Only show date label if showing multiple dates
      if (selectedDate === 'all' && allDates.length > 1) {
        scheduleHtml += `<div class="schedule-date-label">${escapeHtml(sch.displayDate)}</div>`;
      }
      sch.times.forEach((t) => {
        const isPast = isTimePast(sch.date, t.start, now, todayStr);
        const endText = t.end ? `<span class="time-end">〜${t.end}</span>` : '';
        scheduleHtml += `<div class="time-chip ${isPast ? 'past' : ''}">${t.start}${endText}</div>`;
      });
    });

    card.innerHTML = `
      <div class="theater-card-header">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <div class="rank-badge ${idx < 3 ? 'top3' : ''}">${idx + 1}</div>
          <div class="theater-info">
            <div class="theater-name">${escapeHtml(item.theater.name)}</div>
            <div class="theater-area">${escapeHtml(item.theater.area)}</div>
          </div>
        </div>
        <div class="theater-badge-group">${badges}</div>
      </div>
      <div class="seat-bar-container">
        <div class="seat-bar">
          <span class="seat-bar-label">最大スクリーン</span>
          <div class="seat-bar-track">
            <div class="seat-bar-fill" style="width: ${seatBarWidth}%"></div>
          </div>
          <span class="seat-bar-value">${item.theater.maxSeats}席</span>
        </div>
      </div>
      <div class="schedule-grid">${scheduleHtml}</div>
    `;

    theaterCards.appendChild(card);
  });
}

// ========================================
// UI Helpers
// ========================================

function hideAllSections() {
  loadingSection.classList.add('hidden');
  movieSelectSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  emptySection.classList.add('hidden');
  searchSuggestions.classList.add('hidden');
}

function showLoading(text, sub) {
  loadingText.textContent = text;
  loadingSub.textContent = sub;
  loadingSection.classList.remove('hidden');
}

function hideLoading() {
  loadingSection.classList.add('hidden');
}

function showEmpty(title, desc) {
  document.getElementById('empty-title').textContent = title;
  document.getElementById('empty-desc').textContent = desc;
  emptySection.classList.remove('hidden');
}

function resetToSearch() {
  hideAllSections();
  currentScheduleData = [];
  currentMovieTitle = '';
  searchInput.focus();
}

// ========================================
// Utility Functions
// ========================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = days[date.getDay()];
  return `${m}/${d}（${dayOfWeek}）`;
}

function isTimePast(dateStr, timeStr, now, todayStr) {
  if (dateStr !== todayStr) return dateStr < todayStr;
  const [h, m] = timeStr.split(':').map(Number);
  const showTime = new Date(now);
  showTime.setHours(h, m, 0, 0);
  return showTime <= now;
}

// ========================================
// Init
// ========================================

searchInput.focus();
