import { useEffect, useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Person, Building, Monolith, WorldObject, PersonMode } from '@/components/PixelSprite';
import { tick as simTick, createPerson, JOBS, NAMES, COLORS, SKINS, TRAITS } from '@/engine/simulate';
import { TRAIT_LABEL } from '@/engine/brain';
import type { WorldState, Person as P, WorldObj, Building as B, Letter, Need } from '@/engine/types';
import func2url from '../../backend/func2url.json';

const BRAIN_URL = (func2url as Record<string, string>)['city-brain'];
const COLS = 22;
const ROWS = 15;
const TILE = 34;
const MONOLITH_GX = 11;
const MONOLITH_GY = 6;

let _uid = 9000;
const uid = () => _uid++;
const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[rnd(a.length)];

const isRoad = (c: number, r: number) => r === 8 || c === 11;
const isSidewalk = (c: number, r: number) => !isRoad(c, r) && (r === 7 || r === 9 || c === 10 || c === 12);

// Начальный мир
function initWorld(): WorldState {
  const people: P[] = Array.from({ length: 5 }, (_, i) => {
    const p = createPerson(i + 1);
    if (i === 0) { p.name = 'Макс'; p.trait = 'rebel'; p.color = '#ff4d6d'; p.job = JOBS[2]; }
    if (i === 1) { p.name = 'Ада'; p.trait = 'artist'; p.color = '#c04dff'; }
    if (i === 2) { p.name = 'Бит'; p.trait = 'lawful'; p.color = '#4dd2ff'; }
    return p;
  });

  const buildings: B[] = [
    { id: uid(), gx: 1, gy: 1, kind: 'house', hp: 100 },
    { id: uid(), gx: 17, gy: 1, kind: 'tower', hp: 100 },
    { id: uid(), gx: 1, gy: 11, kind: 'shop', hp: 100 },
    { id: uid(), gx: 18, gy: 11, kind: 'tree', hp: 100 },
    { id: uid(), gx: 14, gy: 11, kind: 'house', hp: 100 },
    { id: MONOLITH_GX * 100, gx: MONOLITH_GX, gy: MONOLITH_GY, kind: 'monolith', hp: 999 },
  ];

  const objects: WorldObj[] = [
    { id: uid(), kind: 'tree', x: 4, y: 3, hp: 100 },
    { id: uid(), kind: 'tree', x: 19, y: 4, hp: 100 },
    { id: uid(), kind: 'tree', x: 6, y: 12, hp: 100 },
    { id: uid(), kind: 'campfire', x: 9, y: 11, hp: 100 },
    { id: uid(), kind: 'well', x: 15, y: 3, hp: 100 },
    { id: uid(), kind: 'bench', x: 5, y: 7, hp: 100 },
    { id: uid(), kind: 'bench', x: 17, y: 7, hp: 100 },
    { id: uid(), kind: 'stone', x: 3, y: 13, hp: 100 },
    { id: uid(), kind: 'stone', x: 20, y: 9, hp: 100 },
    { id: uid(), kind: 'flower', x: 7, y: 2, hp: 100 },
    { id: uid(), kind: 'flower', x: 14, y: 13, hp: 100 },
    { id: uid(), kind: 'letter_box', x: MONOLITH_GX + 1, y: MONOLITH_GY + 4, hp: 100 },
  ];

  return {
    people, buildings, objects,
    letters: [], events: [{ id: uid(), icon: '✨', text: 'Город основан. Макс, Ада, Бит и другие жители пришли в этот мир.', kind: 'birth' }],
    era: 'Современность', rule: 'Абсолютная свобода',
    tick: 0, mode: 'human',
  };
}

const NEED_LABEL: Record<Need, string> = {
  sleep: '😴 Сон', food: '🍞 Еда', water: '💧 Вода',
  fun: '🎉 Веселье', social: '👋 Общение', meaning: '✨ Смысл',
};

