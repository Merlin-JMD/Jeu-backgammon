// Position de départ standard (convention 1-24 définie dans board.js) et
// rendu des pions en SVG, empilés à l'intérieur de chaque flèche.
// Utilise les vraies images générées (Nano-Banana) plutôt que des formes.

import pionClairUrl from './assets/pieces de jeu de backgammon/pion-clair.png';
import pionSombreUrl from './assets/pieces de jeu de backgammon/pion-sombre.png';

export const DISPOSITION_INITIALE = {
  24: { couleur: 'clair', nombre: 2 },
  13: { couleur: 'clair', nombre: 5 },
  8:  { couleur: 'clair', nombre: 3 },
  6:  { couleur: 'clair', nombre: 5 },
  1:  { couleur: 'sombre', nombre: 2 },
  12: { couleur: 'sombre', nombre: 5 },
  17: { couleur: 'sombre', nombre: 3 },
  19: { couleur: 'sombre', nombre: 5 },
};

const RAYON = 30;
const DIAMETRE_EFFECTIF = RAYON * 2; // aucun chevauchement, pions côte à côte

export function pion(cx, cy, couleur, id) {
  const url = couleur === 'clair' ? pionClairUrl : pionSombreUrl;
  const taille = RAYON * 2;
  return `<image href="${url}" x="${cx - RAYON}" y="${cy - RAYON}" width="${taille}" height="${taille}" class="pion" data-point="${id}"></image>`;
}

export function construirePionsSVG(points, disposition = DISPOSITION_INITIALE) {
  const elements = [];

  for (const [numStr, info] of Object.entries(disposition)) {
    const num = Number(numStr);
    const pt = points[num];
    if (!pt) continue;
    const sens = pt.yPointe < pt.yBase ? -1 : 1;
    const depart = pt.yBase + sens * (RAYON + 4);
    const visibles = Math.min(info.nombre, 5);

    for (let i = 0; i < visibles; i++) {
      const cy = depart + sens * i * DIAMETRE_EFFECTIF;
      elements.push(pion(pt.x, cy, info.couleur, num));
    }
    if (info.nombre > 5) {
      const cyDernier = depart + sens * (visibles - 1) * DIAMETRE_EFFECTIF;
      elements.push(
        `<text x="${pt.x}" y="${cyDernier + 5}" text-anchor="middle" font-size="20" font-family="Georgia, serif" fill="${info.couleur === 'clair' ? '#2a180c' : '#f7ecd6'}" stroke="#000" stroke-width="0.5">${info.nombre}</text>`
      );
    }
  }

  return elements.join('\n  ');
}


export function construireBarreSVG(centreX, yHaut, yBas, barre) {
  const elements = [];

  const nClair = Math.min(barre.clair, 5);
  for (let i = 0; i < nClair; i++) {
    const cy = yHaut + RAYON + 4 + i * DIAMETRE_EFFECTIF;
    elements.push(pion(centreX, cy, 'clair', 'barre'));
  }
  if (barre.clair > 5) {
    const cy = yHaut + RAYON + 4 + 4 * DIAMETRE_EFFECTIF;
    elements.push(`<text x="${centreX}" y="${cy + 5}" text-anchor="middle" font-size="20" font-family="Georgia, serif" fill="#2a180c" stroke="#fff" stroke-width="0.5">${barre.clair}</text>`);
  }

  const nSombre = Math.min(barre.sombre, 5);
  for (let i = 0; i < nSombre; i++) {
    const cy = yBas - RAYON - 4 - i * DIAMETRE_EFFECTIF;
    elements.push(pion(centreX, cy, 'sombre', 'barre'));
  }
  if (barre.sombre > 5) {
    const cy = yBas - RAYON - 4 - 4 * DIAMETRE_EFFECTIF;
    elements.push(`<text x="${centreX}" y="${cy + 5}" text-anchor="middle" font-size="20" font-family="Georgia, serif" fill="#f7ecd6" stroke="#000" stroke-width="0.5">${barre.sombre}</text>`);
  }

  return elements.join('\n  ');
}
