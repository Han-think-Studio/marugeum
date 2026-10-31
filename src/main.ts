import './style.css';
import { createGame } from './game/state';
import { mountUI } from './ui/ui';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app 요소가 없습니다');

// 주소 뒤에 ?seed=123 을 붙이면 같은 지도를 다시 볼 수 있다
const param = new URLSearchParams(location.search).get('seed');
const seed = param ? Number(param) >>> 0 : (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

const state = createGame(seed);
mountUI(app, state);
console.log('마루금 seed =', seed);