// API base auto-detection.
// When backend serves the frontend (Railway, Render, local Express): use same origin.
// When frontend is on GitHub Pages or a separate static host: override by setting
// window.ABOOD_API_BASE in your HTML before app.js loads, e.g.
//   <script>window.ABOOD_API_BASE = 'https://abood-test.up.railway.app';</script>
const API_BASE = (typeof window.ABOOD_API_BASE === 'string' && window.ABOOD_API_BASE)
  ? window.ABOOD_API_BASE.replace(/\/$/, '') + '/api'
  : window.location.origin + '/api';

// i18n - language switcher with localStorage persistence
const I18n = {
  getLang() {
    return localStorage.getItem('abood_lang') || 'en';
  },

  setLang(lang) {
    localStorage.setItem('abood_lang', lang);
    this.apply();
  },

  toggle() {
    this.setLang(this.getLang() === 'en' ? 'ar' : 'en');
  },

  t(key) {
    const lang = this.getLang();
    const dict = (typeof TRANSLATIONS !== 'undefined') ? TRANSLATIONS[lang] : null;
    if (dict && dict[key] !== undefined) return dict[key];
    const fallback = (typeof TRANSLATIONS !== 'undefined') ? TRANSLATIONS.en[key] : null;
    return fallback !== null && fallback !== undefined ? fallback : key;
  },

  apply() {
    const lang = this.getLang();
    const isRtl = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', this.t(key));
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = this.t(key);
    });

    document.querySelectorAll('.lang-toggle-label').forEach(el => {
      el.textContent = lang === 'en' ? 'AR' : 'EN';
    });
  },

  initToggle(selector) {
    const btn = document.querySelector(selector);
    if (btn) btn.addEventListener('click', () => this.toggle());
  },

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.apply());
    } else {
      this.apply();
    }
  }
};
I18n.init();

// Authentication helper - manages token and user storage
const Auth = {
  // Get JWT token from localStorage
  getToken() {
    return localStorage.getItem('medplay_token');
  },

  // Save JWT token to localStorage
  setToken(token) {
    localStorage.setItem('medplay_token', token);
  },

  // Clear token and user data
  removeToken() {
    localStorage.removeItem('medplay_token');
    localStorage.removeItem('medplay_user');
  },

  // Save user object to localStorage
  setUser(user) {
    localStorage.setItem('medplay_user', JSON.stringify(user));
  },

  // Get stored user object
  getUser() {
    const u = localStorage.getItem('medplay_user');
    return u ? JSON.parse(u) : null;
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken();
  },

  // Logout and redirect to login page
  // Uses a relative path so it works whether the app is hosted at
  // origin/, /abood-test-FRONT/, /any/sub/path/, etc.
  logout() {
    this.removeToken();
    window.location.href = 'login.html';
  },

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }
};

// API client - handles all backend requests
const API = {
  // Generic request method with auth header
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    const token = Auth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'An error occurred');
    }
    return data;
  },

  // Register a new user
  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },

  // Login existing user
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // Get current user info
  async getMe() {
    return this.request('/user/me');
  },

  // Get list of challenges for a section
  async getChallenges(section) {
    return this.request(`/challenges/${section}`);
  },

  // Get full details of a specific challenge
  async getChallengeDetail(id) {
    return this.request(`/challenges/detail/${id}`);
  },

  // Submit an answer to a challenge
  async submitChallenge(id, answer) {
    return this.request(`/challenges/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answer })
    });
  },

  // Get progress statistics for all sections
  async getSectionsProgress() {
    return this.request('/sections/progress');
  },

  // Get top 10 users by XP
  async getLeaderboard() {
    return this.request('/leaderboard');
  },

  // Get analytics: aggregated stats + recent activity
  async getAnalytics() {
    return this.request('/analytics');
  },

  // Get user's achievement list (unlocked + locked with progress)
  async getAchievements() {
    return this.request('/achievements');
  },

  // Ask the AI assistant a question
  async aiAsk(question) {
    return this.request('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  }
};

// Show a message in a UI element (error or success)
function showMessage(elementId, text, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
  el.style.display = 'block';
  if (type === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }
}

// Dashboard shell: renders shared sidebar + topbar around page content.
// Pages call Shell.render({ active: 'hub', title: 'DASHBOARD', showAI: true });
const Shell = {
  navItems: [
    { id: 'hub',          icon: '⊞',  i18n: 'shell.dashboard',   href: 'hub.html' },
    { id: 'modes',        icon: '▶',  i18n: 'shell.modes',       href: 'hub.html#modes' },
    { id: 'social',       icon: '◯',  i18n: 'shell.social',      href: 'social.html' },
    { id: 'analytics',    icon: '◫',  i18n: 'shell.analytics',   href: 'analytics.html' },
    { id: 'achievements', icon: '★',  i18n: 'shell.achievements',href: 'achievements.html' },
    { id: 'ai',           icon: '✦',  i18n: 'shell.ai',          href: 'ai.html' },
    { id: 'settings',     icon: '⚙',  i18n: 'shell.settings',    href: 'settings.html' },
  ],

  initials(name) {
    if (!name) return 'A';
    return name.trim().charAt(0).toUpperCase();
  },

  renderSidebar(activeId) {
    const user = Auth.getUser() || { username: 'Player', id: 0 };
    const items = this.navItems.map(it => `
      <a href="${it.href}" class="nav-item ${it.id === activeId ? 'active' : ''}" data-nav="${it.id}">
        <span class="nav-icon">${it.icon}</span>
        <span data-i18n="${it.i18n}">${it.id}</span>
      </a>
    `).join('');

    return `
      <aside class="sidebar" id="sidebar">
        <a class="sb-logo" href="landing.html">MEDPLAY<span class="accent"> NEXUS</span></a>
        <div class="sb-user">
          <div class="sb-avatar">${this.initials(user.username)}</div>
          <div class="sb-info">
            <div class="sb-name">${user.username}</div>
            <div class="sb-id">#AT-${String(user.id).padStart(4, '0')}</div>
          </div>
        </div>
        ${items}
        <div class="nav-bottom" style="margin-top:auto;padding:16px 20px;">
          <button class="logout-btn" onclick="Auth.logout()" data-i18n="nav.logout">Log out</button>
        </div>
      </aside>
    `;
  },

  renderTopbar(title) {
    return `
      <header class="topbar">
        <button class="menu-toggle" id="menuToggle">☰</button>
        <div class="topbar-title" data-i18n="${title.i18n || ''}">${title.text}</div>
        <a class="topbar-icon" href="achievements.html" title="Achievements">★</a>
        <a class="topbar-icon" href="settings.html" title="Settings">⚙</a>
        <button class="lang-btn-pill" id="langToggle" title="Switch language">
          <span class="lang-toggle-label">AR</span>
        </button>
      </header>
    `;
  },

  // Mount sidebar + topbar around an existing #page element.
  // Usage in pages: <body><div id="page"><!-- content --></div></body>
  // Call Shell.mount({ active, title });
  mount({ active, title }) {
    const page = document.getElementById('page');
    if (!page) return;
    const content = page.innerHTML;
    document.body.innerHTML = `
      <div class="app-shell">
        ${this.renderSidebar(active)}
        <main class="main-area">
          ${this.renderTopbar(title)}
          <div class="content" id="content">${content}</div>
        </main>
      </div>
    `;

    // Wire up menu toggle
    const toggle = document.getElementById('menuToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Wire up language toggle
    I18n.initToggle('#langToggle');
    I18n.apply();
  }
};
