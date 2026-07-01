// Попиксельные спрайты — рисуются пиксель-в-пиксель без картинок.

type Palette = Record<string, string>;

function draw(map: string[], palette: Palette, px: number) {
  const cells: JSX.Element[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      const color = palette[c];
      if (!color) continue;
      cells.push(
        <span key={`${x}-${y}`} style={{
          position: 'absolute', left: x * px, top: y * px,
          width: px, height: px, backgroundColor: color,
        }} />
      );
    }
  });
  const w = Math.max(...map.map((r) => r.length));
  return { cells, w, h: map.length };
}

// ── Человечек (8×8 пикселей) ──
const HUMAN = [
  '..HH..',
  '.HSSH.',
  '.HEEH.',
  '..SS..',
  '.BCCB.',
  'B.CC.B',
  '..LL..',
  '.L..L.',
];
const HUMAN_FLIP = [...HUMAN].reverse();
const NATIVE = [
  '..F...',
  '.HFH..',
  '.REER.',
  '.HSSH.',
  '..SS..',
  '.BCCB.',
  'B.CC.B',
  '..LL..',
];
const PAINTING = [
  '..HH..',
  '.HSSH.',
  '.HEEH.',
  '..SS..',
  '.BCCB.',
  'B.CC.B',
  '..LL..',
  '.LAAL.',
];

type Mode = 'human' | 'flip' | 'native';

export function Person({
  color, skin = '#e8b98a', mode = 'human', px = 3, facing = 1, isPainting = false,
}: {
  color: string; skin?: string; mode?: Mode; px?: number; facing?: 1 | -1; isPainting?: boolean;
}) {
  const palette: Palette = {
    H: '#1a1a2e', S: skin, C: color, B: color,
    L: '#3a2a1a', F: '#ff4d6d', R: '#c04dff',
    E: '#111', A: '#ff8b4d',
  };
  const map = isPainting ? PAINTING : mode === 'flip' ? HUMAN_FLIP : mode === 'native' ? NATIVE : HUMAN;
  const { cells, w, h } = draw(map, palette, px);
  return (
    <span style={{
      position: 'relative', display: 'inline-block',
      width: w * px, height: h * px,
      transform: `scaleX(${facing})`, imageRendering: 'pixelated',
    }}>
      {cells}
    </span>
  );
}

// ── Мусор ──
const TRASH_MAPS: string[][] = [
  ['.a.', 'aaa', '.a.'],
  ['b.b', '.bb', 'b..'],
  ['..c', '.cc', 'c..'],
  ['.d.', 'dd.', '..d'],
];
export function Trash({ variant = 0, px = 2 }: { variant?: number; px?: number }) {
  const palette: Palette = { a: '#6b7a52', b: '#8a6d3b', c: '#5a5f6b', d: '#7a4a4a' };
  const map = TRASH_MAPS[variant % TRASH_MAPS.length];
  const { cells, w, h } = draw(map, palette, px);
  return <span style={{ position: 'relative', display: 'inline-block', width: w * px, height: h * px }}>{cells}</span>;
}

// ── Здания ──
const HOUSE = [
  '..RRRR..',
  '.RRRRRR.',
  'RRRRRRRR',
  'WWWWWWWW',
  'WdddWggW',
  'WdddWggW',
  'WWWWWWWW',
];
const TOWER = [
  'GGGGGG',
  'GwwGwG',
  'GGGGGG',
  'GwGwwG',
  'GGGGGG',
  'GwwGwG',
  'GGGGGG',
  'GGddGG',
];
const TREE = [
  '..tt..',
  '.tttt.',
  'tttttt',
  '.tttt.',
  '..bb..',
  '..bb..',
];
const SHOP = [
  'YYYYYYYY',
  'YsssssY.',
  'WWWWWWWW',
  'WggWWggW',
  'WggWWggW',
  'WWWWddWW',
];

const B_PAL: Palette = {
  R: '#b5423a', W: '#c9b79c', d: '#5a3d28', g: '#7ec8e3', w: '#7ec8e3',
  G: '#8a8f9c', t: '#3c8f42', b: '#5a3d28', Y: '#e0a93b', s: '#3a2a1a',
};
const B_MAPS: Record<string, string[]> = { house: HOUSE, tower: TOWER, tree: TREE, shop: SHOP };

export function Building({ kind, px = 4 }: { kind: string; px?: number }) {
  const map = B_MAPS[kind] || HOUSE;
  const { cells, w, h } = draw(map, B_PAL, px);
  return <span style={{
    position: 'relative', display: 'inline-block',
    width: w * px, height: h * px, filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.4))',
  }}>{cells}</span>;
}

// ── Монолит-статуя (15×18 пикселей) ──
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
const MONOLITH_PAL: Palette = {
  G: '#7a6f9a', A: '#ffd700', O: '#ff8c00', B: '#4a4060',
};
export function Monolith({ px = 4 }: { px?: number }) {
  const { cells, w, h } = draw(MONOLITH_MAP, MONOLITH_PAL, px);
  return (
    <span style={{
      position: 'relative', display: 'inline-block', width: w * px, height: h * px,
      filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6)) drop-shadow(0 2px 0 rgba(0,0,0,0.5))',
    }}>
      {cells}
    </span>
  );
}

// ── Граффити на стене ──
const GRAFFITI_SHAPES = [
  // сердечко
  ['.aa.aa.', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'],
  // звезда
  ['...a...', '.aaaaa.', 'aaaaaaa', '.aaaaa.', '...a...'],
  // волна
  ['.a...a.', 'aaa.aaa', '.aaaaa.', '..aaa..'],
  // крест / знак
  ['..aaa..', 'aaaaaaa', '..aaa..', '..aaa..'],
];

export function Graffiti({ color, variant = 0, px = 2 }: { color: string; variant?: number; px?: number }) {
  const palette: Palette = { a: color };
  const map = GRAFFITI_SHAPES[variant % GRAFFITI_SHAPES.length];
  const { cells, w, h } = draw(map, palette, px);
  return (
    <span style={{
      position: 'relative', display: 'inline-block', width: w * px, height: h * px,
      filter: `drop-shadow(0 0 3px ${color}80)`,
    }}>
      {cells}
    </span>
  );
}

export type PersonMode = Mode;
