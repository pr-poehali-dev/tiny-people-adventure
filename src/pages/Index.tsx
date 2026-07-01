import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const GRID = 20;
const TILE = 32;

type Job = { emoji: string; title: string };
const JOBS: Job[] = [
  { emoji: '🔨', title: 'строитель' },
  { emoji: '🥖', title: 'пекарь' },
  { emoji: '🎨', title: 'художник' },
  { emoji: '📚', title: 'учёный' },
  { emoji: '🎸', title: 'музыкант' },
  { emoji: '👮', title: 'мэр' },
  { emoji: '🌾', title: 'фермер' },
  { emoji: '⚕️', title: 'лекарь' },
  { emoji: '🕵️', title: 'бездельник' },
];

const NAMES = ['Пиксель', 'Бит', 'Нео', 'Ада', 'Лея', 'Кода', 'Джем', 'Рей', 'Мия', 'Люкс', 'Зет', 'Ория', 'Тао', 'Финн', 'Вэл', 'Сол'];

const THOUGHTS = [
  'Пора построить новый дом 🏠',
  'Хочу открыть кафе ☕',
  'Кажется, я влюбился ❤️',
  'Снесу-ка старое здание 💥',
  'Стану мэром города! 👑',
  'Надо посадить дерево 🌳',
  'Изобрету что-нибудь 💡',
  'Устрою вечеринку 🎉',
  'Пойду навещу друга 👋',
  'Мне скучно... 😴',
  'Организую выборы 🗳️',
  'Напишу песню 🎵',
];

type Person = {
  id: number;
  name: string;
  job: Job;
  x: number; y: number;
  tx: number; ty: number;
  color: string;
  thought: string | null;
  thoughtTs: number;
  age: number;
};

type Building = { id: number; x: number; y: number; emoji: string; hp: number };
type Event = { id: number; ts: number; icon: string; text: string; kind: string };

const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd24d', '#7cff4d', '#c04dff', '#ff8b4d'];
const BUILDINGS = ['🏠', '🏢', '🏪', '🏫', '🏛️', '🌳', '⛲', '🎡'];

let uid = 1;
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[rnd(a.length)];

