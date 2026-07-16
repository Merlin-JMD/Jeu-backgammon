import './style.css';

import img1 from './assets/pieces de jeu de backgammon/1784168651701.png';
import img2 from './assets/pieces de jeu de backgammon/1784169152887.png';
import img3 from './assets/pieces de jeu de backgammon/1784174938329.png';
import img4 from './assets/pieces de jeu de backgammon/1784174949558.png';
import img5 from './assets/pieces de jeu de backgammon/1784174991708.png';

const images = [
  { src: img1, nom: '1784168651701.png' },
  { src: img2, nom: '1784169152887.png' },
  { src: img3, nom: '1784174938329.png' },
  { src: img4, nom: '1784174949558.png' },
  { src: img5, nom: '1784174991708.png' },
];

const demo = document.getElementById('demo');
demo.innerHTML = `
  <h1>DÉMO — PIÈCES NANO-BANANA</h1>
  <div class="sous-titre">Comparaison côte à côte sur une table de jeu — identifie chaque fichier</div>
  <div id="table-demo">
    ${images.map(img => `
      <div class="carte-piece">
        <img src="${img.src}" alt="${img.nom}" />
        <div class="nom-fichier">${img.nom}</div>
      </div>
    `).join('')}
  </div>
`;
