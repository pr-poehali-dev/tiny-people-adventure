import { useEffect, useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Person, Building, Trash, Monolith, Graffiti, PersonMode } from '@/components/PixelSprite';
import func2url from '../../backend/func2url.json';

const BRAIN_URL = (func2url as Record<string, string>)['city-brain'];

const COLS = 24;
const ROWS = 16;
const TILE = 32;

// ── Типы ──
type Job = { emoji: string; title: string };
type Trait = 'rebel' | 'lawful' | 'artist' | 'wise' | 'lazy';
type Need = 'sleep' | 'food' | 'water' | 'fun' | 'social';
type Goal =
  | { type: 'wander'; tx: number; ty: number }
  | { type: 'sleep'; tx: number; ty: number }
  | { type: 'eat'; tx: number; ty: number }
  | { type: 'drink'; tx: number; ty: number }
  | { type: 'fun'; tx: number; ty: number }
  | { type: 'socialize'; targetId: number; tx: number; ty: number }
  | { type: 'paint'; wallX: number; wallY: number; tx: number; ty: number }
  | { type: 'worship'; tx: number; ty: number };

type Person_ = {
  id: number; name: string; job: Job;
  x: number; y: number;
  goal: Goal;
  color: string; skin: string; facing: 1 | -1;
  thought: string | null; thoughtTs: number;
  age: number; trait: Trait;
  needs: Record<Need, number>;
  isPainting: boolean;
};

type Building_ = { id: number; gx: number; gy: number; kind: string };
type Graffiti_ = { id: number; x: number; y: number; color: string; variant: number; author: string };
type Trash_ = { id: number; x: number; y: number; v: number };
type Event = { id: number; icon: string; text: string; kind: string };

// ── Константы ──
const JOBS: Job[] = [
  { emoji: '🔨', title: 'строитель' }, { emoji: '🥖', title: 'пекарь' },
  { emoji: '🎨', title: 'художник' }, { emoji: '📚', title: 'учёный' },
  { emoji: '🎸', title: 'музыкант' }, { emoji: '👮', title: 'мэр' },
  { emoji: '🌾', title: 'фермер' }, { emoji: '⚕️', title: 'лекарь' },
];
const NAMES = ['Пиксель', 'Бит', 'Нео', 'Ада', 'Лея', 'Кода', 'Джем', 'Рей', 'Мия', 'Люкс', 'Зет', 'Ория', 'Тао', 'Финн', 'Вэл', 'Сол', 'Макс', 'Лин'];
const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd24d', '#7cff4d', '#c04dff', '#ff8b4d', '#00e5ff', '#ff6ef7'];
const SKINS = ['#e8b98a', '#c98a5a', '#f0d0a8', '#a06a3a', '#d4956a'];
const B_KINDS = ['house', 'tower', 'shop', 'tree'];
const TRAITS: Trait[] = ['rebel', 'lawful', 'artist', 'wise', 'lazy'];

const TRAIT_LABEL: Record<Trait, string> = {
  rebel: '🔥 бунтарь', lawful: '⚖️ законник', artist: '🎨 артист', wise: '🧠 мудрец', lazy: '😴 лентяй',
};

const TRAIT_REACTIONS: Record<Trait, Record<string, string[]>> = {
  rebel: {
    paint_ok: ['Давай, рисуй!', 'Так и надо, ломай систему!'],
    paint_bad: ['Всё равно продолжай!', 'Плевать на запреты!'],
    god: ['Это приказ?! Я не согласен!', 'Бог не указ — я свободен!'],
  },
  lawful: {
    paint_ok: ['Красиво, но разрешение есть?', 'Хорошая работа.'],
    paint_bad: ['Немедленно прекратите!', 'Вандализм карается!'],
    god: ['Воля Создателя — закон.', 'Слушаюсь и повинуюсь!'],
  },
  artist: {
    paint_ok: ['Круто рисуешь!', 'Гениально! Обожаю!'],
    paint_bad: ['Это искусство, а не безобразие!', 'Пусть рисует!'],
    god: ['О, какое вдохновение!', 'Послание прекрасно!'],
  },
  wise: {
    paint_ok: ['Граффити — это послание веков.', 'Интересная трактовка...'],
    paint_bad: ['Стена — не место для этого.', 'Осмыслим последствия.'],
    god: ['Глубокий смысл скрыт здесь...', 'Истина открылась.'],
  },
  lazy: {
    paint_ok: ['Угу, норм.', 'Ладно...'],
    paint_bad: ['Ну и пусть рисует.', 'Мне всё равно.'],
    god: ['Хм, ладно, завтра сделаю.', 'Только дайте поспать...'],
  },
};

