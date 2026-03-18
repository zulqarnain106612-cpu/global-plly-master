const fs = require('fs');
const path = 'public/index.html';

let content = fs.readFileSync(path, 'utf8');

// 1. els 객체 전면 수정 (실제 HTML ID와 매칭)
const oldElsRegex = /const els = \{[\s\S]*?\};/;
const newEls = `const els = {
      selectCountry: document.getElementById('select-country'),
      selectGenre: document.getElementById('select-genre'),
      selectMood: document.getElementById('select-mood'),
      selectTempo: document.getElementById('select-tempo'),
      selectVocal: document.getElementById('vocal-select'),
      selectStructure: document.getElementById('structure-select'),
      selectCreativity: document.getElementById('creativity-select'),
      inputTheme: document.getElementById('theme-text'),
      btnGenerate: document.getElementById('btn-generate'),
      btnText: document.getElementById('btn-text'),
      btnIcon: document.getElementById('btn-icon'),
      btnSpinner: document.getElementById('btn-spinner'),
      btnCopyPrompt: document.getElementById('btn-copy-prompt'),
      btnCopySuno: document.getElementById('btn-copy-prompt'),
      btnClearHistory: document.getElementById('btn-clear-history'),
      promptPlaceholder: document.getElementById('prompt-placeholder'),
      promptResult: document.getElementById('prompt-result'),
      promptText: document.getElementById('prompt-text'),
      titleSuggestions: document.getElementById('title-suggestions'),
      metaPanel: document.getElementById('meta-panel'),
      metaTagsGrid: document.getElementById('meta-tags-grid'),
      playerPanel: document.getElementById('player-panel'),
      trackTitle: document.getElementById('track-title'),
      trackStatus: document.getElementById('track-status'),
      audioPlayer: document.getElementById('audio-player'),
      demoMessage: document.getElementById('demo-message'),
      historyPanel: document.getElementById('history-panel'),
      historyList: document.getElementById('history-list'),
      countryFlag: document.getElementById('country-flag'),
      moodEmoji: document.getElementById('mood-emoji'),
      btnGenerateBatch: document.getElementById('btn-generate-batch'),
      btnBatchText: document.getElementById('btn-batch-text'),
      btnBatchSpinner: document.getElementById('btn-batch-spinner'),
    };

    // --- 모달 및 공통 함수 보충 ---
    function openSettingsModal() {
      const modal = document.getElementById('settings-modal');
      const keyInput = document.getElementById('api-key-input');
      const modelSelect = document.getElementById('ai-model-select');
      if (keyInput) keyInput.value = state.apiKey;
      if (modelSelect) modelSelect.value = state.aiModel;
      if (modal) modal.classList.remove('hidden');
    }
    function closeSettingsModal() {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.add('hidden');
    }
    function openPwModal() {
      const modal = document.getElementById('password-modal');
      if (modal) modal.classList.remove('hidden');
    }
    function hidePwModal() {
      const modal = document.getElementById('password-modal');
      if (modal) modal.classList.add('hidden');
    }
    function doLogout() {
      if(confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('gpm_token');
        location.href = '/login.html';
      }
    }
`;

content = content.replace(oldElsRegex, newEls);

// 2. 존재하지 않는 요소에 대한 displayResults 내부 코드 제거
content = content.replace(/els\.lyricsTheme\.innerHTML = [\s\S]*?suggestedLanguage;/g, '// Lyrics/Lang display removed for 3-col layout');
content = content.replace(/els\.suggestedLang\.textContent = [\s\S]*?;/g, '');
content = content.replace(/els\.trackDuration\.textContent = [\s\S]*?;/g, '');
content = content.replace(/els\.waveAnimation\.classList\.remove\('hidden'\);/g, '');
content = content.replace(/els\.waveAnimation\.classList\.add\('hidden'\);/g, '');

fs.writeFileSync(path, content);
console.log('JavaScript 보정 완료!');
