/**
 * Global Plly Master - Backend Server
 * Suno AI 맞춤형 프롬프트 생성 및 음원 제작 자동화 웹서비스
 * 
 * 코다리 개발부장이 정성스럽게 만든 서버입니다! 🐟
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════
// 🎵 프롬프트 엔지니어링 데이터베이스
// 국가별 / 장르별 / 무드별 메타태그 사전
// ═══════════════════════════════════════════════════════════════

const COUNTRY_STYLES = {
  india: {
    name: '인도',
    flag: '🇮🇳',
    instruments: ['sitar', 'tabla', 'tanpura', 'bansuri', 'dhol'],
    scales: ['Raga Bhairavi', 'Raga Yaman', 'pentatonic Indian scale'],
    vibes: ['Bollywood cinematic', 'Indian classical fusion', 'Desi beats'],
    languages: ['Hindi', 'Sanskrit chanting']
  },
  brazil: {
    name: '브라질',
    flag: '🇧🇷',
    instruments: ['berimbau', 'pandeiro', 'cavaquinho', 'cuica', 'agogo'],
    scales: ['bossa nova harmony', 'samba rhythm', 'baião groove'],
    vibes: ['Rio carnival energy', 'tropical sunset', 'favela funk'],
    languages: ['Portuguese', 'Brazilian Portuguese']
  },
  usa: {
    name: '미국',
    flag: '🇺🇸',
    instruments: ['electric guitar', 'synthesizer', 'drum machine', 'bass guitar', 'Rhodes piano'],
    scales: ['blues scale', 'major pentatonic', 'jazz harmony'],
    vibes: ['American pop', 'West Coast vibes', 'Nashville country soul'],
    languages: ['English']
  },
  korea: {
    name: '한국',
    flag: '🇰🇷',
    instruments: ['gayageum', 'haegeum', 'janggu', 'daegeum', 'synthesizer'],
    scales: ['Korean pentatonic', 'K-pop chord progression', 'trot melody'],
    vibes: ['K-pop energy', 'Korean ballad emotion', 'han (한) aesthetic'],
    languages: ['Korean']
  },
  japan: {
    name: '일본',
    flag: '🇯🇵',
    instruments: ['shamisen', 'koto', 'shakuhachi', 'taiko', 'synthesizer'],
    scales: ['Japanese pentatonic', 'Miyako-bushi scale', 'Yo scale'],
    vibes: ['anime soundtrack', 'J-pop sparkle', 'city pop nostalgia'],
    languages: ['Japanese']
  },
  mexico: {
    name: '멕시코',
    flag: '🇲🇽',
    instruments: ['mariachi trumpet', 'guitarrón', 'vihuela', 'maracas', 'accordion'],
    scales: ['Mexican folk harmony', 'ranchera melody', 'cumbia rhythm'],
    vibes: ['fiesta energy', 'desert sunset', 'Día de los Muertos'],
    languages: ['Spanish']
  },
  france: {
    name: '프랑스',
    flag: '🇫🇷',
    instruments: ['accordion', 'violin', 'piano', 'clarinet', 'musette'],
    scales: ['French chanson harmony', 'impressionist chords', 'Debussy-inspired'],
    vibes: ['Parisian café', 'romantic evening', 'French electronic'],
    languages: ['French']
  },
  uk: {
    name: '영국',
    flag: '🇬🇧',
    instruments: ['electric guitar', 'bass guitar', 'synthesizer', 'drum kit', 'cello'],
    scales: ['Britpop chord progression', 'post-punk harmony', 'Celtic melody'],
    vibes: ['British indie', 'London underground', 'stadium anthem'],
    languages: ['English (British)']
  },
  nigeria: {
    name: '나이지리아',
    flag: '🇳🇬',
    instruments: ['talking drum', 'shekere', 'djembe', 'bass guitar', 'log drum'],
    scales: ['Afrobeat polyrhythm', 'highlife harmony', 'jùjú music'],
    vibes: ['Lagos nightlife', 'Afrofusion', 'West African energy'],
    languages: ['Yoruba', 'Pidgin English']
  },
  turkey: {
    name: '튀르키예',
    flag: '🇹🇷',
    instruments: ['oud', 'ney', 'kanun', 'darbuka', 'bağlama'],
    scales: ['Turkish makam', 'Hicaz scale', 'Ottoman classical'],
    vibes: ['Istanbul mystique', 'Anatolian folk', 'Turkish pop fusion'],
    languages: ['Turkish']
  },
  egypt: {
    name: '이집트',
    flag: '🇪🇬',
    instruments: ['oud', 'ney', 'qanun', 'riq', 'tabla baladi'],
    scales: ['Arabic maqam', 'Bayati scale', 'Hijaz mode'],
    vibes: ['Nile sunset', 'Cairo nightlife', 'pharaonic grandeur'],
    languages: ['Arabic']
  },
  jamaica: {
    name: '자메이카',
    flag: '🇯🇲',
    instruments: ['steel drum', 'bass guitar', 'organ', 'bongo', 'melodica'],
    scales: ['reggae offbeat', 'dub bass', 'dancehall rhythm'],
    vibes: ['Kingston vibes', 'island sunset', 'roots reggae spirit'],
    languages: ['Jamaican Patois', 'English']
  }
};

const GENRE_MAP = {
  phonk: {
    name: 'Phonk',
    tags: ['phonk', 'Memphis rap', 'cowbell', 'drift phonk', 'dark bass', '808 bass'],
    bpm: '130-160',
    style: 'aggressive bass drops, distorted cowbell, Memphis vocal samples'
  },
  bollywood: {
    name: 'Bollywood',
    tags: ['Bollywood', 'Indian cinema', 'filmi music', 'orchestral Indian', 'dhol beats'],
    bpm: '90-140',
    style: 'dramatic strings, tabla rhythms, soaring vocal melody, cinematic build'
  },
  chillpop: {
    name: 'Chillpop',
    tags: ['chill pop', 'bedroom pop', 'dreamy', 'lo-fi pop', 'soft vocals'],
    bpm: '75-100',
    style: 'warm pads, soft guitar, airy vocals, gentle reverb, cozy atmosphere'
  },
  acoustic: {
    name: 'Acoustic',
    tags: ['acoustic', 'unplugged', 'fingerpicking', 'folk', 'singer-songwriter'],
    bpm: '70-110',
    style: 'acoustic guitar fingerpicking, warm vocals, intimate recording, natural reverb'
  },
  edm: {
    name: 'EDM',
    tags: ['EDM', 'electronic dance music', 'festival', 'big room', 'progressive house'],
    bpm: '125-150',
    style: 'massive synth leads, euphoric build-ups, heavy drops, crowd energy'
  },
  hiphop: {
    name: 'Hip-Hop',
    tags: ['hip-hop', 'rap', 'boom bap', 'trap', 'urban'],
    bpm: '80-100',
    style: 'hard-hitting drums, rhythmic flow, bass-heavy, lyrical delivery'
  },
  jazz: {
    name: 'Jazz',
    tags: ['jazz', 'smooth jazz', 'swing', 'bebop', 'jazz fusion'],
    bpm: '100-140',
    style: 'complex chord progressions, improvisation, swing feel, sophisticated harmony'
  },
  lofi: {
    name: 'Lo-Fi',
    tags: ['lo-fi', 'lo-fi hip-hop', 'chillhop', 'study beats', 'vinyl crackle'],
    bpm: '70-90',
    style: 'dusty samples, vinyl crackle, mellow piano, tape saturation, jazzy chords'
  },
  rock: {
    name: 'Rock',
    tags: ['rock', 'alternative rock', 'indie rock', 'power chords', 'driving drums'],
    bpm: '110-140',
    style: 'distorted guitars, powerful drums, energetic performance, anthem-like chorus'
  },
  rnb: {
    name: 'R&B',
    tags: ['R&B', 'soul', 'neo-soul', 'contemporary R&B', 'smooth'],
    bpm: '65-95',
    style: 'silky vocals, lush harmonies, groove-oriented, emotional delivery'
  },
  classical: {
    name: 'Classical',
    tags: ['classical', 'orchestral', 'symphony', 'cinematic score', 'neoclassical'],
    bpm: '60-120',
    style: 'full orchestra, dynamic range, emotional movements, classical structure'
  },
  reggaeton: {
    name: 'Reggaeton',
    tags: ['reggaeton', 'dembow', 'Latin urban', 'perreo', 'Latin trap'],
    bpm: '85-100',
    style: 'dembow rhythm, Latin percussion, catchy hooks, dance energy'
  },
  kpop: {
    name: 'K-Pop',
    tags: ['K-Pop', 'Korean pop', 'idol music', 'K-pop dance', 'Korean R&B'],
    bpm: '100-130',
    style: 'polished production, catchy hooks, dynamic arrangement, dance break'
  },
  afrobeats: {
    name: 'Afrobeats',
    tags: ['Afrobeats', 'Afropop', 'Afrofusion', 'amapiano', 'West African'],
    bpm: '100-120',
    style: 'percussive groove, log drum, infectious rhythm, joyful energy'
  },
  ambient: {
    name: 'Ambient',
    tags: ['ambient', 'atmospheric', 'soundscape', 'drone', 'ethereal'],
    bpm: '60-80',
    style: 'evolving textures, spacious reverb, meditative, floating pads'
  }
};

const MOOD_MAP = {
  dawn: {
    name: '새벽 감성',
    emoji: '🌅',
    tags: ['dawn atmosphere', 'early morning', 'peaceful sunrise', 'meditative'],
    description: 'gentle awakening, soft light, contemplative solitude',
    energy: 'low',
    valence: 'neutral-positive'
  },
  running: {
    name: '빠른 러닝용',
    emoji: '🏃',
    tags: ['workout', 'high energy', 'running tempo', 'motivational', 'adrenaline'],
    description: 'pumping beat, unstoppable momentum, athletic energy',
    energy: 'very high',
    valence: 'positive'
  },
  cafe: {
    name: '카페 배경음',
    emoji: '☕',
    tags: ['café ambience', 'background music', 'cozy', 'warm', 'relaxing'],
    description: 'coffee shop atmosphere, gentle murmur, warm and inviting',
    energy: 'low-medium',
    valence: 'positive'
  },
  night_drive: {
    name: '밤 드라이브',
    emoji: '🌃',
    tags: ['night driving', 'midnight cruise', 'synthwave', 'neon lights'],
    description: 'city lights reflection, smooth road, nocturnal freedom',
    energy: 'medium',
    valence: 'neutral'
  },
  study: {
    name: '집중 공부용',
    emoji: '📚',
    tags: ['focus', 'concentration', 'study session', 'calm', 'minimal'],
    description: 'distraction-free, steady rhythm, mental clarity',
    energy: 'low',
    valence: 'neutral'
  },
  party: {
    name: '파티 바이브',
    emoji: '🎉',
    tags: ['party', 'celebration', 'dance floor', 'euphoric', 'festival'],
    description: 'bass-heavy, crowd going wild, strobe lights, peak energy',
    energy: 'very high',
    valence: 'very positive'
  },
  romantic: {
    name: '로맨틱',
    emoji: '💕',
    tags: ['romantic', 'love song', 'intimate', 'tender', 'heartfelt'],
    description: 'soft candlelight, whispered emotions, gentle sway',
    energy: 'low-medium',
    valence: 'positive'
  },
  melancholy: {
    name: '우울/감성',
    emoji: '🌧️',
    tags: ['melancholy', 'sad', 'emotional', 'bittersweet', 'rainy day'],
    description: 'rain on window, nostalgic memories, beautiful sadness',
    energy: 'low',
    valence: 'negative'
  },
  epic: {
    name: '에픽/웅장',
    emoji: '⚔️',
    tags: ['epic', 'cinematic', 'heroic', 'grand', 'powerful orchestral'],
    description: 'massive orchestra, battle drums, heroic triumph, goosebumps',
    energy: 'high',
    valence: 'positive'
  },
  chill: {
    name: '릴랙스/힐링',
    emoji: '🧘',
    tags: ['chill', 'relaxing', 'healing', 'zen', 'spa music'],
    description: 'deep breath, ocean waves, complete relaxation, inner peace',
    energy: 'very low',
    valence: 'positive'
  },
  cyberpunk: {
    name: '사이버펑크',
    emoji: '🤖',
    tags: ['cyberpunk', 'dystopian', 'dark electronic', 'neon noir', 'futuristic'],
    description: 'neon-soaked streets, digital rain, tech noir atmosphere',
    energy: 'medium-high',
    valence: 'neutral-negative'
  },
  summer: {
    name: '여름 바이브',
    emoji: '🏖️',
    tags: ['summer', 'tropical', 'beach', 'sunshine', 'vacation vibes'],
    description: 'ocean breeze, sunny disposition, carefree happiness',
    energy: 'medium-high',
    valence: 'very positive'
  }
};

// ═══════════════════════════════════════════════════════════════
// 🧠 프롬프트 엔지니어링 엔진
// ═══════════════════════════════════════════════════════════════

/**
 * Suno AI 최적화 프롬프트 생성 함수
 * @param {string} country - 타겟 국가 코드
 * @param {string} genre - 음악 장르 코드
 * @param {string} mood - 무드/분위기 코드
 * @param {string} tempo - 템포 (slow/medium/fast)
 * @returns {object} 생성된 프롬프트 및 메타데이터
 */
