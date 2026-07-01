// ═══════════════════════════════════════
//  PIXEL LIFE — Мозг человечка
//  Потребности → Цели → Мысли → Реакции
// ═══════════════════════════════════════

import type { Person, WorldObj, Building, Need, Trait, Goal, ActionType } from './types';

// ── Метки характеров ──
export const TRAIT_LABEL: Record<Trait, string> = {
  rebel:   '🔥 бунтарь',
  lawful:  '⚖️ законник',
  artist:  '🎨 артист',
  wise:    '🧠 мудрец',
  lazy:    '😴 лентяй',
  greedy:  '💰 жадный',
  kind:    '💚 добряк',
  fearful: '😰 трус',
};

// ── Скорость убывания потребностей по характеру ──
const NEED_DECAY: Record<Trait, Partial<Record<Need, number>>> = {
  rebel:   { fun: 1.2, social: 0.5 },
  lawful:  { meaning: 0.8 },
  artist:  { fun: 0.4, meaning: 1.2 },
  wise:    { meaning: 0.4, sleep: 0.7 },
  lazy:    { sleep: 1.5, food: 0.9 },
  greedy:  { food: 1.1, water: 1.1 },
  kind:    { social: 1.3 },
  fearful: { meaning: 1.4, social: 0.6 },
};

const BASE_DECAY: Record<Need, number> = {
  sleep: 0.35, food: 0.45, water: 0.55, fun: 0.3, social: 0.38, meaning: 0.25,
};

export function decayNeeds(p: Person): Record<Need, number> {
  const n = { ...p.needs };
  const trait_mod = NEED_DECAY[p.trait] || {};
  for (const k of Object.keys(n) as Need[]) {
    const rate = BASE_DECAY[k] * (trait_mod[k] ?? 1);
    n[k] = Math.max(0, n[k] - rate);
  }
  return n;
}

// ── Самая срочная потребность ──
export function urgentNeed(needs: Record<Need, number>): Need | null {
  const priority: Need[] = ['sleep', 'food', 'water', 'fun', 'social', 'meaning'];
  let worst: Need | null = null;
  let worstVal = 35;
  for (const n of priority) {
    if (needs[n] < worstVal) { worst = n; worstVal = needs[n]; }
  }
  return worst;
}

// ── Реакция на действие по характеру ──
type ReactionKey = 'chop_tree' | 'dig_ground' | 'break_building' | 'paint_graffiti'
  | 'fight' | 'worship' | 'dance' | 'build' | 'deliver_letter';

