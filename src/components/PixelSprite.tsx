// Попиксельные спрайты — пиксель-в-пиксель через позиционирование

type Palette = Record<string, string>;

function draw(map: string[], palette: Palette, px: number) {
  const cells: JSX.Element[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      const color = palette[c];
      if (!color) continue;
      cells.push(<span key={`${x}-${y}`} style={{ position: 'absolute', left: x * px, top: y * px, width: px, height: px, backgroundColor: color }} />);
    }
  });
  const w = Math.max(...map.map(r => r.length));
  return { cells, w, h: map.length };
}

// ── ЧЕЛОВЕЧКИ ──
const HUMAN = ['..HH..', '.HEEH.', '.HSSH.', '..SS..', '.BCCB.', 'B.CC.B', '..LL..', '.L..L.'];
const HUMAN_FLIP = [...HUMAN].reverse();
const NATIVE = ['..F...', '.HFH..', '.REER.', '.HSSH.', '..SS..', '.BCCB.', 'B.CC.B', '..LL..'];
const HUMAN_PAINT = ['..HH..', '.HEEH.', '.HSSH.', '..SS..', '.BCCB.', 'B.CCAB', '..LL..', '.L..L.'];
const HUMAN_DIG   = ['..HH..', '.HEEH.', '.HSSH.', '..SS..', '.BCCB.', 'B.CC.B', '..LLLL', '..L...'];
const HUMAN_CHOP  = ['..HH..', '.HEEH.', '.HSSH.', '..SS..', '.BCCBA', 'B.CC.A', '..LL..', '.L..L.'];
type Mode = 'human' | 'flip' | 'native';

export function Person({
  color, skin = '#e8b98a', mode = 'human', px = 3, facing = 1,
  isPainting = false, isDigging = false, isChopping = false,
}: {
  color: string; skin?: string; mode?: Mode; px?: number; facing?: 1 | -1;
  isPainting?: boolean; isDigging?: boolean; isChopping?: boolean;
}) {
  const palette: Palette = { H: '#1a1a2e', E: '#0d0d1a', S: skin, C: color, B: color, L: '#3a2a1a', F: '#ff4d6d', R: '#c04dff', A: '#d0c080' };
  const map = isPainting ? HUMAN_PAINT : isDigging ? HUMAN_DIG : isChopping ? HUMAN_CHOP
    : mode === 'flip' ? HUMAN_FLIP : mode === 'native' ? NATIVE : HUMAN;
  const { cells, w, h } = draw(map, palette, px);
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px, transform: `scaleX(${facing})`, imageRendering: 'pixelated' }}>
      {cells}
    </span>
  );
}

// ── МУСОР ──
const TRASH_MAPS = [['.a.', 'aaa', '.a.'], ['b.b', '.bb', 'b..'], ['..c', '.cc', 'c..'], ['.d.', 'dd.', '..d']];
export function Trash({ variant = 0, px = 2 }: { variant?: number; px?: number }) {
  const palette: Palette = { a: '#6b7a52', b: '#8a6d3b', c: '#5a5f6b', d: '#7a4a4a' };
  const map = TRASH_MAPS[variant % TRASH_MAPS.length];
  const { cells, w, h } = draw(map, palette, px);
  return <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px }}>{cells}</span>;
}

// ── ЗДАНИЯ ──
const HOUSE  = ['..RRRR..', '.RRRRRR.', 'RRRRRRRR', 'WWWWWWWW', 'WdddWggW', 'WdddWggW', 'WWWWWWWW'];
const TOWER  = ['GGGGGG', 'GwwGwG', 'GGGGGG', 'GwGwwG', 'GGGGGG', 'GwwGwG', 'GGGGGG', 'GGddGG'];
const TREE_B = ['..tt..', '.tttt.', 'tttttt', '.tttt.', '..bb..', '..bb..'];
const SHOP   = ['YYYYYYYY', 'YsssssY.', 'WWWWWWWW', 'WggWWggW', 'WggWWggW', 'WWWWddWW'];
const B_PAL: Palette = { R: '#b5423a', W: '#c9b79c', d: '#5a3d28', g: '#7ec8e3', w: '#7ec8e3', G: '#8a8f9c', t: '#3c8f42', b: '#5a3d28', Y: '#e0a93b', s: '#3a2a1a' };
const B_MAPS: Record<string, string[]> = { house: HOUSE, tower: TOWER, tree: TREE_B, shop: SHOP };