function generateSunoPrompt(country, genre, mood, tempo) {
  const countryData = COUNTRY_STYLES[country];
  const genreData = GENRE_MAP[genre];
  const moodData = MOOD_MAP[mood];

  if (!countryData || !genreData || !moodData) {
    throw new Error('Invalid parameters provided');
  }

  // 템포 매핑
  const tempoMap = {
    very_slow: { label: 'Very Slow', bpm: '50-70', desc: 'extremely slow, meditative pace' },
    slow: { label: 'Slow', bpm: '60-80', desc: 'slow tempo, gentle pace' },
    medium: { label: 'Medium', bpm: '90-110', desc: 'moderate tempo, steady groove' },
    fast: { label: 'Fast', bpm: '120-140', desc: 'fast tempo, energetic pace' },
    very_fast: { label: 'Very Fast', bpm: '140-170', desc: 'very fast, high-octane energy' }
  };

  const tempoData = tempoMap[tempo] || tempoMap.medium;

  // 악기 랜덤 선택 (2-3개)
  const selectedInstruments = shuffleArray(countryData.instruments).slice(0, 3);

  // 스케일 랜덤 선택 (1개)
  const selectedScale = countryData.scales[Math.floor(Math.random() * countryData.scales.length)];

  // 국가 바이브 랜덤 선택 (1개)
  const selectedVibe = countryData.vibes[Math.floor(Math.random() * countryData.vibes.length)];

  // ═══ Style of Music 프롬프트 조합 ═══
  const styleParts = [
    ...genreData.tags.slice(0, 3),
    selectedVibe,
    ...moodData.tags.slice(0, 2),
    tempoData.desc,
    `featuring ${selectedInstruments.join(', ')}`,
    selectedScale,
    moodData.description
  ];

  const styleOfMusic = styleParts.join(', ');

  // ═══ Lyrics Theme / Title 제안 ═══
  const titleSuggestions = generateTitleSuggestions(countryData, genreData, moodData);

  // ═══ 메타태그 형식 포맷팅 ═══
  const metaTags = {
    genre: genreData.tags.slice(0, 3).join(', '),
    mood: moodData.tags.slice(0, 3).join(', '),
    instruments: selectedInstruments.join(', '),
    tempo: `${tempoData.label} (${tempoData.bpm} BPM)`,
    region: `${countryData.name} (${countryData.flag})`,
    scale: selectedScale,
    energy: moodData.energy,
    valence: moodData.valence
  };

  return {
    prompt: styleOfMusic,
    metaTags,
    titleSuggestions,
    fullPrompt: {
      styleOfMusic,
      lyricsTheme: `${moodData.description}, inspired by ${selectedVibe}, in the style of ${genreData.name} from ${countryData.name}`,
      suggestedLanguage: countryData.languages[0]
    }
  };
}

