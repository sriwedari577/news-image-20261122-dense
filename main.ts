import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const PAPER = [246, 241, 227];
const INK = [17, 17, 17];
const WHITE = [255, 255, 255];
const RED = [178, 34, 34];
const DARKRED = [140, 20, 20];
const BLUE = [30, 70, 120];
const OCEAN = [168, 198, 216];
const LAND = [227, 211, 150];
const GREEN = [27, 94, 32];
const GOLD = [198, 154, 0];
const GREY = [90, 86, 76];

const buf = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) { buf[i * 3] = PAPER[0]; buf[i * 3 + 1] = PAPER[1]; buf[i * 3 + 2] = PAPER[2]; }

function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const o = (yy * W + xx) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
  }
}
function hline(x, y, w, c, t) { fillRect(x, y, w, t, c); }
function box(x, y, w, h, fill, border, bt) {
  fillRect(x, y, w, h, fill);
  fillRect(x, y, w, bt, border); fillRect(x, y + h - bt, w, bt, border);
  fillRect(x, y, bt, h, border); fillRect(x + w - bt, y, bt, h, border);
}
function fillCircle(cx, cy, r, c) {
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    if (xx * xx + yy * yy <= r * r) fillRect(cx + xx, cy + yy, 1, 1, c);
  }
}
function fillPoly(pts, c) {
  let minY = 1e9, maxY = -1e9;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
  }
}

