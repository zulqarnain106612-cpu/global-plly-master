const fs = require('fs');
const path = 'server.js';
let content = fs.readFileSync(path, 'utf8');

// 이미 추가되었으면 스킵
if (content.includes("    phonk: [\n        { name: 'Ghostemane'")) {
    console.log('이미 추가됨. 스킵합니다.');
    process.exit(0);
}

const newArtists = `
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
`;

// ballad 배열 끝(],\n};) 앞에 삽입
const marker = `    ballad: [\n        { name: 'IU', emoji: '🌙' },\n        { name: 'Adele', emoji: '💔' },\n        { name: 'Sam Smith', emoji: '🌹' },\n        { name: 'Paul Kim', emoji: '🎹' },\n        { name: 'Lim Chang-jung', emoji: '🌊' },\n    ],\n};`;

const replacement = `    ballad: [\n        { name: 'IU', emoji: '🌙' },\n        { name: 'Adele', emoji: '💔' },\n        { name: 'Sam Smith', emoji: '🌹' },\n        { name: 'Paul Kim', emoji: '🎹' },\n        { name: 'Lim Chang-jung', emoji: '🌊' },\n    ],` + newArtists + `};\n`;

// \r\n 정규화 후 찾기/교체
const norm = s => s.replace(/\r\n/g, '\n');
const contentNorm = norm(content);
const markerNorm = norm(marker);

if (!contentNorm.includes(markerNorm)) {
    console.error('마커를 찾지 못했습니다. 현재 ballad 부분:');
    const idx = contentNorm.indexOf('ballad: [');
    console.log(contentNorm.substring(idx, idx + 300));
    process.exit(1);
}

const result = contentNorm.replace(markerNorm, norm(replacement));
fs.writeFileSync(path, result);
console.log('✅ 아티스트 추가 완료!');
