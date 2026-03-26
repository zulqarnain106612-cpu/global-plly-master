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
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');

const JWT_SECRET = process.env.JWT_SECRET || 'global-plly-master-secret-key-2025';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
    console.warn('⚠️ Supabase credentials not found. History will not be saved to DB.');
}

// ═══════════════════════════════════════════════════════════════
// 🔐 Gemini AI 서버사이드 초기화 (키는 .env에서만 — 클라이언트 노출 금지)
// ═══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';

if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_Gemini_API_키를_붙여넣으세요') {
    console.warn('⚠️ GEMINI_API_KEY not found in .env. /api/generate-prompts will not work.');
} else {
    console.log(`✅ Gemini AI initialized: ${GEMINI_MODEL}`);
}


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
    // ── 글로벌 메인스트림 ──────────────────────────────────
    phonk: {
        name: 'Phonk',
        tags: ['phonk', 'Memphis rap', 'drift phonk', 'dark bass', '808'],
        bpm: '130-160', style: 'aggressive bass drops, distorted cowbell, Memphis vocal samples'
    },
    hiphop: {
        name: 'Hip-Hop',
        tags: ['hip-hop', 'rap', 'boom bap', 'trap', 'urban'],
        bpm: '80-100', style: 'hard-hitting drums, rhythmic flow, bass-heavy, lyrical delivery'
    },
    edm: {
        name: 'EDM',
        tags: ['EDM', 'electronic dance music', 'festival', 'big room', 'progressive house'],
        bpm: '125-150', style: 'massive synth leads, euphoric build-ups, heavy drops, crowd energy'
    },
    jazz: {
        name: 'Jazz',
        tags: ['jazz', 'smooth jazz', 'swing', 'bebop', 'jazz fusion'],
        bpm: '100-140', style: 'complex chord progressions, improvisation, swing feel, sophisticated harmony'
    },
    lofi: {
        name: 'Lo-Fi',
        tags: ['lo-fi', 'lo-fi hip-hop', 'chillhop', 'study beats', 'vinyl crackle'],
        bpm: '70-90', style: 'dusty samples, vinyl crackle, mellow piano, tape saturation, jazzy chords'
    },
    rock: {
        name: 'Rock',
        tags: ['rock', 'alternative rock', 'indie rock', 'power chords', 'driving drums'],
        bpm: '110-140', style: 'distorted guitars, powerful drums, energetic performance, anthem-like chorus'
    },
    rnb: {
        name: 'R&B',
        tags: ['R&B', 'soul', 'neo-soul', 'contemporary R&B', 'smooth'],
        bpm: '65-95', style: 'silky vocals, lush harmonies, groove-oriented, emotional delivery'
    },
    classical: {
        name: 'Classical',
        tags: ['classical', 'orchestral', 'symphony', 'cinematic score', 'neoclassical'],
        bpm: '60-120', style: 'full orchestra, dynamic range, emotional movements, classical structure'
    },
    chillpop: {
        name: 'Chillpop',
        tags: ['chill pop', 'bedroom pop', 'dreamy', 'lo-fi pop', 'soft vocals'],
        bpm: '75-100', style: 'warm pads, soft guitar, airy vocals, gentle reverb, cozy atmosphere'
    },
    acoustic: {
        name: 'Acoustic',
        tags: ['acoustic', 'unplugged', 'fingerpicking', 'folk', 'singer-songwriter'],
        bpm: '70-110', style: 'acoustic guitar fingerpicking, warm vocals, intimate recording, natural reverb'
    },
    ambient: {
        name: 'Ambient',
        tags: ['ambient', 'atmospheric', 'soundscape', 'drone', 'ethereal'],
        bpm: '60-80', style: 'evolving textures, spacious reverb, meditative, floating pads'
    },

    // ── 🇰🇷 한국 ──────────────────────────────────────────
    kpop: {
        name: '🇰🇷 K-Pop',
        tags: ['K-Pop', 'Korean pop', 'idol music', 'K-pop dance', 'Korean R&B'],
        bpm: '100-130', style: 'polished production, catchy hooks, dynamic arrangement, dance break'
    },
    khiphop: {
        name: '🇰🇷 K-Hip Hop',
        tags: ['K-hip hop', 'Korean rap', 'Korean trap', 'K-R&B', 'Seoul hip hop'],
        bpm: '85-110', style: 'Korean language flow, boom bap meets K-pop aesthetics, emotional hooks'
    },
    trot: {
        name: '🇰🇷 트로트',
        tags: ['trot', 'Korean trot', 'K-trot', 'ppongjjak', 'Korean traditional pop'],
        bpm: '100-130', style: 'bouncy rhythm, emotional vocal ornaments, Korean folk melody, vibrato'
    },
    kindie: {
        name: '🇰🇷 K-Indie',
        tags: ['K-indie', 'Korean indie', 'Korean alternative', 'Hongdae music', 'K-folk'],
        bpm: '80-120', style: 'heartfelt lyrics, guitar-driven, raw emotion, cafe vibes, indie aesthetic'
    },

    // ── 🇯🇵 일본 ──────────────────────────────────────────
    jpop: {
        name: '🇯🇵 J-Pop',
        tags: ['J-Pop', 'Japanese pop', 'idol pop', 'Oricon chart', 'Japanese mainstream'],
        bpm: '95-130', style: 'bright melodies, polished production, emotional chorus, Japanese aesthetics'
    },
    citypop: {
        name: '🇯🇵 City Pop',
        tags: ['city pop', 'Japanese city pop', '80s Japan', 'Shibuya-kei', 'bubble era'],
        bpm: '90-115', style: 'smooth bass, retro synthesizer, breezy summer feel, nostalgic 80s Tokyo'
    },
    anisong: {
        name: '🇯🇵 Anime OST',
        tags: ['anime', 'anisong', 'J-anime soundtrack', 'opening theme', 'otaku culture'],
        bpm: '120-160', style: 'soaring vocals, epic build-up, dramatic strings, hero theme, emotional peak'
    },
    jrock: {
        name: '🇯🇵 J-Rock',
        tags: ['J-rock', 'Japanese rock', 'visual kei', 'J-metal', 'anime rock'],
        bpm: '120-160', style: 'power chords, dramatic vocals, Japanese lyrical style, rock theatrics'
    },

    // ── 🇮🇳 인도 ──────────────────────────────────────────
    bollywood: {
        name: '🇮🇳 Bollywood',
        tags: ['Bollywood', 'Indian cinema', 'filmi music', 'orchestral Indian', 'dhol beats'],
        bpm: '90-140', style: 'dramatic strings, tabla rhythms, soaring vocal melody, cinematic build'
    },
    bhangra: {
        name: '🇮🇳 Bhangra',
        tags: ['Bhangra', 'Punjabi music', 'dhol', 'Punjabi folk', 'Bhangra pop'],
        bpm: '140-160', style: 'pounding dhol drum, Punjabi vocals, high-energy folk dance, celebration'
    },
    punjabihiphop: {
        name: '🇮🇳 Punjabi Hip Hop',
        tags: ['Punjabi hip hop', 'Desi hip hop', 'Punjabi rap', 'brown trap', 'Desi trap'],
        bpm: '90-130', style: 'Punjabi language rap, dhol-influenced trap, desi swagger, street energy'
    },
    indianclassical: {
        name: '🇮🇳 Indian Classical',
        tags: ['Indian classical', 'Hindustani', 'raga', 'classical Indian', 'sitar fusion'],
        bpm: '60-120', style: 'raga improvisation, sitar meditation, tabla cycles, spiritual depth'
    },

    // ── 🇧🇷 브라질 ────────────────────────────────────────
    samba: {
        name: '🇧🇷 Samba',
        tags: ['samba', 'Brazilian samba', 'carnival', 'Rio rhythm', 'pagode'],
        bpm: '95-115', style: 'syncopated 2/4 rhythm, surdo bass, festive brass, joyful celebration'
    },
    bossanova: {
        name: '🇧🇷 Bossa Nova',
        tags: ['bossa nova', 'Brazilian jazz', 'Ipanema', 'saudade', 'Brazilian guitar'],
        bpm: '100-120', style: 'subtle swing, nylon guitar, breathy vocals, saudade emotion, summer calm'
    },
    bailefunk: {
        name: '🇧🇷 Baile Funk',
        tags: ['baile funk', 'funk carioca', 'Brazilian funk', 'favela funk', 'tamborzao'],
        bpm: '125-140', style: 'hard tamborzão beat, bass-heavy, Rio de Janeiro street energy, raw and loud'
    },

    // ── 🌍 라틴 / 카리브 ──────────────────────────────────
    reggaeton: {
        name: '🌍 Reggaeton',
        tags: ['reggaeton', 'dembow', 'Latin urban', 'perreo', 'Latin trap'],
        bpm: '85-100', style: 'dembow rhythm, Latin percussion, catchy hooks, dance energy'
    },
    salsa: {
        name: '🌍 Salsa',
        tags: ['salsa', 'Cuban salsa', 'salsa romántica', 'Latin brass', 'clave rhythm'],
        bpm: '160-230', style: 'clave pattern, energetic brass section, congas, passionate Latin dance'
    },
    latin_pop: {
        name: '🌍 Latin Pop',
        tags: ['Latin pop', 'Spanish pop', 'Latino', 'pop en español', 'Latin crossover'],
        bpm: '95-130', style: 'catchy hooks in Spanish, radio-friendly production, warm Latin rhythms'
    },

    // ── 🌍 아프리카 ───────────────────────────────────────
    afrobeats: {
        name: '🌍 Afrobeats',
        tags: ['Afrobeats', 'Afropop', 'Afrofusion', 'West African', 'Lagos sound'],
        bpm: '100-120', style: 'percussive groove, log drum, infectious rhythm, joyful energy'
    },
    amapiano: {
        name: '🌍 Amapiano',
        tags: ['amapiano', 'South African', 'log drum', 'piano house', 'Joburg sound'],
        bpm: '100-115', style: 'deep log drum bass, jazzy piano riffs, South African township vibes'
    },

    // ── 🌍 중동 / 북아프리카 ──────────────────────────────
    arabpop: {
        name: '🌍 Arab Pop',
        tags: ['Arabic pop', 'Arab music', 'Middle Eastern', 'khaleeji', 'Lebanese pop'],
        bpm: '95-125', style: 'Arabic maqam scale, oud-inspired melodies, emotional Arabic vocals, oriental'
    },

    // ── 🌍 유럽 ───────────────────────────────────────────
    frenchpop: {
        name: '🇫🇷 French Pop',
        tags: ['French pop', 'chanson', 'variété française', 'Parisian', 'French electronic'],
        bpm: '90-120', style: 'romantic French lyrics, accordion hints, café atmosphere, chic sophistication'
    },
    europop: {
        name: '🌍 Euro Pop',
        tags: ['Euro pop', 'dance pop', 'Euro dance', 'Scandinavian pop', 'Swedish pop'],
        bpm: '110-130', style: 'four-on-the-floor beat, bright synths, melodic hooks, catchy chorus'
    },

    // ── 팝 / 인디팝 / 발라드 ──────────────────────────────
    pop: {
        name: 'Pop',
        tags: ['pop', 'mainstream pop', 'radio pop', 'catchy', 'top 40'],
        bpm: '95-130', style: 'polished production, hooky melodies, verse-chorus structure, radio-friendly'
    },
    indiepop: {
        name: '🎸 Indie Pop',
        tags: ['indie pop', 'alternative pop', 'lo-fi pop', 'dream pop', 'jangle pop'],
        bpm: '80-120', style: 'jangly guitars, layered synths, introspective lyrics, warm DIY production'
    },
    ballad: {
        name: '🎹 Ballad',
        tags: ['ballad', 'power ballad', 'slow song', 'emotional ballad', 'piano ballad'],
        bpm: '60-80', style: 'emotive vocal performance, sparse arrangement, piano or acoustic guitar, heartfelt'
    },
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
    },
    // ── 활동적 ──────────────────────────────────────
    gym: {
        name: '💪 헬스/운동',
        emoji: '💪',
        tags: ['gym', 'workout', 'pump up', 'fitness', 'power training'],
        description: 'iron clanging, raw power, sweat and grind, beast mode',
        energy: 'very high',
        valence: 'positive'
    },
    roadtrip: {
        name: '🚗 로드트립',
        emoji: '🚗',
        tags: ['road trip', 'highway', 'open road', 'adventure', 'freedom drive'],
        description: 'windows down, open highway, endless horizon, free spirit',
        energy: 'medium-high',
        valence: 'very positive'
    },
    gaming: {
        name: '🎮 게이밍',
        emoji: '🎮',
        tags: ['gaming', 'video game', 'boss battle', 'RPG soundtrack', 'game music'],
        description: 'intense boss fight, pixel energy, dungeon crawl, game on',
        energy: 'high',
        valence: 'neutral-positive'
    },
    // ── 감성/감정 ─────────────────────────────────────
    nostalgia: {
        name: '📼 노스탈지아',
        emoji: '📼',
        tags: ['nostalgic', 'retro', '80s vibe', 'old memories', 'throwback'],
        description: 'dusty film reel, childhood memories, warm vintage glow',
        energy: 'low-medium',
        valence: 'bittersweet'
    },
    heartbreak: {
        name: '💔 이별/실연',
        emoji: '💔',
        tags: ['heartbreak', 'breakup', 'lonely', 'crying', 'goodbye song'],
        description: 'empty room, late night crying, missing someone, bittersweet ache',
        energy: 'low',
        valence: 'very negative'
    },
    confidence: {
        name: '😎 자신감/스웨그',
        emoji: '😎',
        tags: ['confident', 'boss energy', 'swagger', 'luxury', 'power moves'],
        description: 'walking into the room, dripping confidence, unstoppable energy',
        energy: 'high',
        valence: 'very positive'
    },
    hopeful: {
        name: '🌈 희망/설렘',
        emoji: '🌈',
        tags: ['hopeful', 'uplifting', 'inspiring', 'new beginning', 'optimistic'],
        description: 'first day of spring, new chapter, bright future ahead',
        energy: 'medium',
        valence: 'very positive'
    },
    anger: {
        name: '😤 분노/반항',
        emoji: '😤',
        tags: ['angry', 'rebellious', 'rage', 'aggressive', 'punk energy'],
        description: 'fists clenched, shouting into the void, raw unfiltered fury',
        energy: 'very high',
        valence: 'negative'
    },
    // ── 공간/장소 ─────────────────────────────────────
    rain: {
        name: '🌧️ 빗소리/우중',
        emoji: '🌧️',
        tags: ['rainy day', 'rain sounds', 'stormy', 'cozy indoors', 'petrichor'],
        description: 'raindrops on glass, grey skies, blanket and hot tea',
        energy: 'low',
        valence: 'neutral'
    },
    forest: {
        name: '🌲 자연/숲',
        emoji: '🌲',
        tags: ['nature', 'forest', 'birdsong', 'organic', 'earth sounds'],
        description: 'sunlight through trees, rustling leaves, deep forest calm',
        energy: 'very low',
        valence: 'positive'
    },
    club: {
        name: '🪩 클럽/나이트',
        emoji: '🪩',
        tags: ['club', 'nightclub', 'after midnight', 'dark dance floor', 'DJ set'],
        description: 'pulsing bass, strobe flash, sweaty dance floor, peak night',
        energy: 'very high',
        valence: 'positive'
    },
    wedding: {
        name: '💒 웨딩/축하',
        emoji: '💒',
        tags: ['wedding', 'ceremony', 'celebration', 'elegant', 'first dance'],
        description: 'white flowers, tears of joy, the most beautiful day',
        energy: 'medium',
        valence: 'very positive'
    },
    // ── 특수 ──────────────────────────────────────────
    sleep: {
        name: '😴 수면/ASMR',
        emoji: '😴',
        tags: ['sleep music', 'ASMR', 'lullaby', 'bedtime', 'dreamy slumber'],
        description: 'soft whisper, weighted blanket, slow breathing, dream state',
        energy: 'very low',
        valence: 'positive'
    },
    meditation: {
        name: '🧘 명상/요가',
        emoji: '🧘',
        tags: ['meditation', 'yoga', 'breathwork', 'mindfulness', 'chakra'],
        description: 'slow breath cycles, third eye open, complete mind stillness',
        energy: 'very low',
        valence: 'neutral-positive'
    },
    horror: {
        name: '👻 공포/다크',
        emoji: '👻',
        tags: ['horror', 'dark', 'eerie', 'haunting', 'creepy atmosphere'],
        description: 'creaking floors, cold shadow, something in the dark',
        energy: 'medium',
        valence: 'very negative'
    },
    anime: {
        name: '⚡ 애니/판타지',
        emoji: '⚡',
        tags: ['anime energy', 'shonen', 'fantasy world', 'power up', 'isekai'],
        description: 'hero rising, power awakening, destiny calling, nakama bonds',
        energy: 'very high',
        valence: 'very positive'
    },
    dinner: {
        name: '🍷 저녁식사/와인',
        emoji: '🍷',
        tags: ['dinner music', 'jazz dinner', 'elegant', 'fine dining', 'wine'],
        description: 'candlelit table, soft conversation, sophisticated evening',
        energy: 'low',
        valence: 'positive'
    },
    kids: {
        name: '🧸 어린이/귀여움',
        emoji: '🧸',
        tags: ['children', 'cute', 'playful', 'kindergarten', 'cartoon'],
        description: 'bright colors, innocent laughter, pure playful joy',
        energy: 'medium',
        valence: 'very positive'
    },
};


// ═══════════════════════════════════════════════════════════════
// 🎤 디테일 확장 옵션 (신규 기능)
// ═══════════════════════════════════════════════════════════════

const VOCAL_MAP = {
    auto: { label: '🤖 자동 (장르 맞춤)', tag: '' },
    male: { label: '👨 남성 보컬', tag: 'male vocals' },
    female: { label: '👩 여성 보컬', tag: 'female vocals' },
    duet: { label: '👫 남녀 듀엣', tag: 'male and female duet vocals' },
    husky: { label: '🚬 허스키 보컬', tag: 'husky raspy vocals' },
    choir: { label: '👥 합창/콰이어', tag: 'choir vocals' }
};

const STRUCTURE_MAP = {
    standard: { label: '📻 스탠다드 (3분)', structure: '[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge]\n[Chorus]\n[Outro]' },
    short: { label: '📱 숏폼/틱톡 (1분)', structure: '[Hook]\n[Chorus]\n[Drop]\n[Outro]' },
    intro: { label: '🎬 인트로 강조', structure: '[Long Instrumental Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]' },
    outro: { label: '🌅 아웃트로 강조', structure: '[Verse]\n[Chorus]\n[Extended Outro]\n[Fade Out]' }
};

const CREATIVITY_MAP = {
    normal: { label: '🎯 정석 모드' },
    creative: { label: '✨ 독창적 모드' },
    crazy: { label: '🌀 짬뽕 모드' }
};

const VOCAL_LANG_MAP = {
    auto: { label: '🤖 자동 (국가 맞춤)', tag: '' },
    korean: { label: '🇰🇷 한국어', tag: 'Korean lyrics' },
    english: { label: '🇺🇸 영어', tag: 'English lyrics' },
    japanese: { label: '🇯🇵 일본어', tag: 'Japanese lyrics' },
    chinese: { label: '🇨🇳 중국어', tag: 'Chinese lyrics' },
    spanish: { label: '🇪🇸 스페인어', tag: 'Spanish lyrics' },
    portuguese: { label: '🇧🇷 포르투갈어', tag: 'Portuguese lyrics' },
    hindi: { label: '🇮🇳 힌디어', tag: 'Hindi lyrics' },
    punjabi: { label: '🇮🇳 펀자비어', tag: 'Punjabi lyrics' },
    french: { label: '🇫🇷 프랑스어', tag: 'French lyrics' },
    german: { label: '🇩🇪 독일어', tag: 'German lyrics' },
    arabic: { label: '🇸🇦 아랍어', tag: 'Arabic lyrics' },
    instrumental: { label: '🎸 가사 없음 (연주)', tag: 'instrumental, no lyrics' }
};

