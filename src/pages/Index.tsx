import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Person, Building, Trash, PersonMode } from '@/components/PixelSprite';
import func2url from '../../backend/func2url.json';

const BRAIN_URL = (func2url as Record<string, string>)['city-brain'];

const COLS = 22;
const ROWS = 15;
const TILE = 34;

type Job = { emoji: string; title: string };
const JOBS: Job[] = [
  { emoji: '🔨', title: 'строитель' }, { emoji: '🥖', title: 'пекарь' },
  { emoji: '🎨', title: 'художник' }, { emoji: '📚', title: 'учёный' },
  { emoji: '🎸', title: 'музыкант' }, { emoji: '👮', title: 'мэр' },
  { emoji: '🌾', title: 'фермер' }, { emoji: '⚕️', title: 'лекарь' },
];
const NAMES = ['Пиксель', 'Бит', 'Нео', 'Ада', 'Лея', 'Кода', 'Джем', 'Рей', 'Мия', 'Люкс', 'Зет', 'Ория', 'Тао', 'Финн', 'Вэл', 'Сол'];
const THOUGHTS = ['Пора строить дом 🏠', 'Хочу кафе ☕', 'Влюбился ❤️', 'Снесу старьё 💥', 'Стану мэром 👑', 'Посажу дерево 🌳', 'Изобрету что-то 💡', 'Устрою праздник 🎉', 'Навещу друга 👋', 'Мне скучно 😴', 'Напишу песню 🎵'];
const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd24d', '#7cff4d', '#c04dff', '#ff8b4d'];
const SKINS = ['#e8b98a', '#c98a5a', '#f0d0a8', '#a06a3a'];
const B_KINDS = ['house', 'tower', 'shop', 'tree'];

type Person_ = {
  id: number; name: string; job: Job;
  x: number; y: number; tx: number; ty: number;
  color: string; skin: string; facing: 1 | -1;
  thought: string | null; thoughtTs: number; age: number;
};
type Building_ = { id: number; gx: number; gy: number; kind: string };
type Trash_ = { id: number; x: number; y: number; v: number };
type Event = { id: number; icon: string; text: string; kind: string };

let uid = 1;
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[rnd(a.length)];

const isRoad = (c: number, r: number) => r === 7 || c === 11;
const isSidewalk = (c: number, r: number) =>
  !isRoad(c, r) && (r === 6 || r === 8 || c === 10 || c === 12);

