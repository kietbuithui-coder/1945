import './style.css';
import { Game } from './game/game';
import { audio } from './game/audio';

const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #scene canvas');

const game = new Game(canvas);
(window as unknown as { __game: Game }).__game = game;

// ------------------------------------------------------------- stage scale --
const stage = document.getElementById('stage') as HTMLElement | null;
function fit(): void {
  if (!stage) return;
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

// ------------------------------------------------------------------ audio ---
const unlock = () => { audio.resume(); };
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

game.boot();
