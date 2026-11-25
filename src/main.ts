// ── main.ts · bootstrap ─────────────────────────────────────────────────────
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './style.css';
import { Game } from './game/game';

const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
const root = document.getElementById('ui') as HTMLElement | null;
if (!canvas || !root) throw new Error('Thiếu #scene hoặc #ui');

const game = new Game(canvas, root);
(globalThis as unknown as { __game: Game }).__game = game;

// Scale nguyên vẹn khung 1280×720, giữ pixel sắc nét, không méo ảnh.
const stage = document.getElementById('stage') as HTMLElement;
function fit(): void {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

void game.boot();