export function Building({ kind, hp = 100, px = 4 }: { kind: string; hp?: number; px?: number }) {
  const map = B_MAPS[kind] || HOUSE;
  const { cells, w, h } = draw(map, B_PAL, px);
  const dmg = hp < 50 ? 'sepia(0.6) contrast(0.8)' : hp < 80 ? 'sepia(0.2)' : 'none';
  return <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px, filter: `drop-shadow(0 2px 0 rgba(0,0,0,0.4)) ${dmg}` }}>{cells}</span>;
}

// ── МОНОЛИТ-СТАТУЯ ──
const MONOLITH_MAP = [
  '...GGG...',
  '..GAAAG..',
  '.GAOOAAG.',
  '.GAOOAAG.',
  '..GAAAG..',
  '...GGG...',
  '...GGG...',
  '..GGGGG..',
  '.GGGGGGG.',
  '.GGGGGGG.',
  '..GGGGG..',
  '...GGG...',
  '..BBBBB..',
  '.BBBBBBB.',
  'BBBBBBBBB',
];
const M_PAL: Palette = { G: '#7a6f9a', A: '#ffd700', O: '#ff8c00', B: '#4a4060' };
export function Monolith({ px = 4 }: { px?: number }) {
  const { cells, w, h } = draw(MONOLITH_MAP, M_PAL, px);
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px, filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.7)) drop-shadow(0 3px 0 rgba(0,0,0,0.6))' }}>
      {cells}
    </span>
  );
}

// ── ОБЪЕКТЫ МИРА ──
const TREE_OBJ = ['..tt..', '.tttt.', 'tttttt', '.tttt.', '..bb..', '..bb..'];
const STUMP    = ['..bb..', '.bbbb.', '..bb..'];
const STONE    = ['.sss.', 'sssss', '.sss.'];
const HOLE     = ['.hhh.', 'hhhhh', '.hhh.'];
const CAMPFIRE = ['.yry.', 'yrRry', '.rRr.', 'bbbbb'];
const FLOWER   = ['..p..', '.ppp.', '..g..', '..g..'];
const RUBBLE   = ['r.r.r', '.r.r.', 'r.r.r'];
const BENCH    = ['eeeee', '.e.e.'];
const WELL_OBJ = ['.ww.', 'wwww', 'w..w', 'wbbw'];
const GRAFFITI_SHAPES = [
  ['.aa.aa.', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'],
  ['...a...', '.aaaaa.', 'aaaaaaa', '.aaaaa.', '...a...'],
  ['.a...a.', 'aaa.aaa', '.aaaaa.', '..aaa..'],
  ['..aaa..', 'aaaaaaa', '..aaa..', '..aaa..'],
];

const OBJ_PAL_BASE: Palette = {
  t: '#3c8f42', b: '#5a3d28', s: '#8a8f7a', h: '#2a1e14',
  y: '#ffcc00', r: '#ff4400', R: '#ff2200', e: '#8a7060',
  w: '#8ab4cc', p: '#ff88cc', g: '#5a8f42',
};

export function WorldObject({ kind, data, variant = 0, px = 3 }: { kind: string; data?: string; variant?: number; px?: number }) {
  let map: string[];
  let pal: Palette = { ...OBJ_PAL_BASE };

  switch (kind) {
    case 'tree':       map = TREE_OBJ; break;
    case 'tree_stump': map = STUMP; break;
    case 'stone':      map = STONE; break;
    case 'stone_broken': map = RUBBLE; break;
    case 'hole':       map = HOLE; break;
    case 'campfire':   map = CAMPFIRE; break;
    case 'flower':     map = FLOWER; break;
    case 'rubble':     map = RUBBLE; break;
    case 'bench':      map = BENCH; break;
    case 'well':       map = WELL_OBJ; break;
    case 'graffiti': {
      map = GRAFFITI_SHAPES[variant % GRAFFITI_SHAPES.length];
      pal = { a: data || '#ff4d6d' };
      break;
    }
    case 'letter_box': {
      map = ['..L..', '.LLL.', 'LLLLL', '.LLL.'];
      pal = { L: '#e0c060' };
      break;
    }
    default: map = STONE;
  }

  const { cells, w, h } = draw(map, pal, px);
  const glow = kind === 'campfire' ? 'drop-shadow(0 0 6px rgba(255,100,0,0.8))' : kind === 'graffiti' ? `drop-shadow(0 0 3px ${data || '#ff4d6d'}80)` : 'none';
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px, filter: glow }}>
      {cells}
    </span>
  );
}

export type PersonMode = Mode;
