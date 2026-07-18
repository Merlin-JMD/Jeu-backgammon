// Rendu d'un dé (SVG) avec ses points, façon dé classique.
const POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

export function deSVG(valeur, joue = false) {
  const points = POSITIONS[valeur] || [];
  const pastilles = points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"></circle>`).join('');
  return `
<svg viewBox="0 0 100 100" class="de ${joue ? 'de-joue' : ''}">
  <rect x="4" y="4" width="92" height="92" rx="14"></rect>
  <g>${pastilles}</g>
</svg>`.trim();
}

export function cubeSVG(cube) {
  const classe = cube.proprietaire ? `cube-${cube.proprietaire}` : 'cube-centre';
  return `
<svg viewBox="0 0 100 100" class="cube ${classe}">
  <rect x="4" y="4" width="92" height="92" rx="10"></rect>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central" class="cube-texte">${cube.valeur}</text>
</svg>`.trim();
}