/**
 * 타이틀 제안 생성
 */
function generateTitleSuggestions(countryData, genreData, moodData) {
  const templates = [
    `${moodData.tags[0]} ${genreData.name}`,
    `${countryData.vibes[0]} Dreams`,
    `${moodData.emoji} ${genreData.tags[0]} Vibes`,
    `Midnight in ${countryData.name}`,
    `${genreData.name} × ${countryData.name} Fusion`
  ];
  return templates;
}

/**
 * 배열 셔플 유틸리티
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ═══════════════════════════════════════════════════════════════
// 🎵 Suno AI API 시뮬레이션 (실제 API 연동 시 교체)
// ═══════════════════════════════════════════════════════════════

/**
 * Suno AI API 호출 시뮬레이션
 * 실제 Suno API 키를 .env에 설정하면 실제 API로 전환 가능
 */
async function callSunoAPI(prompt, titleSuggestion) {
  // 실제 Suno API 연동 시 아래 주석을 해제하고 구현
  // const SUNO_API_KEY = process.env.SUNO_API_KEY;
  // const response = await fetch('https://api.suno.ai/v1/generate', { ... });

  // 현재는 시뮬레이션 모드 - 데모 음원 URL 반환
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          id: `plly_${Date.now()}`,
          title: titleSuggestion || 'Global Plly Track',
          audioUrl: null, // 실제 API 연동 시 MP3 URL이 여기에
          coverUrl: null, // 실제 API 연동 시 커버 이미지 URL
          duration: '3:24',
          prompt: prompt,
          status: 'demo_mode',
          message: '🎵 프롬프트가 성공적으로 생성되었습니다! Suno AI에 이 프롬프트를 붙여넣으면 최적화된 음악이 생성됩니다.'
        }
      });
    }, 1500); // 1.5초 딜레이로 API 호출 감 재현
  });
}

