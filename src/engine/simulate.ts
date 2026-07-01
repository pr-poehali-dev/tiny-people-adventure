// ═══════════════════════════════════════
//  PIXEL LIFE — Главный тик симуляции
// ═══════════════════════════════════════

import type { WorldState, Person, WorldObj, Building, Letter, Event, Trait } from './types';
import { decayNeeds, urgentNeed, contextThought, pickGoal, getReaction, evolveTraitByMood } from './brain';

let _uid = 1000;
const uid = () => _uid++;
const rnd = (n: number) => Math.floor(Math.random() * n);
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

const COLS = 22;
const ROWS = 15;
const SPEED = 0.45;

export const JOBS = [
  { emoji: '🔨', title: 'строитель' }, { emoji: '🥖', title: 'пекарь' },
  { emoji: '🎨', title: 'художник' }, { emoji: '📚', title: 'учёный' },
  { emoji: '🎸', title: 'музыкант' }, { emoji: '👮', title: 'мэр' },
  { emoji: '🌾', title: 'фермер' }, { emoji: '⚕️', title: 'лекарь' },
  { emoji: '🏛️', title: 'философ' }, { emoji: '🗡️', title: 'охотник' },
];
export const NAMES = ['Пиксель', 'Бит', 'Нео', 'Ада', 'Лея', 'Кода', 'Джем', 'Рей', 'Мия', 'Люкс', 'Зет', 'Ория', 'Тао', 'Финн', 'Вэл', 'Сол', 'Ян', 'Вика', 'Лука', 'Эри'];
export const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd24d', '#7cff4d', '#c04dff', '#ff8b4d', '#00e5ff', '#ff6ef7'];
export const SKINS = ['#e8b98a', '#c98a5a', '#f0d0a8', '#a06a3a', '#d4956a'];
export const TRAITS: Trait[] = ['rebel', 'lawful', 'artist', 'wise', 'lazy', 'greedy', 'kind', 'fearful'];
const pick = <T,>(a: T[]): T => a[rnd(a.length)];

export function createPerson(id?: number): Person {
  return {
    id: id ?? uid(),
    name: pick(NAMES),
    job: pick(JOBS),
    x: rnd(COLS), y: rnd(ROWS),
    facing: 1,
    color: pick(COLORS), skin: pick(SKINS),
    thought: null, thoughtTs: 0,
    age: rnd(40) + 16,
    trait: pick(TRAITS),
    needs: {
      sleep: 70 + rnd(30), food: 65 + rnd(35), water: 70 + rnd(30),
      fun: 55 + rnd(45), social: 60 + rnd(40), meaning: 50 + rnd(50),
    },
    goal: { action: 'wander', tx: rnd(COLS), ty: rnd(ROWS) },
    inventory: [],
    energy: 80 + rnd(20),
    mood: 50 + rnd(50),
    memory: [],
    isPainting: false,
    isDigging: false,
    isChopping: false,
    activity: '',
  };
}

