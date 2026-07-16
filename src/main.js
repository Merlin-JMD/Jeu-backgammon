import './style.css';
import { construirePlateauSVG } from './board.js';
import { construirePionsSVG } from './pieces.js';
import { deSVG } from './des.js';
import {
  etatInitial, lancerDes, coupsPossibles, destinationLegale,
  jouerCoup, finDeTour, adversaire,
} from './game.js';

const app = document.getElementById('app');
const { svg: svgBase, points } = construirePlateauSVG();

let etat = etatInitial();
let origine = null; // point sélectionné (numéro ou 'barre'), ou null
let iaActive = true;
const JOUEUR_IA = 'sombre'; // IA de test : coups légaux choisis au hasard

function versDisposition(pointsEtat) {
  const dispo = {};
  for (let p = 1; p <= 24; p++) {
    const c = pointsEtat[p];
    if (c.couleur && c.nombre > 0) dispo[p] = { couleur: c.couleur, nombre: c.nombre };
  }
  return dispo;
}

function nomCouleur(c) { return c === 'clair' ? 'Clair' : 'Sombre'; }

function ciblesDepuisOrigine() {
  const cibles = new Map();
  const sorties = [];
  if (origine === null) return { cibles, sorties };
  const desUniques = [...new Set(etat.des)];
  for (const d of desUniques) {
    const dest = destinationLegale(etat, etat.joueur, origine, d);
    if (dest === null) continue;
    if (dest === 'sortie') sorties.push(d);
    else if (!cibles.has(dest)) cibles.set(dest, d);
  }
  return { cibles, sorties };
}

function originesPossibles() {
  if (etat.des.length === 0 || origine !== null) return new Set();
  return new Set(coupsPossibles(etat, etat.joueur).map(c => c.origine));
}

function render() {
  const dispo = versDisposition(etat.points);
  const pionsSVG = construirePionsSVG(points, dispo);
  const svgComplet = svgBase.replace('</svg>', `${pionsSVG}\n</svg>`);

  const desHTML = etat.des.length
    ? etat.des.map(d => deSVG(d)).join('')
    : '<span class="des-vides">Aucun dé lancé</span>';

  const tourIA = iaActive && etat.joueur === JOUEUR_IA;
  const peutLancer = etat.des.length === 0 && !etat.gagnant && !tourIA;

  app.innerHTML = `
    <h1>BACKGAMMON</h1>
    <div class="sous-titre">Jeu classique · règles complètes</div>

    <div class="panneau">
      <div class="tour ${etat.joueur}">Au tour de : <strong>${nomCouleur(etat.joueur)}</strong></div>
      <div class="des-zone">${desHTML}</div>
      <button id="btn-lancer" ${peutLancer ? '' : 'disabled'}>Lancer les dés</button>
      <button id="btn-ia">IA (Sombre) : ${iaActive ? 'activée' : 'désactivée'}</button>
    </div>

    <div class="compteurs">
      <span>Barre — Clair : ${etat.barre.clair} · Sombre : ${etat.barre.sombre}</span>
      <span>Sorties — Clair : ${etat.sorties.clair} / 15 · Sombre : ${etat.sorties.sombre} / 15</span>
    </div>

    <div id="plateau-cadre">${svgComplet}</div>
    <div id="message"></div>
    <div id="boutons-sortie"></div>
  `;

  document.getElementById('btn-lancer').addEventListener('click', surLancerDes);
  document.getElementById('btn-ia').addEventListener('click', () => { iaActive = !iaActive; render(); });

  const svgEl = document.getElementById('plateau-svg');
  svgEl.addEventListener('click', (e) => {
    const cible = e.target.closest('[data-point]');
    if (!cible) return;
    const val = cible.dataset.point;
    surClicPoint(val === 'barre' ? 'barre' : Number(val));
  });

  colorierSelection();
  afficherMessage();
  iaJoue();
}

function colorierSelection() {
  const svgEl = document.getElementById('plateau-svg');
  svgEl.querySelectorAll('.fleche').forEach(el =>
    el.classList.remove('origine-selectionnee', 'cible', 'origine-possible'));
  const barreEl = svgEl.querySelector('.barre-zone');
  if (barreEl) barreEl.classList.remove('origine-selectionnee', 'origine-possible');

  if (origine === 'barre' && barreEl) {
    barreEl.classList.add('origine-selectionnee');
  } else if (origine !== null) {
    const el = svgEl.querySelector(`.fleche[data-point="${origine}"]`);
    if (el) el.classList.add('origine-selectionnee');
  }

  if (origine !== null) {
    const { cibles } = ciblesDepuisOrigine();
    for (const p of cibles.keys()) {
      const el = svgEl.querySelector(`.fleche[data-point="${p}"]`);
      if (el) el.classList.add('cible');
    }
  } else {
    for (const o of originesPossibles()) {
      if (o === 'barre') { if (barreEl) barreEl.classList.add('origine-possible'); continue; }
      const el = svgEl.querySelector(`.fleche[data-point="${o}"]`);
      if (el) el.classList.add('origine-possible');
    }
  }
}

