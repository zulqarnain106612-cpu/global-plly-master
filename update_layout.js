const fs = require('fs');
const path = 'public/index.html';

let content = fs.readFileSync(path, 'utf8');

// 보존해야 할 영역 찾기 (Head와 Script)
const headEnd = content.indexOf('<body');
const scriptStart = content.indexOf('<!-- ═══ JavaScript ═══ -->');

if (headEnd === -1 || scriptStart === -1) {
    console.error('필요한 마커를 찾지 못했습니다.');
    process.exit(1);
}

const newBodyContent = `
<body class="bg-plly-bg text-plly-text font-sans min-h-screen bg-grid overflow-hidden">
  
  <!-- ═══ Mobile Only Overlay ═══ -->
  <div class="mobile-overlay fixed inset-0 z-[9999] bg-[#080810] hidden flex-col items-center justify-center p-12 text-center lg:hidden">
    <div class="text-7xl mb-8 animate-float">📱</div>
    <h2 class="text-3xl font-black text-white mb-6 uppercase tracking-tighter">Desktop Only</h2>
    <p class="text-plly-muted text-lg leading-relaxed">Global Plly Master는 전문적인 제작 도구입니다.<br>최상의 경험을 위해 데스크탑 환경에서 접속해주세요.</p>
  </div>

  <canvas id="particles-canvas"></canvas>
  <div id="toast-container" class="fixed top-8 right-8 z-[300] flex flex-col gap-4"></div>

  <!-- ════════════════════════════════════════════════════
       🚀 SIDEBAR (Column 1)
  ════════════════════════════════════════════════════ -->
  <aside class="app-sidebar">
    <div class="p-8">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-2xl shadow-xl shadow-purple-500/20 animate-pulse-glow">🎵</div>
        <div>
          <h1 class="font-black text-xl leading-none tracking-tighter uppercase">PLLY <span class="text-purple-500">MASTER</span></h1>
          <p class="text-[9px] text-plly-muted mt-1.5 uppercase tracking-[0.2em] font-black opacity-60">AI Music Dashboard</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
      <div class="text-[10px] font-black text-plly-muted px-4 mb-3 uppercase tracking-[0.2em] opacity-40">Main Control</div>
      <a class="nav-link active">
        <span class="w-8 flex justify-center">🏠</span> <span>대시보드</span>
      </a>
      <a class="nav-link" id="btn-admin-nav" style="display:none;" href="/admin.html">
        <span class="w-8 flex justify-center">🛡️</span> <span>관리자 패널</span>
      </a>
      
      <div class="pt-8 text-[10px] font-black text-plly-muted px-4 mb-3 uppercase tracking-[0.2em] opacity-40">Insights</div>
      <a class="nav-link" onclick="document.getElementById('trends-area').scrollIntoView({behavior:'smooth'})">
        <span class="w-8 flex justify-center">📈</span> <span>글로벌 트렌드</span>
      </a>
      <a class="nav-link" onclick="document.getElementById('history-panel').scrollIntoView({behavior:'smooth'})">
        <span class="w-8 flex justify-center">📜</span> <span>작업 기록</span>
      </a>

      <div class="pt-8 text-[10px] font-black text-plly-muted px-4 mb-3 uppercase tracking-[0.2em] opacity-40">Preference</div>
      <button class="nav-link w-full text-left" id="btn-ai-setup-side" onclick="openSettingsModal()">
        <span class="w-8 flex justify-center">⚙️</span> <span>AI 엔진 설정</span>
      </button>
      <button class="nav-link w-full text-left" id="btn-change-password-side" onclick="openPwModal()">
        <span class="w-8 flex justify-center">🔒</span> <span>보안 설정</span>
      </button>
    </nav>

    <div class="p-4 mt-auto border-t border-white/5 bg-white/[0.01]">
      <div class="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-default group">
        <div id="user-avatar-initial" class="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-rose-400 flex items-center justify-center font-black text-white shadow-lg">👤</div>
        <div class="flex-1 min-w-0">
          <p id="user-display" class="text-sm font-bold truncate">User</p>
          <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Pro Active</p>
        </div>
        <button onclick="doLogout()" title="로그아웃" class="text-plly-muted hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </div>
  </aside>

  <main class="main-viewport bg-grid">
    <div class="content-center">
      <header class="mb-12 animate-fade-in">
        <div class="flex items-center gap-3 mb-4">
          <span class="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest">Next-Gen Audio Engine</span>
          <span id="admin-badge" class="hidden px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 uppercase tracking-widest">Master Admin</span>
        </div>
        <h2 class="text-5xl font-black text-white leading-[1.1] tracking-tight">Design the Sound<br><span class="gradient-text">of Tomorrow.</span></h2>
        <p class="text-plly-muted mt-6 text-xl font-medium">타겟 국가와 무드를 선택하세요. AI가 최적의 선율을 제안합니다.</p>
      </header>

      <div id="prompt-form" class="space-y-12">
        <section class="animate-slide-up" style="animation-delay: 0.1s">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-lg text-plly-muted border border-white/10">01</div>
            <div>
              <h3 class="text-2xl font-black text-white">Target Selection</h3>
              <p class="text-xs text-plly-muted mt-0.5">시장과 장르의 정체성을 설정합니다.</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-8">
            <div class="input-group">
              <label class="input-label">타겟 국가 <span id="country-flag" class="ml-2"></span></label>
              <select id="select-country" class="select-premium"><option value="" disabled selected>국가를 선택하세요</option></select>
            </div>
            <div class="input-group">
              <label class="input-label">음악 장르</label>
              <select id="select-genre" class="select-premium"><option value="" disabled selected>장르를 선택하세요</option></select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-8 mt-4">
            <div class="input-group">
              <label class="input-label">감성 무드 <span id="mood-emoji" class="ml-2"></span></label>
              <select id="select-mood" class="select-premium"><option value="" disabled selected>무드를 선택하세요</option></select>
            </div>
            <div class="input-group">
              <label class="input-label">곡의 속도 (Tempo)</label>
              <select id="select-tempo" class="select-premium"><option value="" disabled selected>템포를 선택하세요</option></select>
            </div>
          </div>
        </section>

        <section class="animate-slide-up" style="animation-delay: 0.2s">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-lg text-plly-muted border border-white/10">02</div>
            <div>
              <h3 class="text-2xl font-black text-white">Refinement</h3>
              <p class="text-xs text-plly-muted mt-0.5">상세 설정을 통해 완성도를 높입니다.</p>
            </div>
          </div>
          <div class="glass-card">
            <div class="grid grid-cols-3 gap-6 mb-8">
              <div><label class="input-label">보컬 유무</label><select id="vocal-select" class="select-premium !py-3 !text-sm"></select></div>
              <div><label class="input-label">곡의 구성</label><select id="structure-select" class="select-premium !py-3 !text-sm"></select></div>
              <div><label class="input-label">AI 창의성</label><select id="creativity-select" class="select-premium !py-3 !text-sm"></select></div>
            </div>
            <div class="input-group mb-0">
              <label class="input-label">테마 및 스탠스 (선택 사항)</label>
              <textarea id="theme-text" rows="3" class="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-purple-500 outline-none transition-all placeholder:text-plly-muted/40 font-medium" placeholder="예: 비 오는 밤 창가에서 헤어진 연인을 그리워하는 마음..."></textarea>
            </div>
          </div>
        </section>

        <div class="pt-8 flex gap-5 animate-slide-up" style="animation-delay: 0.3s">
          <button id="btn-generate" disabled class="btn-premium flex-1 py-5 flex items-center justify-center gap-4 group">
            <span id="btn-icon" class="text-2xl group-hover:scale-125 transition-transform">✨</span>
            <span id="btn-spinner" class="spinner hidden"></span>
            <span id="btn-text" class="text-xl font-black tracking-tight">1개 프롬프트 추출</span>
          </button>
          <button id="btn-generate-batch" disabled class="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all flex items-center gap-3 group">
            <span id="btn-batch-spinner" class="spinner hidden"></span>
            <span id="btn-batch-text" class="tracking-tight">10개 대량 생성</span>
            <span class="text-amber-400 group-hover:rotate-12 transition-transform">🎯</span>
          </button>
        </div>
      </div>
      
      <footer class="mt-32 pt-12 border-t border-white/5 flex items-center justify-between text-[10px] text-plly-muted font-black uppercase tracking-[0.3em] opacity-40">
        <div>Proprietary Engine v2.5</div>
        <div class="flex gap-8"><span>Global Plly Master</span><span>Suno AI Optimized</span></div>
      </footer>
    </div>

    <div class="panel-right">
      <div id="results-area" class="mb-10">
        <div id="prompt-placeholder" class="h-80 rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12 bg-white/[0.01]">
          <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl mb-6 opacity-30 animate-float">🤖</div>
          <p class="text-base text-plly-muted font-medium">생성 버튼을 클릭하면<br>이곳에 AI 마스터 프롬프트가 표시됩니다</p>
        </div>
        <div id="prompt-result" class="hidden animate-slide-up">
          <div class="flex items-center justify-between mb-5">
            <h4 class="text-[11px] font-black text-plly-muted uppercase tracking-widest">Master Prompt Output</h4>
            <button id="btn-copy-prompt" class="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-[11px] font-black flex items-center gap-2 transition-all"><span>COPY</span></button>
          </div>
          <div class="bg-black/30 border border-white/10 rounded-3xl p-6 font-mono text-sm leading-relaxed text-purple-200 break-words mb-6 shadow-2xl" id="prompt-text"></div>
          <div id="title-suggestions" class="flex flex-wrap gap-2"></div>
          <div id="meta-panel" class="hidden mt-6"><div class="grid grid-cols-2 gap-3" id="meta-tags-grid"></div></div>
        </div>
      </div>

      <div id="player-panel" class="hidden glass-card !p-6 mb-10 border-purple-500/20 shadow-2xl shadow-purple-500/5">
        <div class="flex items-center gap-5 mb-5">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-rose-400 flex items-center justify-center text-3xl shadow-lg">💿</div>
          <div class="flex-1 min-w-0"><div id="track-title" class="font-black text-white text-lg truncate">Track</div><div id="track-status" class="text-[10px] text-plly-muted uppercase tracking-widest">Ready</div></div>
        </div>
        <audio id="audio-player" controls class="w-full h-11 filter invert grayscale contrast-125 opacity-70"></audio>
      </div>

      <section id="trends-area" class="mb-10">
        <div class="flex gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 mb-6">
          <button id="tab-country" onclick="switchTrendTab('country')" class="trend-tab active flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all">REGIONAL</button>
          <button id="tab-rising" onclick="switchTrendTab('rising')" class="trend-tab flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all">RISING 📈</button>
        </div>
        <div id="trend-country" class="trend-content">
          <div class="flex flex-wrap gap-2 mb-6" id="trend-country-nav">
             <button onclick="selectTrendCountry('kr')" id="ctry-kr" class="country-btn active px-4 py-2 rounded-xl text-xs font-bold border transition-all">🇰🇷 KR</button>
             <button onclick="selectTrendCountry('us')" id="ctry-us" class="country-btn px-4 py-2 rounded-xl text-xs font-bold border transition-all">🇺🇸 US</button>
          </div>
          <div id="age-breakdown" class="space-y-4"></div>
        </div>
        <div id="trend-rising" class="trend-content hidden"><div id="rising-cards" class="space-y-4"></div></div>
      </section>

      <div id="history-panel" class="hidden border-t border-white/5 pt-10"><div id="history-list" class="space-y-3"></div></div>
    </div>
  </main>

  <div id="settings-modal" class="fixed inset-0 z-[500] hidden flex items-center justify-center p-8 bg-black/90 backdrop-blur-md">
    <div class="w-full max-w-lg glass-card !p-0 overflow-hidden shadow-2xl">
      <div class="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h3 class="text-xl font-black text-white">AI Engine Config</h3>
        <button onclick="closeSettingsModal()" class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-plly-muted">✕</button>
      </div>
      <div class="p-10 space-y-8">
        <div><label class="input-label">Model</label><select id="ai-model-select" class="select-premium"><option value="gemini-2.0-flash">Gemini 2.0 Flash</option></select></div>
        <div><label class="input-label">API Key</label><input type="password" id="api-key-input" class="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white" placeholder="Input API Key"></div>
        <div class="pt-4 flex gap-4"><button onclick="saveSettings()" class="btn-premium flex-1 py-5">SAVE CONFIG</button></div>
      </div>
    </div>
  </div>

  <div id="password-modal" class="fixed inset-0 z-[500] hidden flex items-center justify-center p-8 bg-black/90 backdrop-blur-md">
    <div class="w-full max-w-md glass-card !p-0 overflow-hidden shadow-2xl">
      <div class="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4"><h3 class="text-xl font-black text-white">Security</h3></div>
      <div class="p-10 space-y-5"><input type="password" id="current-password" class="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white" placeholder="Current Password"><input type="password" id="new-password" class="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white" placeholder="New Password"><div class="pt-6 flex gap-4"><button id="btn-submit-pwd" class="btn-premium flex-1 py-5">UPDATE</button></div></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
`;

const finalContent = content.substring(0, headEnd) + newBodyContent + content.substring(scriptStart);

fs.writeFileSync(path, finalContent);
console.log('index.html 업데이트 완료!');
