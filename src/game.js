// Logique du jeu : état, règles de déplacement, capture, sortie (bearing off),
// entrée depuis la barre. Aucune dépendance au DOM — fonctions pures/état simple.

export function etatInitial() {
  const points = Array(25).fill(null).map(() => ({ couleur: null, nombre: 0 }));
  const dispo = {
    24: ['clair', 2], 13: ['clair', 5], 8: ['clair', 3], 6: ['clair', 5],
    1: ['sombre', 2], 12: ['sombre', 5], 17: ['sombre', 3], 19: ['sombre', 5],
  };
  for (const [p, [c, n]] of Object.entries(dispo)) points[p] = { couleur: c, nombre: n };
  let a, b;
  do {
    a = 1 + Math.floor(Math.random() * 6);
    b = 1 + Math.floor(Math.random() * 6);
  } while (a === b);
  const debutant = a > b ? 'clair' : 'sombre';
  return {
    points,
    barre: { clair: 0, sombre: 0 },
    sorties: { clair: 0, sombre: 0 },
    joueur: debutant,
    des: [a, b],
    gagnant: null,
    finPar: null,
    cube: { valeur: 1, proprietaire: null, enAttente: null },
    premierTour: true,
    ouvertureNombres: { clair: a, sombre: b },
  };
}

export function adversaire(c) { return c === 'clair' ? 'sombre' : 'clair'; }
function direction(j) { return j === 'clair' ? -1 : 1; }
function entreeBarre(j, d) { return j === 'clair' ? 25 - d : d; }
function distanceMaison(j, p) { return j === 'clair' ? p : 25 - p; }
function estDansMaison(j, p) { return j === 'clair' ? (p >= 1 && p <= 6) : (p >= 19 && p <= 24); }

export function peutSortir(etat, j) {
  if (etat.barre[j] > 0) return false;
  for (let p = 1; p <= 24; p++) {
    const c = etat.points[p];
    if (c.couleur === j && c.nombre > 0 && !estDansMaison(j, p)) return false;
  }
  return true;
}

function distanceMaxOccupee(etat, j) {
  let max = 0;
  for (let p = 1; p <= 24; p++) {
    const c = etat.points[p];
    if (c.couleur === j && c.nombre > 0) max = Math.max(max, distanceMaison(j, p));
  }
  return max;
}

// Retourne le numéro de point de destination (1-24), la chaîne 'sortie', ou null si illégal.
export function destinationLegale(etat, j, origine, d) {
  if (etat.barre[j] > 0 && origine !== 'barre') return null;

  if (origine === 'barre') {
    const dest = entreeBarre(j, d);
    const c = etat.points[dest];
    if (c.couleur && c.couleur !== j && c.nombre >= 2) return null;
    return dest;
  }

  const depart = etat.points[origine];
  if (!depart || depart.couleur !== j || depart.nombre <= 0) return null;

  if (estDansMaison(j, origine) && peutSortir(etat, j)) {
    const dist = distanceMaison(j, origine);
    if (dist === d) return 'sortie';
    if (dist < d && distanceMaxOccupee(etat, j) <= d) return 'sortie';
  }

  const dest = origine + direction(j) * d;
  if (dest < 1 || dest > 24) return null;
  const c = etat.points[dest];
  if (c.couleur && c.couleur !== j && c.nombre >= 2) return null;
  return dest;
}

export function coupsPossibles(etat, j) {
  const origines = etat.barre[j] > 0
    ? ['barre']
    : etat.points.reduce((acc, c, p) => { if (p >= 1 && c.couleur === j && c.nombre > 0) acc.push(p); return acc; }, []);
  const desUniques = [...new Set(etat.des)];
  const possibles = [];
  for (const o of origines) for (const d of desUniques) {
    if (destinationLegale(etat, j, o, d) !== null) possibles.push({ origine: o, de: d });
  }
  return possibles;
}

export function jouerCoup(etat, j, origine, d) {
  const dest = destinationLegale(etat, j, origine, d);
  if (dest === null) return etat;
  etat.premierTour = false;

  if (origine === 'barre') {
    etat.barre[j]--;
  } else {
    etat.points[origine].nombre--;
    if (etat.points[origine].nombre === 0) etat.points[origine].couleur = null;
  }

  if (dest === 'sortie') {
    etat.sorties[j]++;
  } else {
    const c = etat.points[dest];
    if (c.couleur && c.couleur !== j) {
      etat.barre[c.couleur] += c.nombre;
      c.couleur = j;
      c.nombre = 1;
    } else {
      c.couleur = j;
      c.nombre = (c.nombre || 0) + 1;
    }
  }

  const idx = etat.des.indexOf(d);
  etat.des.splice(idx, 1);

  if (etat.sorties[j] === 15) { etat.gagnant = j; etat.finPar = 'sortie'; }

  return etat;
}