const REACTIONS: Record<Trait, Partial<Record<ReactionKey, string[]>>> = {
  rebel: {
    chop_tree:       ['Давай, рубай! Лес нам не указ!', 'Свобода природе!'],
    break_building:  ['Сноси всё! Новый мир!', 'Разрушение — это тоже творчество.'],
    paint_graffiti:  ['Отличная работа, художник!', 'Стены — наш холст!'],
    worship:         ['Не верю в монолит. Иду гулять.', 'Поклоняться? Смешно.'],
    fight:           ['Вот это да! Хорошая драка!', 'Дерись сильнее!'],
    dance:           ['Потанцую с тобой!', 'Праздник!'],
    build:           ['Хм, зачем? Старое и так годится.'],
    deliver_letter:  ['Хорошее желание!', 'Бог слышит смелых!'],
    dig_ground:      ['Копай глубже! Найдёшь сокровища!'],
  },
  lawful: {
    chop_tree:       ['Есть ли разрешение?!', 'Немедленно прекратить!'],
    break_building:  ['Это незаконно!', 'Остановитесь, нарушители!'],
    paint_graffiti:  ['Вандализм карается штрафом!', 'Немедленно закрасить!'],
    worship:         ['Чтим монолит, как велит закон.', 'Да пребудет порядок.'],
    fight:           ['Разнять немедленно!', 'Я вызову стражу!'],
    dance:           ['Это уместно?', 'Танцы до вечера — и по домам.'],
    build:           ['Правильно, строим по плану!', 'Соблюдаем нормы!'],
    deliver_letter:  ['Мой запрос оформлен официально.'],
    dig_ground:      ['Есть ли разрешение на раскопки?!'],
  },
  artist: {
    chop_tree:       ['Дерево — натурщик... жалко.', 'Нарисую его перед гибелью.'],
    break_building:  ['Из обломков сделаю скульптуру!', 'Прекрасный хаос.'],
    paint_graffiti:  ['Шедевр! Я учусь!', 'Немного яркости не хватает!'],
    worship:         ['Монолит — вдохновение эпох.', 'Сделаю его портрет.'],
    fight:           ['Какая экспрессия... запишу в дневник.'],
    dance:           ['Присоединяюсь! Музыка!', 'Это прекрасно!'],
    build:           ['Пусть будет красиво!', 'Добавлю орнамент.'],
    deliver_letter:  ['Написал поэму в конверте.'],
    dig_ground:      ['Ищу артефакты!', 'Может, клад художника...'],
  },
  wise: {
    chop_tree:       ['Дерево дало нам плоды — теперь мы его гасим...', 'Последствия непредсказуемы.'],
    break_building:  ['Разрушение предшествует созиданию.', 'Осмыслим последствия.'],
    paint_graffiti:  ['Надписи на стенах — послания веков.'],
    worship:         ['Монолит — символ коллективной воли.', 'Истина открывается в тишине.'],
    fight:           ['Конфликт — это диалог силой.', 'Надо разобраться в причинах.'],
    dance:           ['Танец — древнейший язык.'],
    build:           ['Строительство — акт веры в будущее.'],
    deliver_letter:  ['Мои слова — семена смысла.'],
    dig_ground:      ['Земля хранит тайны прошлого.'],
  },
  lazy: {
    chop_tree:       ['Ну и пусть рубят. Мне тепло от костра.'],
    break_building:  ['Лишь бы не меня попросили убирать.'],
    paint_graffiti:  ['Угу, красиво. Я сплю.'],
    worship:         ['До монолита далеко... может завтра.'],
    fight:           ['Слишком шумно. Иду спать.'],
    dance:           ['Ладно, разок потоптаться.'],
    build:           ['Это же работа... зачем.'],
    deliver_letter:  ['Написал "хочу спать" и положил в ящик.'],
    dig_ground:      ['Лопата тяжёлая. Нет.'],
  },
  greedy: {
    chop_tree:       ['Дрова продам! Деньги!', 'Отличное сырьё!'],
    break_building:  ['Кирпичи ценные. Соберу.'],
    paint_graffiti:  ['Если заплатят — нарисую.'],
    worship:         ['Принесу подношение и попрошу богатства.'],
    fight:           ['За деньги? Готов!', 'Зачем? Что мне за это?'],
    dance:           ['Если это привлекает покупателей — танцую.'],
    build:           ['Построю и сдам в аренду.'],
    deliver_letter:  ['Попрошу у бога злата.'],
    dig_ground:      ['Ищу клад! Скорее!'],
  },
  kind: {
    chop_tree:       ['Бедное дерево... может, хоть посадим новое?'],
    break_building:  ['Людям же негде жить будет!', 'Сначала найдём жильё соседям.'],
    paint_graffiti:  ['Красиво! Город стал веселее!'],
    worship:         ['Помолюсь за всех жителей.', 'Пусть всем будет хорошо.'],
    fight:           ['Остановитесь! Помиритесь!', 'Может, поговорим?'],
    dance:           ['Танцуем вместе! Зову всех!'],
    build:           ['Помогу! Это для всех!'],
    deliver_letter:  ['Написал, чтобы всем было хорошо.'],
    dig_ground:      ['Сделаем огород для всех!'],
  },
  fearful: {
    chop_tree:       ['А вдруг дерево упадёт на меня?!', 'Опасно...'],
    break_building:  ['Спасаюсь! Всё рушится!'],
    paint_graffiti:  ['Смотрю из-за угла... вдруг поймают?'],
    worship:         ['Боюсь монолита... но надо.', 'Молюсь чтобы не случилось плохого.'],
    fight:           ['Бегу! БЕГУ!'],
    dance:           ['А все смотрят... стыдно.'],
    build:           ['А что если упадёт?!'],
    deliver_letter:  ['Написал анонимно. На всякий случай.'],
    dig_ground:      ['А вдруг провалюсь?!'],
  },
};

