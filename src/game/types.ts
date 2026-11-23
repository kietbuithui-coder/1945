export type Category = 'food' | 'household' | 'materials' | 'medicine' | 'valuables' | 'special';
export type Difficulty = 'story' | 'normal' | 'hard';
export type Phase = 'morning' | 'open' | 'report' | 'evening' | 'ended';
export type TimePhase = 'sang' | 'trua' | 'chieu' | 'toi';
export type Weather = 'nang' | 'nang_nhieu' | 'am_u' | 'mua' | 'mua_to' | 'nong';

export interface ItemDef {
  id: string;
  name: string;
  cat: Category;
  desc: string;
  buy: number;
  sell: number;
  weight: number;
  vol: number;
  perish: number;
  shelf: number;
  icon: string;
}

export interface NeedDef { item: string; weight: number; min: number; max: number }

export type Personality = 'kind' | 'stern' | 'shrewd' | 'proud' | 'gentle' | 'anxious' | 'cheerful' | 'quiet';

export interface NpcDef {
  id: string;
  name: string;
  age: number;
  role: string;
  bio: string;
  portrait: string;
  portraits: Record<string, string>;
  sprite: string;
  schedule: { rate: number; start: number; end: number };
  needs: NeedDef[];
  budget: [number, number];
  priceSensitivity: number;
  patience: number;
  personality: Personality;
  barter: { give: string; want: string; ratio: number }[];
  arc?: string;
  vendor?: boolean;
}

export interface SupplierDef {
  id: string;
  name: string;
  role: string;
  portrait: string;
  location: string;
  desc: string;
  items: { item: string; min: number; max: number; priceMod: number }[];
  reliability: number;
  leadDays: number;
  restock: number;
  trustGain: number;
}

export interface LocationDef {
  id: string;
  name: string;
  desc: string;
  bg: string;
  unlockDay: number;
  actions: { id: string; label: string; desc: string; kind: 'shop' | 'talk' | 'explore' | 'quest' }[];
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  level: number;
  category: 'shelf' | 'storage' | 'counter' | 'lamp' | 'sign' | 'staff';
  effect: string;
  req?: { rep?: number; trust?: number; money?: number; day?: number };
}

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  desc: string;
  stages: { text: string; objective: string; done: string }[];
  type: 'story' | 'personal' | 'side';
}

export interface ChoiceDef {
  label: string;
  hint?: string;
  require?: (s: GameState) => boolean;
  effects: string[];
  result: string;
  rep?: number;
  trust?: number;
  money?: number;
  item?: { id: string; qty: number };
  flag?: string;
  next?: string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  speaker?: string;
  portrait?: string;
  kind: 'story' | 'npc' | 'world' | 'market' | 'quest';
  day?: number;
  minDay?: number;
  maxDay?: number;
  once?: boolean;
  weight?: number;
  condition?: (s: GameState) => boolean;
  choices: ChoiceDef[];
}

export interface TxRecord {
  day: number;
  itemId: string;
  qty: number;
  price: number;
  type: 'sale' | 'credit' | 'gift' | 'barter' | 'refused';
}

export interface NpcState {
  id: string;
  trust: number;
  relationship: number;
  met: boolean;
  lastVisitDay: number;
  visits: number;
  purchases: number;
  totalSpent: number;
  flags: Record<string, number | boolean | string>;
  history: TxRecord[];
  questStage: number;
  owed: number;
}

export interface InvItem {
  uid: number;
  itemId: string;
  qty: number;
  quality: number;
  freshness: number;
  slot: number;
  acquiredDay: number;
  cost: number;
}

export interface Shelf {
  id: number;
  itemId: string | null;
  qty: number;
  quality: number;
  freshness: number;
  capacity: number;
  markup: number;
  cost: number;
}

export interface Debt {
  id: string;
  kind: 'borrowed' | 'lent';
  partyId: string;
  partyName: string;
  principal: number;
  interest: number;
  dueDay: number;
  createdDay: number;
  paid: number;
  status: 'active' | 'paid' | 'overdue' | 'defaulted';
  note?: string;
}

export interface Delivery {
  id: string;
  supplierId: string;
  supplierName: string;
  itemId: string;
  qty: number;
  quality: number;
  paid: number;
  orderDay: number;
  dueDay: number;
  status: 'transit' | 'arrived' | 'delayed' | 'lost';
}

