import './style.css';
import { construirePlateauSVG } from './board.js';
import { construirePionsSVG, construireBarreSVG } from './pieces.js';
import { deSVG, cubeSVG } from './des.js';
import {
  etatInitial, lancerDes, coupsPossibles, destinationLegale,
  jouerCoup, finDeTour, adversaire, calculerPoints,
  peutProposerDouble, proposerDouble, accepterDouble, refuserDouble,
} from './game.js';

const app = document.getElementById('app');
const { svg: svgBase, points, barre: barreCoord } = construirePlateauSVG();

const largeurSauvegardee = localStorage.getItem('backgammon-table-largeur');
if (largeurSauvegardee) {
  document.documentElement.style.setProperty('--table-largeur', largeurSauvegardee + 'px');
}

const DELAI_IA = 850;

let etat = etatInitial();
let origine = null;
let iaActive = true;
const JOUEUR_IA = 'sombre';
let pointsComptabilises = false;
let matchEtat = {
  objectif: 7,
  score: { clair: 0, sombre: 0 },
  crawfordJoue: false,
  crawfordEnAttente: false,
  crawfordEnCours: false,
};

function versDisposition(pointsEtat) {
  const dispo = {};
  for (let p = 1; p <= 24; p++) {
    const c = pointsEtat[p];
    if (c.couleur && c.nombre > 0) dispo[p] = { couleur: c.couleur, nombre: c.nombre };
  }
  return dispo;
}

function nomCouleur(c) { return c === 'clair' ? 'Clair' : 'Sombre'; }

function texteCube(cube) {
  if (cube.enAttente) {
    return `${nomCouleur(cube.enAttente)} propose de doubler à ${cube.valeur * 2} — en attente de la réponse de ${nomCouleur(adversaire(cube.enAttente))}.`;
  }
  const lieu = cube.proprietaire ? `chez ${nomCouleur(cube.proprietaire)}` : 'au centre';
  return `Doubleur : ${cube.valeur} (${lieu})`;
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
  const peutDoubler = !tourIA && !enAttenteReponse && !matchEtat.crawfordEnCours && peutProposerDouble(etat, etat.joueur);

  const matchTermine = matchEtat.score.clair >= matchEtat.objectif || matchEtat.score.sombre >= matchEtat.objectif;
  const objectifOptions = [7, 9, 11, 13, 15, 17, 21, 25]
    .map(n => `<option value="${n}" ${n === matchEtat.objectif ? 'selected' : ''}>${n}</option>`)
    .join('');
  const zoneCube = `
    <div class="zone-cube">
      <span class="groupe-match">Match — Clair : ${matchEtat.score.clair} · Sombre : ${matchEtat.score.sombre} (objectif :
        <select id="select-objectif" ${(matchEtat.score.clair > 0 || matchEtat.score.sombre > 0) ? 'disabled' : ''}>${objectifOptions}</select>
        points)
        ${matchEtat.crawfordEnCours ? '<span class="badge-crawford">Partie Crawford — doublement désactivé</span>' : ''}
      </span>
      <div class="groupe-doubleur">
        ${cubeSVG(etat.cube)}
        <span class="texte-cube">${texteCube(etat.cube)}</span>
        <button id="btn-doubler" ${peutDoubler ? '' : 'disabled'}>Doubler</button>
      </div>
    </div>`;

  const reponseIA = enAttenteReponse && iaActive && adversaire(etat.cube.enAttente) === JOUEUR_IA;
  const boutonsReponse = (enAttenteReponse && !reponseIA)
    ? `<button id="btn-accepter">Accepter le double</button>
       <button id="btn-refuser">Refuser le double</button>`
    : '';

  app.innerHTML = `
    <h1>BACKGAMMON</h1>
    <div class="sous-titre">Jeu classique · règles complètes</div>

    <div class="panneau">
      <div class="tour ${etat.joueur}">Au tour de : <strong>${nomCouleur(etat.joueur)}</strong></div>
      <button id="btn-lancer" ${peutLancer ? '' : 'disabled'}>Lancer les dés</button>
      <div class="des-zone">${desHTML}</div>
      <button id="btn-plein-ecran">${document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran'}</button>
      ${boutonsReponse}
      <button id="btn-nouvelle">Nouvelle partie</button>
    </div>

    ${zoneCube}


    <div id="plateau-cadre">${svgComplet}<div id="poignee-resize" class="poignee-resize" title="Glisser pour agrandir/rétrécir la table"></div></div>
    <div id="message"></div>
    <div id="boutons-sortie"></div>
  `;

  document.getElementById('btn-lancer').addEventListener('click', surLancerDes);
  document.getElementById('btn-doubler').addEventListener('click', surProposerDouble);
  if (enAttenteReponse && !reponseIA) {
    document.getElementById('btn-accepter').addEventListener('click', surAccepterDouble);
    document.getElementById('btn-refuser').addEventListener('click', surRefuserDouble);
  }

  document.getElementById('btn-nouvelle').addEventListener('click', nouvellePartie);

  const selectObjectif = document.getElementById('select-objectif');
  if (selectObjectif) selectObjectif.addEventListener('change', (e) => { matchEtat.objectif = Number(e.target.value); render(); });
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
  return versLaDroite ? ' — déplacement vers la droite →' : ' — déplacement vers la gauche ←';
}