// ── Мысли по контексту места ──
export function contextThought(p: Person, objs: WorldObj[], buildings: Building[]): string | null {
  const near = objs.filter(o => Math.abs(o.x - p.x) < 3 && Math.abs(o.y - p.y) < 3);

  for (const o of near) {
    if (o.kind === 'tree') {
      if (p.trait === 'artist') return '🌲 Нарисую этот дуб...';
      if (p.trait === 'greedy') return '🪵 Сколько дров можно срубить!';
      if (p.trait === 'rebel') return '🌲 Срублю? Почему нет!';
      if (p.trait === 'kind') return '🌳 Какое красивое дерево...';
      return '🌿 Тихо здесь, у дерева.';
    }
    if (o.kind === 'campfire') {
      if (p.needs.food < 40) return '🔥 Поем у костра!';
      return '🔥 Хорошо у огня...';
    }
    if (o.kind === 'well') {
      if (p.needs.water < 40) return '💧 Наконец вода!';
      return '💧 Свежий колодец.';
    }
    if (o.kind === 'hole') return '🕳️ Кто-то вырыл яму...';
    if (o.kind === 'graffiti') {
      if (p.trait === 'lawful') return '😡 Опять вандализм!';
      if (p.trait === 'artist') return '🎨 Интересный стиль!';
      return '👀 Кто это нарисовал?';
    }
    if (o.kind === 'stone') {
      if (p.trait === 'greedy') return '💎 Ценный камень!';
      if (p.inventory.length === 0) return '🪨 Подберу камень.';
    }
    if (o.kind === 'rubble') return '🧱 Обломки... кто разрушил?';
    if (o.kind === 'flower') return '🌸 Какой цветок!';
    if (o.kind === 'bench') {
      if (p.needs.sleep < 50) return '😴 Посижу, отдохну.';
    }
    if (o.kind === 'letter_box') {
      if (p.needs.meaning < 40) return '📬 Напишу желание богу.';
      return '📬 Что в ящике у монолита?';
    }
  }

  const nearB = buildings.filter(b => Math.abs(b.gx - p.x) < 4 && Math.abs(b.gy - p.y) < 4);
  for (const b of nearB) {
    if (b.kind === 'monolith') {
      if (p.needs.meaning < 45) return '🛐 Иду к монолиту молиться.';
      if (p.trait === 'rebel') return '🗿 Монолит... может снесу?';
      return '✨ Монолит светится сегодня.';
    }
    if (b.hp < 50) {
      if (p.trait === 'kind') return '🏚️ Надо отремонтировать...';
      if (p.trait === 'rebel') return '💥 Доломаю!';
    }
  }

  // Мысли по потребностям
  if (p.needs.sleep < 20) return '💤 Засыпаю на ходу...';
  if (p.needs.food < 20) return '🍞 Умираю с голоду!';
  if (p.needs.water < 20) return '💧 Нужна вода срочно!';
  if (p.needs.social < 20) return '🙁 Никто не говорит со мной...';
  if (p.needs.meaning < 20) return '❓ В чём смысл жизни?';
  if (p.needs.fun < 20) return '😤 Мне надоело всё!';

  return null;
}