const NEED_THOUGHTS: Record<Need, string[]> = {
  sleep: ['Хочу спать... 😴', 'Так устал... 💤', 'Глаза слипаются...'],
  food: ['Хочу есть 🍞', 'Живот урчит... 🍕', 'Срочно нужна еда!'],
  water: ['Хочу пить 💧', 'Пересохло горло...', 'Нужна вода!'],
  fun: ['Скучно! 😤', 'Хочу развлечений 🎉', 'Пойду праздновать!'],
  social: ['Хочу поговорить 👋', 'Одиноко...', 'Найду друга!'],
};

// Монолит в центре города
const MONOLITH_GX = 11;
const MONOLITH_GY = 6;

let uid = 1;
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[rnd(a.length)];
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

const isRoad = (c: number, r: number) => r === 8 || c === 12;
const isSidewalk = (c: number, r: number) =>
  !isRoad(c, r) && (r === 7 || r === 9 || c === 11 || c === 13);

function urgentNeed(needs: Record<Need, number>): Need | null {
  const order: Need[] = ['sleep', 'food', 'water', 'fun', 'social'];
  for (const n of order) if (needs[n] < 25) return n;
  return null;
}

function needGoal(need: Need, people: Person_[], selfId: number): Goal {
  switch (need) {
    case 'sleep': return { type: 'sleep', tx: rnd(3) + 2, ty: rnd(3) + 2 };
    case 'food': return { type: 'eat', tx: 3, ty: 12 };
    case 'water': return { type: 'drink', tx: rnd(COLS), ty: rnd(ROWS) };
    case 'fun': return { type: 'fun', tx: MONOLITH_GX, ty: MONOLITH_GY };
    case 'social': {
      const other = people.find((p) => p.id !== selfId);
      return other
        ? { type: 'socialize', targetId: other.id, tx: Math.round(other.x), ty: Math.round(other.y) }
        : { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) };
    }
    default: return { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) };
  }
}

