// Chaos probe: open every panel and click every enabled control, watching for
// exceptions. Run with: npx tsx tools/chaos.ts
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
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.localStorage = dom.window.localStorage;
class FakeImage { onload: any = null; onerror: any = null; complete = false; naturalWidth = 0; naturalHeight = 0; private _s=''; get src(){return this._s;} set src(v:string){this._s=v;this.complete=true;this.naturalWidth=64;this.naturalHeight=64;setTimeout(()=>this.onload?.(),0);} }
(g as any).Image = FakeImage; (win as any).Image = FakeImage;
function makeCtx(): any {
  const gradient = { addColorStop() {} };
  return new Proxy({}, { get: (_t, p: string) => (p === 'createRadialGradient' || p === 'createLinearGradient') ? () => gradient : (p === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
}
(dom.window as any).HTMLCanvasElement.prototype.getContext = function () { return makeCtx(); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const errors: string[] = [];
process.on('uncaughtException', (e) => errors.push('uncaught: ' + (e as Error).stack?.split('\n').slice(0, 3).join(' | ')));
const origError = console.error;
console.error = (...a: unknown[]) => { errors.push('console.error: ' + a.map(String).join(' ').slice(0, 200)); origError(...a); };

const PANELS = ['inventory','prices','suppliers','debts','quests','journal','shop','map','family','save','settings','help'];

async function main() {
  const { Game } = await import('../src/game/game');
  const game = new Game(document.getElementById('scene') as HTMLCanvasElement);
  const ui = game.ui as any;
  game.boot();
  await sleep(80);
  document.querySelector('[data-action="new-game-screen"]')!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  document.querySelector('#start-btn')!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  document.querySelector('[data-action="chapter-continue"]')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  document.querySelector('[data-action="event-choice"]')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  game.world.state.player.money = 5000;
  game.world.state.player.reputation = 80;
  game.world.state.npcs['ba_tu'].trust = 80;

  console.log('day', game.world.state.player.day, 'phase', game.world.state.time.phase);
  for (const p of PANELS) {
    ui.openPanel(p);
    await sleep(5);
    const btns = Array.from(document.querySelectorAll('#modal-root [data-action]')) as HTMLElement[];
    const enabled = btns.filter((b) => !(b as HTMLButtonElement).disabled);
    console.log(`  ${p}: ${enabled.length} controls`);
    // click each control once; re-open the panel after each click
    for (let i = 0; i < Math.min(enabled.length, 14); i++) {
      const action = enabled[i].dataset.action;
      const ds = { ...enabled[i].dataset };
      ui.openPanel(p);
      await sleep(2);
      const el = Array.from(document.querySelectorAll(`#modal-root [data-action="${action}"]`)).find((x) => {
        const d = (x as HTMLElement).dataset;
        return Object.keys(ds).every((k) => d[k] === ds[k]);
      }) as HTMLElement | undefined;
      if (!el || (el as HTMLButtonElement).disabled) continue;
      try {
        el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      } catch (e) { errors.push(`click ${p}/${action} threw: ${(e as Error).message}`); }
      await sleep(3);
    }
    ui.closeModal();
    await sleep(3);
  }
  console.log('\nerrors:', errors.length);
  errors.slice(0, 20).forEach((e) => console.log('  !', e));
  process.exit(errors.length ? 1 : 0);
}
main().catch((e) => { console.error('CHAOS FATAL', e); process.exit(1); });