// ═══════════════════════════════════════════════════════════════
// 🎨 서브스타일 맵 (장르별 세부 분위기 태그)
// ═══════════════════════════════════════════════════════════════
const SUBSTYLE_MAP = {
    kpop: [
        { id: 'girlcrush', label: '👊 걸크러쉬', tag: 'girl crush, fierce, powerful female energy, bold', desc: 'BLACKPINK/aespa 스타일의 강렬한 걸크러쉬' },
        { id: 'cute', label: '🍭 큐티/청량', tag: 'cute, refreshing, bubbly, bright sunshine pop', desc: 'IVE/NewJeans 스타일의 청량하고 사랑스러운 분위기' },
        { id: 'y2k', label: '💿 Y2K 레트로', tag: 'Y2K aesthetic, retro 2000s, nostalgia pop, vintage synth', desc: '2000년대 감성의 레트로 팝' },
        { id: 'hybe', label: '🌙 몽환/아련', tag: 'dreamy, ethereal, atmospheric, melancholic K-pop', desc: 'BTS/LE SSERAFIM 스타일의 몽환적 분위기' },
        { id: 'boygroup', label: '🔥 보이그룹 에너지', tag: 'powerful, intense, synchronized, boy group performance', desc: 'BTS/Stray Kids 스타일의 강렬한 에너지' },
        { id: 'hiphopkpop', label: '🎤 K-힙합팝 퓨전', tag: 'K-pop hip-hop fusion, trap beats, swag, street', desc: '힙합이 가미된 K-Pop' },
        { id: 'emotional', label: '💜 감성 K-Pop', tag: 'emotional ballad pop, heartfelt, soft piano, vocal run', desc: '감성적이고 서정적인 K-Pop' },
        { id: 'classic', label: '🎵 클래식 아이돌', tag: 'classic K-pop idol, catchy hook, synchronized dance', desc: '2NE1/SNSD 시대의 클래식 아이돌 K-Pop' },
    ],
    hiphop: [
        { id: 'trap', label: '⛓️ 트랩/다크', tag: 'dark trap, heavy 808, hi-hats, menacing', desc: '묵직한 808 베이스의 트랩' },
        { id: 'oldschool', label: '🎙️ 올드스쿨', tag: 'old school hip-hop, boom bap, vinyl samples, raw', desc: '붐뱁 계열의 올드스쿨' },
        { id: 'drill', label: '🔫 드릴', tag: 'drill music, sliding beats, menacing bass, street energy', desc: 'UK/Chicago 드릴 스타일' },
        { id: 'lofi_hip', label: '☕ 로파이 힙합', tag: 'lo-fi hip-hop, jazzy samples, chill beats, study music', desc: '공부할 때 듣는 로파이 힙합' },
        { id: 'emo_rap', label: '💔 이모 랩', tag: 'emo rap, sad trap, melodic vocals, vulnerable', desc: '감성적인 멜로딕 랩' },
        { id: 'conscious', label: '✊ 컨셔스 랩', tag: 'conscious hip-hop, storytelling, lyrical, thought-provoking', desc: '메시지 중심의 컨셔스 힙합' },
    ],
    khiphop: [
        { id: 'flex', label: '💎 플렉스/스웨그', tag: 'Korean hip-hop flex, luxurious, swag, braggadocious', desc: 'Show Me the Money 스타일의 플렉스' },
        { id: 'lyrical', label: '📖 서정적 K-힙합', tag: 'lyrical Korean rap, emotional, introspective, poetic', desc: '감성적인 서정 K-힙합' },
        { id: 'street', label: '🏙️ 스트리트', tag: 'Korean street hip-hop, underground, raw, authentic', desc: '홍대 언더그라운드 씬 스타일' },
        { id: 'groove', label: '🎷 그루브/훵크', tag: 'Korean hip-hop groove, funky bass, jazz influenced', desc: '훵키하고 그루비한 K-힙합' },
    ],
    edm: [
        { id: 'festival', label: '🎉 페스티벌 뱅어', tag: 'festival EDM, massive drop, euphoric build, crowd energy', desc: 'EDC/Ultra 페스티벌 메인스테이지 급' },
        { id: 'futurebass', label: '🌊 퓨처 베이스', tag: 'future bass, colorful synths, emotional drop, melodic', desc: 'Flume/Marshmello 스타일의 퓨처 베이스' },
        { id: 'techno', label: '🖤 다크 테크노', tag: 'dark techno, Berlin underground, industrial, relentless', desc: '베를린 언더그라운드 테크노' },
        { id: 'house', label: '🏠 딥 하우스', tag: 'deep house, soulful vocals, warm bass, sophisticated', desc: '소울풀한 딥 하우스' },
        { id: 'hyperpop', label: '💥 하이퍼팝', tag: 'hyperpop, glitchy, maximalist, chaotic energy, PC Music', desc: '카오틱한 하이퍼팝' },
    ],
    rnb: [
        { id: 'neosoul', label: '🌿 네오소울', tag: 'neo soul, organic instruments, spiritual, smooth groove', desc: 'D\'Angelo/H.E.R. 스타일의 네오소울' },
        { id: 'urban', label: '🌆 어반 R&B', tag: 'urban R&B, modern production, sultry, night drive', desc: '세련된 현대 어반 R&B' },
        { id: 'alternative', label: '🌀 얼터너티브 R&B', tag: 'alternative R&B, experimental, dark, moody', desc: 'Frank Ocean 스타일의 얼터 R&B' },
        { id: 'classic_rnb', label: '💿 클래식 소울', tag: 'classic soul, Motown inspired, rich harmonies, gospel', desc: '클래식 소울/모타운 스타일' },
    ],
    rock: [
        { id: 'indierock', label: '🎸 인디 록', tag: 'indie rock, jangly guitars, introspective lyrics, lo-fi', desc: '인디 감성의 기타 록' },
        { id: 'hardrock', label: '⚡ 하드 록', tag: 'hard rock, power chords, guitar solo, arena rock', desc: '강렬한 하드 록' },
        { id: 'punk', label: '🔴 펑크', tag: 'punk rock, fast, aggressive, rebellious, three chords', desc: '짧고 강렬한 펑크 록' },
        { id: 'shoegaze', label: '🌫️ 슈게이징', tag: 'shoegaze, wall of sound, distorted guitars, dreamy vocals', desc: 'My Bloody Valentine 스타일' },
    ],
    pop: [
        { id: 'synthpop', label: '🎹 신스팝', tag: 'synth-pop, 80s inspired, neon aesthetic, catchy hooks', desc: '80년대 신스팝 감성' },
        { id: 'darkpop', label: '🖤 다크 팝', tag: 'dark pop, haunting, minor key, cinematic tension', desc: 'Billie Eilish 스타일의 다크 팝' },
        { id: 'bubblegum', label: '🫧 버블검 팝', tag: 'bubblegum pop, ultra-catchy, colorful, happy energy', desc: '밝고 귀여운 버블검 팝' },
        { id: 'hyperpop2', label: '💥 하이퍼팝', tag: 'hyperpop, autotune heavy, glitchy, chaotic fun', desc: 'Charli XCX 스타일' },
    ],
    chillpop: [
        { id: 'bedroom', label: '🛏️ 베드룸 팝', tag: 'bedroom pop, intimate, DIY production, vulnerable', desc: 'Rex Orange County 스타일의 베드룸 팝' },
        { id: 'sadgirl', label: '🌧️ 새드걸 팝', tag: 'sad girl pop, melancholic, acoustic soft, emotional', desc: 'Phoebe Bridgers 스타일' },
        { id: 'cottagecore', label: '🌻 코티지코어', tag: 'cottagecore, folk pop, whimsical, nature, soft acoustic', desc: '전원적이고 따뜻한 분위기' },
    ],
    jpop: [
        { id: 'city_pop', label: '🌃 시티팝', tag: 'city pop, 80s Japan, funky bass, late night Tokyo drive', desc: '야마시타 타츠로 스타일의 시티팝' },
        { id: 'anime_ost', label: '⚡ 애니메 OP/ED', tag: 'anime opening song, high energy, epic, catchy melody', desc: '애니메이션 오프닝 스타일' },
        { id: 'vocaloid', label: '🤖 보컬로이드', tag: 'Vocaloid, synthetic vocals, otaku culture, Miku vibes', desc: '하츠네 미쿠 스타일의 보컬로이드' },
        { id: 'jrock', label: '🎸 J-Rock', tag: 'J-rock, visual kei influence, dramatic, powerful', desc: '원피스/나루토 OST 스타일의 J-Rock' },
    ],
    // 기타 장르는 빈 배열 (범용 사용)
    lofi: [
        { id: 'study', label: '📚 공부/집중', tag: 'lo-fi study beats, calm, focus, coffee shop ambiance', desc: '집중력을 높이는 로파이' },
        { id: 'late_night', label: '🌙 심야/감성', tag: 'late night lo-fi, melancholic, city lights, alone time', desc: '혼자 있는 밤의 로파이' },
    ],
    afrobeats: [
        { id: 'afropop', label: '☀️ 아프로팝', tag: 'Afropop, Wizkid style, smooth, rhythmic, party vibes', desc: '위즈키드 스타일의 아프로팝' },
        { id: 'amapiano', label: '🥁 아마피아노', tag: 'Amapiano, log drum, soulful piano, South African', desc: '남아공 아마피아노' },
    ],
    phonk: [
        { id: 'drift', label: '🚗 드리프트 포크', tag: 'drift phonk, aggressive 808, dark hypnotic, Memphis rap', desc: '드리프트 영상에 쓰이는 짙은 포크' },
        { id: 'cowbell', label: '🔔 카우벨 포크', tag: 'cowbell phonk, Memphis phonk, repetitive hooks, distorted synth', desc: '카우벨 루프가 특징적인 Memphis 포크' },
        { id: 'romanian', label: '🌙 루마니안 포크', tag: 'Romanian phonk, dark hypnotic, slow drag, ominous bass', desc: '루마니안 스타일의 느린 포크' },
        { id: 'rage_phonk', label: '🔥 레이지 포크', tag: 'rage phonk, trap influences, aggressive, adrenaline rush', desc: '공격적이고 강렬한 레이지 포크' },
    ],
    jazz: [
        { id: 'smooth', label: '🥂 스무스 재즈', tag: 'smooth jazz, saxophone, mellow groove, sophisticated', desc: '부드럽고 세련된 스무스 재즈' },
        { id: 'bebop', label: '🎷 비밥', tag: 'bebop jazz, fast tempo, complex harmony, virtuosic', desc: '빠르고 기교넘치는 비밥' },
        { id: 'modal', label: '🌌 모달/퓨전', tag: 'modal jazz, fusion, Miles Davis influenced, atmospheric', desc: 'Miles Davis 스타일의 모달 재즈' },
        { id: 'swing', label: '🎩 스윙/빅밴드', tag: 'swing jazz, big band, brass section, upbeat danceable', desc: '1940년대 빅밴드 스윙' },
    ],
    classical: [
        { id: 'baroque', label: '🎻 바로크', tag: 'baroque music, harpsichord, counterpoint, ornamental, Bach style', desc: '바흐 시대의 바로크 음악' },
        { id: 'romantic_era', label: '🌹 낭만주의', tag: 'romantic era, sweeping orchestral, emotional, Chopin style', desc: '쇼팽/슈베르트 스타일의 낭만주의' },
        { id: 'modern_classical', label: '🔬 현대음악', tag: 'modern classical, minimalist, Philip Glass style', desc: '미니멀리즘 현대 음악' },
        { id: 'cinematic_orch', label: '🎬 시네마틱', tag: 'cinematic orchestral, epic score, Hans Zimmer inspired', desc: '영화음악 스타일의 오케스트라' },
    ],
    acoustic: [
        { id: 'folk', label: '🌿 포크', tag: 'folk acoustic, storytelling, fingerpicking guitar, raw', desc: '어쿠스틱 포크 스타일' },
        { id: 'fingerstyle', label: '🎸 핑거스타일', tag: 'fingerstyle guitar, intricate, classical guitar technique', desc: '복잡한 기타 핑거스타일' },
        { id: 'singer_songwriter', label: '✍️ 싱어송라이터', tag: 'singer-songwriter, confessional lyrics, piano or guitar, intimate', desc: '개인적인 이야기를 담은 싱어송라이터' },
        { id: 'campfire', label: '🔥 캠프파이어', tag: 'campfire acoustic, warm, simple strumming, nostalgic', desc: '따뜻하고 단순한 어쿠스틱' },
    ],
    ambient: [
        { id: 'dark_ambient', label: '🖤 다크 앰비언트', tag: 'dark ambient, ominous drone, industrial texture, unsettling', desc: '불안하고 어두운 분위기' },
        { id: 'space_amb', label: '🚀 스페이스', tag: 'space ambient, cosmic, ethereal pads, vast emptiness', desc: '우주적이고 광활한 앰비언트' },
        { id: 'nature_amb', label: '🌊 네이처/힐링', tag: 'nature ambient, rain sounds, forest, healing, meditation', desc: '자연음이 담긴 힐링 앰비언트' },
        { id: 'drone', label: '🎛️ 드론/실험', tag: 'drone music, experimental, minimalist, Brian Eno style', desc: 'Brian Eno 스타일의 드론' },
    ],
    trot: [
        { id: 'classic_trot', label: '🎤 클래식 트로트', tag: 'classic Korean trot, traditional, heartfelt, melodic', desc: '나훈아/조용필 스타일의 클래식 트로트' },
        { id: 'modern_trot', label: '✨ 뉴트로 트로트', tag: 'modern trot, youth friendly, pop mix, catchy hook', desc: '임영웅 스타일의 뉴트로 트로트' },
        { id: 'dance_trot', label: '💃 댄스 트로트', tag: 'dance trot, upbeat, party, electronic trot beats', desc: '흥겨운 댄스 트로트' },
    ],
    kindie: [
        { id: 'dreampop', label: '🌙 드림팝', tag: 'Korean indie dream pop, reverb guitar, hazy, emotional', desc: '몽환적인 한국 드림팝' },
        { id: 'postrock', label: '🏔️ 포스트록', tag: 'Korean post-rock, instrumental, crescendo, epic buildup', desc: '한국 포스트록 밴드 스타일' },
        { id: 'acoustic_indie', label: '🎵 어쿠스틱 인디', tag: 'Korean acoustic indie, delicate, honest lyrics, coffee shop', desc: '카페에서 듣는 어쿠스틱 인디' },
        { id: 'synth_indie', label: '🎹 신스 인디', tag: 'Korean indie synth, retro keyboard, layered textures', desc: '신시사이저 중심의 K-인디' },
    ],
    citypop: [
        { id: 'classic_city', label: '🌃 클래식 시티팝', tag: 'classic city pop, 1983 Tokyo, funky bass, smooth groove', desc: '1980년대 도쿄 밤거리의 시티팝' },
        { id: 'future_city', label: '🚀 퓨처 시티팝', tag: 'future city pop, modern production, retro aesthetic, vaporwave', desc: '현대적으로 재해석된 시티팝' },
        { id: 'kcitypop', label: '🌆 K-시티팝', tag: 'Korean city pop, Seoul nights, Korean lyrics, 80s groove', desc: '한국형 시티팝' },
    ],
    anisong: [
        { id: 'shounen', label: '⚔️ 소년만화 OP', tag: 'shonen anime opening, energetic, epic, heroic melody', desc: '나루토/원피스 스타일의 오프닝' },
        { id: 'emotional_anime', label: '💧 감동 ED', tag: 'anime ending song, emotional, melancholic, heartfelt vocals', desc: '눈물샘 자극하는 감동 엔딩' },
        { id: 'idol_anime', label: '🌸 아이돌 애니송', tag: 'idol anime song, Love Live style, cheerful, cute', desc: '러브라이브 스타일의 아이돌 애니송' },
        { id: 'dark_anime', label: '🖤 다크 애니 OST', tag: 'dark anime OST, Attack on Titan style, orchestral, intense', desc: '진격의 거인 스타일의 다크 OST' },
    ],
    jrock: [
        { id: 'visualkei', label: '💄 비주얼 케이', tag: 'visual kei, dramatic, glamorous, dark theatrical', desc: '엑스재팬 스타일의 비주얼 케이' },
        { id: 'alternative_j', label: '🎸 J-얼터너티브', tag: 'Japanese alternative rock, experimental, RADWIMPS style', desc: 'RADWIMPS 스타일의 J-얼터' },
        { id: 'punk_j', label: '⚡ J-펑크', tag: 'Japanese punk, fast, aggressive, youthful energy', desc: '빠르고 에너지 넘치는 J-펑크' },
    ],
    bollywood: [
        { id: 'item', label: '💃 아이템 송', tag: 'Bollywood item song, dance, glamorous, festive, dhol beats', desc: '화려하고 신나는 볼리우드 댄스송' },
        { id: 'romantic_bw', label: '🌹 로맨틱', tag: 'Bollywood romantic, lush strings, heartfelt vocals, emotional', desc: '감동적인 볼리우드 로맨스' },
        { id: 'sufi', label: '🕌 수피 퓨전', tag: 'Sufi fusion, spiritual, qawwali influence, devotional', desc: '수피 음악 영향의 퓨전' },
        { id: 'folk_bw', label: '🌾 포크/데시', tag: 'Bollywood folk, desi vibes, regional instruments, earthy', desc: '인도 지역 포크 스타일' },
    ],
    bhangra: [
        { id: 'classic_bhangra', label: '🥁 클래식 방그라', tag: 'classic bhangra, dhol, tumbi, energetic, Punjabi folk', desc: '전통 방그라 스타일' },
        { id: 'urban_bhangra', label: '🏙️ 어반 방그라', tag: 'urban bhangra, hip-hop mixed, Diljit Dosanjh style', desc: '딜짓 도산 스타일의 어반 방그라' },
        { id: 'fusion_bhangra', label: '🎛️ EDM 방그라', tag: 'bhangra EDM fusion, festival ready, multicultural', desc: 'EDM과 결합된 방그라 퓨전' },
    ],
    punjabihiphop: [
        { id: 'drill_punjabi', label: '🎤 펀자비 드릴', tag: 'Punjabi drill, dark beats, UK influence, menacing street', desc: 'UK 드릴에 영향받은 펀자비 힙합' },
        { id: 'desi_trap', label: '⛓️ 데시 트랩', tag: 'desi trap, dark 808, Punjabi lyrics, street energy', desc: '트랩 비트의 펀자비 힙합' },
        { id: 'melodic_punjabi', label: '🎵 멜로딕 펀자비', tag: 'melodic Punjabi hip-hop, emotional, storytelling', desc: '감성적인 멜로딕 펀자비 랩' },
    ],
    indianclassical: [
        { id: 'raga', label: '🪘 라가', tag: 'Indian classical raga, sitar, tabla, meditative, traditional', desc: '전통 시타르 라가 음악' },
        { id: 'fusion_ic', label: '🎷 인도 재즈 퓨전', tag: 'Indian classical jazz fusion, sitar meets saxophone, world music', desc: '인도 클래식과 재즈의 퓨전' },
        { id: 'carnatic', label: '🎶 카르나틱', tag: 'Carnatic music, South Indian classical, vocal ornaments', desc: '남인도 카르나틱 음악' },
    ],
    samba: [
        { id: 'samba_enredo', label: '🥁 카니발 삼바', tag: 'samba enredo, Rio carnival, heavy percussion, celebratory', desc: '리우 카니발 스타일의 삼바' },
        { id: 'pagode', label: '🍺 파고지', tag: 'pagode, intimate samba, acoustic, Brazilian popular', desc: '친밀한 파고지 삼바' },
    ],
    bossanova: [
        { id: 'classic_bossa', label: '🌺 클래식 보사노바', tag: 'classic bossa nova, Joao Gilberto style, nylon guitar, soft vocals', desc: '조앙 질베르토 스타일의 보사노바' },
        { id: 'modern_bossa', label: '🌆 모던 보사노바', tag: 'modern bossa nova, jazz influence, sophisticated, lounge', desc: '현대적으로 재해석된 보사노바' },
    ],
    bailefunk: [
        { id: 'classic_baile', label: '💦 클래식 바일레', tag: 'classic baile funk, raw, Brazilian favela, aggressive bass', desc: '브라질 바일레 펑크' },
        { id: 'phonk_baile', label: '🔊 포크 바일레', tag: 'baile funk phonk fusion, trap influenced, heavy bass', desc: '트랩과 결합된 바일레 퓨전' },
    ],
    reggaeton: [
        { id: 'classic_reg', label: '🌴 클래식 레게톤', tag: 'classic reggaeton, dembow rhythm, street, Bad Bunny style', desc: '전통 레게톤 데모우 리듬' },
        { id: 'perreo', label: '🔥 페레오', tag: 'perreo, reggaeton sensual, slow dembow, night club', desc: '클럽 분위기의 감각적인 레게톤' },
        { id: 'pop_reg', label: '✨ 팝 레게톤', tag: 'pop reggaeton, mainstream, radio friendly, catchy', desc: '팝과 결합된 레게톤' },
    ],
    salsa: [
        { id: 'classic_salsa', label: '🎺 클래식 살사', tag: 'classic salsa, brass heavy, New York Cali style, dance floor', desc: '뉴욕/칼리 스타일의 살사' },
        { id: 'salsa_romantica', label: '🌹 살사 로만티카', tag: 'salsa romantica, slow, emotional, romantic Cuban vocals', desc: '감성적인 로맨틱 살사' },
    ],
    latin_pop: [
        { id: 'tropical', label: '🌺 트로피칼', tag: 'tropical pop, sunny, carefree, marimba, vacation vibes', desc: '열대 분위기의 팝' },
        { id: 'urban_latin', label: '🏙️ 어반 라틴', tag: 'urban Latin pop, Bad Bunny meets pop, modern production', desc: '현대적인 어반 라틴 팝' },
        { id: 'flamenco_pop', label: '💃 플라멩코 팝', tag: 'flamenco pop, Spanish guitar, passion, Rosalia style', desc: '로살리아 스타일의 플라멩코 팝' },
    ],
    amapiano: [
        { id: 'log_drum', label: '🥁 로그드럼', tag: 'amapiano log drum, deep bass, South African club music', desc: '특징적인 로그 드럼의 아마피아노' },
        { id: 'vocal_amp', label: '🎤 보컬 아마피아노', tag: 'vocal amapiano, soulful singing, emotional, house influenced', desc: '보컬이 중심인 아마피아노' },
    ],
    arabpop: [
        { id: 'khaleeji', label: '🌙 칼리지 팝', tag: 'Khaleeji pop, Gulf Arabic, festive, traditional instruments', desc: '걸프 아랍 팝 스타일' },
        { id: 'levantine', label: '🌿 레반트 팝', tag: 'Levantine pop, Egyptian or Lebanese style, romantic', desc: '레바논/이집트 아랍 팝' },
        { id: 'arabic_edm', label: '🎛️ 아랍 EDM', tag: 'Arabic EDM fusion, electronic beats with Arabic instruments', desc: 'EDM과 아랍 음악의 퓨전' },
    ],
    frenchpop: [
        { id: 'chanson', label: '🥐 상송', tag: 'French chanson, accordeon, storytelling, romantic Paris', desc: '파리의 낭만 상송' },
        { id: 'ye_ye', label: '🌸 예-예', tag: 'ye-ye, 60s French pop, carefree, retro vibes', desc: '1960년대 프렌치 예-예' },
        { id: 'french_house', label: '🏠 프렌치 하우스', tag: 'French house, Daft Punk style, filtered funky retro electronic', desc: '다프트 펑크 스타일의 프렌치 하우스' },
    ],
    europop: [
        { id: 'eurodance', label: '💃 유로댄스', tag: 'Eurodance, 90s, catchy chorus, electronic beats, Ace of Base', desc: '90년대 유로댄스 스타일' },
        { id: 'schlager', label: '🎵 슐라거', tag: 'Schlager, German pop, catchy, feel-good, simple melody', desc: '독일/스칸디나비아 슐라거' },
        { id: 'nordic_pop', label: '❄️ 노르딕 팝', tag: 'Nordic pop, clean production, ABBA influenced, melodic', desc: 'ABBA 영향의 노르딕 팝' },
    ],
    dawn: [
        { id: 'peaceful', label: '🌤️ 평화로운 새벽', tag: 'peaceful dawn, soft synths, gentle melody, hopeful morning', desc: '잔잔하고 희망적인 새벽 음악' },
        { id: 'melancholic_dawn', label: '🌧️ 쓸쓸한 새벽', tag: 'melancholic dawn, minor key, nostalgic, lonely night ending', desc: '혼자 보내는 새벽의 쓸쓸함' },
    ],
    running: [
        { id: 'hype', label: '🔥 하이프 러닝', tag: 'high energy running, trap beats, motivational, adrenaline rush', desc: '강렬한 동기부여 러닝 음악' },
        { id: 'steady', label: '🏃 스테디 페이스', tag: 'steady running beats, 160BPM, electronic, consistent energy', desc: '꾸준한 페이스 유지 러닝 음악' },
        { id: 'endurance', label: '💪 지구력/마라톤', tag: 'marathon music, uplifting, long distance running, perseverance', desc: '마라톤 완주를 위한 지구력 음악' },
    ],
    cafe: [
        { id: 'morning_cafe', label: '☀️ 모닝 카페', tag: 'morning cafe, bright acoustic, coffee, cheerful start of day', desc: '좋은 하루를 시작하는 카페 음악' },
        { id: 'indie_cafe', label: '🎵 인디 카페', tag: 'indie cafe, mellow, creative, bohemian, artsy feel', desc: '감성 인디 카페 분위기' },
        { id: 'jazz_cafe', label: '🎷 재즈 카페', tag: 'jazz cafe, live piano, sophisticated, background music', desc: '재즈 카페의 라이브 분위기' },
    ],
    night_drive: [
        { id: 'chill_drive', label: '🌙 칠 드라이브', tag: 'chill night drive, synthwave, smooth, city lights blur', desc: '도시 불빛 속 편안한 드라이브' },
        { id: 'dark_drive', label: '🖤 다크 드라이브', tag: 'dark night drive, dark synth, cinematic tension, highway speed', desc: '긴장감 있는 다크 드라이브' },
        { id: 'lofi_drive', label: '🎵 로파이 드라이브', tag: 'lo-fi night drive, chill, window down, open road freedom', desc: '창문 열고 달리는 로파이 드라이브' },
    ],
    study: [
        { id: 'lofi_study', label: '📚 로파이 스터디', tag: 'lo-fi study, calm beats, focus, unobtrusive background', desc: '집중력을 높이는 로파이' },
        { id: 'classical_study', label: '🎻 클래식 스터디', tag: 'classical study music, piano, quiet, deep concentration', desc: '클래식 피아노 스터디 음악' },
        { id: 'ambient_study', label: '🌌 앰비언트 스터디', tag: 'ambient study, nature sounds, minimal, zen focus state', desc: '자연음이 가미된 앰비언트 공부 음악' },
    ],
    party: [
        { id: 'club', label: '🎉 클럽 파티', tag: 'club party, EDM drops, crowd energy, night club anthem', desc: '클럽 분위기의 파티 음악' },
        { id: 'pregame', label: '🍻 프리게임', tag: 'pregame party, hip-hop, hype, letting loose, fun vibes', desc: '파티 전 분위기를 달구는 음악' },
        { id: 'outdoor', label: '🌞 야외 파티', tag: 'outdoor party, tropical, festival, daylight, summer fun', desc: '야외 페스티벌 파티 음악' },
    ],
    romantic: [
        { id: 'classic_romantic', label: '🌹 클래식 로맨틱', tag: 'classic romantic, strings, candlelight dinner, timeless love', desc: '촛불 저녁식사 분위기의 로맨틱' },
        { id: 'modern_romantic', label: '💫 모던 로맨틱', tag: 'modern romantic, R&B influenced, intimate, first date vibes', desc: '현대적인 로맨틱 분위기' },
        { id: 'dreamy_romantic', label: '🌸 몽환 로맨틱', tag: 'dreamy romantic, soft synths, floating, fairytale love story', desc: '꿈같은 몽환적 로맨스' },
    ],
    melancholy: [
        { id: 'rainy', label: '🌧️ 비 오는 날', tag: 'rainy day, melancholic piano, introspective, alone with thoughts', desc: '비 오는 날의 감성' },
        { id: 'bittersweet', label: '🍂 쓸쓸한 가을', tag: 'bittersweet, autumn feeling, nostalgic, looking back at memories', desc: '가을 낙엽 같은 쓸쓸함' },
        { id: 'heartbreak', label: '💔 이별/상처', tag: 'heartbreak, breakup song, tears, raw emotional vocals', desc: '이별 후의 아픔을 담은 음악' },
    ],
    epic: [
        { id: 'trailer', label: '🎬 트레일러 뮤직', tag: 'trailer music, cinematic, massive orchestra, Hans Zimmer inspired', desc: '영화 트레일러 스타일의 웅장함' },
        { id: 'battle', label: '⚔️ 배틀/전투', tag: 'battle music, intense, percussion, war drums, victory charge', desc: '전투 장면 같은 격렬한 음악' },
        { id: 'heroic', label: '🦸 영웅/감동', tag: 'heroic epic, swelling strings, emotional climax, triumphant', desc: '영웅의 귀환 같은 감동적인 클라이맥스' },
    ],
    indiepop: [
        { id: 'dreampop', label: '🌙 드림 팝', tag: 'dream pop, reverb-washed guitars, hazy, ethereal vocals, shoegaze adjacent', desc: 'Beach House / Cocteau Twins 스타일의 몽환적인 드림팝' },
        { id: 'janglepop', label: '🎸 잰글 팝', tag: 'jangle pop, bright clean guitars, 80s indie, upbeat, breezy', desc: 'The Smiths / R.E.M. 스타일의 잰글 팝' },
        { id: 'bedroomindee', label: '🛏️ 베드룸 인디', tag: 'bedroom indie, DIY, lo-fi warmth, candid lyrics, home recording feel', desc: 'Clairo / Beabadoobee 스타일의 베드룸 인디팝' },
        { id: 'indiefolk', label: '🌿 인디 포크', tag: 'indie folk pop, acoustic guitar, warm, storytelling, Bon Iver adjacent', desc: '인디 감성의 포크 팝' },
        { id: 'synthindee', label: '🎹 신스 인디팝', tag: 'synth indie pop, catchy hooks, 80s synth influence, danceable yet indie', desc: '신시사이저가 가미된 댄서블한 인디팝' },
    ],
    ballad: [
        { id: 'piano_ballad', label: '🎹 피아노 발라드', tag: 'piano ballad, emotional piano, slow tempo, raw vocals, intimate', desc: '피아노가 메인인 서정적 발라드' },
        { id: 'power_ballad', label: '🔥 파워 발라드', tag: 'power ballad, big chorus, soaring vocals, dramatic crescendo, rock influenced', desc: 'Celine Dion / Whitney Houston 스타일의 파워 발라드' },
        { id: 'kballad', label: '🇰🇷 한국 발라드', tag: 'Korean ballad, heartfelt, emotional, melismatic vocals, bittersweet', desc: '김광석 / IU 스타일의 한국 감성 발라드' },
        { id: 'acoustic_ballad', label: '🎸 어쿠스틱 발라드', tag: 'acoustic ballad, guitar, stripped back, confessional, warm', desc: '어쿠스틱 기타 중심의 소박한 발라드' },
        { id: 'rnb_ballad', label: '💜 R&B 발라드', tag: 'R&B ballad, smooth, soulful, melismatic vocals, groovy slow jam', desc: '소울풀한 R&B 발라드' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// 🎤 추천 아티스트 맵 (장르별)
// ═══════════════════════════════════════════════════════════════
const RECOMMENDED_ARTISTS_MAP = {
    kpop: [
        { name: 'aespa', emoji: '🤖' },
        { name: '(G)I-DLE', emoji: '👊' },
        { name: 'BLACKPINK', emoji: '🖤' },
        { name: 'NewJeans', emoji: '💙' },
        { name: 'IVE', emoji: '✨' },
        { name: 'LE SSERAFIM', emoji: '🔥' },
        { name: 'BTS', emoji: '💜' },
        { name: 'Stray Kids', emoji: '⚡' },
        { name: 'TWICE', emoji: '💕' },
        { name: 'SEVENTEEN', emoji: '💎' },
        { name: 'Red Velvet', emoji: '🌹' },
        { name: 'EXO', emoji: '🌙' },
    ],
    khiphop: [
        { name: 'ZICO', emoji: '🎤' },
        { name: 'pH-1', emoji: '🎯' },
        { name: 'Loco', emoji: '🏃' },
        { name: 'Epik High', emoji: '📖' },
        { name: 'BewhY', emoji: '🌊' },
        { name: 'Dok2', emoji: '💎' },
        { name: 'Crush', emoji: '🎸' },
        { name: 'Dean', emoji: '🌙' },
        { name: 'Simon Dominic', emoji: '😎' },
    ],
    hiphop: [
        { name: 'Drake', emoji: '🦉' },
        { name: 'Kendrick Lamar', emoji: '✊' },
        { name: 'Travis Scott', emoji: '🌵' },
        { name: 'J. Cole', emoji: '📝' },
        { name: 'Future', emoji: '🔮' },
        { name: 'Lil Baby', emoji: '🚀' },
        { name: 'Tyler, the Creator', emoji: '🌈' },
        { name: 'Frank Ocean', emoji: '🌊' },
        { name: 'Playboi Carti', emoji: '👻' },
    ],
    edm: [
        { name: 'Martin Garrix', emoji: '🦊' },
        { name: 'Marshmello', emoji: '☁️' },
        { name: 'Flume', emoji: '🌊' },
        { name: 'Skrillex', emoji: '💥' },
        { name: 'Deadmau5', emoji: '🐭' },
        { name: 'Kygo', emoji: '🌅' },
        { name: 'Illenium', emoji: '💎' },
        { name: 'Said the Sky', emoji: '☁️' },
        { name: 'Porter Robinson', emoji: '🌸' },
    ],
    rnb: [
        { name: 'The Weeknd', emoji: '🌙' },
        { name: 'SZA', emoji: '🌿' },
        { name: 'H.E.R.', emoji: '💜' },
        { name: 'Jhené Aiko', emoji: '🌸' },
        { name: 'Daniel Caesar', emoji: '🍂' },
        { name: 'Brent Faiyaz', emoji: '🖤' },
        { name: 'Summer Walker', emoji: '☀️' },
        { name: 'PinkPantheress', emoji: '🩷' },
    ],
    pop: [
        { name: 'Taylor Swift', emoji: '✨' },
        { name: 'Billie Eilish', emoji: '🖤' },
        { name: 'Dua Lipa', emoji: '💃' },
        { name: 'Olivia Rodrigo', emoji: '💜' },
        { name: 'Sabrina Carpenter', emoji: '🍒' },
        { name: 'Charli XCX', emoji: '💥' },
        { name: 'Ariana Grande', emoji: '🌙' },
        { name: 'Harry Styles', emoji: '🌈' },
    ],
    jpop: [
        { name: 'Fujii Kaze', emoji: '🌸' },
        { name: 'Ado', emoji: '🎭' },
        { name: 'King Gnu', emoji: '👑' },
        { name: 'YOASOBI', emoji: '🌙' },
        { name: 'Kenshi Yonezu', emoji: '✨' },
        { name: 'Official HiGE DANdism', emoji: '🎩' },
        { name: 'Yorushika', emoji: '🌿' },
        { name: 'Eve', emoji: '🍎' },
    ],
    cpop: [
        { name: 'Jay Chou', emoji: '🎹' },
        { name: 'G.E.M.', emoji: '💎' },
        { name: 'Eason Chan', emoji: '🌟' },
        { name: 'Jolin Tsai', emoji: '💃' },
        { name: 'Joker Xue', emoji: '🃏' },
    ],
    afrobeats: [
        { name: 'Wizkid', emoji: '⭐' },
        { name: 'Burna Boy', emoji: '🔥' },
        { name: 'Davido', emoji: '🦁' },
        { name: 'Rema', emoji: '🌊' },
        { name: 'Tems', emoji: '🌿' },
        { name: 'Fireboy DML', emoji: '🎸' },
    ],
    latin: [
        { name: 'Bad Bunny', emoji: '🐰' },
        { name: 'J Balvin', emoji: '🌈' },
        { name: 'Rauw Alejandro', emoji: '🕺' },
        { name: 'Karol G', emoji: '💚' },
        { name: 'Rosalía', emoji: '🌹' },
        { name: 'Shakira', emoji: '💃' },
    ],
    rock: [
        { name: 'Arctic Monkeys', emoji: '🐒' },
        { name: 'Tame Impala', emoji: '🔮' },
        { name: 'The Strokes', emoji: '🎸' },
        { name: 'Radiohead', emoji: '🌀' },
        { name: 'Mitski', emoji: '🌸' },
        { name: 'Wet Leg', emoji: '🦅' },
    ],
    lofi: [
        { name: 'Joji', emoji: '🍂' },
        { name: 'mxmtoon', emoji: '🌙' },
        { name: 'beabadoobee', emoji: '✨' },
        { name: 'Rex Orange County', emoji: '🍊' },
        { name: 'Clairo', emoji: '🌿' },
    ],
    chillpop: [
        { name: 'Lana Del Rey', emoji: '🌙' },
        { name: 'Phoebe Bridgers', emoji: '🔭' },
        { name: 'Gracie Abrams', emoji: '🤍' },
        { name: 'boygenius', emoji: '⭐' },
        { name: 'girl in red', emoji: '🔴' },
    ],
    punjabi: [
        { name: 'AP Dhillon', emoji: '🔥' },
        { name: 'Sidhu Moosewala', emoji: '🦁' },
        { name: 'DIVINE', emoji: '🎤' },
        { name: 'Diljit Dosanjh', emoji: '💛' },
        { name: 'Karan Aujla', emoji: '⚡' },
    ],
    // 공통 — 범용
    ballad: [
        { name: 'IU', emoji: '🌙' },
        { name: 'Adele', emoji: '💔' },
        { name: 'Sam Smith', emoji: '🌹' },
        { name: 'Paul Kim', emoji: '🎹' },
        { name: 'Lim Chang-jung', emoji: '🌊' },
    ],
    phonk: [
        { name: 'Ghostemane', emoji: '👻' },
        { name: 'Night Lovell', emoji: '🌙' },
        { name: 'Sickboyrari', emoji: '🔪' },
        { name: 'Kordhell', emoji: '🚗' },
        { name: 'Floyymenor', emoji: '🔥' },
        { name: 'Dj Smokey', emoji: '💨' },
        { name: 'Mortis', emoji: '⚡' },
        { name: 'BURAK YETER', emoji: '🎵' },
    ],
    jazz: [
        { name: 'Miles Davis', emoji: '🎺' },
        { name: 'John Coltrane', emoji: '🎷' },
        { name: 'Herbie Hancock', emoji: '🎹' },
        { name: 'Norah Jones', emoji: '🌙' },
        { name: 'Diana Krall', emoji: '🎼' },
        { name: 'Chet Baker', emoji: '🌹' },
        { name: 'Bill Evans', emoji: '🍂' },
        { name: 'Esperanza Spalding', emoji: '✨' },
    ],
    classical: [
        { name: 'Hans Zimmer', emoji: '🎬' },
        { name: 'Ludovico Einaudi', emoji: '🎹' },
        { name: 'Yiruma', emoji: '🌸' },
        { name: 'Max Richter', emoji: '🌌' },
        { name: 'Ólafur Arnalds', emoji: '❄️' },
        { name: 'Johann Sebastian Bach', emoji: '🎻' },
        { name: 'Frédéric Chopin', emoji: '🌹' },
        { name: 'Philip Glass', emoji: '🔬' },
    ],
    acoustic: [
        { name: 'Ed Sheeran', emoji: '🎸' },
        { name: 'John Mayer', emoji: '🌊' },
        { name: 'Damien Rice', emoji: '🌧️' },
        { name: 'Iron & Wine', emoji: '🌿' },
        { name: 'Bon Iver', emoji: '❄️' },
        { name: 'Nick Drake', emoji: '🍂' },
        { name: 'James Taylor', emoji: '☀️' },
        { name: 'Sufjan Stevens', emoji: '🎄' },
    ],
    ambient: [
        { name: 'Brian Eno', emoji: '🎛️' },
        { name: 'Aphex Twin', emoji: '🌀' },
        { name: 'Ólafur Arnalds', emoji: '❄️' },
        { name: 'Bonobo', emoji: '🌴' },
        { name: 'Four Tet', emoji: '🌊' },
        { name: 'Tycho', emoji: '🌅' },
        { name: 'Nils Frahm', emoji: '🎹' },
    ],
    trot: [
        { name: '임영웅', emoji: '⭐' },
        { name: '나훈아', emoji: '🎤' },
        { name: '조용필', emoji: '🌸' },
        { name: '송가인', emoji: '🌺' },
        { name: '장윤정', emoji: '💕' },
        { name: '이찬원', emoji: '🎵' },
        { name: '영탁', emoji: '🎶' },
        { name: '진해성', emoji: '🌊' },
    ],
    kindie: [
        { name: '혁오', emoji: '🎸' },
        { name: '잔나비', emoji: '🌿' },
        { name: '새소년', emoji: '🌸' },
        { name: '검정치마', emoji: '🖤' },
        { name: '실리카겔', emoji: '💎' },
        { name: '한로로', emoji: '🌙' },
        { name: '볼빨간사춘기', emoji: '🍑' },
        { name: '10cm', emoji: '🎵' },
    ],
    citypop: [
        { name: '야마시타 타츠로', emoji: '🌃' },
        { name: 'Mariya Takeuchi', emoji: '🌸' },
        { name: 'Anri', emoji: '☀️' },
        { name: 'Tatsuro Yamashita', emoji: '🎸' },
        { name: '허성현', emoji: '🌆' },
        { name: 'Junko Ohashi', emoji: '🌺' },
        { name: 'Miki Matsubara', emoji: '💿' },
    ],
    anisong: [
        { name: 'LiSA', emoji: '🔥' },
        { name: 'Aimer', emoji: '🌙' },
        { name: 'YOASOBI', emoji: '✨' },
        { name: 'Hiroyuki Sawano', emoji: '⚔️' },
        { name: 'FictionJunction', emoji: '🌸' },
        { name: 'Myth & Roid', emoji: '🌌' },
        { name: 'OP/ED Masters', emoji: '🎌' },
        { name: 'man with a mission', emoji: '🐺' },
    ],
    jrock: [
        { name: 'X Japan', emoji: '💄' },
        { name: 'ONE OK ROCK', emoji: '🎸' },
        { name: 'RADWIMPS', emoji: '🌸' },
        { name: 'Buck-Tick', emoji: '🖤' },
        { name: 'Dir en grey', emoji: '🔴' },
        { name: 'Maximum the Hormone', emoji: '⚡' },
        { name: 'BUCK-TICK', emoji: '🌙' },
        { name: 'Glay', emoji: '❄️' },
    ],
    bollywood: [
        { name: 'A.R. Rahman', emoji: '🎵' },
        { name: 'Pritam', emoji: '🎼' },
        { name: 'Arijit Singh', emoji: '🌹' },
        { name: 'Shreya Ghoshal', emoji: '💫' },
        { name: 'Vishal-Shekhar', emoji: '🎸' },
        { name: 'Shankar Mahadevan', emoji: '🎤' },
        { name: 'Sonu Nigam', emoji: '🌊' },
    ],
    bhangra: [
        { name: 'Diljit Dosanjh', emoji: '🌟' },
        { name: 'Guru Randhawa', emoji: '🎵' },
        { name: 'Badshah', emoji: '👑' },
        { name: 'Hardy Sandhu', emoji: '💫' },
        { name: 'Gippy Grewal', emoji: '🌾' },
        { name: 'Jazzy B', emoji: '🎤' },
        { name: 'Panjabi MC', emoji: '🥁' },
    ],
    punjabihiphop: [
        { name: 'Sidhu Moosewala', emoji: '🌾' },
        { name: 'AP Dhillon', emoji: '🎵' },
        { name: 'Shubh', emoji: '💫' },
        { name: 'Karan Aujla', emoji: '⚡' },
        { name: 'Sunny Malton', emoji: '🎤' },
        { name: 'Bohemia', emoji: '🔥' },
        { name: 'Amrit Maan', emoji: '🌟' },
    ],
    indianclassical: [
        { name: 'Ravi Shankar', emoji: '🪘' },
        { name: 'Zakir Hussain', emoji: '🥁' },
        { name: 'Hariprasad Chaurasia', emoji: '🪈' },
        { name: 'Bismillah Khan', emoji: '🎵' },
        { name: 'M.S. Subbulakshmi', emoji: '🌺' },
    ],
    samba: [
        { name: 'Jorge Ben Jor', emoji: '🌴' },
        { name: 'Seu Jorge', emoji: '🎸' },
        { name: 'Beth Carvalho', emoji: '🌺' },
        { name: 'Martinho da Vila', emoji: '🥁' },
        { name: 'Zeca Pagodinho', emoji: '🍺' },
    ],
    bossanova: [
        { name: 'João Gilberto', emoji: '🌺' },
        { name: 'Antônio Carlos Jobim', emoji: '🎹' },
        { name: 'Astrud Gilberto', emoji: '☀️' },
        { name: 'Stan Getz', emoji: '🎷' },
        { name: 'Caetano Veloso', emoji: '🌿' },
    ],
    bailefunk: [
        { name: 'Anitta', emoji: '💃' },
        { name: 'MC Fioti', emoji: '🔊' },
        { name: 'Kevinho', emoji: '🔥' },
        { name: 'Ludmilla', emoji: '🌟' },
        { name: 'MC Lan', emoji: '💦' },
    ],
    reggaeton: [
        { name: 'Bad Bunny', emoji: '🐰' },
        { name: 'J Balvin', emoji: '🌈' },
        { name: 'Daddy Yankee', emoji: '👑' },
        { name: 'Ozuna', emoji: '🌙' },
        { name: 'Maluma', emoji: '🌺' },
        { name: 'Rauw Alejandro', emoji: '🔥' },
        { name: 'Farruko', emoji: '⭐' },
    ],
    salsa: [
        { name: 'Marc Anthony', emoji: '🎺' },
        { name: 'Celia Cruz', emoji: '👑' },
        { name: 'Rubén Blades', emoji: '🌿' },
        { name: 'Willie Colón', emoji: '🎵' },
        { name: 'Víctor Manuelle', emoji: '🌹' },
    ],
    latin_pop: [
        { name: 'Shakira', emoji: '💃' },
        { name: 'Ricky Martin', emoji: '🌴' },
        { name: 'Rosalía', emoji: '💃' },
        { name: 'Enrique Iglesias', emoji: '❤️' },
        { name: 'Camilo', emoji: '🌸' },
        { name: 'Sebastián Yatra', emoji: '🌊' },
        { name: 'Becky G', emoji: '⚡' },
    ],
    amapiano: [
        { name: 'Kabza De Small', emoji: '🥁' },
        { name: 'DJ Maphorisa', emoji: '🎵' },
        { name: 'Focalistic', emoji: '🔥' },
        { name: 'Langa Mavuthela', emoji: '✨' },
        { name: 'Young Stunna', emoji: '⭐' },
        { name: 'Boohle', emoji: '🎤' },
    ],
    arabpop: [
        { name: 'Amr Diab', emoji: '🌙' },
        { name: 'Nancy Ajram', emoji: '🌺' },
        { name: 'Mohamed Hamaki', emoji: '🎵' },
        { name: 'Elissa', emoji: '💫' },
        { name: 'Haifa Wehbe', emoji: '⭐' },
        { name: 'Tamer Hosny', emoji: '🌊' },
    ],
    frenchpop: [
        { name: 'Édith Piaf', emoji: '🥐' },
        { name: 'Serge Gainsbourg', emoji: '🎵' },
        { name: 'Charlotte Gainsbourg', emoji: '🌸' },
        { name: 'Daft Punk', emoji: '🏠' },
        { name: 'Angèle', emoji: '💫' },
        { name: 'Stromae', emoji: '🎤' },
        { name: 'Aya Nakamura', emoji: '✨' },
    ],
    europop: [
        { name: 'ABBA', emoji: '❄️' },
        { name: 'Ace of Base', emoji: '💃' },
        { name: 'Aqua', emoji: '🌊' },
        { name: 'Robyn', emoji: '🌟' },
        { name: 'Zara Larsson', emoji: '✨' },
        { name: 'Sigrid', emoji: '❄️' },
        { name: 'Loreen', emoji: '💫' },
    ],
    pop: [
        { name: 'Taylor Swift', emoji: '✨' },
        { name: 'Harry Styles', emoji: '🌈' },
        { name: 'Dua Lipa', emoji: '💃' },
        { name: 'Olivia Rodrigo', emoji: '💜' },
        { name: 'Ed Sheeran', emoji: '🎸' },
        { name: 'Ariana Grande', emoji: '🌙' },
        { name: 'Sabrina Carpenter', emoji: '🍒' },
        { name: 'Billie Eilish', emoji: '🖤' },
    ],
    indiepop: [
        { name: 'Clairo', emoji: '🌿' },
        { name: 'Beabadoobee', emoji: '✨' },
        { name: 'Rex Orange County', emoji: '🍊' },
        { name: 'Phoebe Bridgers', emoji: '🔭' },
        { name: 'Snail Mail', emoji: '🐌' },
        { name: 'Japanese Breakfast', emoji: '🌸' },
        { name: 'girl in red', emoji: '🔴' },
        { name: 'Beach House', emoji: '🌊' },
    ],
    dawn: [
        { name: 'Bon Iver', emoji: '❄️' },
        { name: 'Sufjan Stevens', emoji: '🌤️' },
        { name: 'Nils Frahm', emoji: '🎹' },
        { name: 'Ólafur Arnalds', emoji: '🌅' },
        { name: 'The xx', emoji: '🌙' },
    ],
    running: [
        { name: 'Eminem', emoji: '🏃' },
        { name: 'Kanye West', emoji: '🔥' },
        { name: 'The Prodigy', emoji: '⚡' },
        { name: 'Skrillex', emoji: '💥' },
        { name: 'Rage Against the Machine', emoji: '✊' },
    ],
    cafe: [
        { name: 'Norah Jones', emoji: '☕' },
        { name: 'Jack Johnson', emoji: '🌊' },
        { name: 'Ben Harper', emoji: '🌿' },
        { name: 'Melody Gardot', emoji: '🎷' },
        { name: 'Corinne Bailey Rae', emoji: '🌸' },
    ],
    night_drive: [
        { name: 'The Weeknd', emoji: '🌙' },
        { name: 'Kavinsky', emoji: '🚗' },
        { name: 'Gesaffelstein', emoji: '🖤' },
        { name: 'FM-84', emoji: '💫' },
        { name: 'Perturbator', emoji: '🌆' },
        { name: 'Gunship', emoji: '🎮' },
    ],
    study: [
        { name: 'Ludovico Einaudi', emoji: '📚' },
        { name: 'Lofi Girl', emoji: '🎵' },
        { name: 'ChilledCow', emoji: '☕' },
        { name: 'Yiruma', emoji: '🎹' },
        { name: 'Nujabes', emoji: '🌸' },
    ],
    party: [
        { name: 'David Guetta', emoji: '🎉' },
        { name: 'The Chainsmokers', emoji: '🍻' },
        { name: 'Calvin Harris', emoji: '🌞' },
        { name: 'Tiësto', emoji: '💃' },
        { name: 'Martin Garrix', emoji: '🔊' },
        { name: 'Drake', emoji: '👑' },
    ],
    romantic: [
        { name: 'John Legend', emoji: '🌹' },
        { name: 'Michael Bublé', emoji: '💫' },
        { name: 'Frank Sinatra', emoji: '🎩' },
        { name: 'Ed Sheeran', emoji: '💕' },
        { name: 'Adele', emoji: '❤️' },
        { name: 'Nat King Cole', emoji: '🎹' },
    ],
    melancholy: [
        { name: 'Radiohead', emoji: '🌧️' },
        { name: 'Elliott Smith', emoji: '🍂' },
        { name: 'Joy Division', emoji: '💔' },
        { name: 'Phoebe Bridgers', emoji: '🌙' },
        { name: 'Sufjan Stevens', emoji: '❄️' },
        { name: 'Bon Iver', emoji: '🌿' },
    ],
    epic: [
        { name: 'Hans Zimmer', emoji: '🎬' },
        { name: 'John Williams', emoji: '🎻' },
        { name: 'Two Steps From Hell', emoji: '⚔️' },
        { name: 'Audiomachine', emoji: '🔥' },
        { name: 'Ramin Djawadi', emoji: '🐉' },
        { name: 'Man with a Mission', emoji: '🦸' },
    ],
};



// ═══════════════════════════════════════════════════════════════

/**
 * Suno AI 최적화 프롬프트 생성 함수
 * @param {string} country - 타겟 국가 코드
 * @param {string} genre - 음악 장르 코드
 * @param {string} mood - 무드/분위기 코드
 * @param {string} tempo - 템포 (slow/medium/fast)
 * @param {string} vocal - 보컬 타입 (auto/male/female/duet/husky/choir)
 * @param {string} structure - 곡 구조 (standard/short/intro/outro)
 * @param {string} creativity - 창의성 (normal/creative/crazy)
 * @param {string} themeText - 커스텀 가사 주제 텍스트
 * @returns {object} 생성된 프롬프트 및 메타데이터
 */
function generateSunoPrompt(country, genre, mood, tempo, vocal = 'auto', structure = 'standard', creativity = 'normal', themeText = '', vocalLang = 'auto', subStyles = [], refArtist = '') {
    const countryData = COUNTRY_STYLES[country];
    const genreData = GENRE_MAP[genre];
    const moodData = MOOD_MAP[mood];

    // 신규 옵션 맵핑
    const vocalData = VOCAL_MAP[vocal] || VOCAL_MAP.auto;
    const structureData = STRUCTURE_MAP[structure] || STRUCTURE_MAP.standard;
    const vocalLangData = VOCAL_LANG_MAP[vocalLang] || VOCAL_LANG_MAP.auto;

    if (!countryData || !genreData || !moodData) {
        throw new Error('Invalid parameters provided');
    }

    // 템포 매핑
    const tempoMap = {
        very_slow: { label: 'Very Slow', bpm: '50-70', desc: 'extremely slow pace' },
        slow: { label: 'Slow', bpm: '60-80', desc: 'slow tempo' },
        medium: { label: 'Medium', bpm: '90-110', desc: 'moderate tempo' },
        fast: { label: 'Fast', bpm: '120-140', desc: 'fast tempo' },
        very_fast: { label: 'Very Fast', bpm: '140-170', desc: 'high-octane energy' }
    };
    const tempoData = tempoMap[tempo] || tempoMap.medium;

    // 🎨 창의성(Creativity) 로직 적용
    let selectedInstruments = shuffleArray(countryData.instruments).slice(0, 2);
    let selectedScale = countryData.scales[Math.floor(Math.random() * countryData.scales.length)];
    let selectedVibe = countryData.vibes[Math.floor(Math.random() * countryData.vibes.length)];
    let selectedGenreTags = genreData.tags.slice(0, 2);

    if (creativity === 'crazy') {
        const allCountries = Object.values(COUNTRY_STYLES);
        const randomCountry = allCountries[Math.floor(Math.random() * allCountries.length)];
        // 짬뽕 모드: 타 국가 악기 강제 주입
        selectedInstruments = [countryData.instruments[0], randomCountry.instruments[0]];
        // 짬뽕 모드: 타 국가 스케일 강제 주입
        selectedScale = randomCountry.scales[0];

        const allGenres = Object.values(GENRE_MAP);
        const randomGenre = allGenres[Math.floor(Math.random() * allGenres.length)];
        selectedGenreTags = [genreData.tags[0], randomGenre.tags[0] + ' fusion'];
    }

    // ═══ Style of Music 프롬프트 조합 (Suno AI 200자 제한 준수) ═══
    const styleParts = [
        ...selectedGenreTags,                 // 장르 태그 2개
        selectedVibe,                         // 국가 바이브 1개
        moodData.tags[0],                     // 무드 태그 1개
        `${tempoData.label} tempo`,           // 템포
        `${selectedInstruments.join(', ')}`,  // 악기 2개
        selectedScale                         // 스케일
    ];

    // 보컬 옵션이 자동이 아니면 추가
    if (vocalData.tag) {
        styleParts.unshift(vocalData.tag); // 보컬은 가장 중요하므로 맨 앞으로
    }

    // 보컬 언어 태그 추가
    if (vocalLangData.tag) {
        styleParts.unshift(vocalLangData.tag);
    }

    // 서브스타일 태그 추가 (선택된 것들만)
    if (subStyles && subStyles.length > 0) {
        const subStylesList = SUBSTYLE_MAP[genre] || [];
        const selectedSubTags = subStyles
            .map(id => subStylesList.find(s => s.id === id))
            .filter(Boolean)
            .map(s => s.tag);
        // 맨 앞에 삽입 (가장 중요한 스타일이므로)
        styleParts.unshift(...selectedSubTags.slice(0, 2));
    }

    // 레퍼런스 아티스트 태그 추가
    if (refArtist && refArtist.trim()) {
        styleParts.push(`in the style of ${refArtist.trim()}`);
    }

    // 200자 제한에 맞게 트리밍
    let styleOfMusic = styleParts.join(', ');
    if (styleOfMusic.length > 198) {
        styleOfMusic = styleOfMusic.substring(0, 198).replace(/,\s*$/, '');
    }

    // ═══ 가사 주제(Lyrics Theme) 설정 ═══
    let lyricsThemeTxt = themeText.trim();
    if (!lyricsThemeTxt) {
        // ✨ 다이나믹 가사 프롬프트 생성 (매번 동일 조건이어도 다른 내용이 나오도록)
        const timeOfDay = ['at midnight', 'during a golden sunset', 'in the early morning mist', 'under a neon-lit sky', 'on a rainy afternoon'];
        const characters = ['a lone wanderer', 'two star-crossed lovers', 'a passionate dreamer', 'someone seeking peace', 'a rebel with a cause'];
        const actions = ['finding hidden beauty', 'letting go of the past', 'racing towards the future', 'reflecting on memories', 'embracing the chaos'];

        const rdTime = timeOfDay[Math.floor(Math.random() * timeOfDay.length)];
        const rdChar = characters[Math.floor(Math.random() * characters.length)];
        const rdAct = actions[Math.floor(Math.random() * actions.length)];

        // 키워드 조합으로 그럴듯한 스토리라인/프롬프트 생성
        lyricsThemeTxt = `A story about ${rdChar} in ${countryData.name} ${rdTime}, ${rdAct}. Vibe: ${selectedVibe}. Mood: ${moodData.description}.${refArtist ? ` Inspired by the artistry of ${refArtist}.` : ''
            }`;
    } else if (refArtist && refArtist.trim()) {
        // 테마가 있어도 레퍼런스 아티스트는 언급
        lyricsThemeTxt = `${themeText.trim()} (Inspired by ${refArtist.trim()}'s style.)`;
    }

    // ═══ 메타태그 형식 포맷팅 ═══
    const metaTags = {
        genre: selectedGenreTags.join(', '),
        mood: moodData.tags.slice(0, 3).join(', '),
        instruments: selectedInstruments.join(', '),
        tempo: `${tempoData.label} (${tempoData.bpm} BPM)`,
        region: `${countryData.name} (${countryData.flag})`,
        scale: selectedScale,
        vocal: vocalData.label,
        structure: structureData.label
    };

    return {
        prompt: styleOfMusic,
        metaTags,
        titleSuggestions: generateTitleSuggestions(countryData, genreData, moodData),
        fullPrompt: {
            styleOfMusic,
            lyricsTheme: lyricsThemeTxt,
            lyricsStructure: structureData.structure,
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
// 🎵 Mureka AI API (MCP 연동)
// ═══════════════════════════════════════════════════════════════
async function callMurekaAPI(prompt, titleSuggestion, murekaKey) {
    if (!murekaKey) throw new Error('Mureka API 키가 제공되지 않았습니다.');

    // CommonJS 환경이므로 동적 import 사용
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

    const transport = new StdioClientTransport({
        command: "uvx", // Python 환경 (uv 모듈) 필요
        args: ["mureka-mcp"],
        env: {
            ...process.env,
            MUREKA_API_KEY: murekaKey
        }
    });

    const mcpClient = new Client(
        { name: "Global-Plly-Master", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    try {
        await mcpClient.connect(transport);

        const result = await mcpClient.callTool({
            name: "generate_song",
            arguments: {
                prompt: prompt,
                title: titleSuggestion || "Mureka Track"
            }
        });

        await mcpClient.close();

        return {
            success: true,
            data: {
                id: `mureka_${Date.now()}`,
                title: titleSuggestion || 'Mureka Track',
                audioUrl: null, // 추후 API 결과가 내려오면 추출하게끔 처리
                coverUrl: null,
                duration: '3:00',
                prompt: prompt,
                status: 'mureka_mode',
                message: '🎵 Mureka AI 생성 결과: ' + (result.content && result.content[0] ? result.content[0].text : JSON.stringify(result)),
                raw: result
            }
        };
    } catch (e) {
        console.error("Mureka 호출 에러:", e);
        throw new Error("Mureka AI 호출 중 오류가 발생했습니다: " + e.message);
    }
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
// � 인증 미들웨어
// ═══════════════════════════════════════════════════════════════

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '로그인이 필요합니다.', code: 'NO_TOKEN' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ success: false, message: '인증 정보가 올바르지 않습니다. 다시 로그인해주세요.', code: 'INVALID_TOKEN' });
    }
}

function verifyAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        next();
    });
}

// ─────────────────── 토큰 유효성 검증 (Auth Guard용) ───────────────────
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// ─────────────────── Gemini AI 연결 상태 확인 ───────────────────
app.get('/api/gemini-status', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_Gemini_API_키를_붙여넣으세요') {
            return res.json({ connected: false, model: null, reason: 'API Key not configured' });
        }
        // 키 존재 여부만 확인 (실제 API 호출 없이 빠르게 응답)
        return res.json({ connected: true, model: GEMINI_MODEL });
    } catch (err) {
        return res.json({ connected: false, model: GEMINI_MODEL, reason: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// �🛣️ API 라우터
// ═══════════════════════════════════════════════════════════════

// 메인 페이지 (로그인 체크는 프론트엔드에서)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로그인 페이지
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 관리자 페이지
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 강제 로그아웃 (localStorage 초기화 + 로그인 페이지로 이동)
app.get('/logout', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>로그아웃</title></head><body style="background:#0a0a0f;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:white;">
    <div style="text-align:center"><p style="font-size:20px">🔐 로그아웃 중...</p></div>
    <script>
      localStorage.removeItem('gpm_token');
      localStorage.removeItem('gpm_role');
      localStorage.removeItem('gpm_username');
      localStorage.removeItem('gpm_realname');
      setTimeout(() => { window.location.href = '/login.html'; }, 500);
    </script></body></html>`);
});

// ─────────────────── 비밀번호 변경 ───────────────────
app.post('/api/auth/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!currentPassword || !newPassword)
            return res.status(400).json({ success: false, message: '모든 항목을 입력해주세요.' });
        if (newPassword.length < 6)
            return res.status(400).json({ success: false, message: '새 비밀번호는 6자 이상이어야 합니다.' });

        // 관리자 계정은 Vercel 환경변수로만 변경 가능
        if (userRole === 'admin' || userId === 'admin') {
            return res.status(403).json({ success: false, message: '관리자 비밀번호는 Vercel 환경변수(ADMIN_PASSWORD)에서 변경해주세요.' });
        }

        // DB에서 사용자 조회
        const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

        // 현재 비밀번호 검증
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) return res.status(401).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' });

        // 새 비밀번호로 업데이트
        const newHash = await bcrypt.hash(newPassword, 12);
        const { error: updateError } = await supabase.from('users').update({ password_hash: newHash }).eq('id', userId);
        if (updateError) throw updateError;

        res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (e) {
        res.status(500).json({ success: false, message: '서버 오류: ' + e.message });
    }
});

// ─────────────────── 회원가입 신청 ───────────────────
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, realName } = req.body;
        if (!username || !password || !realName)
            return res.status(400).json({ success: false, message: '모든 항목을 입력해주세요.' });
        if (username.length < 4)
            return res.status(400).json({ success: false, message: '아이디는 4자 이상이어야 합니다.' });
        if (password.length < 6)
            return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });

        // 중복 체크
        const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
        if (existing) return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });

        const passwordHash = await bcrypt.hash(password, 12);
        const { error } = await supabase.from('users').insert([{
            username, password_hash: passwordHash, real_name: realName, role: 'pending'
        }]);
        if (error) throw error;

        res.json({ success: true, message: '가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.' });
    } catch (e) {
        res.status(500).json({ success: false, message: '서버 오류: ' + e.message });
    }
});

// ─────────────────── 로그인 ───────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });

        // 관리자 계정 체크 (Supabase 없이도 동작)
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ id: 'admin', username: ADMIN_USERNAME, role: 'admin', realName: '관리자' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, role: 'admin', username: ADMIN_USERNAME, realName: '관리자' });
        }

        // 일반 사용자 체크
        const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
        if (error || !user) return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });

        if (user.role === 'pending')
            return res.status(403).json({ success: false, status: 'pending', message: '⏳ 아직 관리자 승인 대기 중입니다. 승인 후 로그인하실 수 있습니다.' });
        if (user.role === 'rejected')
            return res.status(403).json({ success: false, message: '❌ 가입 신청이 거절되었습니다. 관리자에게 문의해주세요.' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, realName: user.real_name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, role: user.role, username: user.username, realName: user.real_name });
    } catch (e) {
        res.status(500).json({ success: false, message: '서버 오류: ' + e.message });
    }
});

// ─────────────────── 관리자: 전체 회원 조회 ───────────────────
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('id, username, real_name, role, created_at, approved_at').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─────────────────── 관리자: 통계 ───────────────────
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const [usersRes, promptsRes] = await Promise.all([
            supabase.from('users').select('role'),
            supabase.from('prompt_history').select('id', { count: 'exact', head: true })
        ]);
        const users = usersRes.data || [];
        const pending = users.filter(u => u.role === 'pending').length;
        const active = users.filter(u => u.role === 'user' || u.role === 'admin').length;
        res.json({ success: true, data: { pending, active, total: users.length, prompts: promptsRes.count || 0 } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─────────────────── 관리자: 승인 ───────────────────
app.put('/api/admin/users/:id/approve', verifyAdmin, async (req, res) => {
    try {
        const { error } = await supabase.from('users').update({ role: 'user', approved_at: new Date().toISOString(), approved_by: req.user.username }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: '승인 완료' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─────────────────── 관리자: 거절 ───────────────────
app.put('/api/admin/users/:id/reject', verifyAdmin, async (req, res) => {
    try {
        const { error } = await supabase.from('users').update({ role: 'rejected' }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: '거절 처리 완료' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
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
        const { country, genre, mood, tempo, vocal, structure, creativity, themeText, vocalLang, subStyles, refArtist } = req.body;

        if (!country || !genre || !mood || !tempo) {
            return res.status(400).json({
                success: false,
                error: '모든 파라미터를 입력해 주세요'
            });
        }

        // 1단계: 프롬프트 기본 생성
        let promptResult = generateSunoPrompt(country, genre, mood, tempo, vocal, structure, creativity, themeText, vocalLang, subStyles || [], refArtist || '');

        //  Gemini API Key가 있다면, Gemini를 사용해 '작사' 및 '곡 스타일' 리라이팅
        const { apiKey, aiModel, murekaKey, aiEngine } = req.body;
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: apiKey });
                const subStylesList = SUBSTYLE_MAP[genre] || [];
                const selectedSubStyleLabels = (subStyles || [])
                    .map(id => subStylesList.find(s => s.id === id)?.label)
                    .filter(Boolean).join(', ');

                const promptText = `
                당신은 Suno AI로 전 세계 차트를 석권하는 히트곡을 만드는 천재 프롬프트 엔지니어이자 작사가입니다.
                다음 사용자 설정에 맞춰 JSON 데이터를 생성하세요.

                [입력 정보]
                국가: ${COUNTRY_STYLES[country]?.name}
                장르: ${GENRE_MAP[genre]?.name}
                분위기: ${MOOD_MAP[mood]?.name}
                속도: ${tempo}
                보컬: ${vocal}
                구조: ${structure}
                가사 언어: ${VOCAL_LANG_MAP[vocalLang]?.label || '자동 (국가 맞춤)'} — 반드시 이 언어로 가사 스타일을 맞출 것
                ${selectedSubStyleLabels ? `선택된 서브스타일/분위기 태그: ${selectedSubStyleLabels} — 이 스타일을 핵심으로 반영할 것` : ''}
                ${refArtist ? `레퍼런스 아티스트: ${refArtist} — 이 아티스트의 음악 제작 방식, 보컬 스타일, 프로덕션 방식을 참고할 것` : ''}
                사용자 추가 테마: ${themeText || '없음, 창의적으로 생성할 것'}
                
                [Suno AI의 특성]
                - 'Style of Music' 필드는 음악의 장르, 악기, 분위기를 콤마(,)로 나열하며, 200자를 초과하면 안 됩니다! 
                - 가사 테마(Lyrics Theme)는 곡의 전체 스토리나 상황극 설정 등을 매혹적으로 서술형으로 표현합니다.
                - 서브스타일과 레퍼런스 아티스트 정보를 최대한 활용하여 구체적이고 세밀한 프롬프트를 만드세요.

                아래 JSON 포맷을 정확히 유지하여 응답하세요 (마크다운 백틱 없이):
                {
                    "styleOfMusic": "콤마로 구분된 200자 이내의 영어 Suno AI 프롬프트. 반드시 맨 앞에 가사 언어 태그(예: Korean lyrics, English lyrics 등)를 포함시킬 것. 예시: 'Korean lyrics, girl crush, fierce female energy, dark K-pop, 128bpm...'",
                    "titleSuggestion": "이 곡에 어울리는 추천 제목 1개",
                    "lyricsTheme": "영어 문장으로 된 멋진 곡 주제 / 배경 설명 (2~3문장, 서브스타일과 레퍼런스 아티스트 느낌 반영)"
                }
                `;
                const response = await ai.models.generateContent({
                    model: aiModel || 'gemini-3.1-pro-preview',
                    contents: promptText,
                    config: { responseMimeType: 'application/json' }
                });

                let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(text);

                // 덮어쓰기
                if (parsed.styleOfMusic) promptResult.prompt = parsed.styleOfMusic.substring(0, 198);
                if (parsed.titleSuggestion) promptResult.titleSuggestions = [parsed.titleSuggestion];
                if (parsed.lyricsTheme) promptResult.fullPrompt.lyricsTheme = parsed.lyricsTheme;

                // ✅ 언어 태그 강제 보정 — Gemini가 누락한 경우에도 반드시 반영
                const vocalLangDataFixed = VOCAL_LANG_MAP[vocalLang] || VOCAL_LANG_MAP.auto;
                if (vocalLangDataFixed.tag && !promptResult.prompt.toLowerCase().includes(vocalLangDataFixed.tag.toLowerCase())) {
                    const tagPrefix = vocalLangDataFixed.tag + ', ';
                    promptResult.prompt = (tagPrefix + promptResult.prompt).substring(0, 198);
                }

                promptResult.fullPrompt.styleOfMusic = promptResult.prompt;

            } catch (geminiError) {
                console.error("Gemini Music Prompt failed, falling back:", geminiError);
            }
        }

        // 2단계: 음악 생성 API 호출 (선택된 AI 엔진에 따라 분기)
        let musicResult;
        if (aiEngine === 'mureka' && murekaKey) {
            // Mureka는 테마/스토리 위주의 프롬프트를 더 잘 이해합니다.
            const murekaPrompt = promptResult.fullPrompt.lyricsTheme || promptResult.prompt;
            musicResult = await callMurekaAPI(murekaPrompt, promptResult.titleSuggestions[0], murekaKey);
        } else {
            // Suno AI (또는 데모 시뮬레이션)
            musicResult = await callSunoAPI(
                promptResult.prompt,
                promptResult.titleSuggestions[0]
            );
        }

        // 3단계: Supabase DB에 이력 저장 (비동기로 실행하여 응답 지연 방지)
        if (supabase) {
            const { data, error } = await supabase.from('prompt_history').insert([{
                country,
                genre,
                mood,
                tempo,
                prompt: promptResult.prompt,
                title: promptResult.titleSuggestions[0],
                lyrics_theme: promptResult.fullPrompt.lyricsTheme,
                suggested_language: promptResult.fullPrompt.suggestedLanguage,
                meta_tags: promptResult.metaTags,
                user_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
            }]);

            if (error) {
                console.error('Supabase Save Error:', error.message);
            } else {
                console.log('✅ Supabase: Prompt history saved successfully.');
            }
        }

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

// ═══════════════════════════════════════════════════════════════
// 🔐 POST /api/generate-prompts
// 서버사이드 Gemini AI 호출 — API 키는 절대 클라이언트에 노출되지 않음
// 사용 모델: gemini-3.1-flash-lite-preview
// ═══════════════════════════════════════════════════════════════
app.post('/api/generate-prompts', verifyToken, async (req, res) => {
    try {
        // ── API 키 확인 ──
        if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_Gemini_API_키를_붙여넣으세요') {
            return res.status(503).json({
                success: false,
                error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다. 관리자에게 문의하세요.'
            });
        }

        const { country, genre, mood, tempo, vocal, structure, vocalLang, subStyles, refArtist, themeText, count, customLyrics, customStyle } = req.body;
        const promptCount = (count === 1) ? 1 : 10;

        if (!country || !genre || !mood || !tempo) {
            return res.status(400).json({
                success: false,
                error: '국가, 장르, 무드, 템포는 필수 항목입니다.'
            });
        }

        // ── 데이터 사전에서 레이블 조회 ──
        const countryInfo   = COUNTRY_STYLES[country]   || { name: country };
        const genreInfo     = GENRE_MAP[genre]           || { name: genre, tags: [genre], bpm: tempo, style: '' };
        const moodInfo      = MOOD_MAP[mood]             || { name: mood, tags: [mood], description: '' };
        const vocalLangInfo = VOCAL_LANG_MAP[vocalLang]  || { label: '자동', tag: '' };

        // 서브스타일 레이블 수집
        const subStyleList   = SUBSTYLE_MAP[genre] || [];
        const subStyleLabels = (subStyles || [])
            .map(id => subStyleList.find(s => s.id === id)?.label)
            .filter(Boolean).join(', ');

        // ── 시스템 프롬프트 (Suno AI V5 최적화 — NotebookLM 핵심 원칙 반영) ──
        const systemPrompt = `You are an elite Suno AI V5 prompt engineer. Your prompts consistently go viral.
Your ONLY output is a valid JSON array with EXACTLY 10 objects. No markdown, no explanation, no extra text.

Output format (strict):
[
  {"prompt": "<V5-optimized style prompt, max 220 chars, English only>", "title": "<creative song title in the target language>", "lyrics": "<Full song lyrics including [Intro], [Verse], [Chorus], and [Outro] in the target language>"},
  ...
]

=== V5 PROMPT FORMULA (apply to EVERY prompt) ===
Structure each prompt using this 7-step director format:
1. GENRE: Specific sub-genre (e.g. "dark indie folk", "melodic trap", "city pop revival")
2. BPM & KEY: Always include exact BPM and musical key (e.g. "92 BPM, F Minor", "128 BPM, A Major")
3. MOOD & ENERGY: 1-2 precise emotional descriptors (e.g. "melancholic longing", "euphoric rush")
4. INSTRUMENTS: Specific instrument names — NOT generic (e.g. "fingerpicked acoustic guitar, lo-fi electric piano, subtle vinyl crackle" NOT "guitar, piano")
5. VOCAL STYLE: Gender + tone + technique (e.g. "breathy female vocals, soft falsetto", "gritty male baritone, ad-libs")
6. ERA & PRODUCTION: Sonic texture and mix vibe (e.g. "late 90s nostalgia, warm analog tape saturation", "2024 hyperpop production, crystal clear mix")
7. NARRATIVE (optional but powerful): 1 short evocative phrase in quotes (e.g. "like watching rain on a neon-lit window")

=== 10-PROMPT ENERGY SPECTRUM (mandatory distribution) ===
- Prompts 1-3: SOFT / WARM (intimate, acoustic, gentle)
- Prompts 4-6: MID ENERGY (groovy, balanced, melodic)  
- Prompts 7-9: INTENSE / PEAK (aggressive, euphoric, powerful)
- Prompt 10: EXPERIMENTAL / UNIQUE (unexpected fusion or avant-garde twist)

=== CRITICAL RULES ===
- ALWAYS include exact BPM and key (this is the #1 V5 improvement)
- Use SPECIFIC instrument names, never vague terms
- Each of the 10 prompts must feel distinctly different in energy and texture
- Include vocal language tag if specified (e.g. "Korean lyrics", "sung in Japanese")
- Max 220 characters per prompt
- Title must be evocative and match the mood (can be in the target language if specified)
- The 'lyrics' field MUST contain the full song lyrics. It MUST structurally include an [Intro], at least one [Verse] and [Chorus], and an [Outro].`;

        // ── 사용자 컨텍스트 ──
        const userContext = `Generate 10 V5-optimized Suno AI prompts for these settings:

- Target Country/Region: ${countryInfo.name}
  → Traditional instruments to consider: ${(countryInfo.instruments || []).join(', ')}
- Genre: ${genreInfo.name} | Typical BPM range: ${genreInfo.bpm} | Style notes: ${genreInfo.style}
- Mood: ${moodInfo.name} — ${moodInfo.description || ''}
- Tempo preference: ${tempo}
- Vocal type: ${vocal || 'auto'}
- Song structure: ${structure || 'standard'}
- Lyrics language: ${vocalLangInfo.label}${vocalLangInfo.tag ? ` → always include tag: "${vocalLangInfo.tag}"` : ''}
${subStyleLabels ? `- Sub-styles/flavor: ${subStyleLabels}` : ''}
${refArtist ? `- Reference artist(s): ${refArtist} — mirror their production aesthetics and vocal delivery style` : ''}
${themeText ? `- Theme/Story concept: "${themeText}" — weave this into the narrative element of each prompt` : ''}

${customStyle ? '- VERY IMPORTANT OVERRIDE for style/genre/vibe: "' + customStyle + '"\n' : ''}${customLyrics ? '- VERY IMPORTANT OVERRIDE for lyrics: Use the exact lyrics provided here for all 10 generations, minimally adjusting them to fit the mood: "' + customLyrics + '"\n' : ''}
REMINDER: Apply the full V5 7-step formula. Vary energy from soft→intense across 10 prompts. Always include BPM+Key.`;

        // ── Gemini API 호출 ──
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContext }] }
            ],
            config: { responseMimeType: 'application/json' }
        });

        // ── 응답 파싱 ──
        let rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        let prompts;
        try {
            prompts = JSON.parse(rawText);
            if (!Array.isArray(prompts)) throw new Error('Response is not an array');
        } catch (parseErr) {
            console.error('Gemini JSON parse error:', parseErr.message, '\nRaw:', rawText.substring(0, 300));
            return res.status(502).json({
                success: false,
                error: 'AI 응답 파싱 실패. 다시 시도해주세요.',
                detail: parseErr.message
            });
        }

        // 개수 정규화 (count=1이면 단일/배열 모두 허용)
        const parsed = prompts;
        if (promptCount === 1) {
            const item = Array.isArray(parsed) ? parsed[0] : parsed;
            prompts = [{ index: 1, prompt: (item.prompt || '').substring(0, 220), title: item.title || 'Track 1', lyrics: item.lyrics || '' }];
        } else {
            prompts = parsed.slice(0, 10).map((item, i) => ({
                index: i + 1,
                prompt: (item.prompt || '').substring(0, 220),
                title: item.title || ('Track ' + (i + 1)),
                lyrics: item.lyrics || ''
            }));
        }

        // ── Supabase 히스토리 저장 (비동기, 실패해도 응답 지연 없음) ──
        if (supabase) {
            supabase.from('prompt_history').insert([{
                country, genre, mood, tempo,
                prompt: prompts[0]?.prompt || '',
                title: prompts[0]?.title || '',
                meta_tags: { batch: true, count: prompts.length },
                user_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
            }]).then(({ error }) => {
                if (error) console.error('Supabase save error:', error.message);
            });
        }

        console.log(`✅ /api/generate-prompts: ${prompts.length}개 생성 완료 (user: ${req.user.username})`);
        res.json({ success: true, data: prompts });

    } catch (err) {
        console.error('generate-prompts error:', err);
        res.status(500).json({ success: false, error: err.message || '서버 오류가 발생했습니다.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🎤 고급 모드 - 가사 자동생성 API
// ═══════════════════════════════════════════════════════════════
app.post('/api/generate-lyrics', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY) return res.status(503).json({ success: false, error: 'API 키 없음' });
        const { country, genre, mood, themeText, vocalLang, weirdness } = req.body;
        const countryInfo   = COUNTRY_STYLES[country]  || { name: country || 'Global' };
        const genreInfo     = GENRE_MAP[genre]          || { name: genre  || 'Pop' };
        const moodInfo      = MOOD_MAP[mood]            || { name: mood   || 'Energetic' };
        const vocalLangInfo = VOCAL_LANG_MAP[vocalLang] || { label: 'Korean' };
        const weirdnessNum  = Math.min(100, Math.max(0, Number(weirdness) || 50));

        const perspectives = ['first-person singular', 'first-person plural', 'second-person', 'third-person narrative'];
        const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];
        const randomSeed = Math.floor(Math.random() * 999999);
        const lyricsPrompt = 'Write compelling song lyrics for a ' + genreInfo.name + ' track.'
            + ' Region/Culture: ' + countryInfo.name + '.'
            + ' Mood: ' + moodInfo.name + '.'
            + ' Language: ' + vocalLangInfo.label + '.'
            + (themeText ? ' Theme: "' + themeText + '".' : ' Pick a completely unexpected, original theme — not love, not party, not success.')
            + ' Perspective: ' + randomPerspective + '.'
            + ' Write complete lyrics with [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], and [Outro] sections.'
            + ' Make it emotionally resonant and singable.'
            + ' IMPORTANT: Variation seed #' + randomSeed + ' — every generation must feel like a different song. Use a unique metaphor, unusual imagery, or an unexpected narrative arc. Never repeat structures or phrases from previous outputs.'
            + ' Return a JSON object: { "title": "<creative song title in the lyrics language>", "lyrics": "<full lyrics text>" }'
            + ' No other text, only valid JSON.';

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        let response, lastErr;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                response = await ai.models.generateContent({
                    model: GEMINI_MODEL,
                    contents: lyricsPrompt,
                    config: { temperature: 1.2, topP: 0.95 }
                });
                break;
            } catch (e) {
                lastErr = e;
                console.error(`generate-lyrics attempt ${attempt} failed:`, e.message);
                if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        if (!response) throw lastErr;

        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let title = '', lyrics = '';
        try {
            const raw = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
            const parsed = JSON.parse(raw);
            title  = parsed.title  || '';
            lyrics = parsed.lyrics || raw;
        } catch(e) {
            lyrics = rawText.trim();
        }
        console.log('✅ /api/generate-lyrics (user: ' + req.user.username + ')');
        res.json({ success: true, title, lyrics });
    } catch (err) {
        console.error('generate-lyrics final error:', err.message, err.status || '');
        res.status(500).json({ success: false, error: err.message || '서버 오류' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🎨 고급 모드 - 스타일 자동추천 API
// ═══════════════════════════════════════════════════════════════
app.post('/api/generate-style', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY) return res.status(503).json({ success: false, error: 'API 키 없음' });
        const { country, genre, mood, subStyles, refArtist, styleInfluence, weirdness } = req.body;
        const countryInfo  = COUNTRY_STYLES[country] || { name: country || 'Global' };
        const genreInfo    = GENRE_MAP[genre]         || { name: genre  || 'Pop', style: '' };
        const moodInfo     = MOOD_MAP[mood]           || { name: mood   || 'Energetic' };
        const influenceNum = Math.min(100, Math.max(0, Number(styleInfluence) || 50));
        const weirdnessNum = Math.min(100, Math.max(0, Number(weirdness)      || 50));

        const stylePrompt = 'You are a Suno AI style expert. Generate a perfect style descriptor string.'
            + ' Genre: ' + genreInfo.name + '. Region: ' + countryInfo.name + '. Mood: ' + moodInfo.name + '.'
            + (subStyles && subStyles.length ? ' Sub-styles: ' + subStyles.join(', ') + '.' : '')
            + (refArtist ? ' Reference: ' + refArtist + '.' : '')
            + ' Style influence: ' + influenceNum + '% (higher = more distinct/defined).'
            + ' Weirdness: ' + weirdnessNum + '% (higher = more experimental).'
            + ' Output ONLY a comma-separated style tag string (max 200 chars, English only).'
            + ' Include: sub-genre, instruments, production style, era/vibe. No explanations.'
            + ' Variation seed #' + Math.floor(Math.random()*999999) + ' — choose completely different instruments, production techniques, and era references each time. Never output the same tag combination twice.';

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: stylePrompt,
            config: { temperature: 1.3, topP: 0.97 }
        });
        const style = (response.text || '').trim().replace(/\n/g, ', ');
        console.log('✅ /api/generate-style (user: ' + req.user.username + ')');
        res.json({ success: true, style });
    } catch (err) {
        console.error('generate-style error:', err);
        res.status(500).json({ success: false, error: err.message || '서버 오류' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🎨 이미지 AI 프롬프트 생성 엔진 (고급 버전)
// 플레이리스트 컨셉 → Midjourney / DALL-E / Niji / SD / NanoBanana
// ═══════════════════════════════════════════════════════════════

const IMAGE_STYLE_MAP = {
    india: {
        scene: 'majestic Indian temple courtyard bathed in cinematic golden hour light, hyper-detailed cascading marigold garlands, intricate high-resolution mandala stone carvings, sacred fire pit with volumetric smoke, geometric rangoli patterns on polished marble',
        atmosphere: 'ethereal spiritual energy, breathtaking grandeur, cinematic lighting',
        texture: 'hyper-realistic carved stone, glowing silk fabric, gleaming gold leaf',
        composition: 'epic symmetrical composition, depth of field, grand scale architectural framing',
        artist: 'award-winning architectural photography, high-end travel editorial, Unreal Engine 5 render',
        camera: '24mm wide angle, f/2.8, cinematic backlight, ray-traced global illumination',
        neg: 'flat, silhouette, ugly, blurry, low quality, vector art, cartoon, dull',
    },
    brazil: {
        scene: 'Rio de Janeiro Carnival stage, hyper-detailed feathered costumes in vibrant electric blues and greens, glowing neon signs reflecting off rain-slicked concrete, dynamic volumetric laser lights, massive stadium energy',
        atmosphere: 'explosive joyful energy, cinematic high-budget performance, vibrant heat',
        texture: 'sparkling sequined fabric, hyper-realistic rain droplets, glowing neon tubes',
        composition: 'dynamic diagonal action shot, foreground glowing bokeh, epic depth',
        artist: 'high-end festival photography, 8k concert key visual, contemporary hyper-realism',
        camera: '35mm lens, flash fill, vivid high-contrast color grading, sharp focus',
        neg: 'flat, silhouette, ugly, blurry, low quality, vector art, monotone, generic',
    },
    usa: {
        scene: 'American downtown at blue hour, hyper-detailed neon signs casting radiant glowing pools on wet asphalt, steam rising with volumetric light rays, towering glass and steel skyscrapers with ray-traced reflections',
        atmosphere: 'cinematic urban cool, high-end cyberpunk aesthetic, breathtaking cityscapes',
        texture: 'wet asphalt mirror reflections, glowing neon glass, brushed steel',
        composition: 'epic rule-of-thirds street view, foreground puddle mirror reflection, incredible scale',
        artist: 'cinematic blockbuster movie still, award-winning urban photography, Unreal Engine 5 environment',
        camera: '50mm lens, f/1.4, flawless night photography, blooming neon highlights',
        neg: 'flat, silhouette, generic, ugly, blurry, low quality, cartoon, flat shading',
    },
    korea: {
        scene: 'Midnight Seoul skyline, hyper-detailed holographic K-pop advertisements glowing with cyan and magenta, traditional hanok roofs blended with futuristic glass towers, cherry blossoms carried by wind in cinematic lighting',
        atmosphere: 'futuristic hyper-modernity, high-budget K-pop music video, dynamic electric tension',
        texture: 'glossy neon-lit surfaces, hyper-realistic flower petals, highly reflective chrome',
        composition: 'epic depth of field, striking contrast between tradition and future, dynamic motion',
        artist: 'contemporary cinematic concept art, high-end Korean commercial photography, 8K 3D render',
        camera: '85mm lens, f/1.2, breathtaking bokeh, cyberpunk-lite color grading',
        neg: 'flat, silhouette, ugly, blurry, low quality, vector art, generic Asian cliché, cartoon',
    },
    japan: {
        scene: 'Tokyo at twilight—bustling Shibuya crossing glowing with neon and holograms, rain puddles reflecting vivid advertisements, intricate modern Japanese architecture blending with high-tech elements, cherry blossom petals caught in cinematic volumetric lighting',
        atmosphere: 'vibrant modern metropolis, electric energy, cinematic anime realism',
        texture: 'wet asphalt reflections, glass skyscrapers, neon glow, detailed rain drops',
        composition: 'dynamic depth of field, low angle looking up at skyscrapers, rule of thirds, grand scale',
        artist: 'Makoto Shinkai background art, Ufotable studio rendering, contemporary high-budget anime',
        camera: '35mm lens, f/1.8, ray-traced reflections, hyper-detailed anime rendering, bloom effect',
        neg: 'flat, silhouette, monotone, vector art, ugly, blurry, low quality, generic anime',
    },
    mexico: {
        scene: 'High desert Mexican village at magical twilight, hyper-detailed papel picado banners glowing against the sky, intricate sugar skull altars with thousands of realistic marigold petals, thousands of luminous candles, giant saguaro cactus',
        atmosphere: 'breathtaking vibrant celebration, magical realism, warm cinematic glow',
        texture: 'hyper-realistic adobe clay, glowing candle wax, delicate flower petals',
        composition: 'epic altar focus, leading lines of glowing petals, majestic sky gradient',
        artist: 'Pixar-level high end 3D animation style, award-winning National Geographic photography',
        camera: 'medium format, flawless dynamic range, vivid warm saturation',
        neg: 'flat, silhouette, vector, ugly, blurry, low quality, cartoonish cliché',
    },
    france: {
        scene: 'Parisian rooftop terrace at blue hour, hyper-detailed wrought iron railings, the Eiffel Tower sparkling brilliantly in the background, luxurious table setting with crystal wine glasses catching cinematic ambient light',
        atmosphere: 'luxurious romantic elegance, high-end fashion editorial, dreamy sophistication',
        texture: 'gleaming crystal, hyper-realistic zinc roofs, soft velvet night sky',
        composition: 'intimate cinematic close-up with majestic background, perfect golden ratio',
        artist: 'high-end Vogue editorial photography, cinematic European film still',
        camera: '50mm f/1.2, creamy bokeh, flawless elegant lighting, cinematic color grade',
        neg: 'flat, silhouette, tourist cliché, ugly, blurry, low quality, cartoon, flat lighting',
    },
    uk: {
        scene: 'London streets at night, hyper-detailed rain droplets on cobblestones reflecting vivid warm amber streetlights, glowing vintage shopfronts, a classic red double-decker bus passing with motion blur',
        atmosphere: 'cinematic moody elegance, high-end urban realism, dramatic lighting',
        texture: 'hyper-realistic wet cobblestone, glowing glass windows, sharp architectural details',
        composition: 'dramatic low angle, incredible depth of field, leading lines along the wet street',
        artist: 'cinematic blockbuster cinematography, award-winning architectural lighting',
        camera: '35mm lens, ultra-sharp focus, cinematic teal and orange grading',
        neg: 'flat, silhouette, dull, ugly, blurry, low quality, cartoon, generic',
    },
    nigeria: {
        scene: 'Lagos Victoria Island rooftop party, hyper-detailed vibrant fashion, majestic skyline of glass towers glowing against a cinematic vermillion sunset, dynamic light trails, high-end DJ equipment gleaming',
        atmosphere: 'luxurious high-energy celebration, contemporary Afrofuturism, breathtaking vibrancy',
        texture: 'hyper-realistic woven fabrics, glowing skin tones, highly reflective glass',
        composition: 'epic panoramic club scene, beautiful backlit subjects, dynamic framing',
        artist: 'high-end fashion campaign, masterpiece contemporary African art, 8K cinematic render',
        camera: '16mm wide angle, flawless sunset backlight, high dynamic range',
        neg: 'flat, silhouette, dull, ugly, blurry, low quality, vector art, flat colors',
    },
    turkey: {
        scene: 'Istanbul at magnificent golden sunset, hyper-detailed Bosphorus strait shimmering with hundreds of lights, majestic Blue Mosque domes, intricate high-resolution Iznik tile patterns glowing under warm lanterns',
        atmosphere: 'breathtaking historical majesty, cinematic magical lighting, luxurious sensory richness',
        texture: 'hyper-realistic ceramic glaze, gleaming copper, rich silk, highly detailed stone',
        composition: 'epic framing through an ornate archway, stunning depth of field to the sea',
        artist: 'high-end travel editorial, masterpiece architectural visualization, cinematic lighting',
        camera: 'medium format, flawless golden hour grade, ultra-sharp details',
        neg: 'flat, silhouette, orientalist cliché, ugly, blurry, low quality, cartoon',
    },
    egypt: {
        scene: 'Cairo rooftop at magical twilight, hyper-detailed Great Pyramid perfectly illuminated against a deep ultramarine sky, intricate carved wood mashrabiya catching golden indoor light, luxurious modern-ancient blend',
        atmosphere: 'majestic timelessness, luxurious cinematic evening, breathtaking scale',
        texture: 'hyper-realistic carved wood, smooth brass, highly detailed ancient stone',
        composition: 'epic architectural framing, perfect symmetrical alignment, cinematic depth',
        artist: 'high-end architectural render, majestic National Geographic photography',
        camera: '35mm, cinematic contrast, stunning deep blue and gold split tone',
        neg: 'flat, silhouette, hieroglyph clipart, ugly, blurry, low quality, cartoon',
    },
    jamaica: {
        scene: 'Kingston luxury beach cove at sunset, hyper-detailed crystal clear glowing turquoise water, lush highly detailed palm trees, dynamic sky gradient from deep coral to indigo, high-end island party setup',
        atmosphere: 'luxurious tropical paradise, high-budget music video energy, cinematic warmth',
        texture: 'hyper-realistic crystal water ripples, glowing white sand, lush foliage',
        composition: 'epic wide landscape, perfect rule of thirds, breathtaking lighting',
        artist: 'high-end resort commercial, cinematic masterpiece 8k, vibrant lighting',
        camera: 'medium format, ultra-wide dynamic range, polarized vivid colors',
        neg: 'flat, silhouette, vector, ugly, blurry, low quality, dull, cliché',
    },
};

const MOOD_VISUAL_MAP = {
    dawn: { lighting: 'cinematic morning golden hour, breathtaking volumetric sun rays, soft luminous mist', palette: 'luminous pastel pink, glowing gold, ethereal blue' },
    running: { lighting: 'dynamic motion blur, high-octane cinematic sunlight, glowing energy trails', palette: 'electric orange, pitch black, hyper-neon green' },
    cafe: { lighting: 'luxurious high-end interior lighting, cinematic window light, beautiful creamy bokeh', palette: 'rich amber, elegant cream, warm espresso' },
    night_drive: { lighting: 'hyper-realistic neon reflections on wet asphalt, cinematic volumetric headlights', palette: 'deep cinematic navy, glowing hot pink, vibrant cyan' },
    study: { lighting: 'flawless studio lighting, crisp shadows, ultra-clean aesthetic', palette: 'pure white, sleek grey, luminous soft blue' },
    party: { lighting: 'high-end nightclub laser grid, volumetric smoke, cinematic strobe, glowing particles', palette: 'vivid electric purple, hot pink, glowing UV cyan' },
    romantic: { lighting: 'luxurious candlelit glow, breathtaking soft bokeh, cinematic rim lighting', palette: 'deep rose red, luminous gold, velvet cream' },
    melancholy: { lighting: 'cinematic overcast lighting, hyper-detailed rain on glass, beautifully diffused glow', palette: 'slate blue, metallic silver, deep cinematic grey' },
    epic: { lighting: 'majestic volumetric god rays piercing storm clouds, blockbuster movie lighting', palette: 'dramatic dark crimson, glowing gold, storm grey' },
    chill: { lighting: 'breathtaking natural sunlight, ethereal soft diffusion, peaceful glowing ambiance', palette: 'luminous sage green, clear sky blue, pure white' },
    cyberpunk: { lighting: 'hyper-detailed neon rain, glowing holographic elements, volumetric fog, Unreal Engine 5 lighting', palette: 'acid yellow, glowing hot pink, electric blue on pitch black' },
    summer: { lighting: 'brilliant high-end commercial sunlight, sparkling crystal water, flawless clear sky', palette: 'vibrant turquoise, sunshine yellow, glowing coral' },
    gym: { lighting: 'dramatic high-contrast athletic studio lighting, cinematic shadows, edge lighting', palette: 'cool brushed steel, intense glowing red, matte black' },
    roadtrip: { lighting: 'majestic golden hour highway sunlight, cinematic heat shimmer, glowing horizon', palette: 'warm intense orange, vivid sky blue, glowing yellow' },
    gaming: { lighting: 'flawless RGB ambient glow, high-end streamer room lighting, glowing screens', palette: 'deep luminous purple, glowing RGB spectrum, dark obsidian' },
    nostalgia: { lighting: 'cinematic warm luminous glow, beautiful soft focus, nostalgic golden hour', palette: 'luminous faded orange, warm soft rose, rich sepia' },
    heartbreak: { lighting: 'dramatic cinematic moonlight, striking high-contrast shadows, highly emotional lighting', palette: 'deep midnight blue, cool silver, singular glowing amber' },
    confidence: { lighting: 'high-end fashion runway spotlight, flawless luxurious edge lighting, sharp elegant shadows', palette: 'gleaming gold, pure obsidian, glowing champagne' },
    hopeful: { lighting: 'breathtaking dawn sunlight bursting through clouds, majestic volumetric rays', palette: 'luminous yellow, fresh glowing green, vivid sky blue' },
    anger: { lighting: 'cinematic intense red emergency lighting, stark high-contrast shadows, aggressive glare', palette: 'glowing blood red, absolute black, piercing white' },
    rain: { lighting: 'hyper-detailed cinematic rain, glowing interior window lights, beautiful specular reflections', palette: 'cool cinematic grey, deep blue, glowing amber' },
    forest: { lighting: 'majestic dappled sunlight through ultra-detailed leaves, glowing volumetric morning mist', palette: 'vibrant emerald green, glowing gold, rich dark earth' },
    club: { lighting: 'high-budget music video laser lighting, volumetric fog, glowing neon accents', palette: 'glowing UV white, neon electric green, absolute black' },
    wedding: { lighting: 'flawless luxurious golden afternoon light, ethereal floral bokeh, breathtaking glow', palette: 'luminous ivory, soft blush pink, gleaming champagne gold' },
    sleep: { lighting: 'beautiful ethereal moonlight, soft luminous stars, peaceful diffused night glow', palette: 'deep midnight blue, glowing silver, soft luminous lavender' },
    meditation: { lighting: 'ethereal glowing light pillars, majestic sunrise rays, divine volumetric lighting', palette: 'glowing warm white, soft radiant gold, luminous sage' },
    horror: { lighting: 'cinematic creeping shadows, highly detailed eerie glowing light, masterpiece horror lighting', palette: 'sickly glowing green, absolute pitch black, stark cold white' },
    anime: { lighting: 'cinematic ray tracing, god rays through intricate clouds, rim lighting, glowing magical particles', palette: 'vibrant cinematic anime colors, rich sky blue, glowing gold, deep atmospheric shadows' },
    dinner: { lighting: 'luxurious Michelin-star restaurant lighting, warm elegant glow, flawless specular highlights', palette: 'deep elegant burgundy, glowing gold, pristine ivory' },
    kids: { lighting: 'flawless bright commercial lighting, cheerful and luminous, high-end 3D animation feel', palette: 'vibrant primary red, glowing sunny yellow, bright sky blue' },
};

const GENRE_VISUAL_MAP = {
    kpop: { element: 'high-budget K-pop idol stage, hyper-detailed futuristic costumes, spectacular glowing stage effects', style: 'masterpiece cinematic music video, 8k resolution, flawless beauty' },
    hiphop: { element: 'high-end urban streetwear editorial, hyper-detailed luxury cars, dramatic dynamic angles', style: 'masterpiece commercial photography, hyper-realistic, vivid contrast' },
    edm: { element: 'colossal Tomorrowland festival mainstage, mind-blowing intricate laser geometry, massive crowd', style: 'Unreal Engine 5 epic render, masterpiece digital art' },
    jazz: { element: 'luxurious underground jazz club, hyper-detailed gleaming brass saxophone, cinematic stage smoke', style: 'high-end cinematic photography, masterpiece moody lighting' },
    lofi: { element: 'hyper-detailed cozy aesthetic room, rain on glass with ray-traced reflections, glowing warm lamp', style: 'masterpiece anime background art, Makoto Shinkai quality, extremely detailed' },
    rock: { element: 'massive stadium rock concert, towering pyrotechnics, hyper-detailed stage lighting, explosive energy', style: 'masterpiece cinematic live photography, striking high contrast' },
    rnb: { element: 'luxurious high-end penthouse interior, glowing neon accents, hyper-detailed velvet and silk textures', style: 'Vogue fashion editorial photography, masterpiece luxury aesthetic' },
    classical: { element: 'majestic grand opera house interior, hyper-detailed gold leaf architecture, glowing crystal chandeliers', style: 'Unreal Engine 5 architectural visualization, flawless photorealism' },
    citypop: { element: 'hyper-detailed vibrant modern Tokyo cityscape, glowing neon signs, flawless ray-traced reflections on cars', style: 'masterpiece contemporary high-end anime aesthetic, vibrant and crisp' },
    bollywood: { element: 'epic grand Bollywood palace set, thousands of hyper-detailed ornate costumes, breathtaking cinematic lighting', style: 'high-budget blockbuster cinematography, 8k flawless rendering' },
    afrobeats: { element: 'luxurious vibrant Afrobeats party, hyper-detailed high-fashion outfits, glowing skin, tropical modernism', style: 'masterpiece high-end fashion campaign, wildly vibrant colors' },
    reggaeton: { element: 'high-energy luxurious beach club at night, hyper-vibrant tropical lighting, massive party energy', style: 'high-budget Latin music video aesthetic, flawless production' },
    phonk: { element: 'hyper-detailed aggressive JDM drift car, cinematic volumetric neon smoke, high-octane action angles', style: 'Unreal Engine 5 cinematic render, hyper-realistic street racing' },
    anisong: { element: 'highly detailed main character in dynamic pose, complex stylish outfit, detailed expressive eyes, flowing hair in the wind, magical energy aura', style: 'masterpiece anime illustration, Kyoto Animation high quality, cinematic key visual, hyper-detailed rendering' },
    ambient: { element: 'breathtaking ethereal cosmic landscape, glowing hyper-detailed flora, floating luminous particles', style: 'masterpiece sci-fi concept art, breathtaking 8k render' },
    acoustic: { element: 'hyper-detailed cozy high-end acoustic studio, gorgeous natural cinematic window light, gleaming wood textures', style: 'award-winning interior photography, beautiful depth of field' },
    amapiano: { element: 'vibrant hyper-detailed luxury club interior, dynamic glowing colors, high-end Afrofuturism elements', style: 'masterpiece cinematic lighting, luxurious contemporary aesthetic' },
    trot: { element: 'grandiose high-budget contemporary stage, hyper-detailed glittering luxury costumes, brilliant spotlighting', style: '8K television broadcast quality, flawless studio production' },
    default: { element: 'majestic breathtaking abstract audio visualization, hyper-detailed glowing sound waves, luminous particles', style: 'masterpiece contemporary digital art, 8k Unreal Engine 5' },
};

/**
/**
 * 이미지 AI 프롬프트 생성기 (고급 버전)
 * 국가 + 장르 + 무드 → 5개 AI 맞춤형 초고품질 프롬프트
 */
function generateImagePrompt(country, genre, mood) {
    const countryData = COUNTRY_STYLES[country];
    const genreData = GENRE_MAP[genre];
    const moodData = MOOD_MAP[mood];
    const C = IMAGE_STYLE_MAP[country] || { scene: `${country} cultural landscape, authentic local details`, atmosphere: 'cultural richness', texture: 'organic natural materials', composition: 'balanced cinematic composition', artist: 'contemporary world art', camera: '50mm, f/2.8, natural light', neg: 'ugly, blurry' };
    const M = MOOD_VISUAL_MAP[mood] || { lighting: 'natural cinematic lighting, volumetric rays', palette: 'harmonious sophisticated color palette', emotion: 'evocative and resonant', timeOfDay: 'golden hour' };
    const G = GENRE_VISUAL_MAP[genre] || GENRE_VISUAL_MAP.default;

    const countryName = countryData ? countryData.name : country;
    const genreName = genreData ? genreData.name : genre;
    const moodName = moodData ? moodData.name : mood;
    const moodEmoji = moodData ? moodData.emoji : '🎵';
    const genreBpm = genreData ? genreData.bpm : '';
    const genreStyle = genreData ? genreData.style : '';

    const prompts = { whisk: [], grok: [], flow: [] };

    // ✨ 5가지 베리에이션 조합을 위한 다이나믹 수식어 풀
    const variations = [
        { accent: 'cinematic blockbuster lighting', camera: '35mm wide angle', feel: 'epic and majestic' },
        { accent: 'intimate soft bokeh', camera: '85mm portrait lens', feel: 'emotional and personal' },
        { accent: 'dynamic high-contrast shadows', camera: '16mm ultra-wide', feel: 'high-energy and edgy' },
        { accent: 'dreamy ethereal glow', camera: '50mm standard lens', feel: 'surreal and poetic' },
        { accent: 'hyper-realistic macro detail', camera: 'medium format 100mm', feel: 'flawless and luxurious' }
    ];

    for (let i = 0; i < 5; i++) {
        const v = variations[i];

        // ══════════════════════════════════════════════════════
        // 🌀 WHISK (Google Labs)
        // ══════════════════════════════════════════════════════
        const whiskPrompt = `🌟 Style Prompt for Google Whisk (Variation ${i + 1})

🎨 Style Description
${C.scene}, ${G.element}.
The overall visual feel is ${v.feel} with ${C.atmosphere}.

💡 Atmosphere & Lighting
${M.lighting}, ${v.accent}.
Color mood: ${M.palette}.

🖼️ Composition Guide
${C.composition}. Shot with ${v.camera} style. 16:9 widescreen landscape.

ℹ️ Whisk 사용 방법:
1. labs.google/fx/tools/whisk 접속
2. [참고 이미지] 업로드 (선택사항)
3. 아래 Style Prompt를 텍스트로 입력하세요
4. 설정 부분에 다음를 추가: &quot;Generate in landscape 16:9 ratio&quot;

📋 간결한 스타일 태그 (Whisk 입력용)
${genreName}, ${moodName} mood, ${countryName} aesthetics, ${M.palette}, ${v.feel}, ${G.element}, 16:9 widescreen, hyperrealistic, 8K`;

        // ══════════════════════════════════════════════════════
        // 🤖 GROK (xAI Aurora)
        // ══════════════════════════════════════════════════════
        const grokPrompt = `Generate a stunning 16:9 widescreen image (1920x1080) for a "${genreName}" music playlist with a "${moodName}" ${moodEmoji} atmosphere, inspired by ${countryName} culture.

🎬 Scene:
${C.scene}. ${G.element}.
💡 Mood & Lighting:
${M.lighting}, ${v.accent}. Palette: ${M.palette}.
🎨 Style:
${G.style}. ${v.feel}. Inspired by ${C.artist}.
📷 Camera:
${v.camera}, ${C.camera}. Cinematic 16:9 widescreen landscape.
⭐ Quality:
Ultra-detailed, 8K resolution, hyperrealistic, professional editorial, award-winning photography. No text, no watermarks, no logos.`;

        // ══════════════════════════════════════════════════════
        // 🎬 FLOW (AI 영상 생성)
        // ══════════════════════════════════════════════════════
        const flowPrompt = `🎬 AI Video Generation Prompt (Variation ${i + 1})
Aspect Ratio: 16:9 Widescreen (1920x1080)

📹 Scene Description:
${C.scene}. ${G.element}.
Camera slowly pans across the scene with ${v.camera} perspective.
The atmosphere is ${v.feel}, bathed in ${M.lighting}.

🎨 Visual Style:
${G.style}. ${C.atmosphere}.
Color palette: ${M.palette}.
Texture: ${C.texture}.

🎵 Motion & Rhythm:
Gentle camera movement synchronized to ${genreName} (${genreBpm || 'moderate'} BPM).
Visual rhythm matches ${moodName} energy - ${v.accent}.
Inspired by ${C.artist} visual storytelling.

⚙️ Technical:
16:9 widescreen, cinematic grain, ${v.camera}, professional color grading.
No text overlays, no watermarks.`;

        prompts.whisk.push(whiskPrompt);
        prompts.grok.push(grokPrompt);
        prompts.flow.push(flowPrompt);
    }

    const conceptTags = [
        genreName,
        `${moodEmoji} ${moodName}`,
        `${countryName} 미학`,
        G.style.substring(0, 15) + '...',
        M.palette.substring(0, 15) + '...',
        '앨범 커버 아트',
    ];

    return {
        country: countryName,
        genre: genreName,
        mood: moodName,
        moodEmoji,
        genreBpm,
        prompts,
        conceptTags,
        colorPalette: M.palette,
        artStyle: G.style,
        scene: C.scene,
    };
}

// 이미지 프롬프트 생성 API
app.post('/api/generate-image-prompt', async (req, res) => {
    try {
        const { country, genre, mood, apiKey, aiModel } = req.body;
        if (!country || !genre || !mood) {
            return res.status(400).json({ success: false, error: 'country, genre, mood 파라미터가 필요합니다.' });
        }

        let result = generateImagePrompt(country, genre, mood);

        // Gemini API Key가 있다면, Gemini로 더 풍부한 5개 프롬프트 배열 생성
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: apiKey });
                const promptText = `
                당신은 세계 최고 수준의 AI 이미지 프롬프트 엔지니어입니다.
                다음 조건에 맞춰 각결별로 5개의 다채롭고 매우 디테일한 (V1~V5) 영어 프롬프트 문자열 배열을 생성하세요.

                조건:
                - 국가: ${COUNTRY_STYLES[country]?.name}
                - 음악 장르: ${GENRE_MAP[genre]?.name}
                - 분위기: ${MOOD_MAP[mood]?.name}

                변동 요소 (각 프롬프트마다 변형을 줄 것):
                1. 피사체/장면 (현지 문화, 랜드마크, 사람상 등 반영)
                2. 조명/분위기 (Cinematic lighting, neon glow 등 다르게)
                3. 카메라/구도 (35mm, Extreme close up, drone shot 등 다르게, 반드시 16:9 와이드스크린 구도)
                4. 예술 스타일 (Unreal Engine 5, 8k resolution, award-winning photography 등)
                
                ⚠️ 중요: 모든 프롬프트는 반드시 16:9 와이드스크린(1920x1080) 비율로 생성하세요.
                - Whisk: 간결한 자연어 프롬프트, 16:9 명시
                - Grok: 서술적 영문 설명, 16:9 1920x1080 명시
                - Flow: AI 영상 생성용 프롬프트, 16:9 와이드스크린, 카메라 움직임 포함
                
                각 툴(Whisk, Grok, Flow)에 맞춰 5개의 프롬프트 배열을 반환하세요.
                Flow는 AI 영상 생성용으로 16:9 와이드스크린, 카메라 무빙, 장면 전환 등을 포함하세요.
                
                반드시 아래 JSON 포맷만 반환하세요 (마크다운 백틱 없이):
                {
                    "prompts": {
                        "whisk": ["prompt1...", "prompt2...", "prompt3...", "prompt4...", "prompt5..."],
                        "grok": ["prompt1...", "prompt2...", "prompt3...", "prompt4...", "prompt5..."],
                        "flow": ["prompt1...", "prompt2...", "prompt3...", "prompt4...", "prompt5..."]
                    },
                    "conceptTags": ["Tag1", "Tag2", "Tag3"],
                    "colorPalette": "설명적 팜레트 문구"
                }
                `;
                const response = await ai.models.generateContent({
                    model: aiModel || 'gemini-3.1-pro-preview',
                    contents: promptText,
                    config: { responseMimeType: 'application/json' }
                });

                let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                let parsed = JSON.parse(text);

                // 생성된 데이터를 덮어쓰기
                result.prompts = parsed.prompts;
                result.conceptTags = parsed.conceptTags || result.conceptTags;
                result.colorPalette = parsed.colorPalette || result.colorPalette;
            } catch (geminiError) {
                console.error("Gemini Image prompt failed, falling back to static:", geminiError);
                // 실패 시 기본 로직 result 유지
            }
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🌐 Gemini 실시간 트렌드 데이터 API
// 오늘 날짜 기반으로 국가별 연령별 음악 트렌드를 AI로 생성
// ═══════════════════════════════════════════════════════════════

app.post('/api/gemini-trends', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY) {
            return res.status(503).json({ success: false, error: 'Gemini API 키가 서버에 설정되지 않았습니다.' });
        }

        const today = new Date();
        const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
        const seasonMap = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
        const season = seasonMap[today.getMonth()];

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const promptText = `
당신은 전 세계 음악 트렌드 전문가입니다.
오늘 날짜(${dateStr}, ${season} 시즌)를 기반으로 각 국가별·연령대별 인기 음악 장르 TOP 5를 분석하세요.

분석 국가: 한국(kr), 일본(jp), 미국(us), 인도(in), 브라질(br), 나이지리아(ng), 멕시코(mx), 영국(gb), 독일(de), 중국(cn)
연령대: 10대, 20대, 30대, 40대, 50대+

각 장르는 [genre_name, badge] 형식이며 badge는 '🔥'(1위 장르), '📈'(급상승), '' (일반) 중 하나.

현재 날짜의 시즌(${season}), 글로벌 트렌드(AI 음악, 소셜미디어 등), 각 국가의 문화적 특성을 반영하여 약간씩 현실적인 변동을 줄 것.
예를 들어 사용자가 매일 접속할 때마다 미묘하게 다른 트렌드 결과가 나와야 합니다.

반드시 아래 JSON 구조로만 응답하세요 (마크다운 백틱 없이):
{
  "date": "${dateStr}",
  "season": "${season}",
  "fetchedAt": "HH:MM",
  "kr": {
    "name": "한국", "flag": "🇰🇷",
    "ages": {
      "10대": { "color": "pink", "icon": "🧒", "label": "Gen Z", "genres": [["K-Pop", "🔥"], ["Phonk", "📈"], ["Hip-Hop / Trap", ""], ["Anime OST", ""], ["EDM", ""]] },
      "20대": { "color": "purple", "icon": "🧑", "label": "밀레니얼Z", "genres": [["K-Hip Hop", "🔥"], ["Indie Pop", ""], ["Lo-Fi", "📈"], ["R&B / Soul", ""], ["EDM", ""]] },
      "30대": { "color": "cyan", "icon": "🧑‍💼", "label": "밀레니얼", "genres": [["K-Pop", "🔥"], ["R&B / Soul", ""], ["발라드", ""], ["Indie", ""], ["재즈", ""]] },
      "40대": { "color": "teal", "icon": "🧑‍🦱", "label": "X세대", "genres": [["트로트", "🔥"], ["발라드", ""], ["Pop Ballad", ""], ["Classic Rock", ""], ["R&B", ""]] },
      "50대+": { "color": "emerald", "icon": "🧓", "label": "Baby Boom", "genres": [["트로트", "🔥"], ["발라드", ""], ["클래식", ""], ["Oldies Pop", ""], ["재즈", ""]] }
    }
  },
  "jp": { ... },
  "us": { ... },
  "in": { ... },
  "br": { ... },
  "ng": { ... },
  "mx": { ... },
  "gb": { ... },
  "de": { ... },
  "cn": { ... }
}

**매우 중요**: 모든 10개 국가의 완전한 데이터를 위 예시 구조와 동일하게 반환하세요. color 값은 pink/purple/cyan/teal/emerald 중 하나여야 합니다.
        `;

        const response = await ai.models.generateContent({
            model: aiModel || 'gemini-3.1-pro-preview',
            contents: promptText,
            config: { responseMimeType: 'application/json' }
        });

        let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);

        // 현재 시각 추가
        const now = new Date();
        parsed.fetchedAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        res.json({ success: true, data: parsed });

    } catch (error) {
        console.error('Gemini Trends Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 배치 프롬프트 생성 API (N개 한번에 생성)
app.post('/api/generate-batch', async (req, res) => {
    try {
        const { country, genre, mood, tempo, vocal, structure, creativity, themeText, count = 10, vocalLang, subStyles, refArtist } = req.body;
        if (!country || !genre || !mood || !tempo) {
            return res.status(400).json({ success: false, error: '모든 파라미터를 입력해 주세요' });
        }

        const batchCount = Math.min(Math.max(parseInt(count) || 10, 1), 10); // 1~10개 제한
        const results = [];

        const { apiKey, aiModel } = req.body;

        let batchResults = [];

        // Gemini API로 10개 배치를 한 번에 요청 (토큰 및 시간 절약을 위해 prompt를 1개로 요청)
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: apiKey });
                const subStylesList = SUBSTYLE_MAP[genre] || [];
                const selectedSubStyleLabels = (subStyles || [])
                    .map(id => subStylesList.find(s => s.id === id)?.label)
                    .filter(Boolean).join(', ');

                const promptText = `
                당신은 Suno AI 전문가입니다.
                다음 조건으로 서로 다른 매력을 가진 프롬프트 ${batchCount}개를 생성하세요.
                국가: ${COUNTRY_STYLES[country]?.name}, 장르: ${GENRE_MAP[genre]?.name}, 무드: ${MOOD_MAP[mood]?.name}, 속도: ${tempo}
                가사 언어: ${VOCAL_LANG_MAP[vocalLang]?.label || '자동 (국가 맞춤)'} — 반드시 이 언어로 가사 스타일을 맞출 것
                ${selectedSubStyleLabels ? `서브스타일/분위기: ${selectedSubStyleLabels} — 이것을 기반으로 다양한 변형을 만들어라` : ''}
                ${refArtist ? `레퍼런스 아티스트: ${refArtist} — 이 아티스트 스타일을 참고하되, 각 프롬프트마다 다른 측면을 강조` : ''}
                사용자 테마: ${themeText || '없음 (창의적으로)'}
                
                - "styleOfMusic": Suno AI 입력용 영문 Suno AI 프롬프트 (최대 180자, 반드시 맨 앞에 언어 태그 포함. 예: ${VOCAL_LANG_MAP[vocalLang]?.tag || 'Korean lyrics'}, 이후 장르/분위기/악기 키워드. 각 프롬프트마다 편공 스타일 변형 필수)
                - "title": 곡 제목
                - "lyricsTheme": 곡 스토리 소개 (영문 1문장)
                
                반드시 아래 JSON 포맷에 맞춘 배열을 반환하세요:
                [
                  { "styleOfMusic": "...", "title": "...", "lyricsTheme": "..." },
                  ... // 총 ${batchCount}개
                ]
                `;
                const response = await ai.models.generateContent({
                    model: aiModel || 'gemini-3.1-pro-preview',
                    contents: promptText,
                    config: { responseMimeType: 'application/json' }
                });
                let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedArr = JSON.parse(text);

                if (Array.isArray(parsedArr)) {
                    for (let i = 0; i < Math.min(parsedArr.length, batchCount); i++) {
                        const item = parsedArr[i];
                        const baseResult = generateSunoPrompt(country, genre, mood, tempo, vocal, structure, creativity, themeText, vocalLang, subStyles || [], refArtist || '');

                        baseResult.prompt = item.styleOfMusic ? item.styleOfMusic.substring(0, 198) : baseResult.prompt;

                        // ✅ 언어 태그 강제 보정 (배치)
                        const batchLangData = VOCAL_LANG_MAP[vocalLang] || VOCAL_LANG_MAP.auto;
                        if (batchLangData.tag && !baseResult.prompt.toLowerCase().includes(batchLangData.tag.toLowerCase())) {
                            baseResult.prompt = (batchLangData.tag + ', ' + baseResult.prompt).substring(0, 198);
                        }

                        baseResult.titleSuggestions = item.title ? [item.title] : baseResult.titleSuggestions;
                        baseResult.fullPrompt.lyricsTheme = item.lyricsTheme || baseResult.fullPrompt.lyricsTheme;
                        baseResult.fullPrompt.styleOfMusic = baseResult.prompt;

                        results.push({
                            index: i + 1,
                            prompt: baseResult.prompt,
                            title: baseResult.titleSuggestions[0],
                            metaTags: baseResult.metaTags,
                            fullPrompt: baseResult.fullPrompt
                        });
                    }
                    batchResults = results;
                }
            } catch (err) {
                console.error("Gemini Batch Failed:", err);
            }
        }

        // Gemini 실패 혹은 미입력 시 기존 루프 처리
        if (batchResults.length === 0) {
            for (let i = 0; i < batchCount; i++) {
                const result = generateSunoPrompt(country, genre, mood, tempo, vocal, structure, creativity, themeText, vocalLang, subStyles || [], refArtist || '');
                results.push({
                    index: i + 1,
                    prompt: result.prompt,
                    title: result.titleSuggestions[0],
                    metaTags: result.metaTags,
                    fullPrompt: result.fullPrompt
                });
            }
        }

        res.json({ success: true, count: batchCount, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🟢 GET /api/gemini-status
// Gemini AI 연결 상태 확인 (사이드바 상태 표시용)
// ═══════════════════════════════════════════════════════════════
app.get('/api/gemini-status', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_Gemini_API_키를_붙여넣으세요') {
            return res.json({ connected: false, reason: 'GEMINI_API_KEY not configured' });
        }
        // 간단한 연결 테스트 (실제 호출 없이 키 존재 여부만 확인)
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        return res.json({ connected: true, model: GEMINI_MODEL });
    } catch (err) {
        return res.json({ connected: false, reason: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🌍 POST /api/gemini-trends
// Gemini AI로 국가별 연령대별 실시간 음악 트렌드 생성
// index.html의 Trends 패널에서 "새로고침" 버튼 클릭 시 호출
// ═══════════════════════════════════════════════════════════════
app.post('/api/gemini-trends', verifyToken, async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === '여기에_Gemini_API_키를_붙여넣으세요') {
            return res.status(503).json({ success: false, error: 'GEMINI_API_KEY not configured' });
        }

        const prompt = `You are a global music trend analyst. Return ONLY a valid JSON object (no markdown, no explanation).

Generate current music trends for these countries: kr (Korea), jp (Japan), us (USA), in (India), br (Brazil).

For each country, provide age groups: 10대, 20대, 30대, 40대, 50대+
For each age group, list top 5 genres as arrays of [genreName, badge] where badge is "🔥" (hottest), "📈" (rising), or "" (stable).

Strict output format:
{
  "kr": { "ages": { "10대": { "genres": [["K-Pop","🔥"],["Phonk","📈"],["EDM",""],["Hip-Hop",""],["Anime OST",""]] }, "20대": {...}, "30대": {...}, "40대": {...}, "50대+": {...} } },
  "jp": { "ages": { ... } },
  "us": { "ages": { ... } },
  "in": { "ages": { ... } },
  "br": { "ages": { ... } }
}

Use only genre names from this list: K-Pop, K-Hip Hop, K-Indie, Trot, Ballad, J-Pop, Anime OST, City Pop, J-Rock, Hip-Hop, Hip-Hop / Trap, R&B, R&B / Soul, Pop, EDM, Phonk, Lo-Fi, Indie Pop, Alt Rock, Jazz, Reggaeton, Latin Pop, Afrobeats, Amapiano, Bollywood, Bhangra, Classical, Acoustic, Baile Funk, Samba, Bossa Nova, Rock, Techno, Mariachi, Chanson, Highlife`;

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        let rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        let trendsData;
        try {
            trendsData = JSON.parse(rawText);
        } catch (parseErr) {
            console.error('Gemini trends parse error:', parseErr.message);
            return res.status(502).json({ success: false, error: 'AI 트렌드 응답 파싱 실패' });
        }

        console.log(`✅ /api/gemini-trends: 트렌드 생성 완료 (user: ${req.user.username})`);
        return res.json({ success: true, data: trendsData });

    } catch (err) {
        console.error('gemini-trends error:', err);
        return res.status(500).json({ success: false, error: err.message });
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

    const vocals = Object.entries(VOCAL_MAP).map(([key, val]) => ({ value: key, label: val.label }));
    const structures = Object.entries(STRUCTURE_MAP).map(([key, val]) => ({ value: key, label: val.label }));
    const creativities = Object.entries(CREATIVITY_MAP).map(([key, val]) => ({ value: key, label: val.label }));
    const vocalLangs = Object.entries(VOCAL_LANG_MAP).map(([key, val]) => ({ value: key, label: val.label }));

    res.json({ countries, genres, moods, tempos, vocals, structures, creativities, vocalLangs, substyles: SUBSTYLE_MAP, recommendedArtists: RECOMMENDED_ARTISTS_MAP });
});

// ═══════════════════════════════════════════════════════════════
// 🎵 Suno AI 비공식 API 연동 (음원 자동 생성)
// ═══════════════════════════════════════════════════════════════
//
// ⚠️ 비공식 API 사용 시 주의사항:
// 1. 쿠키(__client)는 24~72시간마다 만료될 수 있으므로 주기적으로 갱신 필요
// 2. 갱신방법: suno.com 로그인 → F12 → Application → Cookies → __client 값 복사 → .env에 업데이트
// 3. 과도한 요청 시 계정 차단 위험 - 반드시 딜레이를 두고 요청할 것
// 4. Suno API 구조가 변경될 수 있으므로 응답 형식이 달라지면 파싱 코드 수정 필요
//
// ═══════════════════════════════════════════════════════════════

const SUNO_COOKIE = process.env.SUNO_COOKIE || '';
const SUNO_BASE_URL = process.env.SUNO_BASE_URL || 'https://studio-api.suno.ai';
const SUNO_DELAY = parseInt(process.env.SUNO_REQUEST_DELAY || '3000', 10);

/**
 * 🔧 유틸: 지정된 ms만큼 대기
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🔑 Suno API 공통 헤더 생성
 * 쿠키 기반 인증을 위한 헤더를 반환합니다.
 */
function getSunoHeaders() {
    return {
        'Content-Type': 'application/json',
        'Cookie': `__client=${SUNO_COOKIE}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://suno.com/',
        'Origin': 'https://suno.com'
    };
}

/**
 * 🎵 Suno에 단일 음악 생성 요청 전송
 * @param {string} prompt - 음악 생성 프롬프트
 * @param {string} title - 곡 제목
 * @param {boolean} instrumental - 인스트루멘탈 여부
 * @returns {object} - { clipIds: [...], taskId: ... }
 */
async function requestSunoGeneration(prompt, title = '', instrumental = false) {
    const payload = {
        prompt: prompt,
        tags: '',                // 자동 감지
        title: title || '',
        make_instrumental: instrumental,
        mv: 'chirp-v4',         // Suno v4 모델
        wait_audio: false       // 즉시 반환 (폴링으로 완료 확인)
    };

    const response = await fetch(`${SUNO_BASE_URL}/api/generate/v2/`, {
        method: 'POST',
        headers: getSunoHeaders(),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Suno API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Suno는 보통 2개의 클립(곡)을 반환
    const clipIds = (data.clips || []).map(clip => clip.id);
    return {
        clipIds,
        clips: data.clips || [],
        taskId: data.id || null
    };
}

/**
 * 🔄 Suno 클립 상태 폴링 (완료될 때까지 대기)
 * @param {string} clipId - 클립 ID
 * @param {number} maxRetries - 최대 폴링 시도 횟수 (기본 60회 × 5초 = 5분)
 * @returns {object} - 완료된 클립 데이터 (audio_url, image_url, title 등)
 */
async function pollSunoClipStatus(clipId, maxRetries = 60) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${SUNO_BASE_URL}/api/feed/?ids=${clipId}`, {
                method: 'GET',
                headers: getSunoHeaders()
            });

            if (!response.ok) {
                console.warn(`Polling error (${response.status}), retry ${i + 1}/${maxRetries}`);
                await sleep(5000);
                continue;
            }

            const data = await response.json();
            const clip = Array.isArray(data) ? data[0] : data;

            if (!clip) {
                await sleep(5000);
                continue;
            }

            // 상태 확인: complete, streaming, error 등
            const status = clip.status || '';

            if (status === 'complete' && clip.audio_url) {
                return {
                    id: clip.id,
                    title: clip.title || 'Untitled',
                    audioUrl: clip.audio_url,
                    imageUrl: clip.image_url || clip.image_large_url || '',
                    duration: clip.metadata?.duration_formatted || clip.metadata?.duration || '',
                    tags: clip.metadata?.tags || '',
                    status: 'complete',
                    createdAt: clip.created_at
                };
            }

            if (status === 'error') {
                return {
                    id: clip.id,
                    title: clip.title || 'Error',
                    status: 'error',
                    error: clip.metadata?.error_message || 'Unknown error'
                };
            }

            // 아직 처리 중... (streaming, queued 등)
            console.log(`  ⏳ Clip ${clipId}: status=${status}, retry ${i + 1}/${maxRetries}`);
            await sleep(5000);
        } catch (err) {
            console.warn(`  ⚠️ Polling exception: ${err.message}, retry ${i + 1}/${maxRetries}`);
            await sleep(5000);
        }
    }

    return {
        id: clipId,
        title: 'Timeout',
        status: 'timeout',
        error: '생성 시간 초과 (5분). 나중에 Suno 대시보드에서 확인하세요.'
    };
}

/**
 * 🚀 POST /api/suno-generate
 * 
 * 클라이언트로부터 프롬프트 배열을 받아 Suno API로 순차 전송합니다.
 * Rate Limit 방지를 위해 요청 사이에 SUNO_DELAY(기본 3초) 딜레이를 둡니다.
 * 
 * Request Body:
 *   { prompts: [{ prompt: string, title: string, instrumental?: boolean }] }
 * 
 * Response:
 *   { success: true, results: [{ index, title, audioUrl, imageUrl, duration, status }] }
 */
app.post('/api/suno-generate', async (req, res) => {
    try {
        // ── 1. 유효성 검사 ──
        if (!SUNO_COOKIE || SUNO_COOKIE === '여기에_suno_쿠키를_붙여넣으세요') {
            return res.status(400).json({
                success: false,
                error: 'Suno 쿠키가 설정되지 않았습니다. .env 파일의 SUNO_COOKIE를 업데이트해주세요.'
            });
        }

        const { prompts } = req.body;
        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({
                success: false,
                error: '프롬프트 배열(prompts)이 비어있습니다.'
            });
        }

        console.log(`\n🎵 Suno 음악 생성 시작: ${prompts.length}개 프롬프트`);
        console.log(`⏱️  요청 간 딜레이: ${SUNO_DELAY}ms`);

        const results = [];

        // ── 2. 순차적으로 Suno API 호출 (Rate Limit 방지) ──
        for (let i = 0; i < prompts.length; i++) {
            const item = prompts[i];
            console.log(`\n  [${i + 1}/${prompts.length}] "${item.title || 'Untitled'}" 생성 요청 중...`);

            try {
                // Suno에 생성 요청
                const genResult = await requestSunoGeneration(
                    item.prompt,
                    item.title || `Track ${i + 1}`,
                    item.instrumental || false
                );

                console.log(`  ✅ 클립 ID: ${genResult.clipIds.join(', ')}`);

                // 첫 번째 클립만 사용 (Suno는 2개씩 생성하지만 1개만 취함)
                if (genResult.clipIds.length > 0) {
                    // 폴링으로 완료 대기
                    console.log(`  ⏳ 완료 대기 중...`);
                    const completed = await pollSunoClipStatus(genResult.clipIds[0]);

                    results.push({
                        index: i + 1,
                        inputTitle: item.title || `Track ${i + 1}`,
                        inputPrompt: item.prompt,
                        ...completed
                    });

                    console.log(`  🎵 결과: ${completed.status} - ${completed.title}`);
                } else {
                    results.push({
                        index: i + 1,
                        inputTitle: item.title || `Track ${i + 1}`,
                        inputPrompt: item.prompt,
                        status: 'error',
                        error: 'Suno가 클립을 반환하지 않았습니다.'
                    });
                }
            } catch (err) {
                console.error(`  ❌ Error: ${err.message}`);
                results.push({
                    index: i + 1,
                    inputTitle: item.title || `Track ${i + 1}`,
                    inputPrompt: item.prompt,
                    status: 'error',
                    error: err.message
                });
            }

            // ── Rate Limit 방지: 마지막 요청이 아니면 딜레이 ──
            if (i < prompts.length - 1) {
                console.log(`  ⏰ ${SUNO_DELAY}ms 대기 중...`);
                await sleep(SUNO_DELAY);
            }
        }

        // ── 3. 결과 반환 ──
        const successCount = results.filter(r => r.status === 'complete').length;
        console.log(`\n🏁 Suno 생성 완료: ${successCount}/${prompts.length} 성공`);

        res.json({
            success: true,
            total: prompts.length,
            completed: successCount,
            results: results
        });

    } catch (err) {
        console.error('Suno generate error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Suno 음악 생성 중 알 수 없는 오류가 발생했습니다.'
        });
    }
});

/**
 * 🔍 GET /api/suno-status
 * Suno 연결 상태 확인 (쿠키 유효성 체크)
 */
app.get('/api/suno-status', async (req, res) => {
    try {
        if (!SUNO_COOKIE || SUNO_COOKIE === '여기에_suno_쿠키를_붙여넣으세요') {
            return res.json({ connected: false, reason: 'SUNO_COOKIE not configured' });
        }

        // Suno 피드 API로 연결 테스트
        const response = await fetch(`${SUNO_BASE_URL}/api/feed/?page=0`, {
            method: 'GET',
            headers: getSunoHeaders()
        });

        if (response.ok) {
            res.json({ connected: true, status: 'active' });
        } else {
            res.json({ connected: false, reason: `API returned ${response.status}`, hint: '쿠키가 만료되었을 수 있습니다. .env의 SUNO_COOKIE를 갱신해주세요.' });
        }
    } catch (err) {
        res.json({ connected: false, reason: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🚀 서버 시작 (Local) & Export (Vercel)
// ═══════════════════════════════════════════════════════════════

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   🎵 Global Plly Master Server                           ║
    ║                                                          ║
    ║   🖥️  Local  : http://localhost:${PORT}                    ║
    ║   🌐  Deploy : https://global-plly-master.vercel.app/   ║
    ║                                                          ║
    ║   🐟 코다리 개발부장 — 충성스럽게 서빙 중!              ║
    ║   🌸 영자 실장       — 디자인 곱게 신경 중!             ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
    });
}

// Vercel Serverless Function을 위한 Export
module.exports = app;
