import './style.css';
import { Game } from './game/game';
import { audio } from './game/audio';

const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #scene canvas');

const game = new Game(canvas);
(window as unknown as { __game: Game }).__game = game;

// ------------------------------------------------------------- stage scale --
const stage = document.getElementById('stage') as HTMLElement | null;
const rotateHint = document.createElement('div');
rotateHint.className = 'rotate-hint';
rotateHint.textContent = 'Màn hình nhỏ — xoay ngang máy để chơi thoải mái hơn.';
document.getElementById('app')?.appendChild(rotateHint);

function fit(): void {
  if (!stage) return;
  // fit the 1280x720 board into the viewport, leaving a small margin
  const s = Math.min((window.innerWidth - 16) / 1280, (window.innerHeight - 16) / 720, 1);
  stage.style.transform = `scale(${Math.max(0.2, s)})`;
  // below this the type is unreadable in portrait; suggest turning the device
  rotateHint.classList.toggle('show', s < 0.42 && window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

// ------------------------------------------------------------------ audio ---
const unlock = () => { audio.resume(); };
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

game.boot();
