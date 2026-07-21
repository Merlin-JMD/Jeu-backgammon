import './style.css';
import { construirePlateauSVG } from './board.js';
import { construirePionsSVG, construireBarreSVG } from './pieces.js';
import { deSVG, cubeSVG } from './des.js';
import {
  etatInitial, lancerDes, coupsPossibles, destinationLegale,
  jouerCoup, finDeTour, adversaire, calculerPoints, typeVictoire,
  peutProposerDouble, proposerDouble, accepterDouble, refuserDouble,
} from './game.js';

const app = document.getElementById('app');
const { svg: svgBase, points, barre: barreCoord } = construirePlateauSVG();

const largeurSauvegardee = localStorage.getItem('backgammon-table-largeur');
if (largeurSauvegardee) {
  document.documentElement.style.setProperty('--table-largeur', largeurSauvegardee + 'px');
}

const DELAI_IA = 2500;

let etat = etatInitial();
let origine = null;
let iaActive = true;
const JOUEUR_IA = 'sombre';
let pointsComptabilises = false;
let dernierPoints = 0;
let dernierType = null;

function versDisposition(pointsEtat) {
  const dispo = {};
  for (let p = 1; p <= 24; p++) {
    const c = pointsEtat[p];
    if (c.couleur && c.nombre > 0) dispo[p] = { couleur: c.couleur, nombre: c.nombre };
  }
  return dispo;
}

function nomCouleur(c) { return c === 'clair' ? 'Clair' : 'Sombre'; }

function texteCubeHaut(cube) {
  return cube.enAttente ? nomCouleur(cube.enAttente) : 'Doubleur';
}
function texteCubeBas(cube) {
  if (cube.enAttente) return `propose ${cube.valeur * 2}`;
  return cube.proprietaire ? `(chez ${nomCouleur(cube.proprietaire)})` : '(au centre)';
}

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
  const barreSVG = construireBarreSVG(barreCoord.x, barreCoord.yHaut, barreCoord.yBas, etat.barre);
  const svgComplet = svgBase.replace('</svg>', `${pionsSVG}\n  ${barreSVG}\n</svg>`);

  const desHTML = etat.des.length
    ? etat.des.map(d => deSVG(d)).join('')
    : '<span class="des-vides">Aucun dé lancé</span>';

  const tourIA = iaActive && etat.joueur === JOUEUR_IA;
  const enAttenteReponse = !!etat.cube.enAttente;
  const peutLancer = etat.des.length === 0 && !etat.gagnant && !tourIA && !enAttenteReponse;
  const peutDoubler = !tourIA && !enAttenteReponse && peutProposerDouble(etat, etat.joueur);

  const reponseDisponible = enAttenteReponse && !(iaActive && adversaire(etat.cube.enAttente) === JOUEUR_IA);
  const zoneCube = `
    <div class="zone-cube">
      <div id="message"></div>
      <div class="groupe-fin">
        <button id="btn-plein-ecran">${document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran'}</button>
        <button id="btn-nouvelle">Nouvelle partie</button>
      </div>
    </div>`;



  app.innerHTML = `
    <h1>BACKGAMMON</h1>
    <div class="sous-titre">Jeu classique · règles complètes</div>

    <div class="panneau">
      <div class="tour-inline">
        <div class="tour ${etat.joueur}"><strong>${nomCouleur(etat.joueur)}</strong> : à jouer</div>
        <button id="btn-lancer" ${peutLancer ? '' : 'disabled'}>Lancer les dés</button>
        <div class="des-zone">${desHTML}</div>
      </div>
      <div class="groupe-doubleur-complet">
        <div class="doubleur-inline">
          ${cubeSVG(etat.cube)}
          <div class="texte-cube">
            <span>${texteCubeHaut(etat.cube)}</span>
            <span>${texteCubeBas(etat.cube)}</span>
          </div>
        </div>
        <div class="boutons-double">
          <button id="btn-doubler" ${peutDoubler ? '' : 'disabled'}>Doubler</button>
          <button id="btn-accepter" ${reponseDisponible ? '' : 'disabled'}>Accepter</button>
          <button id="btn-refuser" ${reponseDisponible ? '' : 'disabled'}>Refuser</button>
        </div>
      </div>
    </div>

    ${zoneCube}


    <div id="plateau-cadre">${svgComplet}<div id="poignee-resize" class="poignee-resize" title="Glisser pour agrandir/rétrécir la table"></div></div>
    <div id="boutons-sortie"></div>
  `;

  document.getElementById('btn-lancer').addEventListener('click', surLancerDes);
  document.getElementById('btn-doubler').addEventListener('click', surProposerDouble);
  if (reponseDisponible) {
    document.getElementById('btn-accepter').addEventListener('click', surAccepterDouble);
    document.getElementById('btn-refuser').addEventListener('click', surRefuserDouble);
  }

  document.getElementById('btn-nouvelle').addEventListener('click', nouvellePartie);

  document.getElementById('btn-plein-ecran').addEventListener('click', basculerPleinEcran);

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
  iaRepondDouble();
  activerPoigneeResize();
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
  return versLaDroite ? ' — vers la droite →' : ' — vers la gauche ←';
}