export default function Index() {
  const [world, setWorld] = useState<WorldState>(initWorld);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'events' | 'letters' | 'person'>('events');
  const [godInput, setGodInput] = useState('');
  const [loadingBrain, setLoadingBrain] = useState(false);
  const [playerMode, setPlayerMode] = useState<'god' | 'interact'>('god');
  const [showHelpTarget, setShowHelpTarget] = useState<{ x: number; y: number; label: string } | null>(null);

  const worldRef = useRef(world);
  worldRef.current = world;

  // ── Тик симуляции ──
  useEffect(() => {
    if (speed === 0) return;
    const iv = setInterval(() => {
      setWorld(prev => {
        const patch = simTick(prev);
        return { ...prev, ...patch };
      });
    }, 800 / speed);
    return () => clearInterval(iv);
  }, [speed]);

  const log = useCallback((icon: string, text: string, kind: string) => {
    setWorld(prev => ({
      ...prev,
      events: [{ id: uid(), icon, text, kind }, ...prev.events].slice(0, 60),
    }));
  }, []);

  const addPerson = () => {
    const p = createPerson();
    setWorld(prev => ({
      ...prev,
      people: [...prev.people, p],
      events: [{ id: uid(), icon: '➕', text: `${p.name} (${TRAIT_LABEL[p.trait]}) прибыл в город.`, kind: 'birth' }, ...prev.events].slice(0, 60),
    }));
  };

  // ── Голос Бога ──
  const sendGodMessage = async () => {
    if (!godInput.trim()) return;
    const msg = godInput.trim();
    setGodInput('');
    setLoadingBrain(true);
    log('⚡', `Послание Бога: «${msg}»`, 'gov');
    try {
      const res = await fetch(BRAIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'god', message: msg,
          people: world.people.length, era: world.era,
          names: world.people.map(p => p.name),
          traits: Object.fromEntries(world.people.map(p => [p.name, p.trait])),
        }),
      });
      const d = await res.json();
      setWorld(prev => {
        let np = prev.people;
        if (Array.isArray(d.reactions)) {
          const rmap: Record<string, string> = {};
          d.reactions.forEach((r: { name: string; reaction: string }) => { rmap[r.name] = r.reaction; });
          np = np.map(p => rmap[p.name] ? { ...p, thought: rmap[p.name], thoughtTs: Date.now() } : p);
          d.reactions.forEach((r: { name: string; reaction: string }) => {
            prev.events.unshift({ id: uid(), icon: '💬', text: `${r.name}: «${r.reaction}»`, kind: 'thought' });
          });
        }
        return {
          ...prev,
          people: np,
          era: d.era || prev.era,
          rule: d.rule || prev.rule,
          mode: d.mode || prev.mode,
          events: [{ id: uid(), icon: '⚡', text: d.divine_message || `Послание принято: ${msg}`, kind: 'gov' }, ...prev.events].slice(0, 60),
        };
      });
    } catch {
      log('⚠️', 'Послание не дошло до жителей.', 'death');
    } finally { setLoadingBrain(false); }
  };

  const answerLetter = (letterId: number, answer: string) => {
    setWorld(prev => ({
      ...prev,
      letters: prev.letters.map(l => l.id === letterId ? { ...l, answered: true, answer } : l),
      events: [{ id: uid(), icon: '⚡', text: `Бог ответил на письмо жителя: «${answer}»`, kind: 'gov' }, ...prev.events].slice(0, 60),
    }));
  };

  // ── Взаимодействие игрока с миром ──
  const handleWorldClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / TILE);
    const cy = Math.floor((e.clientY - rect.top) / TILE);

    const ws = worldRef.current;
    const clickedPerson = ws.people.find(p => Math.abs(p.x - cx) < 1 && Math.abs(p.y - cy) < 1);
    if (clickedPerson) { setSelected(clickedPerson.id); setTab('person'); return; }

    const clickedObj = ws.objects.find(o => Math.abs(o.x - cx) < 1 && Math.abs(o.y - cy) < 1);
    const clickedBuilding = ws.buildings.find(b => Math.abs(b.gx - cx) < 2 && Math.abs(b.gy - cy) < 2);

    if (playerMode === 'interact') {
      if (clickedObj) {
        const actions = getObjectActions(clickedObj.kind);
        if (actions.length > 0) {
          const label = `${clickedObj.kind} → ${actions[0]}`;
          setShowHelpTarget({ x: cx, y: cy, label });
          setTimeout(() => setShowHelpTarget(null), 3000);
          // Применяем первое действие к объекту
          applyPlayerAction(clickedObj, actions[0]);
        }
      } else if (clickedBuilding && clickedBuilding.kind !== 'monolith') {
        setShowHelpTarget({ x: cx, y: cy, label: `здание → осмотреть (HP: ${clickedBuilding.hp})` });
        setTimeout(() => setShowHelpTarget(null), 3000);
      } else {
        // Ставим костёр / сажаем дерево
        setWorld(prev => {
          const exists = prev.objects.find(o => Math.abs(o.x - cx) < 1 && Math.abs(o.y - cy) < 1);
          if (exists) return prev;
          const newObj: WorldObj = { id: uid(), kind: 'flower', x: cx, y: cy, hp: 100 };
          return {
            ...prev, objects: [...prev.objects, newObj],
            events: [{ id: uid(), icon: '🌸', text: `Игрок посадил цветок.`, kind: 'build' }, ...prev.events].slice(0, 60),
          };
        });
      }
    }
  }, [playerMode]);

  const applyPlayerAction = (obj: WorldObj, action: string) => {
    setWorld(prev => {
      let newObjs = [...prev.objects];
      let newEvents = [...prev.events];
      if (action === 'срубить' && obj.kind === 'tree') {
        newObjs = newObjs.filter(o => o.id !== obj.id);
        newObjs.push({ id: uid(), kind: 'tree_stump', x: obj.x, y: obj.y, hp: 100 });
        newEvents = [{ id: uid(), icon: '🪓', text: 'Игрок срубил дерево!', kind: 'action' }, ...newEvents].slice(0, 60);
      } else if (action === 'убрать' && (obj.kind === 'rubble' || obj.kind === 'hole')) {
        newObjs = newObjs.filter(o => o.id !== obj.id);
        newEvents = [{ id: uid(), icon: '🧹', text: 'Игрок убрал завалы.', kind: 'build' }, ...newEvents].slice(0, 60);
      } else if (action === 'разжечь' && obj.kind === 'campfire') {
        newEvents = [{ id: uid(), icon: '🔥', text: 'Игрок разжёг костёр ярче!', kind: 'social' }, ...newEvents].slice(0, 60);
      } else if (action === 'взять' && obj.kind === 'stone') {
        newObjs = newObjs.filter(o => o.id !== obj.id);
        newEvents = [{ id: uid(), icon: '🪨', text: 'Игрок подобрал камень.', kind: 'action' }, ...newEvents].slice(0, 60);
      }
      return { ...prev, objects: newObjs, events: newEvents };
    });
  };

  const getObjectActions = (kind: string): string[] => {
    const map: Record<string, string[]> = {
      tree: ['срубить'], tree_stump: ['убрать'], stone: ['взять'],
      campfire: ['разжечь'], rubble: ['убрать'], hole: ['убрать'],
    };
    return map[kind] || [];
  };

  const sel = world.people.find(p => p.id === selected);
  const unanswered = world.letters.filter(l => !l.answered);

  const kindColor: Record<string, string> = {
    birth: 'text-primary', death: 'text-red-400', thought: 'text-cyan-300',
    build: 'text-yellow-300', destroy: 'text-orange-400', job: 'text-purple-300',
    gov: 'text-pink-400', social: 'text-blue-300', action: 'text-orange-300',
    worship: 'text-yellow-400', nature: 'text-green-400', trait: 'text-purple-300',
  };

  return (
    <div className="crt min-h-screen w-full bg-background text-foreground animate-flicker overflow-hidden">

      {/* Шапка */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-pixel text-primary neon-text text-base sm:text-xl">PIXEL LIFE</h1>
          <p className="text-lg text-foreground/60 mt-0.5">
            <span className="text-accent neon-pink">{world.era}</span>
            <span className="mx-2 text-border">·</span>
            день {Math.floor(world.tick / 10) + 1}
            <span className="mx-2 text-border">·</span>
            {world.rule}
          </p>
        </div>
        <div className="flex gap-4 text-xl">
          <span className="neon-text" title="жителей">👥 {world.people.length}</span>
          <span className="text-yellow-300" title="строений">🏙️ {world.buildings.filter(b => b.kind !== 'monolith').length}</span>
          {unanswered.length > 0 && (
            <button onClick={() => setTab('letters')} className="text-accent neon-pink animate-blink" title="новые письма">
              📬 {unanswered.length}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-6">

        {/* ── Город ── */}
        <div className="flex-1 flex flex-col items-start">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setPlayerMode('god')}
              className={`font-pixel text-[8px] px-3 py-1.5 rounded border transition ${playerMode === 'god' ? 'bg-yellow-500 text-black border-yellow-500' : 'border-border text-foreground/60 hover:border-yellow-400'}`}>
              ⚡ БОГ
            </button>
            <button onClick={() => setPlayerMode('interact')}
              className={`font-pixel text-[8px] px-3 py-1.5 rounded border transition ${playerMode === 'interact' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground/60 hover:border-primary'}`}>
              🖱️ ТРОГАТЬ
            </button>
            <span className="text-base text-foreground/40 self-center">
              {playerMode === 'interact' ? 'клик по объекту — взаимодействие' : 'кликни на жителя'}
            </span>
          </div>

          <div
            className="pixel-border relative rounded-md overflow-hidden select-none cursor-crosshair"
            style={{ width: COLS * TILE, height: ROWS * TILE, maxWidth: '100%' }}
            onClick={handleWorldClick}
          >
            {/* Тайлы */}
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const road = isRoad(c, r);
                const side = isSidewalk(c, r);
                const cls = road ? 'tile-road' : side ? 'tile-side' : 'tile-grass';
                return (
                  <div key={`${c}-${r}`}
                    className={`absolute ${cls} ${road ? 'tile-road-mark' : ''}`}
                    style={{ left: c * TILE, top: r * TILE, width: TILE, height: TILE }} />
                );
              })
            )}

            {/* Объекты мира */}
            {world.objects.map(obj => (
              <span key={obj.id} className="absolute animate-fade-in"
                style={{ left: obj.x * TILE + 2, top: obj.y * TILE + 2, zIndex: 6 }}>
                <WorldObject kind={obj.kind} data={obj.data} variant={obj.variant} px={obj.kind === 'tree' ? 4 : 3} />
              </span>
            ))}

            {/* Здания */}
            {world.buildings.filter(b => b.kind !== 'monolith').map(b => (
              <span key={b.id} className="absolute animate-fade-in"
                style={{ left: b.gx * TILE, top: b.gy * TILE, zIndex: 10 }}>
                <Building kind={b.kind} hp={b.hp} px={4} />
              </span>
            ))}

            {/* Монолит */}
            <span className="absolute" style={{ left: MONOLITH_GX * TILE - 6, top: MONOLITH_GY * TILE - 4, zIndex: 15 }}>
              <Monolith px={4} />
            </span>

            {/* Человечки */}
            {world.people.map(p => (
              <button key={p.id}
                onClick={e => { e.stopPropagation(); setSelected(p.id); setTab('person'); }}
                className="absolute"
                style={{
                  left: p.x * TILE + 5, top: p.y * TILE + 3, zIndex: 20,
                  transition: 'left 0.75s linear, top 0.75s linear',
                  filter: selected === p.id ? `drop-shadow(0 0 7px ${p.color}) drop-shadow(0 0 2px #fff)` : 'none',
                }}
                title={`${p.name} · ${TRAIT_LABEL[p.trait]}`}>
                {p.thought && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] bg-card/95 border border-border px-1 rounded z-30"
                    style={{ color: p.color }}>
                    {p.thought.slice(0, 4)}
                  </span>
                )}
                {p.activity && (
                  <span className="absolute -top-1 -right-2 text-xs z-30">{p.activity}</span>
                )}
                <Person
                  color={p.color} skin={p.skin} mode={world.mode as PersonMode}
                  facing={p.facing} px={3}
                  isPainting={p.isPainting} isDigging={p.isDigging} isChopping={p.isChopping}
                />
              </button>
            ))}

            {/* Подсказка взаимодействия */}
            {showHelpTarget && (
              <div className="absolute z-50 bg-card border border-primary rounded px-2 py-1 text-base text-primary pointer-events-none"
                style={{ left: showHelpTarget.x * TILE, top: showHelpTarget.y * TILE - 24 }}>
                {showHelpTarget.label}
              </div>
            )}
          </div>
          <p className="text-foreground/40 text-base mt-1.5">монолит принимает письма · жители действуют автономно</p>
        </div>

        {/* ── Боковая панель ── */}
        <aside className="w-full lg:w-[380px] flex flex-col gap-4">

          {/* Голос Бога + управление */}
          <div className="bg-card pixel-border rounded-md p-4">
            <h2 className="font-pixel text-yellow-300 text-[10px] mb-3">⚡ ГОЛОС БОГА</h2>
            <div className="flex gap-2 mb-3">
              <input value={godInput} onChange={e => setGodInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendGodMessage()}
                placeholder="напишите послание жителям..."
                className="flex-1 bg-background border border-border rounded px-2 py-2 text-base text-foreground outline-none focus:border-yellow-400 transition" />
              <button onClick={sendGodMessage} disabled={loadingBrain || !godInput.trim()}
                className="font-pixel text-[8px] bg-yellow-500 text-black px-3 rounded hover:brightness-110 disabled:opacity-40 transition">
                {loadingBrain ? '...' : 'ПОСЛАТЬ'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={addPerson}
                className="flex-1 min-w-[80px] font-pixel text-[8px] bg-primary text-primary-foreground py-2 rounded hover:brightness-110 transition">
                <Icon name="UserPlus" className="inline mr-1" size={11} /> ЖИТЕЛЬ
              </button>
              <button onClick={() => setWorld(prev => ({ ...prev, objects: prev.objects.filter(o => o.kind !== 'rubble') }))}
                className="flex-1 min-w-[80px] font-pixel text-[8px] border border-border text-foreground/70 py-2 rounded hover:border-primary transition">
                <Icon name="Trash2" className="inline mr-1" size={11} /> ОЧИСТИТЬ
              </button>
              <button onClick={() => {
                setWorld(prev => ({ ...prev, objects: [...prev.objects, { id: uid(), kind: 'campfire', x: rnd(COLS), y: rnd(ROWS), hp: 100 }] }));
                log('🔥', 'Бог поставил костёр в городе!', 'gov');
              }} className="flex-1 min-w-[80px] font-pixel text-[8px] border border-border text-foreground/70 py-2 rounded hover:border-yellow-400 transition">
                🔥 КОСТЁР
              </button>
            </div>
            <p className="text-lg mb-1.5 mt-3 text-foreground/60">Скорость</p>
            <div className="flex gap-1">
              {[0, 1, 2, 4].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`flex-1 font-pixel text-[8px] py-2 rounded border transition ${speed === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground/60 hover:border-primary'}`}>
                  {s === 0 ? '⏸' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Табы */}
          <div className="bg-card pixel-border rounded-md flex-1 flex flex-col">
            <div className="flex border-b border-border">
              {(['events', 'letters', 'person'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 font-pixel text-[8px] py-3 transition ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-foreground/50 hover:text-foreground/80'}`}>
                  {t === 'events' ? '📡 ЛЕНТА' : t === 'letters' ? `📬 ПИСЬМА${unanswered.length > 0 ? ` (${unanswered.length})` : ''}` : '👤 ЖИТЕЛЬ'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-h-[450px]">

              {/* ЛЕНТА */}
              {tab === 'events' && (
                <div className="space-y-1.5">
                  {world.events.map(e => (
                    <div key={e.id} className="animate-fade-in text-base leading-tight flex gap-2">
                      <span className="flex-shrink-0">{e.icon}</span>
                      <span className={kindColor[e.kind] || 'text-foreground/80'}>{e.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ПИСЬМА */}
              {tab === 'letters' && (
                <div className="space-y-3">
                  {world.letters.length === 0 && (
                    <p className="text-foreground/40 text-base">Жители ещё не писали монолиту. Когда им понадобится смысл — напишут.</p>
                  )}
                  {[...world.letters].reverse().map(l => (
                    <div key={l.id} className={`rounded border p-3 ${l.answered ? 'border-border opacity-60' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
                      <p className="font-pixel text-[9px] text-yellow-300 mb-1">📜 {l.from}</p>
                      <p className="text-base text-foreground/90 mb-2">«{l.text}»</p>
                      {l.answered ? (
                        <p className="text-base text-primary">⚡ Ответ Бога: {l.answer}</p>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => answerLetter(l.id, 'Желание исполнено!')}
                            className="flex-1 font-pixel text-[8px] bg-primary text-primary-foreground py-1.5 rounded hover:brightness-110 transition">
                            ✅ ИСПОЛНИТЬ
                          </button>
                          <button onClick={() => answerLetter(l.id, 'Боги молчат.')}
                            className="flex-1 font-pixel text-[8px] border border-border text-foreground/60 py-1.5 rounded hover:border-red-500 transition">
                            ❌ ОТКЛОНИТЬ
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ЖИТЕЛЬ */}
              {tab === 'person' && (
                <div>
                  {!sel ? (
                    <p className="text-foreground/40 text-base">Кликни на человечка в городе, чтобы узнать о нём.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Person color={sel.color} skin={sel.skin} mode={world.mode as PersonMode} px={5} />
                        <div>
                          <p className="font-pixel text-primary text-[12px]">{sel.name}</p>
                          <p className="text-lg text-foreground/70">{sel.job.emoji} {sel.job.title} · {sel.age} лет</p>
                          <p className="text-lg">{TRAIT_LABEL[sel.trait]}</p>
                          <p className="text-base text-foreground/50">😊 настроение: {Math.round(sel.mood)}%</p>
                        </div>
                      </div>
                      {sel.thought && (
                        <div className="border border-cyan-500/30 rounded p-2 bg-cyan-500/5">
                          <p className="text-base text-cyan-300">💭 {sel.thought}</p>
                        </div>
                      )}
                      {sel.goal.planThought && sel.thought !== sel.goal.planThought && (
                        <p className="text-base text-foreground/50 italic">📍 план: {sel.goal.planThought}</p>
                      )}
                      <div className="space-y-1.5">
                        {(Object.entries(sel.needs) as [Need, number][]).map(([n, v]) => {
                          const color = v > 60 ? '#7cff4d' : v > 30 ? '#ffd24d' : '#ff4d6d';
                          return (
                            <div key={n} className="flex items-center gap-2">
                              <span className="text-base w-24 flex-shrink-0 text-foreground/70">{NEED_LABEL[n]}</span>
                              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${v}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-base w-8 text-right text-foreground/50">{Math.round(v)}</span>
                            </div>
                          );
                        })}
                      </div>
                      {sel.inventory.length > 0 && (
                        <div>
                          <p className="text-base text-foreground/60 mb-1">🎒 инвентарь:</p>
                          <div className="flex gap-2 flex-wrap">
                            {sel.inventory.map((item, i) => (
                              <span key={i} className="text-base bg-border/50 px-2 py-0.5 rounded">
                                {item === 'stone' ? '🪨 камень' : item === 'wood' ? '🪵 дерево' : item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sel.memory.length > 0 && (
                        <div>
                          <p className="text-base text-foreground/60 mb-1">🧠 память:</p>
                          {sel.memory.map((m, i) => <p key={i} className="text-base text-foreground/60 italic">· {m}</p>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