export default function Index() {
  const [people, setPeople] = useState<Person_[]>([]);
  const [buildings, setBuildings] = useState<Building_[]>([]);
  const [graffiti, setGraffiti] = useState<Graffiti_[]>([]);
  const [trash, setTrash] = useState<Trash_[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<PersonMode>('human');
  const [era, setEra] = useState('Современность');
  const [rule, setRule] = useState('Обычная жизнь города');
  const [loadingBrain, setLoadingBrain] = useState(false);
  const [godInput, setGodInput] = useState('');
  const [divineMsg, setDivineMsg] = useState<string | null>(null);
  const [showGod, setShowGod] = useState(false);

  const peopleRef = useRef(people);
  peopleRef.current = people;

  const log = useCallback((icon: string, text: string, kind: string) => {
    setEvents((e) => [{ id: uid++, icon, text, kind }, ...e].slice(0, 50));
  }, []);

  const spawnPerson = useCallback((): Person_ => {
    const trait = pick(TRAITS);
    return {
      id: uid++, name: pick(NAMES), job: pick(JOBS),
      x: rnd(COLS), y: rnd(ROWS),
      goal: { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) },
      color: pick(COLORS), skin: pick(SKINS), facing: 1,
      thought: null, thoughtTs: 0,
      age: rnd(40) + 18, trait,
      needs: { sleep: 80 + rnd(20), food: 70 + rnd(30), water: 75 + rnd(25), fun: 60 + rnd(40), social: 65 + rnd(35) },
      isPainting: false,
    };
  }, []);

  // Инициализация мира
  useEffect(() => {
    const initial = Array.from({ length: 6 }, spawnPerson);
    // Макс — особый персонаж
    initial[0] = {
      ...initial[0], name: 'Макс', trait: 'rebel',
      color: '#ff4d6d', skin: '#c98a5a', job: JOBS[2],
    };
    setPeople(initial);
    setBuildings([
      { id: uid++, gx: 1, gy: 1, kind: 'house' },
      { id: uid++, gx: 17, gy: 1, kind: 'tower' },
      { id: uid++, gx: 1, gy: 11, kind: 'shop' },
      { id: uid++, gx: 18, gy: 11, kind: 'tree' },
      { id: uid++, gx: 8, gy: 11, kind: 'house' },
      { id: uid++, gx: 14, gy: 1, kind: 'shop' },
    ]);
    setTrash(Array.from({ length: 8 }, () => ({ id: uid++, x: rnd(COLS), y: rnd(ROWS), v: rnd(4) })));
    log('✨', 'Город основан. Макс и другие жители появились из ниоткуда.', 'birth');
  }, [spawnPerson, log]);

  // Главный тик симуляции
  useEffect(() => {
    if (speed === 0) return;
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();

      setPeople((prev) => {
        let next = prev.map((p) => {
          // Движение к цели
          let { x, y, facing, isPainting } = p;
          const { goal, needs } = p;
          const tx = goal.tx ?? x;
          const ty = goal.ty ?? y;
          const dx = Math.sign(tx - x);
          const dy = Math.sign(ty - y);
          const arrived = Math.abs(x - tx) < 0.6 && Math.abs(y - ty) < 0.6;

          if (!arrived) {
            if (dx !== 0) { x += dx * 0.4; facing = dx > 0 ? 1 : -1; }
            else if (dy !== 0) y += dy * 0.4;
            isPainting = false;
          }

          // Потребности медленно убывают
          const newNeeds = { ...needs };
          const decay: Record<Need, number> = { sleep: 0.4, food: 0.5, water: 0.6, fun: 0.3, social: 0.35 };
          for (const n in newNeeds) newNeeds[n as Need] = Math.max(0, newNeeds[n as Need] - decay[n as Need]);

          // При достижении цели — восстанавливаем нужду
          let newGoal: Goal = goal;
          let newThought = p.thought;
          let newThoughtTs = p.thoughtTs;

          if (arrived) {
            if (goal.type === 'sleep') { newNeeds.sleep = 100; newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) }; }
            else if (goal.type === 'eat') { newNeeds.food = 100; newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) }; }
            else if (goal.type === 'drink') { newNeeds.water = 100; newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) }; }
            else if (goal.type === 'fun') { newNeeds.fun = 100; newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) }; }
            else if (goal.type === 'socialize') { newNeeds.social = 100; newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) }; }
            else if (goal.type === 'paint') {
              isPainting = true;
              // граффити создаётся ниже через setGraffiti
            }
            else if (goal.type === 'worship') {
              newNeeds.fun = Math.min(100, newNeeds.fun + 40);
              newNeeds.social = Math.min(100, newNeeds.social + 20);
              newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) };
              newThought = '🙏 Монолит дарит силу...';
              newThoughtTs = now;
            }
            else {
              // новое блуждание
              newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) };
            }
          }

          // Если цель «блуждание» и дошли — выбрать новую по потребностям
          if (goal.type === 'wander' && arrived) {
            const urgent = urgentNeed(newNeeds);
            if (urgent) {
              newGoal = needGoal(urgent, prev, p.id);
              newThought = pick(NEED_THOUGHTS[urgent]);
              newThoughtTs = now;
            } else {
              // случайное поведение: рисовать, молиться, гулять
              const r = Math.random();
              if (r < 0.08 && p.trait === 'artist') {
                const wallX = rnd(COLS); const wallY = rnd(ROWS);
                newGoal = { type: 'paint', wallX, wallY, tx: wallX, ty: wallY };
                newThought = '🎨 Хочу нарисовать!';
                newThoughtTs = now;
              } else if (r < 0.05) {
                newGoal = { type: 'worship', tx: MONOLITH_GX, ty: MONOLITH_GY };
                newThought = '🛐 Иду к монолиту...';
                newThoughtTs = now;
              } else {
                newGoal = { type: 'wander', tx: rnd(COLS), ty: rnd(ROWS) };
              }
            }
          }

          // Гасим старые мысли
          if (newThought && now - newThoughtTs > 4000) { newThought = null; }

          return { ...p, x, y, goal: newGoal, facing, needs: newNeeds, isPainting, thought: newThought, thoughtTs: newThoughtTs };
        });

        // Граффити: проверяем кто только что доформировал paint
        next.forEach((p) => {
          if (p.isPainting && p.goal.type === 'paint') {
            const g = p.goal as Extract<Goal, { type: 'paint' }>;
            setGraffiti((grf) => {
              if (grf.some((gr) => Math.abs(gr.x - g.wallX) < 1 && Math.abs(gr.y - g.wallY) < 1)) return grf;
              if (grf.length >= 12) return grf;
              log('🎨', `${p.name} нарисовал граффити на стене!`, 'build');
              // реакции соседей
              const nearby = next.filter((o) => o.id !== p.id && dist(o.x, o.y, p.x, p.y) < 4);
              nearby.forEach((o) => {
                const isOk = Math.random() > 0.5;
                const reaction = pick(TRAIT_REACTIONS[o.trait][isOk ? 'paint_ok' : 'paint_bad']);
                log(isOk ? '😍' : '😤', `${o.name}: «${reaction}»`, isOk ? 'thought' : 'destroy');
              });
              return [...grf, { id: uid++, x: g.wallX, y: g.wallY, color: p.color, variant: rnd(4), author: p.name }];
            });
          }
        });

        // Случайные события
        if (Math.random() < 0.05 && next.length) {
          const i = rnd(next.length); const nj = pick(JOBS); const old = next[i].job.title;
          if (nj.title !== old) { log('🔄', `${next[i].name}: ${old} → ${nj.title}`, 'job'); next[i] = { ...next[i], job: nj }; }
        }
        if (Math.random() < 0.04 && next.length < 22) {
          const baby = spawnPerson(); baby.age = 1; next = [...next, baby];
          log('👶', `Родился новый житель — ${baby.name}! Характер: ${TRAIT_LABEL[baby.trait]}`, 'birth');
        }
        if (Math.random() < 0.025 && next.length > 4) {
          const i = rnd(next.length); const d = next[i];
          next = next.filter((_, k) => k !== i);
          log('🕯️', `${d.name} прожил долгую жизнь и покинул город.`, 'death');
        }

        return next;
      });

      // Здания
      if (Math.random() < 0.07) {
        setBuildings((prev) => {
          if (Math.random() < 0.45 && prev.length > 3) {
            const i = rnd(prev.length);
            log('💥', 'Старое здание снесено.', 'destroy');
            return prev.filter((_, k) => k !== i);
          }
          if (prev.length < 14) {
            const nb = { id: uid++, gx: rnd(COLS - 2) + 1, gy: rnd(ROWS - 3) + 1, kind: pick(B_KINDS) };
            log('🏗️', `Построено новое здание ${nb.kind}!`, 'build');
            return [...prev, nb];
          }
          return prev;
        });
      }

      // Мусор
      if (Math.random() < 0.12) {
        setTrash((prev) => prev.length < 20
          ? [...prev, { id: uid++, x: rnd(COLS), y: rnd(ROWS), v: rnd(4) }] : prev);
      }
    }, 750 / speed);
    return () => clearInterval(iv);
  }, [speed, spawnPerson, log]);

  // ── Голос Бога ──
  const sendGodMessage = async () => {
    if (!godInput.trim()) return;
    setLoadingBrain(true);
    const msg = godInput.trim();
    setGodInput('');
    log('⚡', `Послание Бога: «${msg}»`, 'gov');
    try {
      const res = await fetch(BRAIN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'god', message: msg,
          people: people.length, era,
          names: people.map((p) => p.name),
          traits: Object.fromEntries(people.map((p) => [p.name, p.trait])),
        }),
      });
      const d = await res.json();
      if (d.divine_message) setDivineMsg(d.divine_message);
      if (d.era) setEra(d.era);
      if (d.rule) setRule(d.rule);
      if (d.mode) setMode(d.mode);
      if (Array.isArray(d.reactions)) {
        setPeople((prev) => {
          const reactionMap: Record<string, string> = {};
          d.reactions.forEach((r: { name: string; reaction: string }) => { reactionMap[r.name] = r.reaction; });
          return prev.map((p) => reactionMap[p.name]
            ? { ...p, thought: reactionMap[p.name], thoughtTs: Date.now() } : p);
        });
        d.reactions.forEach((r: { name: string; reaction: string }) => {
          log('💬', `${r.name}: «${r.reaction}»`, 'thought');
        });
      }
    } catch {
      log('⚠️', 'Послание не дошло до жителей.', 'death');
    } finally { setLoadingBrain(false); }
  };

  const askBrain = async () => {
    setLoadingBrain(true);
    try {
      const res = await fetch(BRAIN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'brain', people: people.length, era, names: people.map((p) => p.name) }),
      });
      const d = await res.json();
      if (d.mode) setMode(d.mode);
      if (d.era) setEra(d.era);
      if (d.rule) setRule(d.rule);
      log('🌀', `НОВАЯ ЭПОХА: ${d.era} — ${d.rule}`, 'gov');
      if (Array.isArray(d.reactions)) {
        setPeople((prev) => {
          const rmap: Record<string, string> = {};
          d.reactions.forEach((r: { name: string; reaction: string }) => { rmap[r.name] = r.reaction; });
          return prev.map((p) => rmap[p.name] ? { ...p, thought: rmap[p.name], thoughtTs: Date.now() } : p);
        });
      }
    } catch {
      log('⚠️', 'Разум города временно недоступен.', 'death');
    } finally { setLoadingBrain(false); }
  };

  const addPerson = () => {
    const p = spawnPerson();
    setPeople((prev) => [...prev, p]);
    log('➕', `${p.name} (${TRAIT_LABEL[p.trait]}) прибыл в город.`, 'birth');
  };
  const cleanTrash = () => { setTrash([]); log('🧹', 'Улицы очищены!', 'build'); };
  const removeGraffiti = () => { setGraffiti([]); log('🖌️', 'Все граффити закрашены.', 'build'); };

  const sel = people.find((p) => p.id === selected);
  const kindColor: Record<string, string> = {
    birth: 'text-primary', death: 'text-red-400', thought: 'text-cyan-300',
    build: 'text-yellow-300', destroy: 'text-orange-400', job: 'text-purple-300', gov: 'text-pink-400',
  };

  return (
    <div className="crt min-h-screen w-full bg-background text-foreground animate-flicker overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 border-b border-border">
        <div>
          <h1 className="font-pixel text-primary neon-text text-base sm:text-xl leading-relaxed">PIXEL LIFE</h1>
          <p className="text-lg text-foreground/60">
            <span className="text-accent neon-pink">{era}</span> · день {Math.floor(tick / 10) + 1} · {rule}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xl">
          <span className="neon-text">👥 {people.length}</span>
          <span className="text-accent neon-pink">🏙️ {buildings.length}</span>
          <span className="text-yellow-300">🎨 {graffiti.length}</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-5 p-4 sm:p-6">
        {/* ── Город ── */}
        <div className="flex-1 flex flex-col items-center">
          <div className="pixel-border relative rounded-md overflow-hidden select-none"
            style={{ width: COLS * TILE, height: ROWS * TILE, maxWidth: '100%' }}>

            {/* Тайлы земли */}
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const road = isRoad(c, r);
                const side = isSidewalk(c, r);
                const cls = road ? 'tile-road' : side ? 'tile-side' : 'tile-grass';
                const mark = road;
                return (
                  <div key={`${c}-${r}`}
                    className={`absolute ${cls} ${mark ? 'tile-road-mark' : ''}`}
                    style={{ left: c * TILE, top: r * TILE, width: TILE, height: TILE }} />
                );
              })
            )}

            {/* Мусор */}
            {trash.map((t) => (
              <span key={t.id} className="absolute" style={{ left: t.x * TILE + 6, top: t.y * TILE + 22, zIndex: 5 }}>
                <Trash variant={t.v} px={2} />
              </span>
            ))}

            {/* Граффити */}
            {graffiti.map((g) => (
              <span key={g.id} className="absolute animate-fade-in"
                title={`граффити от ${g.author}`}
                style={{ left: g.x * TILE + 2, top: g.y * TILE + 4, zIndex: 6 }}>
                <Graffiti color={g.color} variant={g.variant} px={2} />
              </span>
            ))}

            {/* Здания */}
            {buildings.map((b) => (
              <span key={b.id} className="absolute animate-fade-in"
                style={{ left: b.gx * TILE, top: b.gy * TILE, zIndex: 10 }}>
                <Building kind={b.kind} px={4} />
              </span>
            ))}

            {/* Монолит */}
            <span className="absolute" style={{ left: MONOLITH_GX * TILE - 8, top: MONOLITH_GY * TILE - 8, zIndex: 15 }}>
              <Monolith px={4} />
            </span>

            {/* Человечки */}
            {people.map((p) => (
              <button key={p.id}
                onClick={() => setSelected(selected === p.id ? null : p.id)}
                className="absolute"
                style={{
                  left: p.x * TILE + 4, top: p.y * TILE + 4, zIndex: 20,
                  transition: 'left 0.75s linear, top 0.75s linear',
                  filter: selected === p.id
                    ? `drop-shadow(0 0 6px ${p.color}) drop-shadow(0 0 2px #fff)`
                    : 'none',
                }}
                title={`${p.name} · ${p.job.title} · ${TRAIT_LABEL[p.trait]}`}>
                {p.thought && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-card/95 border border-border px-1 rounded z-30"
                    style={{ color: p.color }}>
                    {p.thought.slice(0, 3)}
                  </span>
                )}
                {p.isPainting && (
                  <span className="absolute -top-1 -right-2 text-sm z-30">🖌️</span>
                )}
                <Person color={p.color} skin={p.skin} mode={mode} facing={p.facing} px={3} isPainting={p.isPainting} />
              </button>
            ))}
          </div>
          <p className="text-foreground/40 text-base mt-2">кликни на человечка · монолит в центре города</p>
        </div>

        {/* ── Боковая панель ── */}
        <aside className="w-full lg:w-96 flex flex-col gap-4">

          {/* Голос Бога */}
          <div className="bg-card pixel-border rounded-md p-4">
            <button onClick={() => setShowGod((v) => !v)}
              className="w-full flex items-center justify-between font-pixel text-xs text-yellow-300 mb-2">
              <span>⚡ ГОЛОС БОГА</span>
              <Icon name={showGod ? 'ChevronUp' : 'ChevronDown'} size={14} />
            </button>
            {divineMsg && (
              <p className="text-base text-yellow-200 border border-yellow-500/30 rounded p-2 mb-3 italic">
                «{divineMsg}»
              </p>
            )}
            {showGod && (
              <div className="flex gap-2">
                <input
                  value={godInput}
                  onChange={(e) => setGodInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendGodMessage()}
                  placeholder="напишите послание жителям..."
                  className="flex-1 bg-background border border-border rounded px-2 py-2 text-base text-foreground outline-none focus:border-yellow-400"
                />
                <button onClick={sendGodMessage} disabled={loadingBrain || !godInput.trim()}
                  className="font-pixel text-[8px] bg-yellow-500 text-black px-3 py-2 rounded hover:brightness-110 disabled:opacity-40 transition">
                  {loadingBrain ? '...' : 'ПОСЛАТЬ'}
                </button>
              </div>
            )}
            <button onClick={askBrain} disabled={loadingBrain}
              className="w-full mt-3 font-pixel text-[8px] bg-accent/80 text-white py-2 rounded hover:brightness-110 transition disabled:opacity-50">
              {loadingBrain ? 'ДУМАЮТ...' : '🌀 СМЕНИТЬ ЭПОХУ'}
            </button>
          </div>

          {/* Управление */}
          <div className="bg-card pixel-border rounded-md p-4">
            <h2 className="font-pixel text-primary text-[10px] mb-3">УПРАВЛЕНИЕ</h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button onClick={addPerson}
                className="font-pixel text-[8px] bg-primary text-primary-foreground py-2 rounded hover:brightness-110 transition">
                <Icon name="UserPlus" className="block mx-auto mb-1" size={12} /> ЖИТЕЛЬ
              </button>
              <button onClick={cleanTrash}
                className="font-pixel text-[8px] border border-border text-foreground/70 py-2 rounded hover:border-primary transition">
                <Icon name="Trash2" className="block mx-auto mb-1" size={12} /> УБОРКА
              </button>
              <button onClick={removeGraffiti}
                className="font-pixel text-[8px] border border-border text-foreground/70 py-2 rounded hover:border-primary transition">
                <Icon name="Eraser" className="block mx-auto mb-1" size={12} /> ЗАКРАСИТЬ
              </button>
            </div>
            <p className="text-base mb-2 text-foreground/60">Скорость</p>
            <div className="flex gap-1">
              {[0, 1, 2, 4].map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`flex-1 font-pixel text-[8px] py-2 rounded border transition ${
                    speed === s ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground/60 hover:border-primary'}`}>
                  {s === 0 ? '⏸' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Выбранный житель */}
          {sel && (
            <div className="bg-card pixel-border rounded-md p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <Person color={sel.color} skin={sel.skin} mode={mode} px={4} />
                <div className="flex-1">
                  <p className="font-pixel text-primary text-[11px] mb-1">{sel.name}</p>
                  <p className="text-base text-foreground/70">{sel.job.emoji} {sel.job.title} · {sel.age} лет</p>
                  <p className="text-base">{TRAIT_LABEL[sel.trait]}</p>
                  {sel.thought && <p className="text-base text-cyan-300 mt-1">💭 {sel.thought}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {(Object.entries(sel.needs) as [Need, number][]).map(([n, v]) => {
                  const labels: Record<Need, string> = { sleep: '😴 Сон', food: '🍞 Еда', water: '💧 Вода', fun: '🎉 Веселье', social: '👋 Общение' };
                  const color = v > 60 ? '#7cff4d' : v > 30 ? '#ffd24d' : '#ff4d6d';
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-base w-20 text-foreground/70">{labels[n]}</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${v}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Лента */}
          <div className="bg-card pixel-border rounded-md p-4 flex-1">
            <h2 className="font-pixel text-primary text-[10px] mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-blink inline-block" /> ЛЕНТА
            </h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {events.map((e) => (
                <div key={e.id} className="animate-fade-in text-base leading-tight flex gap-2">
                  <span className="flex-shrink-0">{e.icon}</span>
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