function afficherMessage() {
  const msg = document.getElementById('message');
  const zoneSortie = document.getElementById('boutons-sortie');
  zoneSortie.innerHTML = '';

  if (etat.gagnant) {
    const matchTermineMsg = matchEtat.score.clair >= matchEtat.objectif || matchEtat.score.sombre >= matchEtat.objectif;
    const scoreTexte = `Score du match — Clair : ${matchEtat.score.clair} · Sombre : ${matchEtat.score.sombre}`;
    msg.textContent = matchTermineMsg
      ? `${nomCouleur(etat.gagnant)} remporte le match ! 🏆 (${scoreTexte})`
      : `${nomCouleur(etat.gagnant)} remporte la partie (cube à ${etat.cube.valeur}) — ${scoreTexte}`;
    return;
  }
  if (etat.cube.enAttente) {
    msg.textContent = `En attente de la réponse de ${nomCouleur(adversaire(etat.cube.enAttente))} au double proposé.`;
    return;
  }
  if (iaActive && etat.joueur === JOUEUR_IA) {
    msg.textContent = `L'IA (Sombre) joue…`;
    return;
  }
  if (etat.des.length === 0) {
    msg.textContent = `${nomCouleur(etat.joueur)} : clique sur « Lancer les dés » pour commencer ton tour, ou propose un double.`;
    return;
  }
  if (etat.premierTour && origine === null) {
    msg.textContent = `Tirage d'ouverture — Clair : ${etat.ouvertureNombres.clair}, Sombre : ${etat.ouvertureNombres.sombre} — ${nomCouleur(etat.joueur)} commence avec [${etat.des.join(', ')}].`;
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
  if (matchEtat.crawfordEnCours) return;
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
  const points = calculerPoints(etat);
  matchEtat.score[etat.gagnant] += points;
  pointsComptabilises = true;
  const dejaEnJeu = matchEtat.score.clair >= matchEtat.objectif || matchEtat.score.sombre >= matchEtat.objectif;
  if (!matchEtat.crawfordJoue && !dejaEnJeu && (matchEtat.score.clair === matchEtat.objectif - 1 || matchEtat.score.sombre === matchEtat.objectif - 1)) {
    matchEtat.crawfordEnAttente = true;
  }
}

function nouvellePartie() {
  etat = etatInitial();
  origine = null;
  pointsComptabilises = false;
  if (matchEtat.crawfordEnAttente) {
    matchEtat.crawfordEnCours = true;
    matchEtat.crawfordJoue = true;
    matchEtat.crawfordEnAttente = false;
  } else {
    matchEtat.crawfordEnCours = false;
  }
  render();
}


function iaJoue() {
  if (!iaActive || etat.joueur !== JOUEUR_IA || etat.gagnant) return;
  if (etat.cube.enAttente) return;

  if (etat.des.length === 0) {
    setTimeout(() => {
      if (iaActive && etat.joueur === JOUEUR_IA && !etat.gagnant && !etat.cube.enAttente) {
        if (!matchEtat.crawfordEnCours && peutProposerDouble(etat, JOUEUR_IA) && Math.random() < 0.2) {
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