export default function Index() {
  const [people, setPeople] = useState<Person[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const stateRef = useRef({ people, buildings });
  stateRef.current = { people, buildings };

  const spawnPerson = useCallback((): Person => ({
    id: uid++,
    name: pick(NAMES),
    job: pick(JOBS),
    x: rnd(GRID), y: rnd(GRID),
    tx: rnd(GRID), ty: rnd(GRID),
    color: pick(COLORS),
    thought: null, thoughtTs: 0,
    age: rnd(40) + 18,
  }), []);

  const log = useCallback((icon: string, text: string, kind: string) => {
    setEvents((e) => [{ id: uid++, ts: Date.now(), icon, text, kind }, ...e].slice(0, 40));
  }, []);

  // initial world
  useEffect(() => {
    const start = Array.from({ length: 5 }, spawnPerson);
    setPeople(start);
    setBuildings([
      { id: uid++, x: 3, y: 4, emoji: '🏠', hp: 100 },
      { id: uid++, x: 8, y: 10, emoji: '🏪', hp: 100 },
      { id: uid++, x: 14, y: 6, emoji: '🌳', hp: 100 },
      { id: uid++, x: 12, y: 15, emoji: '🏛️', hp: 100 },
    ]);
    log('✨', 'Город основан. 5 первых жителей появились из ниоткуда.', 'birth');
  }, [spawnPerson, log]);

  // simulation loop
  useEffect(() => {
    if (speed === 0) return;
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      setPeople((prev) => {
        let next = prev.map((p) => {
          let { x, y, tx, ty } = p;
          const dx = Math.sign(tx - x);
          const dy = Math.sign(ty - y);
          if (dx !== 0) x += dx * 0.5;
          else if (dy !== 0) y += dy * 0.5;
          if (Math.abs(x - tx) < 0.5 && Math.abs(y - ty) < 0.5) {
            x = tx; y = ty;
            tx = rnd(GRID); ty = rnd(GRID);
          }
          return { ...p, x, y, tx, ty };
        });

        // random "AI" decisions
        if (Math.random() < 0.55 && next.length) {
          const i = rnd(next.length);
          const p = next[i];
          const th = pick(THOUGHTS);
          next[i] = { ...p, thought: th, thoughtTs: Date.now() };
          log('💭', `${p.name} (${p.job.title}): «${th}»`, 'thought');
        }

        // change of profession
        if (Math.random() < 0.12 && next.length) {
          const i = rnd(next.length);
          const nj = pick(JOBS);
          const old = next[i].job.title;
          if (nj.title !== old) {
            next[i] = { ...next[i], job: nj };
            log('🔄', `${next[i].name} сменил профессию: ${old} → ${nj.title}`, 'job');
          }
        }

        // birth
        if (Math.random() < 0.06 && next.length < 24) {
          const baby = spawnPerson();
          baby.age = 1;
          next = [...next, baby];
          log('👶', `Родился новый житель — ${baby.name}!`, 'birth');
        }

        // death of the old
        if (Math.random() < 0.04 && next.length > 3) {
          const i = rnd(next.length);
          const dead = next[i];
          next = next.filter((_, idx) => idx !== i);
          log('🕯️', `${dead.name} прожил долгую жизнь и покинул город.`, 'death');
        }

        // clear old thoughts
        const now = Date.now();
        next = next.map((p) => (p.thought && now - p.thoughtTs > 3500 ? { ...p, thought: null } : p));
        return next;
      });

      // building events
      if (Math.random() < 0.1) {
        setBuildings((prev) => {
          if (Math.random() < 0.5 && prev.length > 1) {
            const i = rnd(prev.length);
            const b = prev[i];
            log('💥', `Старое здание ${b.emoji} снесено ради обновления города.`, 'destroy');
            return prev.filter((_, idx) => idx !== i);
          }
          if (prev.length < 14) {
            const nb: Building = { id: uid++, x: rnd(GRID), y: rnd(GRID), emoji: pick(BUILDINGS), hp: 100 };
            log('🏗️', `Построено новое здание ${nb.emoji}!`, 'build');
            return [...prev, nb];
          }
          return prev;
        });
      }
    }, 900 / speed);
    return () => clearInterval(iv);
  }, [speed, spawnPerson, log]);

  const addPerson = () => {
    const p = spawnPerson();
    setPeople((prev) => [...prev, p]);
    log('➕', `${p.name} прибыл в город и стал работать: ${p.job.title}.`, 'birth');
  };

  const revolution = () => {
    setPeople((prev) => {
      if (!prev.length) return prev;
      const mayor = pick(prev);
      log('🗳️', `Смена власти! Новый мэр города — ${mayor.name}.`, 'gov');
      return prev.map((p) => ({ ...p, job: p.id === mayor.id ? JOBS[5] : p.job }));
    });
  };

  const sel = people.find((p) => p.id === selected);

  const kindColor: Record<string, string> = {
    birth: 'text-primary', death: 'text-red-400', thought: 'text-cyan-300',
    build: 'text-yellow-300', destroy: 'text-orange-400', job: 'text-purple-300', gov: 'text-pink-400',
  };

  return (
    <div className="crt min-h-screen w-full bg-background text-foreground animate-flicker overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-5 border-b border-border">
        <div>
          <h1 className="font-pixel text-primary neon-text text-lg sm:text-2xl leading-relaxed">
            PIXEL LIFE
          </h1>
          <p className="text-lg sm:text-xl text-foreground/60 mt-1">
            симулятор живого города · день {Math.floor(tick / 10) + 1}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xl">
          <span className="neon-text">👥 {people.length}</span>
          <span className="neon-pink text-accent">🏙️ {buildings.length}</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-8">
        {/* City */}
        <div className="flex-1 flex flex-col items-center">
          <div
            className="grid-ground pixel-border relative rounded-md"
            style={{ width: GRID * TILE, height: GRID * TILE, maxWidth: '100%' }}
          >
            {buildings.map((b) => (
              <div
                key={b.id}
                className="absolute flex items-center justify-center text-2xl transition-all duration-500 animate-fade-in"
                style={{ left: b.x * TILE, top: b.y * TILE, width: TILE, height: TILE }}
                title="здание"
              >
                {b.emoji}
              </div>
            ))}
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className="absolute flex flex-col items-center justify-center animate-bob"
                style={{
                  left: p.x * TILE, top: p.y * TILE, width: TILE, height: TILE,
                  transition: 'left 0.8s linear, top 0.8s linear',
                  filter: selected === p.id ? 'drop-shadow(0 0 6px #fff)' : 'none',
                }}
                title={`${p.name} · ${p.job.title}`}
              >
                {p.thought && (
                  <span className="absolute -top-5 whitespace-nowrap text-[10px] bg-card/90 px-1 rounded border border-border">
                    {p.thought.slice(0, 2)}
                  </span>
                )}
                <span
                  className="w-3 h-4 rounded-sm"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
                />
                <span className="text-[13px]">{p.job.emoji}</span>
              </button>
            ))}
          </div>
          <p className="text-foreground/50 text-lg mt-3">
            кликни на человечка, чтобы узнать о нём
          </p>
        </div>

        {/* Side panel */}
        <aside className="w-full lg:w-96 flex flex-col gap-5">
          {/* Controls */}
          <div className="bg-card pixel-border rounded-md p-5">
            <h2 className="font-pixel text-primary text-xs mb-4">УПРАВЛЕНИЕ</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={addPerson}
                className="flex-1 min-w-[120px] font-pixel text-[9px] bg-primary text-primary-foreground py-3 rounded hover:brightness-110 transition">
                <Icon name="UserPlus" className="inline mr-1" size={14} /> ЖИТЕЛЬ
              </button>
              <button onClick={revolution}
                className="flex-1 min-w-[120px] font-pixel text-[9px] bg-accent text-white py-3 rounded hover:brightness-110 transition">
                <Icon name="Crown" className="inline mr-1" size={14} /> ВЫБОРЫ
              </button>
            </div>
            <p className="text-lg mb-2 text-foreground/70">Скорость времени</p>
            <div className="flex gap-2">
              {[0, 1, 2, 4].map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`flex-1 font-pixel text-[9px] py-2 rounded border transition ${
                    speed === s ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground/60 hover:border-primary'
                  }`}>
                  {s === 0 ? '⏸' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Selected person */}
          {sel && (
            <div className="bg-card pixel-border rounded-md p-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="w-4 h-5 rounded-sm" style={{ backgroundColor: sel.color, boxShadow: `0 0 8px ${sel.color}` }} />
                <div>
                  <p className="font-pixel text-primary text-[11px]">{sel.name}</p>
                  <p className="text-lg text-foreground/70">{sel.job.emoji} {sel.job.title} · {sel.age} лет</p>
                </div>
              </div>
              <p className="text-lg mt-3 text-cyan-300">
                💭 {sel.thought || 'занят своими делами...'}
              </p>
            </div>
          )}

          {/* Event feed */}
          <div className="bg-card pixel-border rounded-md p-5 flex-1">
            <h2 className="font-pixel text-primary text-xs mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-blink inline-block" /> ЛЕНТА ГОРОДА
            </h2>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
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