function afficherMessage() {
  const msg = document.getElementById('message');
  const zoneSortie = document.getElementById('boutons-sortie');
  zoneSortie.innerHTML = '';

  if (etat.gagnant) {
    msg.textContent = `${nomCouleur(etat.gagnant)} remporte la partie${dernierType === 'gammon' ? ' (gammon)' : dernierType === 'backgammon' ? ' (backgammon)' : ''} avec ${dernierPoints} point${dernierPoints > 1 ? 's' : ''} (cube à ${etat.cube.valeur}).`;
    return;
  }
  if (etat.cube.enAttente) {
    msg.textContent = `En attente de la réponse de ${nomCouleur(adversaire(etat.cube.enAttente))} au double proposé.`;
    return;
  }
  if (etat.premierTour && origine === null) {
    msg.textContent = `Tirage d'ouverture — Clair : ${etat.ouvertureNombres.clair}, Sombre : ${etat.ouvertureNombres.sombre} — ${nomCouleur(etat.joueur)} commence avec [${etat.des.join(', ')}].`;
    return;
  }
  if (iaActive && etat.joueur === JOUEUR_IA) {
    msg.textContent = `L'IA (Sombre) joue…`;
    return;
  }
  if (etat.des.length === 0) {
    msg.textContent = peutProposerDouble(etat, etat.joueur)
      ? `${nomCouleur(etat.joueur)} : clique sur « Lancer les dés » ou propose un double.`
      : `${nomCouleur(etat.joueur)} : clique sur « Lancer les dés ».`;
    return;
  }
  if (origine === null) {
    msg.textContent = `${nomCouleur(etat.joueur)} : dés restants [${etat.des.join(', ')}] - clique sur l'une des flèches en pointillées dorées.`;
    return;
  }
  const { sorties } = ciblesDepuisOrigine();
  msg.textContent = `Pion sélectionné${texteSens(etat.joueur, origine)} — clique une case en surbrillance.`;
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
  if (etat.cube.enAttente) return;
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

function surProposerDouble() {
  if (!peutProposerDouble(etat, etat.joueur)) return;
  proposerDouble(etat, etat.joueur);
  render();
}

function surAccepterDouble() {
  accepterDouble(etat);
  render();
}

function surRefuserDouble() {
  refuserDouble(etat);
  comptabiliserVictoire();
  render();
}

function surClicPoint(p) {
  if (etat.des.length === 0 || etat.gagnant) return;
  if (iaActive && etat.joueur === JOUEUR_IA) return;
  if (etat.cube.enAttente) return;

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
  comptabiliserVictoire();
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

function comptabiliserVictoire() {
  if (!etat.gagnant || pointsComptabilises) return;
  dernierPoints = calculerPoints(etat);
  dernierType = typeVictoire(etat);
  pointsComptabilises = true;
}

function nouvellePartie() {
  etat = etatInitial();
  origine = null;
  pointsComptabilises = false;
  render();
}


function iaJoue() {
  if (!iaActive || etat.joueur !== JOUEUR_IA || etat.gagnant) return;
  if (etat.cube.enAttente) return;

  if (etat.des.length === 0) {
    setTimeout(() => {
      if (iaActive && etat.joueur === JOUEUR_IA && !etat.gagnant && !etat.cube.enAttente) {
        if (peutProposerDouble(etat, JOUEUR_IA) && Math.random() < 0.2) {
          proposerDouble(etat, JOUEUR_IA);
          render();
          return;
        }
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
    }, DELAI_IA);
    return;
  }

  const coups = coupsPossibles(etat, JOUEUR_IA);
  if (coups.length === 0) return;

  const choix = coups[Math.floor(Math.random() * coups.length)];
  setTimeout(() => {
    if (iaActive && etat.joueur === JOUEUR_IA && !etat.gagnant) jouer(choix.origine, choix.de);
  }, DELAI_IA);
}

function basculerPleinEcran() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('plein-ecran', !!document.fullscreenElement);
  const btn = document.getElementById('btn-plein-ecran');
  if (btn) btn.textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
});

render();

function iaRepondDouble() {
  if (!iaActive || !etat.cube.enAttente || etat.gagnant) return;
  if (adversaire(etat.cube.enAttente) !== JOUEUR_IA) return;
  setTimeout(() => {
    if (iaActive && etat.cube.enAttente && !etat.gagnant) {
      accepterDouble(etat);
      render();
      document.getElementById('message').textContent = `Sombre a accepté le double (cube à ${etat.cube.valeur}).`;
    }
  }, DELAI_IA);
}

function activerPoigneeResize() {
  const poignee = document.getElementById('poignee-resize');
  if (!poignee || poignee.dataset.actif) return;
  poignee.dataset.actif = '1';
  poignee.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const largeurDepart = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--table-largeur')) || 900;
    const xDepart = e.clientX;
    function surDeplacement(ev) {
      const delta = xDepart - ev.clientX;
      let nouvelleLargeur = largeurDepart + delta;
      nouvelleLargeur = Math.max(400, Math.min(1400, nouvelleLargeur));
      document.documentElement.style.setProperty('--table-largeur', nouvelleLargeur + 'px');
    }
    function surRelachement() {
      document.removeEventListener('mousemove', surDeplacement);
      document.removeEventListener('mouseup', surRelachement);
      const largeurActuelle = getComputedStyle(document.documentElement).getPropertyValue('--table-largeur').trim();
      localStorage.setItem('backgammon-table-largeur', parseInt(largeurActuelle));
    }
    document.addEventListener('mousemove', surDeplacement);
    document.addEventListener('mouseup', surRelachement);
  });
}
