const fs = require('fs');

try {
  const indexHtml = fs.readFileSync('public/index.html', 'utf8');
  const asideEndIndex = indexHtml.indexOf('</aside>') + 8;
  const headAndSidebar = indexHtml.substring(0, asideEndIndex);

  const newHtml = headAndSidebar + `

  <main class="main-viewport flex-1 flex flex-col w-full h-full relative z-0">
    <!-- Top Bar -->
    <div class="h-20 bg-white/80 backdrop-blur-md border-b border-[#f0f1f3] flex items-center justify-between px-10 shrink-0 z-40 sticky top-0 w-full shadow-[0px_10px_30px_rgba(45,47,49,0.03)]">
      <div class="flex items-center gap-3">
        <span class="text-luminous-textMuted font-bold text-sm tracking-wide uppercase">Results</span>
        <span class="text-[#d1d5db] mx-1">›</span>
        <span id="page-title" class="text-sm font-extrabold text-luminous-text">생성 결과</span>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="copyAll()" class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] font-bold text-sm hover:bg-[#FF5A5F]/20 transition-all">
          📋 <span id="copy-all-text">전체 복사</span>
        </button>
        <button onclick="resetResults()" class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f0f1f3] text-luminous-textMuted font-bold text-sm hover:bg-[#e7e8ea] transition-all">
          🔄 초기화
        </button>
        <a href="/" class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#e7e8ea] text-luminous-text font-bold text-sm hover:shadow-[0px_20px_40px_rgba(45,47,49,0.04)] transition-all">
          🏠 대시보드
        </a>
      </div>
    </div>

    <!-- Results Content -->
    <div class="content-area flex-1 overflow-y-auto p-12 bg-[#f6f6f8]">
      <div id="results-container" class="max-w-[1400px] mx-auto pb-24">
        <div id="loading" class="text-center py-40">
          <div class="text-5xl mb-6 animate-pulse" style="animation: float 4s ease-in-out infinite;">🎵</div>
          <p class="text-luminous-textMuted font-bold text-lg">결과를 불러오는 중...</p>
        </div>
      </div>
    </div>
  </main>

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
      t.className = 'rounded-[1rem] px-6 py-4 border flex items-center gap-3 shadow-[0px_20px_40px_rgba(45,47,49,0.06)] max-w-sm ' + (colors[type] || colors.info);
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

    function renderBatch(container, results) {
      document.getElementById('page-title').textContent = results.length + '개 프롬프트 배치 결과';
      var copiedCount = Object.keys(_copiedBatchCards).length;

      var cards = results.map(function (r, i) {
        var escaped = (r.prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var escapedLyrics = (r.lyrics || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var isCopied = _copiedBatchCards['batch_' + i];
        
        return '<div id="batch-card-' + i + '" class="prompt-card bg-[#fcfcfd] border border-[rgba(172,173,175,0.1)] rounded-[1.25rem] p-6 hover:bg-white hover:border-[#FF5A5F]/30 hover:shadow-[0_16px_32px_rgba(45,47,49,0.05)] transition-all ' + (isCopied ? 'opacity-80 saturate-[0.8]' : '') + '">' +
          '<div class="flex items-center justify-between mb-4">' +
            '<div class="flex items-center gap-3">' +
              '<div class="w-8 h-8 rounded-lg bg-[#f0f1f3] text-[#5a5c5d] font-bold flex items-center justify-center text-[12px]">' + r.index + '</div>' +
              '<span class="text-sm font-extrabold text-luminous-text truncate max-w-[200px]">' + (r.title || 'Untitled track') + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
              '<button id="copy-btn-style-' + i + '" onclick="copyBatchCard(this,' + i + ',' + r.index + ', \\'style\\')" class="btn-copy text-[11px] px-3 py-1.5 ' + (isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FF5A5F]/10 text-[#FF5A5F]') + ' font-bold rounded-full transition-all">' + (isCopied ? '✅ 스타일' : '✨ 스타일') + '</button>' +
              '<button id="copy-btn-lyrics-' + i + '" onclick="copyBatchCard(this,' + i + ',' + r.index + ', \\'lyrics\\')" class="btn-copy text-[11px] px-3 py-1.5 bg-[#FF5A5F]/10 text-[#FF5A5F] font-bold rounded-full transition-all">🎤 가사</button>' +
            '</div>' +
          '</div>' +
          '<div class="text-[11px] text-[#FF5A5F] mb-1.5 font-bold tracking-wider uppercase">Style Prompt</div>' +
          '<div class="prompt-text mb-4 max-h-[85px] overflow-y-auto bg-[#FF5A5F]/[0.03] border border-[#FF5A5F]/10 text-luminous-text text-[13px] leading-relaxed p-4 rounded-xl font-mono whitespace-pre-wrap word-break">' + escaped + '</div>' +
          '<div class="text-[11px] text-[#FF5A5F] mb-1.5 font-bold tracking-wider uppercase">Full Lyrics</div>' +
          '<div class="prompt-text max-h-[140px] overflow-y-auto bg-[#FF5A5F]/[0.03] border border-[#FF5A5F]/10 text-luminous-text text-[12px] leading-relaxed p-4 rounded-xl font-mono whitespace-pre-wrap word-break">' + (escapedLyrics || '가사가 포함되지 않았습니다.') + '</div>' +
        '</div>';
      }).join('');

      var progressW = results.length > 0 ? (copiedCount / results.length * 100) : 0;

      container.innerHTML =
        '<div class="mb-10">' +
          '<div class="flex items-center gap-5 mb-4">' +
            '<div class="w-16 h-16 rounded-[1.5rem] bg-gradient-to-tr from-[#FF5A5F] to-[#ffc2cd] flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(255,90,95,0.25)]">🎯</div>' +
            '<div>' +
              '<h2 class="text-[28px] font-display font-black text-luminous-text tracking-tight">' + results.length + '개 프롬프트 세트 결과</h2>' +
              '<p class="text-[13px] text-luminous-textMuted font-bold mt-1">이전에 생성한 스타일과 가사 내역입니다. 계속 복사해서 사용하세요.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">' + cards + '</div>' +
        '<div class="text-center mt-12 mb-10">' +
          '<a href="/" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#f0f1f3] text-luminous-text font-extrabold text-[15px] hover:bg-[#e7e8ea] transition-all">🏠 대시보드로 돌아가기</a>' +
        '</div>';

      window._batchData = results;
    }

    function renderSingle(container, result) {
      document.getElementById('page-title').textContent = '단일 프롬프트 결과';
      var escaped = (result.prompt.prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      container.innerHTML = '<div class="glass-card bg-white rounded-3xl p-10 shadow-[0_20px_40px_rgba(45,47,49,0.04)] border border-transparent hover:shadow-[0_30px_60px_rgba(45,47,49,0.08)] transition-all max-w-4xl mx-auto">' +
        '<div class="flex items-center gap-4 mb-8">' +
            '<div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF5A5F] to-[#ffc2cd] shadow-[0_10px_30px_rgba(255,90,95,0.25)] flex items-center justify-center text-2xl">✨</div>' +
            '<div><h2 class="text-2xl font-display font-extrabold text-luminous-text">Single Prompt Output</h2><p class="text-sm text-luminous-textMuted">가사 정보는 포함되어 있지 않습니다.</p></div>' +
        '</div>' +
        '<div class="bg-luminous-surfaceLow p-6 rounded-2xl font-mono text-[14px] text-luminous-text mb-8 whitespace-pre-wrap leading-relaxed border border-[#e7e8ea]">' + escaped + '</div>' +
        '<div class="text-right">' +
            '<button onclick="copyText(\\'' + escaped.replace(/'/g, "\\\\'") + '\\'); showToast(\\'프롬프트가 복사되었습니다!\\', \\'success\\');" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF5A5F] text-white font-extrabold hover:shadow-[0_10px_30px_rgba(255,90,95,0.25)] hover:-translate-y-1 transition-all">📋 프롬프트 복사하기</button>' +
        '</div>' +
      '</div>';
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
          if (card) { 
            card.classList.add('opacity-80', 'saturate-[0.8]'); 
          }
          btn.textContent = '✅ 스타일';
          btn.classList.add('bg-emerald-50', 'text-emerald-600');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
      } else {
          btn.textContent = '✅ 가사';
          btn.classList.add('bg-emerald-50', 'text-emerald-600');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
      }
      
      showToast('#' + cardIndex + ' ' + (type === 'style' ? '스타일' : '가사') + ' 복사 완료!', 'success');
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
          var lb = document.getElementById('copy-btn-lyrics-' + i);
          if (sb) { sb.textContent = '✅ 스타일'; sb.classList.add('bg-emerald-50', 'text-emerald-600'); sb.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]'); }
          if (lb) { lb.textContent = '✅ 가사'; lb.classList.add('bg-emerald-50', 'text-emerald-600'); lb.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]'); }
          var card = document.getElementById('batch-card-' + i);
          if (card) card.classList.add('opacity-80', 'saturate-[0.8]'); 
        }
        saveCopiedState();
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

    // Initialize
    renderResults();
  </script>
</body>
</html>`;

  fs.writeFileSync('public/results.html', newHtml);
  console.log('REWRITE SUCCESS');
} catch(e) {
  console.error(e);
}
