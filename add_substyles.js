const fs = require('fs');
const path = 'server.js';
let content = fs.readFileSync(path, 'utf8');

// 삽입할 새 세부스타일 블록 (afrobeats 뒤, }; 앞에 추가)
const newStyles = `
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
`;

// afrobeats 블록 끝(],) 뒤에 };가 나오는 부분을 찾아서 교체
const marker = `    afrobeats: [
        { id: 'afropop', label: '☀️ 아프로팝', tag: 'Afropop, Wizkid style, smooth, rhythmic, party vibes', desc: '위즈키드 스타일의 아프로팝' },
        { id: 'amapiano', label: '🥁 아마피아노', tag: 'Amapiano, log drum, soulful piano, South African', desc: '남아공 아마피아노' },
    ],\r\n};`;

const replacement = `    afrobeats: [
        { id: 'afropop', label: '☀️ 아프로팝', tag: 'Afropop, Wizkid style, smooth, rhythmic, party vibes', desc: '위즈키드 스타일의 아프로팝' },
        { id: 'amapiano', label: '🥁 아마피아노', tag: 'Amapiano, log drum, soulful piano, South African', desc: '남아공 아마피아노' },
    ],` + newStyles + `};`;

if (!content.includes('afrobeats: [')) {
    console.error('마커를 찾지 못했습니다!');
    process.exit(1);
}

// 이미 phonk: 가 추가되어 있으면 스킵
if (content.includes("    phonk: [")) {
    console.log('이미 phonk 스타일이 존재합니다. 스킵합니다.');
    process.exit(0);
}

// \r\n 처리
const markerNorm = marker.replace(/\r\n/g, '\n');
const contentNorm = content.replace(/\r\n/g, '\n');
const replacementNorm = replacement.replace(/\r\n/g, '\n');

if (!contentNorm.includes(markerNorm)) {
    console.error('정규화 후에도 마커를 찾지 못했습니다!');
    // 디버그: 마커 주변 찾기
    const idx = contentNorm.indexOf('afrobeats: [');
    console.log('afrobeats 위치:', idx);
    console.log('주변 내용:', contentNorm.substring(idx, idx + 400));
    process.exit(1);
}

const result = contentNorm.replace(markerNorm, replacementNorm);
fs.writeFileSync(path, result);
console.log('✅ 세부 스타일 추가 완료!');
