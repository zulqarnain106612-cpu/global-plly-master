const fs = require('fs');

try {
  let indexHtml = fs.readFileSync('public/index.html', 'utf8');
  const asideEndIndex = indexHtml.indexOf('</aside>') + 8;
  const headAndSidebar = indexHtml.substring(0, asideEndIndex);

  const mainView = `
  <main class="main-viewport flex-1 flex flex-col w-full h-full relative z-0 bg-[#f6f6f8] min-w-0">
    <!-- Top Bar -->
    <div class="h-20 bg-white/80 backdrop-blur-md border-b border-[#f0f1f3] flex items-center justify-between px-6 lg:px-10 shrink-0 z-40 sticky top-0 w-full shadow-[0px_10px_30px_rgba(45,47,49,0.03)]">
      <div class="flex items-center gap-3">
        <span class="hidden md:inline text-luminous-textMuted font-bold text-sm tracking-wide uppercase">Results</span>
        <span class="hidden md:inline text-[#d1d5db] mx-1">›</span>
        <span id="page-title" class="text-sm font-extrabold text-luminous-text">생성 결과</span>
      </div>
      <div class="flex items-center gap-2 lg:gap-3">
        <button onclick="copyAll()" class="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] font-bold text-[13px] lg:text-sm hover:bg-[#FF5A5F]/20 transition-all whitespace-nowrap">
          📋 <span id="copy-all-text">전체 복사</span>
        </button>
        <button onclick="resetResults()" class="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-[#f0f1f3] text-luminous-textMuted font-bold text-[13px] lg:text-sm hover:bg-[#e7e8ea] hover:text-luminous-text transition-all whitespace-nowrap">
          🔄 <span class="hidden md:inline">초기화</span>
        </button>
        <a href="/" class="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-white border border-[#e7e8ea] text-luminous-text font-bold text-[13px] lg:text-sm hover:shadow-[0px_20px_40px_rgba(45,47,49,0.04)] transition-all whitespace-nowrap">
          🏠 <span class="hidden md:inline">대시보드</span>
        </a>
      </div>
    </div>

    <!-- Results Content -->
    <div class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 lg:p-12 w-full">
      <div id="results-container" class="max-w-[1400px] mx-auto pb-24 w-full">
        <div id="loading" class="text-center py-40">
          <div class="text-5xl mb-6 animate-pulse" style="animation: float 4s ease-in-out infinite;">🎵</div>
          <p class="text-luminous-textMuted font-bold text-lg">결과를 불러오는 중...</p>
        </div>
      </div>
    </div>
  </main>
  `;

  const scriptTag = `
  <script>
    // ═══ Auth Guard ═══
    (function () {
      var token = localStorage.getItem('gpm_token');
      if (!token) { window.location.href = '/login.html'; return; }
      var name = localStorage.getItem('gpm_realname') || localStorage.getItem('gpm_username') || 'User';
      var el = document.getElementById('user-display');
      if (el) el.textContent = name;
    })();

    function doLogout() {
      if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('gpm_token');
        window.location.href = '/login.html';
      }
    }

    // ═══ Sidebar badge ═══
    (function () {
      var prev = localStorage.getItem('plly_results');
      if(prev){
        try{
          var d = JSON.parse(prev);
          var badge = document.getElementById('nav-results-badge');
          if(badge) badge.textContent = d.type==='batch' ? (d.data.length+'개') : '1개';
        }catch(e){}
      }
    })();

    // ═══ Sidebar Nav Active State ═══
    setTimeout(() => {
        document.querySelectorAll('.app-sidebar .nav-link').forEach(link => link.classList.remove('active'));
        const resultsLink = document.getElementById('nav-recent-results');
        if(resultsLink) resultsLink.classList.add('active');
    }, 50);

    // ═══ Toast ═══
    function showToast(msg, type) {
      type = type || 'info';
      var container = document.getElementById('toast-container');
      if(!container) return;
      var colors = { success: 'bg-emerald-50 text-emerald-700 border-emerald-200', error: 'bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/20', info: 'bg-blue-50 text-blue-700 border-blue-200' };
      var icons = { success: '✅', error: '❌', info: 'ℹ️' };
      var t = document.createElement('div');
      t.className = 'rounded-[1rem] px-5 py-3 border flex items-center gap-3 shadow-[0px_20px_40px_rgba(45,47,49,0.06)] max-w-sm ' + (colors[type] || colors.info);
      t.style.cssText = 'transform:translateX(110%);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
      t.innerHTML = '<span class="text-lg">' + (icons[type] || 'ℹ️') + '</span><span class="text-[13px] font-extrabold tracking-tight">' + msg + '</span>';
      container.appendChild(t);
      requestAnimationFrame(function () { t.style.transform = 'translateX(0)'; });
      setTimeout(function () { t.style.transform = 'translateX(110%)'; setTimeout(function () { t.remove(); }, 400); }, 3000);
    }

    // ═══ Clipboard ═══
    async function copyText(text) {
      try { await navigator.clipboard.writeText(text); }
      catch (e) { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    }

    var _copiedBatchCards = JSON.parse(localStorage.getItem('plly_copied_batch') || '{}');
    var _copiedImgCards = JSON.parse(localStorage.getItem('plly_copied_img') || '{}');

    function saveCopiedState() {
      localStorage.setItem('plly_copied_batch', JSON.stringify(_copiedBatchCards));
      localStorage.setItem('plly_copied_img', JSON.stringify(_copiedImgCards));
    }

    function renderResults() {
      var raw = localStorage.getItem('plly_results');
      if (!raw) {
        document.getElementById('results-container').innerHTML =
          '<div class="text-center py-40">' +
          '<div class="w-24 h-24 rounded-[2rem] bg-white shadow-[0_20px_40px_rgba(45,47,49,0.04)] border border-[#e7e8ea] flex items-center justify-center text-5xl mx-auto mb-6 opacity-80" style="animation: float 4s ease-in-out infinite;">😶</div>' +
          '<p class="text-luminous-textMuted font-bold text-lg mb-8">표시할 결과가 없습니다.</p>' +
          '<a href="/" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF5A5F] text-white font-extrabold text-[15px] hover:shadow-[0_10px_30px_rgba(255,90,95,0.25)] hover:-translate-y-1 transition-all">🏠 대시보드로 이동</a>' +
          '</div>';
        return;
      }
      var data = JSON.parse(raw);
      var container = document.getElementById('results-container');
      if (data.type === 'single') { renderSingle(container, data.data); }
      else if (data.type === 'batch') { renderBatch(container, data.data); }
    }

    // ── Single Result ──
    function renderSingle(container, result) {
      document.getElementById('page-title').textContent = '단일 프롬프트 결과';
      var escaped = (result.prompt.prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var m = result.music;
      var titleText = m ? (m.title || 'Untitled') : 'Single Prompt Output';
      var mInfo = m ? '<div class="text-[11px] text-[#FF5A5F] uppercase font-bold tracking-widest mt-1">' + (m.duration||'') + '</div>' : '<p class="text-sm text-luminous-textMuted">가사 스크립트는 고급 모드에서 사용 가능합니다.</p>';

      container.innerHTML = '<div class="glass-card bg-white rounded-[2rem] p-8 lg:p-12 shadow-[0_20px_40px_rgba(45,47,49,0.04)] border border-transparent hover:shadow-[0_30px_60px_rgba(45,47,49,0.08)] transition-all max-w-4xl mx-auto">' +
        '<div class="flex items-center gap-4 mb-8">' +
            '<div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF5A5F] to-[#ffc2cd] shadow-[0_10px_30px_rgba(255,90,95,0.25)] flex items-center justify-center text-2xl">✨</div>' +
            '<div><h2 class="text-2xl font-display font-extrabold text-luminous-text">' + titleText + '</h2>' + mInfo + '</div>' +
        '</div>' +
        '<div class="bg-luminous-surfaceLow p-6 rounded-2xl font-mono text-[14px] text-luminous-text mb-8 whitespace-pre-wrap leading-relaxed border border-[#e7e8ea] max-h-[400px] overflow-y-auto break-words">' + escaped + '</div>' +
        '<div class="flex flex-wrap gap-4 items-center justify-end">' +
            '<button onclick="copyText(\\'' + escaped.replace(/'/g, "\\\\'") + '\\'); showToast(\\'프롬프트가 복사되었습니다!\\', \\'success\\');" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF5A5F] text-white font-extrabold hover:shadow-[0_10px_30px_rgba(255,90,95,0.25)] hover:-translate-y-1 transition-all">📋 프롬프트 복사하기</button>' +
        '</div>' +
        
        '<!-- Image Prompts Section -->' +
        '<div id="image-prompt-section" class="mt-12 pt-10 border-t border-[#f0f1f3]">' +
          '<div class="flex items-center gap-4 mb-6">' +
            '<div class="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-fuchsia-400 to-purple-500 flex items-center justify-center text-xl shadow-[0_10px_30px_rgba(217,70,239,0.2)]">🎨</div>' +
            '<div><h3 class="text-[20px] font-display font-black text-luminous-text">Image &amp; Video Prompts</h3><p class="text-xs text-luminous-textMuted font-bold mt-1 tracking-wide">앨범 커버 및 뮤직비디오용 AI 프롬프트 (16:9)</p></div>' +
            '<div id="img-loading" class="ml-auto flex items-center gap-2 text-fuchsia-500 text-[13px] font-bold hidden"><div class="spinner w-4 h-4 border-2 border-fuchsia-200 border-t-fuchsia-500"></div>생성 중...</div>' +
          '</div>' +
          '<div class="flex flex-wrap gap-2 mb-6"><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab active" data-tab="whisk" onclick="switchImgTab(\\'whisk\\')">🌀 Whisk (Pika)</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="flow" onclick="switchImgTab(\\'flow\\')">🎬 FLOW (Video)</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="grok" onclick="switchImgTab(\\'grok\\')">🤖 Grok (Image)</button></div>' +
          '<div id="img-prompt-list"><p class="text-luminous-textMuted text-sm font-bold animate-pulse">⏳ 프롬프트를 불러오는 중입니다...</p></div>' +
        '</div>' +

      '</div>';
      
      setTimeout(function() {
        var inp = JSON.parse(localStorage.getItem('plly_input') || '{}');
        if (window.fetchImagePrompt) fetchImagePrompt(inp.country, inp.genre, inp.mood);
      }, 300);
    }

    // ── Batch Results ──
    function renderBatch(container, results) {
      document.getElementById('page-title').textContent = results.length + '개 프롬프트 배치 결과';
      var copiedCount = Object.keys(_copiedBatchCards).length;

      var cards = results.map(function (r, i) {
        var escaped = (r.prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var escapedLyrics = (r.lyrics || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var isCopied = _copiedBatchCards['batch_' + i];
        
        return '<div id="batch-card-' + i + '" class="prompt-card bg-[#fcfcfd] border border-[rgba(172,173,175,0.1)] rounded-[1.25rem] p-5 lg:p-6 hover:bg-white hover:border-[#FF5A5F]/30 hover:shadow-[0_16px_32px_rgba(45,47,49,0.05)] transition-all ' + (isCopied ? 'opacity-70 saturate-[0.8]' : '') + '">' +
          '<div class="flex items-center justify-between mb-4">' +
            '<div class="flex items-center gap-3 w-full max-w-[50%]">' +
              '<div class="shrink-0 w-8 h-8 rounded-lg bg-[#f0f1f3] text-[#5a5c5d] font-bold flex items-center justify-center text-[12px]">' + r.index + '</div>' +
              '<span class="text-[13px] lg:text-sm font-extrabold text-luminous-text truncate">' + (r.title || 'Untitled track') + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-1.5 lg:gap-2 shrink-0">' +
              '<button id="copy-btn-style-' + i + '" onclick="copyBatchCard(this,' + i + ',' + r.index + ', \\'style\\')" class="btn-copy text-[10px] lg:text-[11px] px-2.5 py-1.5 ' + (isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FF5A5F]/10 text-[#FF5A5F]') + ' font-bold rounded-full transition-all whitespace-nowrap">' + (isCopied ? '✅ 스타일' : '✨ 스타일') + '</button>' +
              '<button id="copy-btn-lyrics-' + i + '" onclick="copyBatchCard(this,' + i + ',' + r.index + ', \\'lyrics\\')" class="btn-copy text-[10px] lg:text-[11px] px-2.5 py-1.5 bg-[#FF5A5F]/10 text-[#FF5A5F] font-bold rounded-full transition-all whitespace-nowrap hover:bg-[#FF5A5F] hover:text-white">🎤 가사</button>' +
            '</div>' +
          '</div>' +
          '<div class="text-[10px] lg:text-[11px] text-[#FF5A5F] mb-1.5 font-bold tracking-wider uppercase">Style Prompt</div>' +
          '<div class="prompt-text mb-4 max-h-[85px] overflow-y-auto bg-[#FF5A5F]/[0.03] border border-[#FF5A5F]/10 text-luminous-text text-[12px] lg:text-[13px] leading-relaxed p-3.5 lg:p-4 rounded-xl font-mono whitespace-pre-wrap break-words">' + escaped + '</div>' +
          '<div class="text-[10px] lg:text-[11px] text-[#FF5A5F] mb-1.5 font-bold tracking-wider uppercase">Full Lyrics</div>' +
          '<div class="prompt-text max-h-[140px] overflow-y-auto bg-[#FF5A5F]/[0.03] border border-[#FF5A5F]/10 text-luminous-text text-[11px] lg:text-[12px] leading-relaxed p-3.5 lg:p-4 rounded-xl font-mono whitespace-pre-wrap break-words">' + (escapedLyrics || '가사가 포함되지 않았습니다.') + '</div>' +
        '</div>';
      }).join('');

      var progressW = results.length > 0 ? (copiedCount / results.length * 100) : 0;

      container.innerHTML =
        '<div class="mb-10">' +
          '<div class="flex items-center gap-5 mb-5">' +
            '<div class="w-16 h-16 shrink-0 rounded-[1.5rem] bg-gradient-to-tr from-[#FF5A5F] to-[#ffc2cd] flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(255,90,95,0.25)]">🎯</div>' +
            '<div>' +
              '<h2 class="text-2xl lg:text-[28px] leading-tight font-display font-black text-luminous-text tracking-tight">' + results.length + '개 프롬프트 세트</h2>' +
              '<p class="text-[12px] lg:text-[13px] text-luminous-textMuted font-bold mt-1.5">이전에 생성한 스타일과 가사 내역입니다. 계속 복사해서 사용하세요.</p>' +
              '<div class="flex items-center gap-3 mt-4 max-w-[280px]"><div class="flex-1 h-2 rounded-full bg-[#e7e8ea] overflow-hidden"><div id="copy-progress-bar" class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500" style="width:' + progressW + '%"></div></div><span id="copy-progress-text" class="text-[11px] font-extrabold text-luminous-textMuted tracking-wide">' + copiedCount + '/' + results.length + ' 복사됨</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 min-w-0 w-full">' + cards + '</div>' +
        
        '<!-- Batch Image Prompts Section -->' +
        '<div id="batch-image-section" class="mt-16 pt-10 border-t border-[#f0f1f3]">' +
          '<div class="flex items-center gap-4 mb-6">' +
            '<div class="w-12 h-12 shrink-0 rounded-[1rem] bg-gradient-to-br from-fuchsia-400 to-purple-600 flex items-center justify-center text-xl shadow-[0_10px_30px_rgba(217,70,239,0.25)]">🎨</div>' +
            '<div><h2 class="text-[20px] font-display font-black text-luminous-text">Image &amp; Video Prompts</h2><p class="text-xs text-luminous-textMuted font-bold mt-1">각 트랙별 앨범 커버 및 뮤직비디오용 AI 프롬프트 (16:9)</p></div>' +
            '<div id="batch-img-loading" class="ml-auto flex items-center gap-2 text-fuchsia-500 text-[13px] font-bold hidden"><div class="spinner w-4 h-4 border-2 border-fuchsia-200 border-t-fuchsia-500"></div>생성 중...</div>' +
          '</div>' +
          '<div class="flex flex-wrap gap-2 mb-6"><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab active" data-tab="whisk" onclick="switchBatchImgTab(\\'whisk\\')">🌀 Whisk</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="flow" onclick="switchBatchImgTab(\\'flow\\')">🎬 FLOW</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="grok" onclick="switchBatchImgTab(\\'grok\\')">🤖 Grok</button></div>' +
          '<div id="batch-img-list"><p class="text-luminous-textMuted text-sm font-bold">⏳ 이미지 프롬프트를 불러오는 중입니다...</p></div>' +
        '</div>' +

        '<div class="text-center mt-12 mb-10">' +
          '<a href="/" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#f0f1f3] text-luminous-text font-extrabold text-[15px] hover:bg-[#e7e8ea] transition-all">🏠 대시보드로 돌아가기</a>' +
        '</div>';

      window._batchData = results;
      
      setTimeout(function() {
        if (window.fetchBatchImagePrompts) fetchBatchImagePrompts(results);
      }, 300);
    }

    function copyBatchCard(btn, idx, cardIndex, type) {
      if (!window._batchData || !window._batchData[idx]) return;
      var data = window._batchData[idx];
      var textToCopy = type === 'lyrics' ? (data.lyrics || '') : data.prompt;
      
      copyText(textToCopy);
      
      if (type === 'style') {
          _copiedBatchCards['batch_' + idx] = true;
          saveCopiedState();
          var card = document.getElementById('batch-card-' + idx);
          if (card) { card.classList.add('opacity-70', 'saturate-[0.8]'); }
          btn.textContent = '✅ 저장됨';
          btn.classList.add('bg-emerald-50', 'text-emerald-600');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
          updateCopyProgress();
      } else {
          btn.textContent = '✅ 저장됨';
          btn.classList.add('bg-[#FF5A5F]', 'text-white');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
          setTimeout(() => {
              btn.textContent = '🎤 가사';
              btn.classList.remove('bg-[#FF5A5F]', 'text-white');
              btn.classList.add('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
          }, 2000);
      }
      showToast('#' + cardIndex + ' ' + (type === 'style' ? '스타일' : '가사') + ' 복사 완료!', 'success');
    }

    function updateCopyProgress() {
      var total = (window._batchData || []).length;
      var copied = Object.keys(_copiedBatchCards).length;
      var bar = document.getElementById('copy-progress-bar');
      var text = document.getElementById('copy-progress-text');
      if (bar) bar.style.width = (total > 0 ? (copied / total * 100) : 0) + '%';
      if (text) text.textContent = copied + '/' + total + ' 복사됨';
      if (copied === total && total > 0) showToast('🎉 모든 스타일이 복사되었습니다!', 'success');
    }

    function copyAll() {
      var data = JSON.parse(localStorage.getItem('plly_results') || '{}');
      var text = '';
      if (data.type === 'batch' && data.data) { 
        text = data.data.map(function (r) { return '[#' + r.index + '] ' + r.title + '\\n[Style]\\n' + r.prompt + '\\n\\n[Lyrics]\\n' + (r.lyrics||''); }).join('\\n\\n---\\n\\n'); 
      } else if (data.data) {
        text = data.data.prompt.prompt;
      }
      
      if (text) {
        copyText(text);
        var btn = document.getElementById('copy-all-text');
        btn.textContent = '복사 완료! ✅';
        setTimeout(function () { btn.textContent = '전체 복사'; }, 2000);
        showToast('전체 내용이 클립보드에 복사되었습니다!', 'success');
        
        var dLength = (data.data && data.type === 'batch') ? data.data.length : 0;
        for (var i = 0; i < dLength; i++) {
          _copiedBatchCards['batch_' + i] = true;
          var sb = document.getElementById('copy-btn-style-' + i);
          if (sb) { sb.textContent = '✅ 저장됨'; sb.classList.add('bg-emerald-50', 'text-emerald-600'); sb.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]'); }
          var card = document.getElementById('batch-card-' + i);
          if (card) card.classList.add('opacity-70', 'saturate-[0.8]'); 
        }
        saveCopiedState();
        updateCopyProgress();
      }
    }

    function resetResults() {
      if (!confirm('생성된 결과를 모두 초기화할까요?')) return;
      localStorage.removeItem('plly_results');
      localStorage.removeItem('plly_input');
      localStorage.removeItem('plly_copied_batch');
      localStorage.removeItem('plly_copied_img');
      showToast('초기화 완료!', 'success');
      setTimeout(function () { window.location.href = '/'; }, 800);
    }

    // ── Image Prompts Logic ──
    var _imgData = {}, _batchImgData = [], _currentImgTab = 'whisk', _currentBatchImgTab = 'whisk';

    function setTabStyles(tabSelector, activeTab) {
      document.querySelectorAll(tabSelector).forEach(function(b) {
        if(b.dataset.tab === activeTab) {
          b.classList.add('bg-fuchsia-50', 'text-fuchsia-600', 'border-fuchsia-200');
          b.classList.remove('bg-[#f0f1f3]', 'text-luminous-textMuted');
        } else {
          b.classList.remove('bg-fuchsia-50', 'text-fuchsia-600', 'border-fuchsia-200');
          b.classList.add('bg-[#f0f1f3]', 'text-luminous-textMuted');
        }
      });
    }

    async function fetchImagePrompt(country, genre, mood) {
      var loading = document.getElementById('img-loading');
      if (loading) loading.classList.remove('hidden');
      try {
        var apiKey = localStorage.getItem('gpm_gemini_key');
        var aiModel = localStorage.getItem('gpm_gemini_model') || 'gemini-2.0-flash';
        var res = await fetch('/api/generate-image-prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country:country, genre:genre, mood:mood, apiKey:apiKey, aiModel:aiModel }) });
        var data = await res.json();
        if (data.success) { _imgData = data.data; renderImgPrompts(); }
        else { document.getElementById('img-prompt-list').innerHTML = '<p class="text-rose-500 text-sm font-bold">⚠️ ' + (data.error || '생성 실패') + '</p>'; }
      } catch (e) { document.getElementById('img-prompt-list').innerHTML = '<p class="text-rose-500 text-sm font-bold">⚠️ 이미지 프롬프트 생성 실패</p>'; }
      finally { if (loading) loading.classList.add('hidden'); }
    }

    function switchImgTab(tab) {
      _currentImgTab = tab;
      setTabStyles('#image-prompt-section .img-tab', tab);
      renderImgPrompts();
    }

    function renderImgPrompts() {
      var list = document.getElementById('img-prompt-list');
      if (!list || !_imgData || !_imgData.prompts) return;
      var prompts = _imgData.prompts[_currentImgTab] || [];
      if (prompts.length === 0) { list.innerHTML = '<p class="text-luminous-textMuted text-sm font-bold">프롬프트가 없습니다.</p>'; return; }
      var html = '';
      for (var idx = 0; idx < prompts.length; idx++) {
        var ep = prompts[idx].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var isCopied = _copiedImgCards['img_single_' + _currentImgTab + '_' + idx];
        html += '<div class="bg-white border border-[#e7e8ea] rounded-[1.25rem] p-5 mb-4 shadow-[0_10px_20px_rgba(45,47,49,0.03)] group transition-all hover:border-fuchsia-200 ' + (isCopied ? 'opacity-70 saturate-[0.8]' : '') + '"><div class="flex items-center justify-between mb-2"><span class="text-xs font-bold text-fuchsia-500 uppercase tracking-widest">' + _currentImgTab + ' Option ' + (idx+1) + '</span><button id="copy-img-single-'+idx+'" onclick="copyImgSingle(this,' + idx + ')" class="btn-copy text-[11px] px-3 py-1.5 ' + (isCopied?'bg-emerald-50 text-emerald-600':'bg-fuchsia-50 text-fuchsia-600') + ' rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">' + (isCopied?'✅ 됨':'📋 복사') + '</button></div><div class="bg-[#fcfcfd] rounded-xl p-4 font-mono text-[13px] text-luminous-text max-h-[150px] overflow-y-auto break-words whitespace-pre-wrap leading-relaxed">' + ep + '</div></div>';
      }
      list.innerHTML = html;
      setTabStyles('#image-prompt-section .img-tab', _currentImgTab);
    }

    function copyImgSingle(btn, idx) {
      var prompts = _imgData.prompts[_currentImgTab] || [];
      if (prompts[idx]) { 
        copyText(prompts[idx]); 
        _copiedImgCards['img_single_' + _currentImgTab + '_' + idx] = true;
        saveCopiedState();
        btn.textContent = '✅ 됨'; 
        btn.classList.add('bg-emerald-50','text-emerald-600');
        btn.classList.remove('bg-fuchsia-50','text-fuchsia-600');
        btn.parentElement.parentElement.classList.add('opacity-70', 'saturate-[0.8]');
        showToast(_currentImgTab.toUpperCase() + ' Option ' + (idx + 1) + ' 이미지 패턴 복사!', 'success'); 
      }
    }

    async function fetchBatchImagePrompts(batchResults) {
      var loading = document.getElementById('batch-img-loading');
      if (loading) loading.classList.remove('hidden');
      _batchImgData = [];
      var inp = JSON.parse(localStorage.getItem('plly_input') || '{}');
      var apiKey = localStorage.getItem('gpm_gemini_key');
      var aiModel = localStorage.getItem('gpm_gemini_model') || 'gemini-2.0-flash';
      for (var i = 0; i < batchResults.length; i++) {
        try {
          var res = await fetch('/api/generate-image-prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: inp.country || 'KR', genre: inp.genre || 'kpop', mood: inp.mood || 'party', apiKey:apiKey, aiModel:aiModel }) });
          var data = await res.json();
          _batchImgData.push({ index: batchResults[i].index, title: batchResults[i].title, data: data.success ? data.data : null });
        } catch (e) { _batchImgData.push({ index: batchResults[i].index, title: batchResults[i].title, data: null }); }
      }
      if (loading) loading.classList.add('hidden');
      renderBatchImgPrompts();
    }

    function switchBatchImgTab(tab) {
      _currentBatchImgTab = tab;
      setTabStyles('#batch-image-section .img-tab', tab);
      renderBatchImgPrompts();
    }

    function renderBatchImgPrompts() {
      var list = document.getElementById('batch-img-list');
      if (!list || _batchImgData.length === 0) return;
      window._batchImgFullPrompts = [];
      var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full overflow-hidden">';
      for (var i = 0; i < _batchImgData.length; i++) {
        var item = _batchImgData[i];
        if (!item.data || !item.data.prompts) { 
          html += '<div class="bg-[#f0f1f3] rounded-2xl p-4 mb-3 opacity-50"><span class="text-sm text-rose-500 font-bold">#' + item.index + ' ' + item.title + ' - 실패</span></div>'; 
          window._batchImgFullPrompts.push(''); 
          continue; 
        }
        var prompts = item.data.prompts[_currentBatchImgTab] || [];
        var fp = prompts[0] || '';
        var esc = fp.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var isCopied = _copiedImgCards['img_' + _currentBatchImgTab + '_' + i];
        
        html += '<div id="batch-img-card-'+i+'" class="bg-white border border-[#e7e8ea] rounded-[1.25rem] p-5 shadow-[0_10px_20px_rgba(45,47,49,0.03)] group transition-all hover:border-fuchsia-200 ' + (isCopied?'opacity-70 saturate-[0.8]':'') + ' flex flex-col min-w-0">'+
          '<div class="flex items-center gap-3 mb-3 w-full">'+
            '<div class="w-8 h-8 rounded-lg bg-fuchsia-50 text-fuchsia-500 font-bold flex shrink-0 items-center justify-center text-[11px]">' + item.index + '</div>'+
            '<span class="text-[13px] font-extrabold text-luminous-text truncate">' + item.title + '</span>'+
            '<button id="copy-batch-img-'+i+'" onclick="copyBatchImg(this,' + i + ')" class="ml-auto btn-copy text-[11px] px-3 py-1.5 ' + (isCopied?'bg-emerald-50 text-emerald-600':'bg-fuchsia-50 text-fuchsia-600') + ' rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">' + (isCopied?'✅':'📋 복사') + '</button>'+
          '</div>'+
          '<div class="bg-[#fcfcfd] rounded-xl p-3.5 lg:p-4 font-mono text-[11px] lg:text-[12px] text-luminous-text flex-1 overflow-y-auto break-words whitespace-pre-wrap leading-relaxed max-h-[120px]">' + esc + '</div>'+
        '</div>';
        
        window._batchImgFullPrompts.push(fp);
      }
      html += '</div>';
      list.innerHTML = html;
      setTabStyles('#batch-image-section .img-tab', _currentBatchImgTab);
    }

    function copyBatchImg(btn, idx) {
      if (window._batchImgFullPrompts && window._batchImgFullPrompts[idx]) {
        copyText(window._batchImgFullPrompts[idx]);
        _copiedImgCards['img_' + _currentBatchImgTab + '_' + idx] = true;
        saveCopiedState();
        var card = document.getElementById('batch-img-card-' + idx);
        if(card) { card.classList.add('opacity-70', 'saturate-[0.8]'); }
        btn.textContent = '✅';
        btn.classList.add('bg-emerald-50','text-emerald-600');
        btn.classList.remove('bg-fuchsia-50','text-fuchsia-600');
        showToast('커버 프롬프트 복사 완료!', 'success');
      }
    }

    // Initialize
    renderResults();
  </script>
</body>
</html>`;

  let newHtml = headAndSidebar + mainView + scriptTag;
  fs.writeFileSync('public/results.html', newHtml);
  console.log('FINAL REWRITE SUCCESS!');
} catch(e) { console.error(e); }