// ── Один тик симуляции ──
export function tick(ws: WorldState): Partial<WorldState> {
  const now = Date.now();
  const newEvents: Event[] = [];
  const newLetters: Letter[] = [...ws.letters];
  const newObjects: WorldObj[] = [...ws.objects];
  const newBuildings: Building[] = [...ws.buildings];

  const log = (icon: string, text: string, kind: string) => {
    newEvents.push({ id: uid(), icon, text, kind });
  };

  const newPeople = ws.people.map((p) => {
    let updated = { ...p };

    // 1. Убывают потребности
    updated.needs = decayNeeds(p);

    // 2. Настроение: зависит от потребностей
    const avgNeeds = Object.values(updated.needs).reduce((a, b) => a + b, 0) / 6;
    updated.mood = Math.max(0, Math.min(100, avgNeeds * 0.7 + updated.mood * 0.3));

    // 3. Характер эволюционирует
    const newTrait = evolveTraitByMood(updated);
    if (newTrait !== updated.trait) {
      log('🔀', `${p.name} изменился: был ${updated.trait}, стал ${newTrait}`, 'trait');
      updated.trait = newTrait;
    }

    // 4. Двигаемся к цели
    const { goal } = updated;
    const tx = Math.max(0, Math.min(COLS - 1, goal.tx));
    const ty = Math.max(0, Math.min(ROWS - 1, goal.ty));
    const dx = Math.sign(tx - updated.x);
    const dy = Math.sign(ty - updated.y);
    const spd = SPEED * (updated.energy / 100 * 0.5 + 0.5);
    const arrived = Math.abs(updated.x - tx) < 0.6 && Math.abs(updated.y - ty) < 0.6;

    if (!arrived) {
      if (dx !== 0) { updated.x += dx * spd; updated.facing = dx > 0 ? 1 : -1; }
      else if (dy !== 0) updated.y += dy * spd;
      updated.isPainting = false;
      updated.isDigging = false;
      updated.isChopping = false;
      updated.activity = '';
    }

    // 5. Пришли — выполняем действие
    if (arrived) {
      updated = performAction(updated, ws.people, newObjects, newBuildings, newLetters, newEvents, log, now);
    }

    // 6. Контекстные мысли (где нахожусь, что вижу)
    if (!arrived && Math.random() < 0.04) {
      const ct = contextThought(updated, newObjects, newBuildings);
      if (ct) {
        updated.thought = ct;
        updated.thoughtTs = now;
      }
    }

    // 7. Гасим старые мысли
    if (updated.thought && now - updated.thoughtTs > 4500) updated.thought = null;

    return updated;
  });

  // Случайные события мира
  if (Math.random() < 0.04 && newPeople.length < 22) {
    const baby = createPerson();
    baby.age = 1;
    (newPeople as Person[]).push(baby);
    log('👶', `Родился новый житель — ${baby.name}!`, 'birth');
  }

  // Старость и уход
  if (Math.random() < 0.025 && newPeople.length > 4) {
    const old = newPeople.reduce((a, b) => a.age > b.age ? a : b);
    const idx = newPeople.findIndex(p => p.id === old.id);
    if (idx !== -1) {
      newPeople.splice(idx, 1);
      log('🕯️', `${old.name} прожил долгую жизнь (${old.age} лет) и покинул город.`, 'death');
    }
  }

  // Деревья сами растут
  if (Math.random() < 0.05 && newObjects.filter(o => o.kind === 'tree').length < 8) {
    newObjects.push({ id: uid(), kind: 'tree', x: rnd(COLS), y: rnd(ROWS), hp: 100 });
    log('🌱', 'Выросло новое дерево.', 'nature');
  }

  // Цветы появляются
  if (Math.random() < 0.06 && newObjects.filter(o => o.kind === 'flower').length < 12) {
    newObjects.push({ id: uid(), kind: 'flower', x: rnd(COLS), y: rnd(ROWS), hp: 100 });
  }

  return {
    people: newPeople as Person[],
    buildings: newBuildings,
    objects: newObjects,
    letters: newLetters,
    events: [...newEvents, ...ws.events].slice(0, 60),
    tick: ws.tick + 1,
  };
}