export function lancerDes() {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  return a === b ? [a, a, a, a] : [a, b];
}

export function finDeTour(etat) {
  etat.des = [];
  etat.joueur = adversaire(etat.joueur);
}

export function peutProposerDouble(etat, j) {
  if (etat.gagnant || etat.des.length > 0) return false;
  if (etat.cube.enAttente) return false;
  if (etat.cube.valeur >= 64) return false;
  return etat.cube.proprietaire === null || etat.cube.proprietaire === j;
}
export function proposerDouble(etat, j) {
  if (!peutProposerDouble(etat, j)) return etat;
  etat.cube.enAttente = j;
  return etat;
}
export function accepterDouble(etat) {
  const proposant = etat.cube.enAttente;
  if (!proposant) return etat;
  etat.cube.valeur *= 2;
  etat.cube.proprietaire = adversaire(proposant);
  etat.cube.enAttente = null;
  return etat;
}
export function refuserDouble(etat) {
  const proposant = etat.cube.enAttente;
  if (!proposant) return etat;
  etat.gagnant = proposant;
  etat.finPar = 'refus';
  etat.cube.enAttente = null;
  return etat;
}

export function calculerPoints(etat) {
  if (!etat.gagnant) return 0;
  if (etat.finPar === 'refus') return etat.cube.valeur;
  const perdant = adversaire(etat.gagnant);
  if (etat.sorties[perdant] > 0) return etat.cube.valeur;
  const maisonGagnant = etat.gagnant === 'clair' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
  let backgammon = etat.barre[perdant] > 0;
  if (!backgammon) {
    for (const p of maisonGagnant) {
      if (etat.points[p].couleur === perdant && etat.points[p].nombre > 0) { backgammon = true; break; }
    }
  }
  return etat.cube.valeur * (backgammon ? 3 : 2);
}

export function typeVictoire(etat) {
  if (!etat.gagnant) return null;
  if (etat.finPar === 'refus') return 'simple';
  const perdant = adversaire(etat.gagnant);
  if (etat.sorties[perdant] > 0) return 'simple';
  const maisonGagnant = etat.gagnant === 'clair' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
  let backgammon = etat.barre[perdant] > 0;
  if (!backgammon) {
    for (const p of maisonGagnant) {
      if (etat.points[p].couleur === perdant && etat.points[p].nombre > 0) { backgammon = true; break; }
    }
  }
  return backgammon ? 'backgammon' : 'gammon';
}

function pipCount(etat, j) {
  let total = etat.barre[j] * 25;
  for (let p = 1; p <= 24; p++) {
    const c = etat.points[p];
    if (c.couleur === j) total += distanceMaison(j, p) * c.nombre;
  }
  return total;
}

function clonerEtat(etat) {
  return {
    points: etat.points.map(c => ({ ...c })),
    barre: { ...etat.barre },
    sorties: { ...etat.sorties },
    joueur: etat.joueur,
    des: [...etat.des],
    gagnant: etat.gagnant,
    finPar: etat.finPar,
    cube: { ...etat.cube },
    premierTour: etat.premierTour,
    ouvertureNombres: { ...etat.ouvertureNombres },
  };
}

function evaluerPosition(etat, j) {
  const adv = adversaire(j);
  let score = pipCount(etat, adv) - pipCount(etat, j);
  score += etat.sorties[j] * 10;
  score -= etat.sorties[adv] * 10;
  score -= etat.barre[j] * 15;
  score += etat.barre[adv] * 15;
  for (let p = 1; p <= 24; p++) {
    const c = etat.points[p];
    if (c.couleur === j) {
      if (c.nombre === 1) score -= 8;
      else if (c.nombre >= 2) score += 3 + (estDansMaison(j, p) ? 2 : 0);
    } else if (c.couleur === adv && c.nombre === 1) {
      score += 4;
    }
  }
  return score;
}

export function meilleurCoup(etat, j) {
  const coups = coupsPossibles(etat, j);
  if (coups.length === 0) return null;
  let meilleur = coups[0];
  let meilleurScore = -Infinity;
  for (const coup of coups) {
    const simule = clonerEtat(etat);
    jouerCoup(simule, j, coup.origine, coup.de);
    const score = evaluerPosition(simule, j);
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleur = coup;
    }
  }
  return meilleur;
}
export function devraitAccepterDouble(etat, j) {
  return evaluerPosition(etat, j) >= -15;
}

export function devraitProposerDouble(etat, j) {
  return evaluerPosition(etat, j) >= 15;
}