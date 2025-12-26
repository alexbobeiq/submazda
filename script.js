const canvas = document.getElementById('skyCanvas');
const ctx = canvas.getContext('2d');

let w, h;
let scale = 950; 
let viewAz = Math.PI; 
let viewAlt = 0.45;    
let isDragging = false;
let startX, startY, startAz, startAlt;
let shootingStar = null;
let isRunning = false; 

// 1. STAR DATA
const realStars = [
    // WINTER (South)
    { id: 'betelgeuse', name: "Betelgeuse", ra: 5.91, dec: 7.4, mag: 0.45, color: '#ffaa8a' },
    { id: 'rigel', name: "Rigel", ra: 5.24, dec: -8.2, mag: 0.12, color: '#cceeff' },
    { id: 'bellatrix', name: "Bellatrix", ra: 5.41, dec: 6.3, mag: 1.6, color: '#cceeff' },
    { id: 'saiph', name: null, ra: 5.79, dec: -9.6, mag: 2.0, color: '#cceeff' },
    { id: 'belt1', name: null, ra: 5.68, dec: -1.9, mag: 1.7, color: '#fff' },
    { id: 'belt2', name: null, ra: 5.60, dec: -1.2, mag: 1.6, color: '#fff' },
    { id: 'belt3', name: null, ra: 5.53, dec: -0.3, mag: 2.2, color: '#fff' },
    { id: 'sirius', name: "Sirius", ra: 6.75, dec: -16.7, mag: -1.46, color: '#cceeff' },
    { id: 'mirzam', name: null, ra: 6.37, dec: -17.9, mag: 1.9, color: '#cceeff' },
    { id: 'wezen', name: null, ra: 7.13, dec: -26.4, mag: 1.8, color: '#fff' },
    { id: 'adhara', name: null, ra: 6.98, dec: -28.9, mag: 1.5, color: '#cceeff' },
    { id: 'aldebaran', name: "Aldebaran", ra: 4.60, dec: 16.5, mag: 0.85, color: '#ffcc99' },
    { id: 'elnath', name: "El Nath", ra: 5.43, dec: 28.6, mag: 1.6, color: '#cceeff' },
    { id: 'pollux', name: "Pollux", ra: 7.75, dec: 28.0, mag: 1.1, color: '#ffcc99' },
    { id: 'castor', name: "Castor", ra: 7.58, dec: 31.9, mag: 1.9, color: '#fff' },
    { id: 'capella', name: "Capella", ra: 5.27, dec: 46.0, mag: 0.08, color: '#ffebb0' },
    { id: 'procyon', name: "Procyon", ra: 7.65, dec: 5.2, mag: 0.38, color: '#fff' },
    // NORTH
    { id: 'dubhe', name: "Dubhe", ra: 11.06, dec: 61.7, mag: 1.8, color: '#ffcc99' },
    { id: 'merak', name: "Merak", ra: 11.03, dec: 56.3, mag: 2.3, color: '#fff' },
    { id: 'phecda', name: null, ra: 11.89, dec: 53.6, mag: 2.4, color: '#fff' },
    { id: 'megrez', name: null, ra: 12.25, dec: 57.0, mag: 3.3, color: '#fff' },
    { id: 'alioth', name: null, ra: 12.90, dec: 55.9, mag: 1.7, color: '#fff' },
    { id: 'mizar', name: "Mizar", ra: 13.39, dec: 54.9, mag: 2.2, color: '#fff' },
    { id: 'alkaid', name: "Alkaid", ra: 13.79, dec: 49.3, mag: 1.8, color: '#cceeff' },
    { id: 'polaris', name: "Polaris", ra: 2.53, dec: 89.2, mag: 1.9, color: '#ffebb0' },
    { id: 'kochab', name: "Kochab", ra: 14.84, dec: 74.1, mag: 2.0, color: '#ffcc99' },
    // SUMMER
    { id: 'vega', name: "Vega", ra: 18.62, dec: 38.78, mag: 0.03, color: '#cceeff' },
    { id: 'deneb', name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.25, color: '#cceeff' },
    { id: 'altair', name: "Altair", ra: 19.84, dec: 8.87, mag: 0.77, color: '#cceeff' },
    // OTHERS
    { id: 'regulus', name: "Regulus", ra: 10.13, dec: 11.9, mag: 1.3, color: '#cceeff' },
    { id: 'alpheratz', name: "Alpheratz", ra: 0.13, dec: 29.0, mag: 2.0, color: '#cceeff' },
    // PLANETS
    { id: 'mars', name: "Mars", ra: 8.15, dec: 24.5, mag: -0.5, color: '#ff5533', planet: true },
    { id: 'jupiter', name: "Jupiter", ra: 4.30, dec: 21.5, mag: -2.6, color: '#fff0cc', planet: true },
];

