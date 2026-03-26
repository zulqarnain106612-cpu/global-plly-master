const fs = require('fs');
try {
  let indexHtml = fs.readFileSync('public/index.html', 'utf8');
  let oldResults = fs.readFileSync('old_results.html', 'utf8');

  // get sidebar & wrapper
  const asideEndIndex = indexHtml.indexOf('</aside>') + 8;
  const headAndSidebar = indexHtml.substring(0, asideEndIndex);

  // extract old script
  let scriptStart = oldResults.indexOf('<script>');
  let scriptEnd = oldResults.lastIndexOf('</script>') + 9;
  let oldScript = oldResults.substring(scriptStart, scriptEnd);

  // rewrite renderBatch and renderSingle inside the old script
  const renderBatchCode = `function renderBatch(container, results) {
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
              '<div class="flex items-center gap-3 mt-4 w-64"><div class="flex-1 h-2 rounded-full bg-[#f0f1f3] overflow-hidden"><div id="copy-progress-bar" class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style="width:' + progressW + '%"></div></div><span id="copy-progress-text" class="text-xs font-bold text-luminous-textMuted">' + copiedCount + '/' + results.length + ' 복사됨</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">' + cards + '</div>' +
        
        '<!-- Image Prompts Section -->' +
        '<div id="batch-image-section" class="mt-16">' +
          '<div class="flex items-center gap-4 mb-6">' +
            '<div class="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-fuchsia-400 to-purple-600 flex items-center justify-center text-xl shadow-[0_10px_30px_rgba(217,70,239,0.25)]">🎨</div>' +
            '<div><h2 class="text-2xl font-display font-black text-luminous-text">Image & Video Prompts</h2><p class="text-xs text-luminous-textMuted font-bold mt-1">각 트랙별 앨범 커버 및 뮤직비디오용 AI 프롬프트</p></div>' +
            '<div id="batch-img-loading" class="ml-auto animate-pulse text-fuchsia-500 text-[13px] font-bold hidden">🔄 생성 중...</div>' +
          '</div>' +
          '<div class="flex gap-2 mb-6"><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab active" data-tab="whisk" onclick="switchBatchImgTab(\\'whisk\\')">🌀 Whisk (Pika)</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="flow" onclick="switchBatchImgTab(\\'flow\\')">🎬 FLOW (Video)</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="grok" onclick="switchBatchImgTab(\\'grok\\')">🤖 Grok (Image)</button></div>' +
          '<div id="batch-img-list"><p class="text-luminous-textMuted text-sm font-bold">⏳ 이미지 프롬프트를 불러오는 중입니다...</p></div>' +
        '</div>' +

        '<div class="text-center mt-12 mb-10">' +
          '<a href="/" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#f0f1f3] text-luminous-text font-extrabold text-[15px] hover:bg-[#e7e8ea] transition-all">🏠 대시보드로 돌아가기</a>' +
        '</div>';

      window._batchData = results;
      
      setTimeout(function() {
        if (window.fetchBatchImagePrompts) fetchBatchImagePrompts(results);
      }, 500);
    }`;

  const renderSingleCode = `function renderSingle(container, result) {
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
        
        '<!-- Image Prompts Section -->' +
        '<div id="image-prompt-section" class="mt-12 pt-8 border-t border-[#f0f1f3]">' +
          '<div class="flex items-center gap-3 mb-5 mt-4">' +
            '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-purple-600 flex items-center justify-center text-xl shadow-[0_10px_30px_rgba(217,70,239,0.25)]">🎨</div>' +
            '<div><h3 class="text-xl font-display font-black text-luminous-text">Image &amp; Video Prompts</h3><p class="text-xs text-luminous-textMuted font-bold">앨범 커버 및 뮤직비디오용 AI 프롬프트 (16:9)</p></div>' +
            '<div id="img-loading" class="ml-auto animate-pulse text-fuchsia-500 text-sm font-bold hidden">🔄 생성 중...</div>' +
          '</div>' +
          '<div class="flex gap-2 mb-6"><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab active" data-tab="whisk" onclick="switchImgTab(\\'whisk\\')">🌀 Whisk</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="flow" onclick="switchImgTab(\\'flow\\')">🎬 FLOW</button><button class="px-5 py-2.5 rounded-full text-[13px] font-bold text-luminous-textMuted bg-[#f0f1f3] hover:bg-[#e7e8ea] hover:text-luminous-text transition-all img-tab" data-tab="grok" onclick="switchImgTab(\\'grok\\')">🤖 Grok</button></div>' +
          '<div id="img-prompt-list"><p class="text-luminous-textMuted text-sm font-bold animate-pulse">⏳ 이미지 프롬프트 생성 중...</p></div>' +
        '</div>' +

      '</div>';
      
      setTimeout(function() {
        var inp = JSON.parse(localStorage.getItem('plly_input') || '{}');
        if (window.fetchImagePrompt) fetchImagePrompt(inp.country, inp.genre, inp.mood);
      }, 500);
    }`;

  const copyBatchCardCode = `function copyBatchCard(btn, idx, cardIndex, type) {
      if (!window._batchData || !window._batchData[idx]) return;
      var data = window._batchData[idx];
      var textToCopy = type === 'lyrics' ? (data.lyrics || '') : data.prompt;
      
      copyText(textToCopy);
      
      if (type === 'style') {
          _copiedBatchCards['batch_' + idx] = true;
          saveCopiedState();
          var card = document.getElementById('batch-card-' + idx);
          if (card) { card.classList.add('opacity-80', 'saturate-[0.8]'); }
          btn.textContent = '✅ 스타일';
          btn.classList.add('bg-emerald-50', 'text-emerald-600');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
      } else {
          btn.textContent = '✅ 가사';
          btn.classList.add('bg-emerald-50', 'text-emerald-600');
          btn.classList.remove('bg-[#FF5A5F]/10', 'text-[#FF5A5F]');
      }
      showToast('#' + cardIndex + ' ' + (type === 'style' ? '스타일' : '가사') + ' 복사 완료!', 'success');
      if(window.updateCopyProgress) updateCopyProgress();
    }`;

  oldScript = oldScript.replace(/function renderBatch\(container, results\) \{[\s\S]*?function copyBatchCard/g, renderBatchCode + '\n\n    ' + 'function copyBatchCard');
  oldScript = oldScript.replace(/function renderSingle\(container, result\) \{[\s\S]*?function renderBatch/g, renderSingleCode + '\n\n    ' + 'function renderBatch');
  oldScript = oldScript.replace(/function copyBatchCard\(btn, idx, cardIndex\) \{[\s\S]*?function updateCopyProgress/g, copyBatchCardCode + '\n\n    ' + 'function updateCopyProgress');

  // Fix toast
  oldScript = oldScript.replace(/var colors \= \{ success\: \'from-[^']*\'/g, "var colors = { success: 'bg-emerald-50 text-emerald-700 border-emerald-200'");
  oldScript = oldScript.replace(/var icons \= \{ /g, "var t = document.createElement('div');\n      t.className = 'rounded-[1rem] px-6 py-4 border flex items-center gap-3 shadow-[0px_20px_40px_rgba(45,47,49,0.06)] max-w-sm ' + (colors[type] || 'bg-blue-50 text-blue-700 border-blue-200'); /*");
  oldScript = oldScript.replace(/container\.appendChild\(t\)/g, "*/ container.appendChild(t)");
  oldScript = oldScript.replace(/\<\span class=\"text-sm text-white font-medium\"\>\'\ \+\ msg/g, "<span class=\"text-[13px] text-luminous-text font-extrabold tracking-tight\">' + msg");

  // Fix glass-cards in Image prompts
  oldScript = oldScript.replace(/\<div class=\"glass-card mb-3 opacity-50\"\>/g, '<div class="bg-[#f0f1f3] rounded-2xl p-4 mb-3 opacity-50">');
  oldScript = oldScript.replace(/\<div class=\"glass-card mb-3 group\"\>/g, '<div class="bg-white border border-[#e7e8ea] rounded-[1.25rem] p-5 mb-4 shadow-[0_10px_30px_rgba(45,47,49,0.03)] group transition-all hover:border-fuchsia-200">');
  oldScript = oldScript.replace(/img-prompt-box/g, 'bg-[#fcfcfd] rounded-xl p-4 font-mono text-[13px] text-fuchsia-600 max-h-[150px] overflow-y-auto mt-2 break-words whitespace-pre-wrap');

  const mainView = `
  <main class="main-viewport flex-1 flex flex-col w-full h-full relative z-0 bg-[#f6f6f8]">
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
    <div class="content-area flex-1 overflow-y-auto p-12">
      <div id="results-container" class="max-w-[1400px] mx-auto pb-24">
        <div id="loading" class="text-center py-40">
          <div class="text-5xl mb-6 animate-pulse" style="animation: float 4s ease-in-out infinite;">🎵</div>
          <p class="text-luminous-textMuted font-bold text-lg">결과를 불러오는 중...</p>
        </div>
      </div>
    </div>
  </main>
  `;

  let newHtml = headAndSidebar + mainView + '\n  ' + oldScript + '\n</body>\n</html>';

  // Make sure image tabs style match luminous (not using linear gradient logic randomly)
  newHtml = newHtml.replace(/\.active", b\.dataset\.tab === tab\)/g, '.active", b.dataset.tab === tab); if(b.dataset.tab === tab){ b.classList.add("bg-fuchsia-50", "text-fuchsia-600"); b.classList.remove("bg-[#f0f1f3]", "text-luminous-textMuted"); } else { b.classList.remove("bg-fuchsia-50", "text-fuchsia-600"); b.classList.add("bg-[#f0f1f3]", "text-luminous-textMuted"); }');

  fs.writeFileSync('public/results.html', newHtml);
  console.log('REWRITE v2 SUCCESS');
} catch(e) {
  console.error(e);
}