export interface CustomerOffer {
  type: 'counter' | 'barter' | 'credit' | 'gift' | 'plea';
  price?: number;
  itemId?: string;
  qty?: number;
  text?: string;
}

export interface Customer {
  uid: number;
  npcId: string;
  name: string;
  role: string;
  portrait: string;
  itemId: string;
  qty: number;
  budget: number;
  urgency: number;
  patience: number;
  maxPatience: number;
  state: 'queue' | 'active' | 'served' | 'leaving';
  mood: string;
  offer: CustomerOffer | null;
  x: number;
  targetX: number;
  arrivedAt: number;
  lastOfferPrice: number;
  history: string[];
  barterItem?: string;
  barterQty?: number;
  line: string;
}

export interface PlannedCustomer {
  npcId: string;
  itemId: string;
  qty: number;
  hour: number;
  spawned?: boolean;
}

export interface QuestState {
  id: string;
  status: 'inactive' | 'active' | 'done' | 'failed';
  stage: number;
  choices: string[];
  startedDay?: number;
}

export interface JournalEntry {
  day: number;
  text: string;
  kind: 'story' | 'quest' | 'event' | 'sale' | 'system';
}

export interface DayStats {
  revenue: number;
  cost: number;
  purchases: number;
  profit: number;
  itemsSold: number;
  itemsBought: number;
  customersServed: number;
  customersLost: number;
  gifts: number;
  creditGiven: number;
  spoiled: number;
  fairDeals: number;
  gouged: number;
  helped: number;
  repDelta: number;
  trustDelta: number;
  familyMeal: number;
  feedback: string[];
}

export interface Totals {
  revenue: number;
  cost: number;
  purchases: number;
  profit: number;
  itemsSold: number;
  itemsBought: number;
  customersServed: number;
  customersLost: number;
  gifts: number;
  creditGiven: number;
  debtsPaid: number;
  spoiled: number;
  fairDeals: number;
  gouged: number;
  helped: number;
}

export interface GameState {
  version: number;
  slot: number;
  savedAt: number;
  playSeconds: number;
  player: {
    name: string;
    difficulty: Difficulty;
    day: number;
    chapter: number;
    money: number;
    reputation: number;
    communityTrust: number;
    familyHealth: number;
    familyPantry: number;
    flags: Record<string, number | boolean | string>;
  };
  time: {
    hour: number;
    minute: number;
    phase: Phase;
    paused: boolean;
    speed: 1 | 2 | 3;
  };
  weather: { today: Weather; tomorrow: Weather; daysLeft: number };
  calendar: { day: number; month: number; year: number };
  inventory: InvItem[];
  shelves: Shelf[];
  warehouse: { cols: number; rows: number; weightCap: number };
  npcs: Record<string, NpcState>;
  quests: Record<string, QuestState>;
  debts: Debt[];
  deliveries: Delivery[];
  suppliers: Record<string, { trust: number; stock: Record<string, number>; lastRestock: number; priceMod: number }>;
  economy: { supply: Record<string, number>; demand: Record<string, number> };
  customers: Customer[];
  activeCustomer: number | null;
  journal: JournalEntry[];
  totals: Totals;
  day: DayStats;
  story: { chapter: number; flags: Record<string, number | boolean | string> };
  settings: { sfx: number; music: number; autosave: boolean; hints: boolean };
  rngSeed: number;
  ending?: { id: string; title: string; text: string };
  dayPlan: { customers: PlannedCustomer[]; eventIds: string[]; news: string[] };
  upgrades: string[];
  employees: string[];
  shopLevel: number;
  shelfCount: number;
  travel: { location: string; actionsLeft: number };
  lastReport?: DayStats;
  seenEvents: string[];
  introDone: boolean;
  chapterIntroSeen: number[];
}

export interface NpcGameplay extends NpcDef {
  needs: NeedDef[];
}

export type GameEvent =
  | { type: 'money'; amount: number }
  | { type: 'rep'; amount: number }
  | { type: 'trust'; npc: string; amount: number }
  | { type: 'toast'; text: string; icon?: string }
  | { type: 'sound'; name: string }
  | { type: 'float'; text: string; x: number; y: number; color?: string }
  | { type: 'refresh' };