const constellations = [
    ['betelgeuse', 'bellatrix'], ['bellatrix', 'belt3'], ['betelgeuse', 'belt1'], ['belt1', 'belt2'], ['belt2', 'belt3'], ['belt3', 'rigel'], ['belt1', 'saiph'], ['rigel', 'saiph'],
    ['sirius', 'mirzam'], ['mirzam', 'wezen'], ['wezen', 'adhara'], ['sirius', 'adhara'],
    ['aldebaran', 'elnath'], ['castor', 'pollux'], ['capella', 'elnath'],
    ['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid'], ['dubhe', 'megrez'],
    ['polaris', 'kochab'],
    ['vega', 'deneb'], ['deneb', 'altair'], ['altair', 'vega'],
    ['regulus', 'alpheratz']
];

// 2. BACKGROUND STARS
const bgStars = [];
for(let i=0; i<4000; i++) {
    bgStars.push({ 
        ra: Math.random()*24, 
        dec: (Math.random()*180)-90, 
        mag: 3+Math.random()*4, 
        opacity: 0.3+Math.random()*0.5,
        twinkleOffset: Math.random() * 100 
    });
}
for(let i=0; i<7000; i++) {
    let ra = Math.random() * 24;
    let centerDec = 60 * Math.sin((ra / 24) * Math.PI * 2 - 1); 
    let spread = (Math.random()-0.5) + (Math.random()-0.5); 
    let dec = centerDec + (spread * 25);
    let alpha = Math.max(0, 0.5 - Math.abs(spread) * 0.4);
    bgStars.push({ 
        ra: ra, 
        dec: dec, 
        mag: 4.5+Math.random()*2, 
        opacity: alpha,
        twinkleOffset: Math.random() * 100 
    });
}

// 3. MATH (Targoviste)
const LAT = 44.9254 * (Math.PI / 180);
const LST = 3.5; 

function getSkyPosition(ra, dec) {
    const raRad = ra * 15 * (Math.PI / 180); const decRad = dec * (Math.PI / 180);
    let ha = (LST - ra) * 15 * (Math.PI/180);
    const sinDec = Math.sin(decRad); const cosDec = Math.cos(decRad);
    const sinLat = Math.sin(LAT); const cosLat = Math.cos(LAT);
    const cosHA = Math.cos(ha); const sinHA = Math.sin(ha);
    const sinAlt = sinDec * sinLat + cosDec * cosLat * cosHA;
    const alt = Math.asin(sinAlt);
    const cosAz = (sinDec - sinAlt * sinLat) / (Math.cos(alt) * cosLat);
    const sinAz = (-cosDec * sinHA) / Math.cos(alt);
    let az = Math.atan2(sinAz, cosAz); if (az < 0) az += 2 * Math.PI;
    return { alt, az };
}

function project(alt, az) {
    let dAz = az - viewAz;
    while (dAz > Math.PI) dAz -= 2*Math.PI;
    while (dAz < -Math.PI) dAz += 2*Math.PI;
    
    const x = w/2 + dAz * scale; 
    const y = h/2 - (alt - viewAlt) * scale;
    
    const isVisible = (x > -50 && x < w + 50 && y > -50 && y < h + 50);
    return { x: x, y: y, visible: isVisible };
}