// ── Выбор цели по ситуации ──
export function pickGoal(
  p: Person,
  people: Person[],
  objs: WorldObj[],
  buildings: Building[],
): Goal {
  const need = urgentNeed(p.needs);

  // Критические потребности — идём прямо к нужному объекту
  if (need === 'sleep') {
    const bench = objs.find(o => o.kind === 'bench');
    const target = bench ?? { x: 1 + Math.floor(Math.random() * 3), y: 1 + Math.floor(Math.random() * 3) };
    return { action: 'sleep', tx: target.x, ty: target.y, planThought: '😴 Надо поспать...' };
  }
  if (need === 'food') {
    const fire = objs.find(o => o.kind === 'campfire');
    const target = fire ?? objs.find(o => o.kind === 'well') ?? { x: 5, y: 5 };
    return { action: 'eat', tx: target.x, ty: target.y, planThought: '🍞 Хочу есть...' };
  }
  if (need === 'water') {
    const well = objs.find(o => o.kind === 'well');
    const target = well ?? { x: 8, y: 8 };
    return { action: 'drink', tx: target.x, ty: target.y, planThought: '💧 Пить хочу...' };
  }
  if (need === 'fun') {
    const fire = objs.find(o => o.kind === 'campfire');
    if (fire) return { action: 'sit_campfire', tx: fire.x, ty: fire.y, planThought: '🔥 Пойду к костру!' };
    return { action: 'dance', tx: p.x + _rnd(-3, 3), ty: p.y + _rnd(-3, 3), planThought: '🎉 Надо повеселиться!' };
  }
  if (need === 'social') {
    const other = people.filter(o => o.id !== p.id);
    if (other.length > 0) {
      const target = other[Math.floor(Math.random() * other.length)];
      return { action: 'socialize', tx: Math.round(target.x), ty: Math.round(target.y), targetId: target.id, planThought: `👋 Пойду поговорю с ${target.name}...` };
    }
  }
  if (need === 'meaning') {
    const mono = buildings.find(b => b.kind === 'monolith');
    if (mono) return { action: 'deliver_letter', tx: mono.gx, ty: mono.gy, planThought: '📬 Напишу желание монолиту...', data: generateWish(p) };
    return { action: 'worship', tx: 11, ty: 7, planThought: '🛐 Иду к монолиту...' };
  }

  // Характерное поведение когда всё хорошо
  const r = Math.random();

  if (p.trait === 'artist' && r < 0.15) {
    return {
      action: 'paint_graffiti',
      tx: _rnd(2, 20), ty: _rnd(2, 13),
      planThought: '🎨 Хочу нарисовать что-нибудь. Что скажут другие?',
    };
  }
  if (p.trait === 'rebel' && r < 0.1) {
    const tree = objs.find(o => o.kind === 'tree');
    if (tree) return {
      action: 'chop_tree',
      tx: tree.x, ty: tree.y, targetId: tree.id,
      planThought: '🪓 Срублю дерево. Пусть говорят что хотят.',
    };
  }
  if ((p.trait === 'rebel' || p.trait === 'greedy') && r < 0.07) {
    const b = buildings.filter(b => b.kind !== 'monolith' && b.hp > 20);
    if (b.length > 0) {
      const target = b[Math.floor(Math.random() * b.length)];
      return {
        action: 'break_building',
        tx: target.gx, ty: target.gy, targetId: target.id,
        planThought: '💥 Отломаю кусок. Камень пригодится.',
      };
    }
  }
  if ((p.trait === 'greedy' || p.needs.food < 50) && r < 0.1) {
    const stone = objs.find(o => o.kind === 'stone');
    if (stone) return { action: 'pick_stone', tx: stone.x, ty: stone.y, targetId: stone.id, planThought: '🪨 Возьму камень, пригодится.' };
  }
  if (r < 0.06) {
    return { action: 'dig_ground', tx: _rnd(2, 20), ty: _rnd(2, 13), planThought: '⛏️ Покопаю здесь... вдруг что-то найду.' };
  }
  if ((p.trait === 'kind' || p.trait === 'fearful') && r < 0.1) {
    const mono = buildings.find(b => b.kind === 'monolith');
    if (mono) return { action: 'worship', tx: mono.gx, ty: mono.gy, planThought: '🙏 Помолюсь монолиту.' };
  }
  if (r < 0.08) {
    return { action: 'dance', tx: p.x + _rnd(-2, 2), ty: p.y + _rnd(-2, 2), planThought: '💃 Настроение хорошее — потанцую!' };
  }

  return { action: 'wander', tx: _rnd(1, 21), ty: _rnd(1, 14) };
}

// ── Реакция наблюдателя на действие ──
export function getReaction(observer: Person, action: ActionType): string {
  const pool = REACTIONS[observer.trait]?.[action as ReactionKey];
  if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  return ['Интересно...', 'Хм.', 'Продолжай.', 'Ничего нового.'][Math.floor(Math.random() * 4)];
}

// ── Генерация желания для письма к монолиту ──
function generateWish(p: Person): string {
  const wishes: Partial<Record<Trait, string[]>> = {
    rebel:   ['Дай нам свободу от всех законов!', 'Хочу чтобы больше не было правил!', 'Сделай так, чтобы я стал лидером!'],
    lawful:  ['Прошу восстановить порядок в городе.', 'Накажи тех, кто нарушает закон.', 'Пусть все живут по правилам.'],
    artist:  ['Хочу чтобы стены стали красивее!', 'Дай мне вдохновение для великого творения.', 'Пусть в городе будет больше красоты.'],
    wise:    ['Открой мне тайну смысла нашего существования.', 'Дай знание о прошлом этого места.'],
    lazy:    ['Хочу чтобы еда сама появлялась.', 'Пусть работает кто-нибудь другой.'],
    greedy:  ['Хочу богатства и ресурсов!', 'Дай мне больше всех остальных.'],
    kind:    ['Пусть все жители будут счастливы.', 'Хочу чтобы никто не голодал.'],
    fearful: ['Защити меня от опасностей.', 'Пусть ничего плохого не случится.'],
  };
  const pool = wishes[p.trait] ?? ['Хочу лучшей жизни.'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Изменение характера со временем ──
export function evolveTraitByMood(p: Person): Trait {
  const m = p.mood;
  if (m < 15 && p.trait === 'kind') return 'fearful';
  if (m > 85 && p.trait === 'fearful') return 'kind';
  if (m < 10 && p.trait === 'lawful') return 'rebel';
  if (m > 90 && p.trait === 'rebel') return 'artist';
  if (p.needs.meaning < 10 && p.trait !== 'wise') return Math.random() < 0.1 ? 'wise' : p.trait;
  return p.trait;
}

function _rnd(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
