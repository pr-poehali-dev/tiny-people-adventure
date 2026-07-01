// ═══════════════════════════════════════
//  PIXEL LIFE — Типы всего мира
// ═══════════════════════════════════════

export type Trait = 'rebel' | 'lawful' | 'artist' | 'wise' | 'lazy' | 'greedy' | 'kind' | 'fearful';
export type Need = 'sleep' | 'food' | 'water' | 'fun' | 'social' | 'meaning';

export type ActionType =
  | 'wander'
  | 'sleep'
  | 'eat'
  | 'drink'
  | 'socialize'
  | 'paint_graffiti'
  | 'chop_tree'
  | 'dig_ground'
  | 'break_building'
  | 'worship'
  | 'deliver_letter'
  | 'build'
  | 'sit_campfire'
  | 'pick_stone'
  | 'fight'
  | 'dance'
  | 'flee';

export type Goal = {
  action: ActionType;
  tx: number;
  ty: number;
  targetId?: number;   // id объекта или человечка
  data?: string;       // доп. данные (текст письма и т.д.)
  planThought?: string; // «подумал о реакции других» — показываем перед действием
};

export type Job = { emoji: string; title: string };

export type Person = {
  id: number;
  name: string;
  job: Job;
  x: number;
  y: number;
  facing: 1 | -1;
  color: string;
  skin: string;
  thought: string | null;
  thoughtTs: number;
  age: number;
  trait: Trait;
  needs: Record<Need, number>;
  goal: Goal;
  inventory: string[];       // ['stone','wood','flower']
  energy: number;            // 0-100, влияет на скорость
  mood: number;              // 0-100
  memory: string[];          // последние 3 важных события для этого жителя
  isPainting: boolean;
  isDigging: boolean;
  isChopping: boolean;
  activity: string;          // текущая анимация-иконка над головой
};

// ── Объекты мира ──
export type WorldObjKind =
  | 'tree' | 'tree_stump'
  | 'stone' | 'stone_broken'
  | 'hole'
  | 'campfire'
  | 'graffiti'
  | 'letter_box'    // ящик у монолита с письмами
  | 'bench'
  | 'well'
  | 'flower'
  | 'rubble';       // обломки здания

export type WorldObj = {
  id: number;
  kind: WorldObjKind;
  x: number;
  y: number;
  hp: number;       // 100 = целый, 0 = уничтожен
  data?: string;    // для graff — цвет; для letter — текст
  variant?: number;
  author?: string;
};

export type Building = {
  id: number;
  gx: number;
  gy: number;
  kind: 'house' | 'tower' | 'shop' | 'monolith';
  hp: number;
};

export type Letter = {
  id: number;
  from: string;
  text: string;         // желание жителя
  ts: number;
  answered: boolean;
  answer?: string;
};

export type Event = {
  id: number;
  icon: string;
  text: string;
  kind: string;
};

export type WorldState = {
  people: Person[];
  buildings: Building[];
  objects: WorldObj[];
  letters: Letter[];
  events: Event[];
  era: string;
  rule: string;
  tick: number;
  mode: 'human' | 'flip' | 'native';
};