// ═══════════════════════════════════════════════════════════════
// 🛣️ API 라우터
// ═══════════════════════════════════════════════════════════════

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 프롬프트 생성 API
app.post('/api/generate-prompt', (req, res) => {
  try {
    const { country, genre, mood, tempo } = req.body;

    if (!country || !genre || !mood || !tempo) {
      return res.status(400).json({
        success: false,
        error: '모든 파라미터를 입력해 주세요 (country, genre, mood, tempo)'
      });
    }

    const result = generateSunoPrompt(country, genre, mood, tempo);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 음악 생성 API (Suno AI 연동)
app.post('/api/generate-music', async (req, res) => {
  try {
    const { country, genre, mood, tempo } = req.body;

    if (!country || !genre || !mood || !tempo) {
      return res.status(400).json({
        success: false,
        error: '모든 파라미터를 입력해 주세요'
      });
    }

    // 1단계: 프롬프트 생성
    const promptResult = generateSunoPrompt(country, genre, mood, tempo);

    // 2단계: Suno AI API 호출
    const musicResult = await callSunoAPI(
      promptResult.prompt,
      promptResult.titleSuggestions[0]
    );

    res.json({
      success: true,
      prompt: promptResult,
      music: musicResult.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 데이터 조회 API (프론트엔드 드롭다운용)
app.get('/api/options', (req, res) => {
  const countries = Object.entries(COUNTRY_STYLES).map(([key, val]) => ({
    value: key,
    label: `${val.flag} ${val.name}`,
    flag: val.flag
  }));

  const genres = Object.entries(GENRE_MAP).map(([key, val]) => ({
    value: key,
    label: val.name
  }));

  const moods = Object.entries(MOOD_MAP).map(([key, val]) => ({
    value: key,
    label: `${val.emoji} ${val.name}`,
    emoji: val.emoji
  }));

  const tempos = [
    { value: 'very_slow', label: '🐢 매우 느림 (50-70 BPM)' },
    { value: 'slow', label: '🚶 느림 (60-80 BPM)' },
    { value: 'medium', label: '🚴 보통 (90-110 BPM)' },
    { value: 'fast', label: '🏃 빠름 (120-140 BPM)' },
    { value: 'very_fast', label: '🚀 매우 빠름 (140-170 BPM)' }
  ];

  res.json({ countries, genres, moods, tempos });
});

// ═══════════════════════════════════════════════════════════════
// 🚀 서버 시작
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║   🎵 Global Plly Master Server                   ║
  ║   Running on http://localhost:${PORT}              ║
  ║                                                  ║
  ║   코다리 개발부장이 충성스럽게 서빙 중! 🐟       ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});
