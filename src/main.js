import './style.css';
import { construirePlateauSVG } from './board.js';
import { construirePionsSVG, DISPOSITION_INITIALE } from './pieces.js';

const app = document.getElementById('app');
const { svg, points } = construirePlateauSVG();
const pionsSVG = construirePionsSVG(points, DISPOSITION_INITIALE);
const svgComplet = svg.replace('</svg>', `${pionsSVG}\n</svg>`);

app.innerHTML = `
  <h1>BACKGAMMON</h1>
  <div class="sous-titre">Jeu classique · règles complètes</div>
  <div id="plateau-cadre">${svgComplet}</div>
  <div id="message">Position de départ standard — étape suivante : les dés et les déplacements.</div>
`;

window.__points = points;
console.log('Coordonnées des 24 flèches :', points);