// ── Выполнение действия при прибытии ──
function performAction(
  p: Person,
  allPeople: Person[],
  objects: WorldObj[],
  buildings: Building[],
  letters: Letter[],
  events: Event[],
  log: (icon: string, text: string, kind: string) => void,
  now: number,
): Person {
  const { goal } = p;
  const updated = { ...p };

  // Соседи в радиусе 4
  const nearby = allPeople.filter(o => o.id !== p.id && dist(o.x, o.y, p.x, p.y) < 4);

  switch (goal.action) {
    case 'wander': {
      // Когда дошли — выбираем новую цель
      const newGoal = pickGoal(p, allPeople, objects, buildings);
      updated.goal = newGoal;
      if (newGoal.planThought) {
        updated.thought = newGoal.planThought;
        updated.thoughtTs = now;
        log('💭', `${p.name} думает: «${newGoal.planThought}»`, 'thought');
      }
      break;
    }

    case 'sleep': {
      updated.needs = { ...updated.needs, sleep: Math.min(100, updated.needs.sleep + 45) };
      updated.energy = Math.min(100, updated.energy + 20);
      updated.thought = '💤 Ах, хорошо поспал!';
      updated.thoughtTs = now;
      updated.activity = '💤';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'eat': {
      updated.needs = { ...updated.needs, food: Math.min(100, updated.needs.food + 50) };
      updated.mood = Math.min(100, updated.mood + 15);
      updated.thought = '🍞 Вкусно! Поел.';
      updated.thoughtTs = now;
      updated.activity = '🍽️';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'drink': {
      updated.needs = { ...updated.needs, water: Math.min(100, updated.needs.water + 55) };
      updated.thought = '💧 Свежая вода!';
      updated.thoughtTs = now;
      updated.activity = '💧';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'socialize': {
      updated.needs = { ...updated.needs, social: Math.min(100, updated.needs.social + 40) };
      updated.mood = Math.min(100, updated.mood + 10);
      const partner = allPeople.find(o => o.id === goal.targetId);
      if (partner) {
        const dialogues = [
          `«${p.name}» и «${partner.name}» поговорили о жизни.`,
          `«${p.name}» рассказал ${partner.name} городские новости.`,
          `«${p.name}» и «${partner.name}» поспорили о монолите.`,
          `«${p.name}» пожаловался ${partner.name} на усталость.`,
          `«${p.name}» и «${partner.name}» вместе посмеялись.`,
        ];
        const d = dialogues[rnd(dialogues.length)];
        log('💬', d, 'social');
        updated.thought = `😊 Поговорил с ${partner.name}`;
        updated.thoughtTs = now;
      }
      updated.activity = '';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'paint_graffiti': {
      updated.isPainting = true;
      updated.activity = '🖌️';
      const existing = objects.find(o => o.kind === 'graffiti' && Math.abs(o.x - p.x) < 1 && Math.abs(o.y - p.y) < 1);
      if (!existing) {
        objects.push({ id: uid(), kind: 'graffiti', x: Math.round(p.x), y: Math.round(p.y), hp: 100, data: p.color, variant: rnd(4), author: p.name });
        log('🎨', `${p.name} нарисовал граффити!`, 'build');
        updated.needs = { ...updated.needs, fun: Math.min(100, updated.needs.fun + 25), meaning: Math.min(100, updated.needs.meaning + 20) };
        // Реакции соседей
        nearby.forEach(o => {
          const reaction = getReaction(o, 'paint_graffiti');
          const isPositive = reaction.includes('!') && !reaction.includes('незакон') && !reaction.includes('прекрати') && !reaction.includes('Вандал');
          log(isPositive ? '😍' : '😤', `${o.name}: «${reaction}»`, 'thought');
          events.push({ id: uid(), icon: isPositive ? '😍' : '😤', text: `${o.name}: «${reaction}»`, kind: 'thought' });
        });
      }
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'chop_tree': {
      updated.isChopping = true;
      updated.activity = '🪓';
      const tree = objects.find(o => o.id === goal.targetId && o.kind === 'tree');
      if (tree) {
        tree.hp -= 40;
        if (tree.hp <= 0) {
          const idx = objects.indexOf(tree);
          if (idx !== -1) {
            objects.splice(idx, 1);
            objects.push({ id: uid(), kind: 'tree_stump', x: tree.x, y: tree.y, hp: 100 });
          }
          updated.inventory = [...updated.inventory, 'wood'];
          log('🪓', `${p.name} срубил дерево! Получил дерево в инвентарь.`, 'action');
          nearby.forEach(o => {
            const r = getReaction(o, 'chop_tree');
            log(o.trait === 'kind' || o.trait === 'fearful' ? '😢' : '👀', `${o.name}: «${r}»`, 'thought');
          });
        } else {
          log('🪓', `${p.name} рубит дерево... (HP: ${tree.hp})`, 'action');
        }
      }
      updated.isChopping = false;
      updated.activity = '';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'dig_ground': {
      updated.isDigging = true;
      updated.activity = '⛏️';
      const hole = objects.find(o => o.kind === 'hole' && Math.abs(o.x - p.x) < 1 && Math.abs(o.y - p.y) < 1);
      if (!hole) {
        const loot = Math.random();
        let found = '';
        if (loot < 0.2) { found = 'stone'; objects.push({ id: uid(), kind: 'stone', x: Math.round(p.x) + 1, y: Math.round(p.y), hp: 100 }); }
        if (loot < 0.05) { found = 'flower'; objects.push({ id: uid(), kind: 'flower', x: Math.round(p.x), y: Math.round(p.y) + 1, hp: 100 }); }
        objects.push({ id: uid(), kind: 'hole', x: Math.round(p.x), y: Math.round(p.y), hp: 100 });
        log('⛏️', found
          ? `${p.name} выкопал яму и нашёл: ${found}!`
          : `${p.name} копает землю и нашёл... ничего.`, 'action');
        nearby.forEach(o => {
          const r = getReaction(o, 'dig_ground');
          log('👀', `${o.name}: «${r}»`, 'thought');
        });
      }
      updated.isDigging = false;
      updated.activity = '';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'break_building': {
      updated.activity = '💥';
      const b = buildings.find(b => b.id === goal.targetId && b.kind !== 'monolith');
      if (b) {
        b.hp = Math.max(0, b.hp - 35);
        if (b.hp <= 0) {
          const idx = buildings.indexOf(b);
          if (idx !== -1) buildings.splice(idx, 1);
          objects.push({ id: uid(), kind: 'rubble', x: b.gx, y: b.gy, hp: 100 });
          updated.inventory = [...updated.inventory, 'stone'];
          log('💥', `${p.name} разрушил здание и взял камень!`, 'destroy');
        } else {
          log('🔨', `${p.name} откалывает камень от здания (HP: ${b.hp})`, 'action');
        }
        nearby.forEach(o => {
          const r = getReaction(o, 'break_building');
          log(o.trait === 'lawful' ? '😡' : '👀', `${o.name}: «${r}»`, 'thought');
        });
      }
      updated.activity = '';
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'pick_stone': {
      const stone = objects.find(o => o.id === goal.targetId && o.kind === 'stone');
      if (stone) {
        const idx = objects.indexOf(stone);
        if (idx !== -1) objects.splice(idx, 1);
        updated.inventory = [...updated.inventory, 'stone'];
        log('🪨', `${p.name} подобрал камень.`, 'action');
        updated.thought = '🪨 Камень пригодится!';
        updated.thoughtTs = now;
      }
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'worship': {
      updated.needs = { ...updated.needs, meaning: Math.min(100, updated.needs.meaning + 35), fun: Math.min(100, updated.needs.fun + 10) };
      updated.mood = Math.min(100, updated.mood + 20);
      updated.thought = '🙏 Монолит слышит меня.';
      updated.thoughtTs = now;
      updated.activity = '🙏';
      log('🛐', `${p.name} молится у монолита.`, 'worship');
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'deliver_letter': {
      updated.needs = { ...updated.needs, meaning: Math.min(100, updated.needs.meaning + 40) };
      const letterText = goal.data ?? 'Хочу лучшей жизни.';
      letters.push({ id: uid(), from: p.name, text: letterText, ts: now, answered: false });
      log('📬', `${p.name} оставил письмо у монолита: «${letterText}»`, 'worship');
      updated.thought = '📬 Монолит получил моё послание.';
      updated.thoughtTs = now;
      updated.activity = '📬';
      nearby.forEach(o => {
        const r = getReaction(o, 'deliver_letter');
        log('🛐', `${o.name}: «${r}»`, 'thought');
      });
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'sit_campfire': {
      updated.needs = {
        ...updated.needs,
        food: Math.min(100, updated.needs.food + 30),
        fun: Math.min(100, updated.needs.fun + 35),
        social: Math.min(100, updated.needs.social + 20),
      };
      updated.mood = Math.min(100, updated.mood + 25);
      updated.thought = '🔥 Хорошо у огня!';
      updated.thoughtTs = now;
      updated.activity = '🔥';
      log('🔥', `${p.name} греется у костра.`, 'social');
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'dance': {
      updated.needs = { ...updated.needs, fun: Math.min(100, updated.needs.fun + 40), social: Math.min(100, updated.needs.social + 15) };
      updated.mood = Math.min(100, updated.mood + 20);
      updated.activity = '💃';
      log('💃', `${p.name} танцует!`, 'social');
      nearby.forEach(o => {
        if (Math.random() < 0.5) {
          const danceReactions = ['Присоединяюсь!', 'Хороший танцор!', 'Не мешайте спать!', 'Красиво!'];
          log('😄', `${o.name}: «${pick(danceReactions)}»`, 'thought');
        }
      });
      updated.thought = '💃 Танцую!';
      updated.thoughtTs = now;
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    case 'build': {
      const rubble = objects.find(o => o.kind === 'rubble' && dist(o.x, o.y, p.x, p.y) < 3);
      if (rubble && updated.inventory.includes('stone')) {
        const idx = objects.indexOf(rubble);
        if (idx !== -1) objects.splice(idx, 1);
        updated.inventory = updated.inventory.filter(i => i !== 'stone');
        buildings.push({ id: uid(), gx: Math.round(p.x), gy: Math.round(p.y), kind: 'house', hp: 100 });
        log('🏗️', `${p.name} построил новый дом из камня!`, 'build');
        updated.thought = '🏠 Построил!';
        updated.thoughtTs = now;
      }
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
      break;
    }

    default: {
      updated.goal = pickGoal(updated, allPeople, objects, buildings);
    }
  }

  return updated;
}