const FONT = {
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  'D': ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000']
};
function adv(scale) { return 5 * scale + 1; }
function textWidth(t, scale) { if (!t) return 0; return t.length * adv(scale) - 1; }
function drawChar(x, y, ch, scale, c) {
  const g = FONT[ch] || FONT['?'];
  for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
    if (g[r][col] === '1') fillRect(x + col * scale, y + r * scale, scale, scale, c);
  }
}
function drawText(x, y, t, scale, c) {
  let cx = x;
  for (const ch of t) { drawChar(cx, y, ch, scale, c); cx += adv(scale); }
  return cx;
}
function wrapText(t, maxW, scale) {
  const words = t.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? cur + ' ' + w : w;
    if (textWidth(cand, scale) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(x, y, t, scale, c, maxW, lh) {
  const lines = wrapText(t, maxW, scale);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lh, lines[i], scale, c);
  return lines.length;
}
function drawStatus(x, y, status) {
  const label = status;
  const w = textWidth(label, 1) + 10;
  const h = 11;
  if (status === 'CONFIRMED') { fillRect(x, y, w, h, GREEN); drawText(x + 5, y + 2, label, 1, WHITE); }
  else if (status === 'CLAIM') { fillRect(x, y, w, h, RED); drawText(x + 5, y + 2, label, 1, WHITE); }
  else { fillRect(x, y, w, h, WHITE); box(x, y, w, h, WHITE, INK, 1); drawText(x + 5, y + 2, label, 1, INK); }
  return w;
}

const STORIES = [
  { n: 1, title: 'COP31 TALKS COLLAPSE WITH NO DEAL IN ANTALYA', status: 'REPORTED', region: 'CLIMATE / TURKIYE', time: '', deck: 'COP31 IN ANTALYA ENDED SUNDAY WITH NO FULL DEAL AFTER THE EU AND DOZENS OF STATES REJECTED THE FINAL DRAFT.' },
  { n: 2, title: 'DYMER DRONE STRIKE FLATTENS FLAT BLOCK, 4 DEAD', status: 'REPORTED', region: 'UKRAINE', time: '03:00 UTC', deck: 'A RUSSIAN DRONE HIT A FIVE-STOREY BLOCK IN DYMER ON SUNDAY MORNING, KILLING AT LEAST FOUR. 10-14 FEARED TRAPPED.' },
  { n: 3, title: 'DRONE HITS VYSHNEVE SUPERMARKET, 3 KILLED', status: 'REPORTED', region: 'UKRAINE', time: '16:49 UTC', deck: 'A SHAHED DRONE HIT THE NOVUS SUPERMARKET IN VYSHNEVE ON SUNDAY EVENING, KILLING THREE AND INJURING 13-15.' },
  { n: 4, title: 'RUSSIA FIRES 186 DRONES; 161 DOWNED, AIR FORCE SAYS', status: 'CONFIRMED', region: 'UKRAINE', time: '06:00 UTC', deck: '186 LAUNCHED. 161 DOWNED.' },
  { n: 5, title: 'ODESA GRID CRIPPLED; SCHOOLS GO REMOTE FOR A WEEK', status: 'REPORTED', region: 'UKRAINE', time: '', deck: 'SCHOOLS REMOTE 23-27 NOV.' },
  { n: 6, title: 'POLAND: ALL THREE OBJECTS WERE RUSSIAN KH-101S', status: 'CONFIRMED', region: 'EUROPE', time: '', deck: 'ALL THREE WERE KH-101S.' },
  { n: 7, title: 'SEA DRONES HIT RUSSIAN CORVETTE OFF LIBYA', status: 'REPORTED', region: 'LIBYA', time: '', deck: 'MERKURY HIT OFF LIBYA.' },
  { n: 8, title: 'SPARTA II TOWED OUT AFTER BALTIC DRONE FIRE', status: 'CONFIRMED', region: 'BALTIC / FINLAND', time: '', deck: 'SPARTA II TOWED OUT SUNDAY.' },
  { n: 9, title: 'SIX KILLED IN GAZA STRIKES IN 24 HOURS', status: 'REPORTED', region: 'MIDDLE EAST', time: '', deck: '6 KILLED, 33 WOUNDED.' },
  { n: 10, title: 'SETTLERS TORCH CARS IN FOUR WEST BANK VILLAGES', status: 'REPORTED', region: 'MIDDLE EAST', time: '', deck: 'CARS TORCHED IN 4 VILLAGES.' },
  { n: 11, title: 'DRONES HIT UN PREMISES IN KHARTOUM', status: 'REPORTED', region: 'AFRICA', time: '00:00 UTC', deck: 'UN PREMISES HIT IN KHARTOUM.' },
  { n: 12, title: 'HOUTHIS CLAIM DIRECT HIT ON RABIGH REFINERY', status: 'CLAIM', region: 'MIDDLE EAST', time: '', deck: 'HOUTHIS CLAIMED RABIGH HIT.' },
  { n: 13, title: 'IRAN CLAIMS TWO TANKERS HIT MINES OFF HORMUZ', status: 'CLAIM', region: 'GULF', time: '', deck: 'CLAIMED TANKERS HIT MINES.' },
  { n: 14, title: 'IRGC CLAIMS US MQ-1 DRONE DOWNED OFF HORMUZ', status: 'CLAIM', region: 'GULF', time: '', deck: 'IRGC CLAIMED A US MQ-1 WAS DOWNED. UNVERIFIED.' },
  { n: 15, title: 'BAHRAIN: TWO INJURED IN IRAN ATTACK, MINISTRY SAYS', status: 'REPORTED', region: 'GULF', time: '', deck: 'TWO INJURED IN IRAN ATTACK, MINISTRY SAID.' },
  { n: 16, title: '24 BODY BAGS REMOVED FROM JAVA FACTORY RUINS', status: 'REPORTED', region: 'SE ASIA', time: '', deck: '24 BODY BAGS FROM CIKANDE FACTORY RUINS SUNDAY.' },
  { n: 17, title: 'NIGERIA BOAT TOLL RISES TO 24, NEMA SAYS', status: 'CONFIRMED', region: 'AFRICA', time: '07:34 UTC', deck: 'NEMA: 24 DEAD AFTER BOAT CAPSIZED IN BAYELSA.' },
  { n: 18, title: 'M5.4 AFTERSHOCK SHAKES CENTRAL PERU', status: 'CONFIRMED', region: 'S AMERICA', time: '21:35 UTC', deck: 'M5.4 AFTERSHOCK. INDECI: 1 DEAD, 853 DISPLACED.' },
  { n: 19, title: 'M5.4 QUAKE STRIKES MALUKU SEA OFF SULAWESI', status: 'CONFIRMED', region: 'SE ASIA', time: '07:54 UTC', deck: 'M5.4, 44 KM DEEP IN MALUKU SEA. NO DAMAGE REPORT.' },
  { n: 20, title: 'SEOUL EDUCATION MINISTER QUITS OVER EXAM CHAOS', status: 'CONFIRMED', region: 'E ASIA', time: '02:30 UTC', deck: 'CHOI QUIT OVER CSAT CHAOS. LEE ACCEPTED IN AN HOUR.' },
  { n: 21, title: 'US INTEL CHIEF CONFIRMS HUANG CHIP PROBE', status: 'REPORTED', region: 'N AMERICA', time: '', deck: 'CLAYTON CONFIRMED A PROBE INTO HUANG AND MEGASPEED.' },
  { n: 22, title: 'BESSENT WARNS FED AGAINST OVER-TIGHTENING', status: 'REPORTED', region: 'N AMERICA', time: '', deck: 'BESSENT: OVER-TIGHTENING WOULD BE A POLICY MISTAKE.' },
  { n: 23, title: 'CHINA CUTS STOCK MARGIN RATIO TO 80%', status: 'CONFIRMED', region: 'E ASIA', time: '', deck: 'MARGIN CUT FROM 100% TO 80% FROM 30 NOVEMBER.' },
  { n: 24, title: 'DELTA OUTAGE DELAYS 1,600+ FLIGHTS IN US', status: 'CONFIRMED', region: 'N AMERICA', time: '12:46 UTC', deck: 'OUTAGE DELAYED 1,600+ FLIGHTS. DELTA: NOT A HACK.' },
  { n: 25, title: 'ARMY TO DETONATE TOXIC LEAD DESPITE COURT HALT', status: 'REPORTED', region: 'N AMERICA', time: '', deck: '68 TOXIC LEAD BARRELS TO BE DETONATED BY TUESDAY.' },
  { n: 26, title: 'ABC CONFIRMS FBI CRIME DATABASE WAS HACKED', status: 'REPORTED', region: 'N AMERICA', time: '', deck: 'SOURCES TOLD ABC THE FBI NCIC DATABASE WAS HACKED.' },
  { n: 27, title: 'SEA-TAC PROTESTS OVER ICE JETWAY ARRESTS', status: 'REPORTED', region: 'N AMERICA', time: '', deck: 'PROTESTS AT SEA-TAC OVER SATURDAY JETWAY ARRESTS.' },
  { n: 28, title: 'BASRA FIRE INJURED TOLL RISES TO ABOUT 46', status: 'REPORTED', region: 'MIDDLE EAST', time: '', deck: 'BASRA FIRE INJURED TOLL ROSE TO ABOUT 46 SUNDAY.' },
  { n: 29, title: 'ALCARAZ BEATS ZVEREV FOR FIRST ATP FINALS TITLE', status: 'CONFIRMED', region: 'ITALY', time: '', deck: 'ALCARAZ BEAT ZVEREV 6-2, 7-6 (9-7) IN TURIN.' },
  { n: 30, title: 'LIVERPOOL THRASH MAN UTD 4-0 AT ANFIELD', status: 'CONFIRMED', region: 'ENGLAND', time: '16:30 UTC', deck: 'YORO OFF IN 8TH MINUTE AS LIVERPOOL WON 4-0.' },
  { n: 31, title: 'HULL STUN BRIGHTON 2-0 WITH LATE DOUBLE', status: 'CONFIRMED', region: 'ENGLAND', time: '', deck: 'MCBURNIE SCORED TWICE LATE AS HULL WON 2-0.' },
  { n: 32, title: 'SIMEONE SETS LA LIGA WINS RECORD AT GETAFE', status: 'CONFIRMED', region: 'SPAIN', time: '', deck: "SIMEONE'S 345TH LA LIGA WIN PASSED ARAGONES." },
  { n: 33, title: 'BARCELONA RALLY FROM 2-0 DOWN TO BEAT VILLARREAL', status: 'CONFIRMED', region: 'SPAIN', time: '', deck: 'BARCELONA WON 3-2 AFTER TRAILING VILLARREAL 2-0.' },
  { n: 34, title: 'ATALANTA AND INTER DRAW 4-4 THRILLER', status: 'CONFIRMED', region: 'ITALY', time: '', deck: 'ATALANTA CAME BACK FROM 4-2 DOWN TO DRAW 4-4.' },
  { n: 35, title: '49ERS ROUT VIKINGS 35-10 IN MEXICO CITY', status: 'CONFIRMED', region: 'N AMERICA', time: '', deck: '49ERS WON 35-10 IN MEXICO CITY ON SUNDAY.' },
  { n: 36, title: 'TRUMP HOSTS MEME-COIN DINNER AS TOKEN SLUMPS', status: 'REPORTED', region: 'N AMERICA', time: '', deck: 'TRUMP HOSTED 185 HOLDERS AS TOKEN FELL ABOUT 99%.' }
];

// Outer border
fillRect(0, 0, W, 4, INK); fillRect(0, H - 4, W, 4, INK); fillRect(0, 0, 4, H, INK); fillRect(W - 4, 0, 4, H, INK);

// Header
drawText(12, 10, 'THE WORLD IN ONE PAGE', 1, GREY);
const hdrR = '36 STORIES - ONE DAY';
drawText(W - 12 - textWidth(hdrR, 1), 10, hdrR, 1, GREY);
const mast = 'SUNDAY 22 NOVEMBER 2026';
drawText(Math.floor((W - textWidth(mast, 6)) / 2), 14, mast, 6, INK);
const sub = 'ALL 36 STORIES HAPPENED OR WERE FIRST REPORTED ON 22 NOVEMBER 2026';
drawText(Math.floor((W - textWidth(sub, 2)) / 2), 60, sub, 2, INK);
hline(12, 76, 1000, RED, 3);

// Main cards 1-3
const MAIN_Y = 82, MAIN_H = 126;
for (let i = 0; i < 3; i++) {
  const s = STORIES[i];
  const x = 12 + i * 336, w = 328;
  box(x, MAIN_Y, w, MAIN_H, WHITE, INK, 2);
  drawStatus(x + 8, MAIN_Y + 6, s.status);
  const meta = s.time ? s.region + ' - ' + s.time : s.region;
  drawText(x + w - 8 - textWidth(meta, 1), MAIN_Y + 7, meta, 1, GREY);
  drawWrapped(x + 8, MAIN_Y + 18, s.title, 3, INK, w - 16, 24);
  drawWrapped(x + 8, MAIN_Y + 93, s.deck, 1, INK, w - 16, 9);
}

// Secondary cards 4-13: 2 cols x 5 rows, horizontal layout
const SEC_Y = 212, SEC_ROW_H = 48;
for (let i = 3; i < 13; i++) {
  const idx = i - 3;
  const col = idx % 2, row = Math.floor(idx / 2);
  const x = 12 + col * 502, y = SEC_Y + row * 51, w = 498;
  box(x, y, w, SEC_ROW_H, WHITE, INK, 1);
  drawText(x + 6, y + 6, String(STORIES[i].n) + '.', 2, RED);
  drawWrapped(x + 34, y + 4, STORIES[i].title, 2, INK, w - 42, 16);
  drawText(x + 34, y + 38, STORIES[i].deck, 1, GREY);
  drawStatus(x + w - 8 - (textWidth(STORIES[i].status, 1) + 10), y + 34, STORIES[i].status);
}

// Info row: DATE CHECK | MAP | REGION
const INFO_Y = 468, INFO_H = 64;
box(12, INFO_Y, 310, INFO_H, WHITE, INK, 1);
drawText(20, INFO_Y + 4, 'DATE CHECK', 2, RED);
drawWrapped(20, INFO_Y + 20, 'EVERY STORY HAPPENED OR WAS FIRST REPORTED ON SUNDAY 22 NOVEMBER 2026. CLAIMS ARE LABELLED CLAIM.', 1, INK, 294, 9);
box(330, INFO_Y, 340, INFO_H, WHITE, INK, 1);
drawText(338, INFO_Y + 3, 'WORLD MAP - PINS MARK THE DAY', 1, GREY);
const mx = 336, my = INFO_Y + 12, mw = 328, mh = 48;
fillRect(mx, my, mw, mh, OCEAN);
fillPoly([[mx + 18, my + 6], [mx + 70, my + 4], [mx + 78, my + 14], [mx + 62, my + 26], [mx + 40, my + 28], [mx + 22, my + 20], [mx + 14, my + 12]], LAND);
fillPoly([[mx + 48, my + 30], [mx + 66, my + 30], [mx + 62, my + 42], [mx + 50, my + 42]], LAND);
fillPoly([[mx + 150, my + 6], [mx + 172, my + 4], [mx + 178, my + 14], [mx + 162, my + 18], [mx + 150, my + 14]], LAND);
fillPoly([[mx + 152, my + 20], [mx + 176, my + 20], [mx + 172, my + 38], [mx + 158, my + 40], [mx + 150, my + 30]], LAND);
fillPoly([[mx + 180, my + 4], [mx + 260, my + 2], [mx + 272, my + 14], [mx + 250, my + 26], [mx + 200, my + 24], [mx + 182, my + 14]], LAND);
fillPoly([[mx + 262, my + 30], [mx + 292, my + 28], [mx + 296, my + 38], [mx + 268, my + 40]], LAND);
for (const p of [[60, 14], [55, 36], [172, 9], [166, 15], [164, 21], [208, 21], [156, 25], [235, 28], [280, 34], [168, 12]]) {
  fillCircle(mx + p[0], my + p[1], 4, WHITE); fillCircle(mx + p[0], my + p[1], 3, RED);
}
box(678, INFO_Y, 334, INFO_H, WHITE, INK, 1);
drawText(686, INFO_Y + 4, 'STORIES BY REGION', 2, INK);
drawWrapped(686, INFO_Y + 20, 'N AMERICA 8 - UKRAINE 4 - MIDDLE EAST 4 - GULF 3 - AFRICA 2 - SE ASIA 2 - E ASIA 2 - ENGLAND 2 - SPAIN 2 - ITALY 2 - TURKIYE 1 - EUROPE 1 - LIBYA 1 - BALTIC 1 - S AMERICA 1 - TOTAL 36', 1, INK, 318, 9);

// Numbers strip
const NUM_Y = 536, NUM_H = 26;
box(12, NUM_Y, 1000, NUM_H, INK, INK, 1);
drawText(20, NUM_Y + 3, 'THE DAY IN NUMBERS', 1, GOLD);
const nums = '186 DRONES | 161 DOWNED | 1,600+ FLIGHTS | 24 BODY BAGS | 80% MARGIN | 345 WINS';
drawText(Math.floor((W - textWidth(nums, 2)) / 2), NUM_Y + 11, nums, 2, WHITE);

// UTC timeline strip
const TIME_Y = 566, TIME_H = 24;
box(12, TIME_Y, 1000, TIME_H, WHITE, INK, 1);
const tl = 'UTC TIMELINE: 00:00 KHARTOUM - 02:30 SEOUL - 03:00 DYMER - 06:00 DRONES - 07:34 NIGERIA - 07:54 MALUKU - 12:46 DELTA - 16:30 LIVERPOOL - 16:49 VYSHNEVE - 21:35 PERU';
drawText(Math.floor((W - textWidth(tl, 1)) / 2), TIME_Y + 9, tl, 1, INK);

// ALSO header
drawText(12, 594, 'ALSO ON SUNDAY 22 NOVEMBER 2026', 2, INK);
const alsoR = 'STORIES 14-36';
drawText(W - 12 - textWidth(alsoR, 1), 597, alsoR, 1, GREY);
hline(12, 612, 1000, INK, 2);

// ALSO grid 14-36: 3 cols x 8 rows
const SHORT = {
  14: 'IRGC CLAIMED MQ-1 DOWNED. UNVERIFIED.',
  15: 'TWO INJURED, MINISTRY SAID.',
  16: '24 BODY BAGS FROM FACTORY RUINS.',
  17: 'NEMA: 24 DEAD IN BAYELSA.',
  18: 'M5.4 AFTERSHOCK NEAR CARHUAMAYO.',
  19: 'M5.4, 44 KM DEEP. NO DAMAGE.',
  20: 'CHOI QUIT. LEE ACCEPTED IN AN HOUR.',
  21: 'PROBE INTO HUANG AND MEGASPEED.',
  22: 'OVER-TIGHTENING WOULD BE A MISTAKE.',
  23: 'MARGIN 100% TO 80% FROM 30 NOV.',
  24: '1,600+ FLIGHTS DELAYED. NOT A HACK.',
  25: '68 LEAD BARRELS TO BE DETONATED.',
  26: 'ABC: FBI NCIC DATABASE WAS HACKED.',
  27: 'PROTESTS OVER JETWAY ARRESTS.',
  28: 'BASRA INJURED TOLL ROSE TO ABOUT 46.',
  29: 'ALCARAZ BEAT ZVEREV 6-2, 7-6 (9-7).',
  30: 'YORO OFF EARLY. LIVERPOOL WON 4-0.',
  31: 'MCBURNIE DOUBLE SEALED HULL WIN 2-0.',
  32: '345TH WIN PASSED ARAGONES RECORD.',
  33: 'BARCELONA WON 3-2 FROM 2-0 DOWN.',
  34: 'ATALANTA DREW 4-4 FROM 4-2 DOWN.',
  35: '49ERS WON 35-10 IN MEXICO CITY.',
  36: '185 HOLDERS HOSTED AS TOKEN FELL 99%.'
};
const ALSO_Y = 616, ALSO_ROW_H = 46;
for (let i = 13; i < 36; i++) {
  const idx = i - 13;
  const col = idx % 3, row = Math.floor(idx / 3);
  const x = 12 + col * 336, y = ALSO_Y + row * 48, w = 328;
  box(x, y, w, ALSO_ROW_H, WHITE, INK, 1);
  drawText(x + 5, y + 6, String(STORIES[i].n) + '.', 1, RED);
  drawWrapped(x + 24, y + 3, STORIES[i].title, 2, INK, w - 32, 16);
  drawText(x + 24, y + 37, SHORT[STORIES[i].n], 1, GREY);
  drawStatus(x + w - 8 - (textWidth(STORIES[i].status, 1) + 10), y + 34, STORIES[i].status);
}

// Footer
const foot = 'DRAWN PROGRAMMATICALLY - NO EXTERNAL ASSETS - DETERMINISTIC - 36 STORIES, ALL DATED 22 NOVEMBER 2026';
drawText(Math.floor((W - textWidth(foot, 1)) / 2), 1004, foot, 1, GREY);

// PNG encoder (RGB, filter 0, zlib level 9, deterministic)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(type, 4); out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
const ihdr = new Uint8Array(13);
{
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
}
const raw = new Uint8Array(H * (1 + W * 3));
for (let y = 0; y < H; y++) { raw[y * (1 + W * 3)] = 0; raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1); }
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.from(chunk(Buffer.from('IHDR'), ihdr)),
  Buffer.from(chunk(Buffer.from('IDAT'), new Uint8Array(idat))),
  Buffer.from(chunk(Buffer.from('IEND'), new Uint8Array(0)))
]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
