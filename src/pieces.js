// Position de départ standard (convention 1-24 définie dans board.js) et
// rendu des pions en SVG, empilés à l'intérieur de chaque flèche.

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

const RAYON = 27;
const DIAMETRE_EFFECTIF = RAYON * 1.9; // léger chevauchement pour bien nicher les pions

function defsGradients() {
  return `
<defs>
  <radialGradient id="grad-clair" cx="35%" cy="30%" r="75%">
    <stop offset="0%" stop-color="#f7ecd6"></stop>
    <stop offset="100%" stop-color="#cdb37a"></stop>
  </radialGradient>
  <radialGradient id="grad-sombre" cx="35%" cy="30%" r="75%">
    <stop offset="0%" stop-color="#6b4226"></stop>
    <stop offset="100%" stop-color="#2a180c"></stop>
  </radialGradient>
</defs>`.trim();
}

function pion(cx, cy, couleur, id) {
  const grad = couleur === 'clair' ? 'url(#grad-clair)' : 'url(#grad-sombre)';
  const trait = couleur === 'clair' ? '#9c8a5c' : '#000';
  return `<circle cx="${cx}" cy="${cy}" r="${RAYON}" fill="${grad}" stroke="${trait}" stroke-width="1.5" class="pion" data-point="${id}"></circle>`;
}

export function construirePionsSVG(points, disposition = DISPOSITION_INITIALE) {
  const elements = [defsGradients()];

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
        `<text x="${pt.x}" y="${cyDernier + 5}" text-anchor="middle" font-size="20" font-family="Georgia, serif" fill="${info.couleur === 'clair' ? '#2a180c' : '#f7ecd6'}">${info.nombre}</text>`
      );
    }
  }

  return elements.join('\n  ');
}