function texteSens(joueur, o) {
  if (o === 'barre' || typeof o !== 'number') return '';
  const secteurBas = o >= 1 && o <= 12;
  const versLaDroite = joueur === 'clair' ? secteurBas : !secteurBas;
  return versLaDroite ? ' — déplacement vers la droite →' : ' — déplacement vers la gauche ←';
}

function afficherMessage() {
  const msg = document.getElementById('message');
  const zoneSortie = document.getElementById('boutons-sortie');
  zoneSortie.innerHTML = '';

  if (etat.gagnant) {
    msg.textContent = `${nomCouleur(etat.gagnant)} remporte la partie ! 🏆`;
    return;
  }
  if (iaActive && etat.joueur === JOUEUR_IA) {
    msg.textContent = `L'IA (Sombre) joue…`;
    return;
  }
  if (etat.des.length === 0) {
    msg.textContent = `${nomCouleur(etat.joueur)} : clique sur « Lancer les dés » pour commencer ton tour.`;
    return;
  }
  if (origine === null) {
    msg.textContent = `${nomCouleur(etat.joueur)} : dés restants [${etat.des.join(', ')}] — les flèches en pointillés dorés peuvent jouer, clique sur l'une d'elles.`;
    return;
  }
  const { sorties } = ciblesDepuisOrigine();
  msg.textContent = `Pion sélectionné${texteSens(etat.joueur, origine)} — clique une case en surbrillance pour le déplacer.`;
  if (sorties.length) {
    const boutons = sorties.map(d =>
      `<button class="btn-sortir" data-de="${d}">Sortir ce pion (dé ${d})</button>`
    ).join(' ');
    zoneSortie.innerHTML = boutons;
    zoneSortie.querySelectorAll('.btn-sortir').forEach(b => {
      b.addEventListener('click', () => jouer(origine, Number(b.dataset.de)));
    });
  }
}

function surLancerDes() {
  if (iaActive && etat.joueur === JOUEUR_IA) return;
  etat.des = lancerDes();
  if (coupsPossibles(etat, etat.joueur).length === 0) {
    render();
    document.getElementById('message').textContent =
      `${nomCouleur(etat.joueur)} : aucun coup possible avec [${etat.des.join(', ')}] — passe automatique.`;
    setTimeout(() => { finDeTour(etat); origine = null; render(); }, 1600);
    return;
  }
  render();
}

function surClicPoint(p) {
  if (etat.des.length === 0 || etat.gagnant) return;
  if (iaActive && etat.joueur === JOUEUR_IA) return;

  if (p === origine) { origine = null; render(); return; }

  const { cibles } = ciblesDepuisOrigine();
  if (origine !== null && p !== 'barre' && cibles.has(p)) {
    jouer(origine, cibles.get(p));
    return;
  }

  if (p === 'barre') {
    if (etat.barre[etat.joueur] > 0) { origine = 'barre'; render(); }
    return;
  }
  const c = etat.points[p];
  if (etat.barre[etat.joueur] > 0) return;
  if (c.couleur === etat.joueur && c.nombre > 0) { origine = p; render(); }
}

function jouer(o, d) {
  jouerCoup(etat, etat.joueur, o, d);
  origine = null;

  if (!etat.gagnant && etat.des.length > 0 && coupsPossibles(etat, etat.joueur).length === 0) {
    render();
    document.getElementById('message').textContent =
      `Plus aucun coup possible avec les dés restants — passe automatique.`;
    setTimeout(() => { finDeTour(etat); render(); }, 1600);
    return;
  }

  if (!etat.gagnant && etat.des.length === 0) {
    finDeTour(etat);
  }
  render();
}

function iaJoue() {
  if (!iaActive || etat.joueur !== JOUEUR_IA || etat.gagnant) return;

  if (etat.des.length === 0) {
    setTimeout(() => {
      if (iaActive && etat.joueur === JOUEUR_IA && !etat.gagnant) {
        etat.des = lancerDes();
        if (coupsPossibles(etat, etat.joueur).length === 0) {
          render();
          document.getElementById('message').textContent =
            `Sombre : aucun coup possible avec [${etat.des.join(', ')}] — passe automatique.`;
          setTimeout(() => { finDeTour(etat); render(); }, 1600);
          return;
        }
        render();
      }
    }, 700);
    return;
  }

  const coups = coupsPossibles(etat, JOUEUR_IA);
  if (coups.length === 0) return;

  const choix = coups[Math.floor(Math.random() * coups.length)];
  setTimeout(() => {
    if (iaActive && etat.joueur === JOUEUR_IA && !etat.gagnant) jouer(choix.origine, choix.de);
  }, 700);
}

render();