// 4. DRAW
function draw() {
    ctx.clearRect(0, 0, w, h);
    const horizY = h/2 + viewAlt * scale;
    
    // Ground
    ctx.fillStyle = '#000'; ctx.fillRect(0, horizY, w, h);
    
    // Subtle Horizon Glow
    const grad = ctx.createLinearGradient(0, horizY - 100, 0, horizY);
    grad.addColorStop(0, 'rgba(5, 10, 20, 0)'); 
    grad.addColorStop(1, 'rgba(10, 15, 30, 0.8)');
    ctx.fillStyle = grad; 
    ctx.fillRect(0, horizY - 100, w, 100);

    // Background
    ctx.fillStyle = '#8fa';
    bgStars.forEach(star => {
        const pos = getSkyPosition(star.ra, star.dec);
        if (pos.alt > 0) {
            const scr = project(pos.alt, pos.az);
            if (scr.visible) {
                let twinkle = 0.5 + Math.sin(Date.now() * 0.003 + star.twinkleOffset) * 0.5;
                ctx.fillStyle = `rgba(220, 230, 255, ${star.opacity * twinkle})`;
                ctx.fillRect(scr.x, scr.y, 1.5, 1.5);
            }
        }
    });

    drawShootingStar();

    // Real Stars Calculation
    const starPos = {};
    realStars.forEach(s => {
        const p = getSkyPosition(s.ra, s.dec);
        if (p.alt > -0.2) starPos[s.id] = project(p.alt, p.az);
    });

    // Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    constellations.forEach(pair => {
        const p1 = starPos[pair[0]]; 
        const p2 = starPos[pair[1]];
        if (p1 && p2) {
            const dist = Math.abs(p1.x - p2.x);
            if (dist < 2000) {
                ctx.moveTo(p1.x, p1.y); 
                ctx.lineTo(p2.x, p2.y);
            }
        }
    });
    ctx.stroke();

    // Stars
    realStars.forEach(star => {
        const scr = starPos[star.id];
        if (scr && scr.visible) {
            const r = Math.max(1.5, (3 - star.mag) * 2.5);
            const g = ctx.createRadialGradient(scr.x, scr.y, 0, scr.x, scr.y, r * 5);
            g.addColorStop(0, star.color);
            g.addColorStop(0.3, 'rgba(255,255,255,0.1)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(scr.x, scr.y, r * 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(scr.x, scr.y, r * 0.4, 0, Math.PI*2); ctx.fill();

            if (star.name && star.mag < 1.0) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '300 12px Montserrat';
                ctx.fillText(star.name, scr.x + 12, scr.y + 4);
            }
        }
    });
}

function drawShootingStar() {
    if (!shootingStar && Math.random() < 0.001) { 
        shootingStar = { x: Math.random() * w, y: Math.random() * h, len: 0, speed: 7 + Math.random() * 5, angle: Math.random() * Math.PI * 2 };
    }
    if (shootingStar) {
        shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
        shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
        shootingStar.len += 2;
        const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.len;
        const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.len;
        const grad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
        grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y); ctx.lineTo(tailX, tailY); ctx.stroke();
        if (shootingStar.len > 150 || shootingStar.x < -50 || shootingStar.x > w+50 || shootingStar.y < -50 || shootingStar.y > h+50) {
            shootingStar = null;
        }
    }
}

// 5. INTERACTION & START
function startExperience() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const intro = document.getElementById('intro');
    intro.style.opacity = '0';
    if (!isRunning) { isRunning = true; animate(); }
    setTimeout(() => {
        intro.style.display = 'none';
        document.getElementById('card').style.opacity = '1';
        document.getElementById('hint').style.opacity = '1';
    }, 1500);
}

function animate() {
    if(isRunning) { draw(); requestAnimationFrame(animate); }
}

canvas.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX; startY = e.clientY; startAz = viewAz; startAlt = viewAlt; document.getElementById('hint').style.opacity = '0'; });
window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    viewAz = startAz - (e.clientX - startX) / scale;
    viewAlt = startAlt + (e.clientY - startY) / scale;
    viewAlt = Math.max(-0.2, Math.min(1.5, viewAlt));
});
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });