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

    // 악기 랜덤 선택 (2개만 - 간결하게)
    const selectedInstruments = shuffleArray(countryData.instruments).slice(0, 2);

    // 스케일 랜덤 선택 (1개)
    const selectedScale = countryData.scales[Math.floor(Math.random() * countryData.scales.length)];

    // 국가 바이브 랜덤 선택 (1개)
    const selectedVibe = countryData.vibes[Math.floor(Math.random() * countryData.vibes.length)];

    // ═══ Style of Music 프롬프트 조합 (Suno AI 200자 제한 준수) ═══
    const styleParts = [
        ...genreData.tags.slice(0, 2),      // 장르 태그 2개
        selectedVibe,                         // 국가 바이브 1개
        moodData.tags[0],                     // 무드 태그 1개
        `${tempoData.label} tempo`,           // 템포
        `${selectedInstruments.join(', ')}`,  // 악기 2개
        selectedScale,                        // 스케일
    ];

    // 200자 제한에 맞게 트리밍
    let styleOfMusic = styleParts.join(', ');
    if (styleOfMusic.length > 198) {
        styleOfMusic = styleOfMusic.substring(0, 198).replace(/,\s*$/, '');
    }

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
// � 인증 미들웨어
// ═══════════════════════════════════════════════════════════════

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(403).json({ success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
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
            const token = jwt.sign({ id: 'admin', username: ADMIN_USERNAME, role: 'admin', realName: '관리자' }, JWT_SECRET, { expiresIn: '24h' });
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

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, realName: user.real_name }, JWT_SECRET, { expiresIn: '24h' });
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

// 🎯 배치 프롬프트 생성 API (N개 한번에 생성)
app.post('/api/generate-batch', async (req, res) => {
    try {
        const { country, genre, mood, tempo, count = 10 } = req.body;
        if (!country || !genre || !mood || !tempo) {
            return res.status(400).json({ success: false, error: '모든 파라미터를 입력해 주세요' });
        }

        const batchCount = Math.min(Math.max(parseInt(count) || 10, 1), 10); // 1~10개 제한
        const results = [];

        for (let i = 0; i < batchCount; i++) {
            const result = generateSunoPrompt(country, genre, mood, tempo);
            results.push({
                index: i + 1,
                prompt: result.prompt,
                title: result.titleSuggestions[0],
                metaTags: result.metaTags,
                fullPrompt: result.fullPrompt
            });
        }

        res.json({ success: true, count: batchCount, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
// 🚀 서버 시작 (Local) & Export (Vercel)
// ═══════════════════════════════════════════════════════════════

if (process.env.NODE_ENV !== 'production') {
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
}

// Vercel Serverless Function을 위한 Export
module.exports = app;
