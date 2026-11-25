// ── Cửa Hàng 1945 · shared contracts ───────────────────────────────────────
// Mọi module đều nói chuyện qua các kiểu này. Không có state ẩn trong UI.

export type Quality = 0 | 1 | 2 | 3; // Kém · Thường · Tốt · Đặc biệt
export type Category = 'food' | 'household' | 'materials' | 'medicine' | 'valuables' | 'special';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm';
export type Phase = 'title' | 'morning' | 'procure' | 'open' | 'report' | 'evening' | 'ending';
export type Difficulty = 'story' | 'normal' | 'hard';
export type Mood = 'neutral' | 'happy' | 'sad' | 'angry' | 'tired' | 'surprised';
export type GridId = 'warehouse' | 'shelves';

export interface ItemDef {
  id: string;
  name: string;
  cat: Category;
  icon: string;          // relative to assets/items/
  buy: number;           // giá nhập tham chiếu (đồng bạc)
  sell: number;          // giá bán tham chiếu
  vol: number;           // thể tích / đơn vị
  weight: number;        // cân nặng / đơn vị
  stack: number;         // tối đa một chồng
  perish: number;        // số ngày trước hư; 0 = bền
  tags: string[];        // staple, fresh, medicine, fuel, tool, rare, luxury, material, coupon…
  desc: string;
}

/** Một chồng hàng. fresh = ngày còn lại (-1 nếu không hư). */
export interface Stack {
  uid: string;
  item: string;
  qty: number;
  q: Quality;
  fresh: number;
  origin: string;
}

export interface Grid {
  w: number;
  h: number;
  cells: (Stack | null)[];
}

export interface MarketRow {
  supply: number;
  demand: number;
  flag: number;          // cú sốc giá có nguyên nhân, tự hồi về 0
}

export interface SupplierStock { qty: number; q: Quality }

export interface SupplierState {
  id: string;
  stock: Record<string, SupplierStock>;
  bond: number;
  lastRestock: number;
  reliability: number;
  priceFactor: number;
  delay: number;
  location: string;
  note: string;
}

export interface Delivery {
  id: string;
  supplier: string;
  item: string;
  qty: number;
  q: Quality;
  cost: number;
  due: number;
  risk: number;
  prepaid: boolean;
  mode: 'cash' | 'barter' | 'order';
}

export interface Debt {
  id: string;
  who: string;
  npc: string | null;
  amount: number;
  paid: number;
  due: number;
  kind: 'receivable' | 'payable';
  history: string[];
}

export interface Relation {
  trust: number;
  bond: number;
  visits: number;
  lastDay: number;
  helped: number;
  refused: number;
  history: string[];
  flags: Record<string, number>;
}

export interface BarterOffer { item: string; qty: number; q: Quality }

export interface Request {
  item: string;
  qty: number;
  maxPrice: number;
  urgency: number;       // 0..1
  barter?: BarterOffer;
  credit?: boolean;
  note: string;
}

export interface Customer {
  id: string;
  npc: string;
  name: string;
  portrait: string;
  sprite: string;
  mood: Mood;
  arrive: number;        // phút trong ngày
  line: string;
  request: Request;
  budget: number;
  patience: number;      // giây thực ở 1x
  /** Ngưỡng mặc cả cố định của khách: quyết định không đổi giữa lần đưa giá và lần chốt. */
  haggle?: number;       // 0..1, lưu được cả save cũ (fallback theo id)
  state: 'waiting' | 'active' | 'served' | 'left';
  result: string;
  arcStep: number;
}

export interface TradeLine {
  uid: string;
  grid: GridId;
  cell: number;
  item: string;
  qty: number;
  q: Quality;
  unit: number;
}

export type TradeMode = 'cash' | 'barter' | 'credit' | 'gift';

export interface Reaction {
  kind: 'accept' | 'haggle' | 'refuse' | 'cantPay' | 'askCredit' | 'barter' | 'leave';
  text: string;
  counter: number;
  delta: number;
}

export interface Trade {
  customerId: string;
  lines: TradeLine[];
  price: number;
  mode: TradeMode;
  discount: number;      // -0.3 .. 0.3
  reaction: Reaction | null;
  counter: number;
  gift: { item: string; qty: number } | null;
  barter: BarterOffer | null;
  inspected: string[];
  step: 'build' | 'quoted' | 'done';
}

export interface QuestState {
  id: string;
  status: 'locked' | 'active' | 'done' | 'failed';
  step: number;
  choice: string;
  day: number;
}

export interface JournalEntry {
  day: number;
  kind: 'story' | 'quest' | 'event' | 'sale' | 'system';
  text: string;
  meta: string;
}

export interface DayLog {
  day: number;
  revenue: number;
  cost: number;
  spoilage: number;
  debtIn: number;
  debtOut: number;
  repDelta: number;
  communityDelta: number;
  trades: number;
  served: number;
  missed: number;
  notes: string[];
}

export interface Settings {
  sound: boolean;
  volume: number;
  reduced: boolean;
  autoSort: boolean;
  autoPause: boolean;
}

export interface World {
  version: number;
  seed: number;
  rng: number;
  difficulty: Difficulty;

  day: number;
  maxDays: number;
  minute: number;
  phase: Phase;
  speed: number;
  paused: boolean;

  weather: Weather;
  weatherNext: Weather;
  forecast: string;

  money: number;
  rep: number;
  community: number;
  family: number;        // suất ăn dự trữ cho gia đình

  shopLevel: number;
  upgrades: string[];
  staff: string[];

  warehouse: Grid;
  shelves: Grid;

  market: Record<string, MarketRow>;
  suppliers: Record<string, SupplierState>;
  deliveries: Delivery[];
  debts: Debt[];

  relations: Record<string, Relation>;
  quests: Record<string, QuestState>;
  journal: JournalEntry[];
  eventsSeen: string[];
  flags: Record<string, number>;
  chapter: number;
  ending: string | null;

  queue: Customer[];
  activeCustomerId: string | null;
  news: string[];

  dayLog: DayLog;
  history: DayLog[];
  settings: Settings;

  location: string;
  travelUsed: boolean;

  stats: {
    served: number; missed: number; trades: number;
    streak: number; bestStreak: number; helped: number; refused: number;
  };

  createdAt: number;
  savedAt: number;
}

export interface SaveEnvelope {
  v: number;
  slot: string;
  savedAt: number;
  world: World;
}
