// Randomised play fuzzer: clicks random enabled controls for hundreds of steps
// and checks the game state never goes invalid. Run: npx tsx tools/fuzz.ts [seed]
import { JSDOM } from 'jsdom';
const dom = new JSDOM(
  `<!doctype html><html><body><div id="app"><div id="stage">
     <canvas id="scene" width="1280" height="720"></canvas><div id="ui"></div><div id="loading"><div class="load-inner"><div class="load-title">Cửa Hàng 1945</div><div class="load-bar"><i id="loading-bar"></i></div></div></div>
   </div></div></body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously' },
);
const g = globalThis as Record<string, unknown>;
const win = dom.window as unknown as Record<string, unknown>;
for (const key of ['window','document','localStorage','HTMLElement','Element','Node','Event','MouseEvent','KeyboardEvent','getComputedStyle']) g[key] = win[key];
g.requestAnimationFrame = () => 0 as unknown as number; // the fuzzer drives the loop itself
g.cancelAnimationFrame = () => {};
g.localStorage = dom.window.localStorage;
class FakeImage { onload: any = null; onerror: any = null; complete = false; naturalWidth = 0; naturalHeight = 0; private _s=''; get src(){return this._s;} set src(v:string){this._s=v;this.complete=true;this.naturalWidth=64;this.naturalHeight=64;setTimeout(()=>this.onload?.(),0);} }
(g as any).Image = FakeImage; (win as any).Image = FakeImage;
function makeCtx(): any {
  const gradient = { addColorStop() {} };
  return new Proxy({}, { get: (_t, p: string) => (p === 'createRadialGradient' || p === 'createLinearGradient') ? () => gradient : (p === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
}
(dom.window as any).HTMLCanvasElement.prototype.getContext = function () { return makeCtx(); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEED = Number(process.argv[2] ?? 1945);
let rngState = SEED >>> 0;
const rnd = () => { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)] as T;

const problems: string[] = [];
process.on('uncaughtException', (e) => problems.push('uncaught: ' + (e as Error).message));
const origErr = console.error;
console.error = (...a: unknown[]) => { problems.push('console.error: ' + a.map(String).join(' ').slice(0, 160)); };

function scanNumbers(obj: unknown, path = 'state', seen = new Set()): string[] {
  const bad: string[] = [];
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'number' && !Number.isFinite(obj)) bad.push(`${path} = ${obj}`);
    return bad;
  }
  if (seen.has(obj as object)) return bad;
  seen.add(obj as object);
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) bad.push(...scanNumbers(v, `${path}.${k}`, seen));
  return bad;
}

async function main() {
  const { Game } = await import('../src/game/game');
  const game = new Game(document.getElementById('scene') as HTMLCanvasElement);
  const ui = game.ui as any;
  game.boot();
  await sleep(60);
  document.querySelector('[data-action="new-game-screen"]')!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  document.querySelector('#start-btn')!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  for (const sel of ['[data-action="chapter-continue"]', '[data-action="event-choice"]']) {
    document.querySelector(sel)?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
  }

  const STEP = Number(process.argv[3] ?? 500);
  const stats = { clicks: 0, days: 0, sales: 0 };
  for (let i = 0; i < STEP; i++) {
    const all = Array.from(document.querySelectorAll('#ui [data-action]')) as HTMLElement[];
    const usable = all.filter((el) => !(el as HTMLButtonElement).disabled && el.dataset.action !== 'modal-surface' && el.dataset.action !== 'backdrop');
    if (!usable.length) { game.openShop(); continue; }
    const el = pick(usable);
    const action = el.dataset.action ?? '';
    // avoid dead ends: story cards must be answered, so prefer their buttons
    const storyCard = document.querySelector('.backdrop[data-static]');
    const target = storyCard
      ? (Array.from(storyCard.querySelectorAll('[data-action]')) as HTMLElement[])
          .filter((x) => x.dataset.action !== 'modal-surface' && x.dataset.action !== 'backdrop' && !(x as HTMLButtonElement).disabled)[0] ?? el
      : el;
    try {
      target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      stats.clicks++;
    } catch (e) {
      problems.push(`click ${target.dataset.action} threw ${(e as Error).message}`);
    }
    // keep the run moving: open the shop in the morning, dismiss leftover panels
    const st0 = game.world.state;
    if (st0.time.phase === 'morning' && i % 3 === 0) game.openShop();
    const backdrop = document.querySelector('.backdrop:not([data-static])') as HTMLElement | null;
    if (backdrop) {
      const closer = Array.from(backdrop.querySelectorAll('[data-action="close-modal"],[data-action="confirm-no"]')) as HTMLElement[];
      if (closer.length && rnd() < 0.8) pick(closer).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    }
    // drive the clock in big steps (the real loop is capped at 50ms per frame,
    // which would make a 30-day run take hours of wall clock)
    game.world.state.time.paused = false;
    for (let k = 0; k < 4; k++) {
      if (game.world.state.time.phase === 'open' && !ui.modalOpen && ui.activePanel === null) {
        game.world.advanceTime(20);
      } else break;
    }
    // the loop normally opens the report when the clock runs out; the fuzzer
    // bypasses the loop, so do it by hand
    if (game.world.state.time.phase === 'report' && !document.querySelector('.backdrop')) {
      ui.showReport();
    }
    // invariants
    const st = game.world.state;
    if (!Number.isFinite(st.player.money)) problems.push(`money not finite at step ${i}: ${st.player.money}`);
    if (st.player.money < 0) problems.push(`money negative at step ${i}: ${st.player.money}`);
    if (st.player.day < 1 || st.player.day > 30) problems.push(`day out of range at step ${i}: ${st.player.day}`);
    for (const inv of st.inventory) if (inv.qty <= 0 || !Number.isFinite(inv.qty)) problems.push(`bad stack qty at step ${i}: ${inv.qty}`);
    for (const sh of st.shelves) if (sh.qty < 0) problems.push(`bad shelf qty at step ${i}: ${sh.qty}`);
    const nan = scanNumbers(st, 'state');
    if (nan.length) problems.push(`non-finite state at step ${i}: ${nan.slice(0, 3).join(', ')}`);
    if (problems.length > 5) break;
    await sleep(1);
  }
  stats.days = game.world.state.player.day;
  console.log(`seed ${SEED}: ${stats.clicks} clicks, reached day ${stats.days}, problems: ${problems.length}`);
  problems.slice(0, 10).forEach((p) => console.log('  !', p));
  process.exit(problems.length ? 1 : 0);
}
main().catch((e) => { console.error('FUZZ FATAL', e); process.exit(1); });