export default function Index() {
  const [people, setPeople] = useState<Person_[]>([]);
  const [buildings, setBuildings] = useState<Building_[]>([]);
  const [trash, setTrash] = useState<Trash_[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<PersonMode>('human');
  const [era, setEra] = useState('Современность');
  const [rule, setRule] = useState('Обычная жизнь города');
  const [loadingBrain, setLoadingBrain] = useState(false);

  const spawnPerson = useCallback((): Person_ => ({
    id: uid++, name: pick(NAMES), job: pick(JOBS),
    x: rnd(COLS), y: rnd(ROWS), tx: rnd(COLS), ty: rnd(ROWS),
    color: pick(COLORS), skin: pick(SKINS), facing: 1,
    thought: null, thoughtTs: 0, age: rnd(40) + 18,
  }), []);

  const log = useCallback((icon: string, text: string, kind: string) => {
    setEvents((e) => [{ id: uid++, icon, text, kind }, ...e].slice(0, 40));
  }, []);

  useEffect(() => {
    setPeople(Array.from({ length: 5 }, spawnPerson));
    setBuildings([
      { id: uid++, gx: 2, gy: 2, kind: 'house' },
      { id: uid++, gx: 16, gy: 2, kind: 'tower' },
      { id: uid++, gx: 3, gy: 11, kind: 'shop' },
      { id: uid++, gx: 17, gy: 11, kind: 'tree' },
      { id: uid++, gx: 7, gy: 11, kind: 'house' },
    ]);
    setTrash(Array.from({ length: 10 }, () => ({ id: uid++, x: rnd(COLS), y: rnd(ROWS), v: rnd(4) })));
    log('✨', 'Город основан. 5 первых жителей появились из ниоткуда.', 'birth');
  }, [spawnPerson, log]);

  useEffect(() => {
    if (speed === 0) return;
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      setPeople((prev) => {
        let next = prev.map((p) => {
          let { x, y, tx, ty, facing } = p;
          const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
          if (dx !== 0) { x += dx * 0.5; facing = dx > 0 ? 1 : -1; }
          else if (dy !== 0) y += dy * 0.5;
          if (Math.abs(x - tx) < 0.5 && Math.abs(y - ty) < 0.5) {
            x = tx; y = ty; tx = rnd(COLS); ty = rnd(ROWS);
          }
          return { ...p, x, y, tx, ty, facing };
        });
        if (Math.random() < 0.5 && next.length) {
          const i = rnd(next.length); const th = pick(THOUGHTS);
          next[i] = { ...next[i], thought: th, thoughtTs: Date.now() };
          log('💭', `${next[i].name}: «${th}»`, 'thought');
        }
        if (Math.random() < 0.1 && next.length) {
          const i = rnd(next.length); const nj = pick(JOBS); const old = next[i].job.title;
          if (nj.title !== old) { log('🔄', `${next[i].name}: ${old} → ${nj.title}`, 'job'); next[i] = { ...next[i], job: nj }; }
        }
        if (Math.random() < 0.06 && next.length < 24) {
          const baby = spawnPerson(); baby.age = 1; next = [...next, baby];
          log('👶', `Родился новый житель — ${baby.name}!`, 'birth');
        }
        if (Math.random() < 0.04 && next.length > 3) {
          const i = rnd(next.length); const d = next[i];
          next = next.filter((_, k) => k !== i);
          log('🕯️', `${d.name} покинул город, прожив долгую жизнь.`, 'death');
        }
        const now = Date.now();
        return next.map((p) => (p.thought && now - p.thoughtTs > 3500 ? { ...p, thought: null } : p));
      });
      if (Math.random() < 0.1) {
        setBuildings((prev) => {
          if (Math.random() < 0.5 && prev.length > 2) {
            const i = rnd(prev.length);
            log('💥', 'Старое здание снесено ради обновления города.', 'destroy');
            return prev.filter((_, k) => k !== i);
          }
          if (prev.length < 12) {
            const nb = { id: uid++, gx: rnd(COLS - 2), gy: rnd(ROWS - 2), kind: pick(B_KINDS) };
            log('🏗️', 'Построено новое здание!', 'build');
            return [...prev, nb];
          }
          return prev;
        });
      }
      if (Math.random() < 0.15) {
        setTrash((prev) => prev.length < 18
          ? [...prev, { id: uid++, x: rnd(COLS), y: rnd(ROWS), v: rnd(4) }] : prev);
      }
    }, 900 / speed);
    return () => clearInterval(iv);
  }, [speed, spawnPerson, log]);

  const addPerson = () => {
    const p = spawnPerson();
    setPeople((prev) => [...prev, p]);
    log('➕', `${p.name} прибыл в город (${p.job.title}).`, 'birth');
  };
  const cleanTrash = () => { setTrash([]); log('🧹', 'Улицы очищены от мусора!', 'build'); };

  const askBrain = async () => {
    setLoadingBrain(true);
    try {
      const res = await fetch(BRAIN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: people.length, era }),
      });
      const d = await res.json();
      if (d.mode) setMode(d.mode);
      if (d.era) setEra(d.era);
      if (d.rule) setRule(d.rule);
      log('🌀', `НОВОЕ ПРАВИЛО: ${d.rule}`, 'gov');
      if (Array.isArray(d.thoughts)) {
        setPeople((prev) => prev.map((p, i) =>
          d.thoughts[i % d.thoughts.length]
            ? { ...p, thought: d.thoughts[i % d.thoughts.length], thoughtTs: Date.now() } : p));
      }
    } catch {
      log('⚠️', 'Разум города временно недоступен.', 'death');
    } finally { setLoadingBrain(false); }
  };

  const sel = people.find((p) => p.id === selected);
  const kindColor: Record<string, string> = {
    birth: 'text-primary', death: 'text-red-400', thought: 'text-cyan-300',
    build: 'text-yellow-300', destroy: 'text-orange-400', job: 'text-purple-300', gov: 'text-pink-400',
  };

  return (
    <div className="crt min-h-screen w-full bg-background text-foreground animate-flicker overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-5 border-b border-border">
        <div>
          <h1 className="font-pixel text-primary neon-text text-lg sm:text-2xl leading-relaxed">PIXEL LIFE</h1>
          <p className="text-lg sm:text-xl text-foreground/60 mt-1">
            эпоха: <span className="text-accent neon-pink">{era}</span> · день {Math.floor(tick / 10) + 1}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xl">
          <span className="neon-text">👥 {people.length}</span>
          <span className="text-accent neon-pink">🏙️ {buildings.length}</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-8">
        <div className="flex-1 flex flex-col items-center">
          <div className="pixel-border relative rounded-md overflow-hidden"
            style={{ width: COLS * TILE, height: ROWS * TILE, maxWidth: '100%' }}>
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const road = isRoad(c, r);
                const side = isSidewalk(c, r);
                const cls = road ? 'tile-road' : side ? 'tile-side' : 'tile-grass';
                const mark = road && (r === 7 || c === 11);
                return (
                  <div key={`${c}-${r}`}
                    className={`absolute ${cls} ${mark ? 'tile-road-mark' : ''}`}
                    style={{ left: c * TILE, top: r * TILE, width: TILE, height: TILE }} />
                );
              })
            )}
            {trash.map((t) => (
              <span key={t.id} className="absolute animate-fade-in"
                style={{ left: t.x * TILE + 8, top: t.y * TILE + 20, zIndex: 5 }}>
                <Trash variant={t.v} px={2} />
              </span>
            ))}
            {buildings.map((b) => (
              <span key={b.id} className="absolute animate-fade-in"
                style={{ left: b.gx * TILE, top: b.gy * TILE, zIndex: 10 }}>
                <Building kind={b.kind} px={4} />
              </span>
            ))}
            {people.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className="absolute animate-bob"
                style={{
                  left: p.x * TILE + 6, top: p.y * TILE + 4, zIndex: 20,
                  transition: 'left 0.8s linear, top 0.8s linear',
                  filter: selected === p.id ? 'drop-shadow(0 0 5px #fff)' : 'none',
                }}
                title={`${p.name} · ${p.job.title}`}>
                {p.thought && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-card/95 px-1 rounded border border-border">
                    {p.thought.slice(0, 2)}
                  </span>
                )}
                <Person color={p.color} skin={p.skin} mode={mode} facing={p.facing} px={3} />
              </button>
            ))}
          </div>
          <p className="text-foreground/50 text-lg mt-3">кликни человечка · улицы, тротуары, мусор — всё живое</p>
        </div>

        <aside className="w-full lg:w-96 flex flex-col gap-5">
          <div className="bg-card pixel-border rounded-md p-5">
            <h2 className="font-pixel text-accent neon-pink text-xs mb-3">РАЗУМ ГОРОДА 🧠</h2>
            <p className="text-lg text-foreground/70 mb-3">
              Текущее правило: <span className="text-primary">{rule}</span>
            </p>
            <button onClick={askBrain} disabled={loadingBrain}
              className="w-full font-pixel text-[9px] bg-accent text-white py-3 rounded hover:brightness-110 transition disabled:opacity-50">
              {loadingBrain ? 'ДУМАЮТ...' : '🌀 ПОМЕНЯТЬ ВСЁ'}
            </button>
            <p className="text-base text-foreground/40 mt-2">
              жители сами придумают новую эпоху, правила и образ жизни
            </p>
          </div>

          <div className="bg-card pixel-border rounded-md p-5">
            <h2 className="font-pixel text-primary text-xs mb-4">УПРАВЛЕНИЕ</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={addPerson}
                className="flex-1 min-w-[110px] font-pixel text-[9px] bg-primary text-primary-foreground py-3 rounded hover:brightness-110 transition">
                <Icon name="UserPlus" className="inline mr-1" size={14} /> ЖИТЕЛЬ
              </button>
              <button onClick={cleanTrash}
                className="flex-1 min-w-[110px] font-pixel text-[9px] border border-border text-foreground/80 py-3 rounded hover:border-primary transition">
                <Icon name="Trash2" className="inline mr-1" size={14} /> УБОРКА
              </button>
            </div>
            <p className="text-lg mb-2 text-foreground/70">Скорость времени</p>
            <div className="flex gap-2">
              {[0, 1, 2, 4].map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`flex-1 font-pixel text-[9px] py-2 rounded border transition ${
                    speed === s ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground/60 hover:border-primary'}`}>
                  {s === 0 ? '⏸' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {sel && (
            <div className="bg-card pixel-border rounded-md p-5 animate-fade-in flex items-center gap-3">
              <Person color={sel.color} skin={sel.skin} mode={mode} px={4} />
              <div>
                <p className="font-pixel text-primary text-[11px]">{sel.name}</p>
                <p className="text-lg text-foreground/70">{sel.job.emoji} {sel.job.title} · {sel.age} лет</p>
                <p className="text-lg text-cyan-300">💭 {sel.thought || 'занят делами...'}</p>
              </div>
            </div>
          )}

          <div className="bg-card pixel-border rounded-md p-5 flex-1">
            <h2 className="font-pixel text-primary text-xs mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-blink inline-block" /> ЛЕНТА ГОРОДА
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {events.map((e) => (
                <div key={e.id} className="animate-fade-in text-lg leading-tight flex gap-2">
                  <span>{e.icon}</span>
                  <span className={kindColor[e.kind] || 'text-foreground/80'}>{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
