// Génère le plateau de Backgammon en SVG : 24 flèches numérotées (1-24,
// convention standard vue du joueur en bas), barre centrale, cadre bois.
// Retourne la balise <svg> (chaîne) + les coordonnées de chaque flèche
// (pour y positionner les pions dans une prochaine étape).

const LARGEUR = 1020, HAUTEUR = 760;
const CADRE = 24;              // épaisseur du cadre extérieur
const RAIL = 34;                // rangement latéral (futur bac de sortie)
const BARRE = 34;               // barre centrale
const HAUTEUR_FLECHE = 300;
const INTERIEUR_X = CADRE, INTERIEUR_LARGEUR = LARGEUR - 2 * CADRE;
const INTERIEUR_Y = CADRE, INTERIEUR_HAUTEUR = HAUTEUR - 2 * CADRE;
const QUAD_LARGEUR = (INTERIEUR_LARGEUR - 2 * RAIL - BARRE) / 2;
const POINTE_LARGEUR = QUAD_LARGEUR / 6;

const X_QUAD_BAS_DROIT = INTERIEUR_X + RAIL;
const X_QUAD_BAS_GAUCHE = X_QUAD_BAS_DROIT + QUAD_LARGEUR + BARRE;
const X_QUAD_HAUT_GAUCHE = X_QUAD_BAS_DROIT + QUAD_LARGEUR + BARRE;
const X_QUAD_HAUT_DROIT = X_QUAD_BAS_DROIT;

const Y_BASE_BAS = INTERIEUR_Y + INTERIEUR_HAUTEUR;
const Y_POINTE_BAS = Y_BASE_BAS - HAUTEUR_FLECHE;
const Y_BASE_HAUT = INTERIEUR_Y;
const Y_POINTE_HAUT = Y_BASE_HAUT + HAUTEUR_FLECHE;

function triangle(xGauche, largeur, yBase, yPointe, couleur, numero) {
  const xCentre = xGauche + largeur / 2;
  const pts = `${xGauche},${yBase} ${xGauche + largeur},${yBase} ${xCentre},${yPointe}`;
  return {
    svg: `<polygon points="${pts}" fill="${couleur}" data-point="${numero}" class="fleche"></polygon>`,
    meta: { numero, x: xCentre, yBase, yPointe, direction: yPointe < yBase ? 'haut' : 'bas' }
  };
}

export function construirePlateauSVG() {
  const polys = [];
  const points = {};
  const creme = 'var(--fleche-claire)';
  const sombre = 'var(--fleche-sombre)';

  for (let i = 0; i < 6; i++) {
    const num = 6 - i;
    const x = X_QUAD_BAS_DROIT + i * POINTE_LARGEUR;
    const { svg, meta } = triangle(x, POINTE_LARGEUR, Y_BASE_BAS, Y_POINTE_BAS, i % 2 === 0 ? creme : sombre, num);
    polys.push(svg); points[num] = meta;
  }
  for (let i = 0; i < 6; i++) {
    const num = 12 - i;
    const x = X_QUAD_BAS_GAUCHE + i * POINTE_LARGEUR;
    const { svg, meta } = triangle(x, POINTE_LARGEUR, Y_BASE_BAS, Y_POINTE_BAS, i % 2 === 0 ? sombre : creme, num);
    polys.push(svg); points[num] = meta;
  }
  for (let i = 0; i < 6; i++) {
    const num = 13 + i;
    const x = X_QUAD_HAUT_GAUCHE + i * POINTE_LARGEUR;
    const { svg, meta } = triangle(x, POINTE_LARGEUR, Y_BASE_HAUT, Y_POINTE_HAUT, i % 2 === 0 ? creme : sombre, num);
    polys.push(svg); points[num] = meta;
  }
  for (let i = 0; i < 6; i++) {
    const num = 19 + i;
    const x = X_QUAD_HAUT_DROIT + i * POINTE_LARGEUR;
    const { svg, meta } = triangle(x, POINTE_LARGEUR, Y_BASE_HAUT, Y_POINTE_HAUT, i % 2 === 0 ? sombre : creme, num);
    polys.push(svg); points[num] = meta;
  }

  const xBarre = X_QUAD_BAS_DROIT + QUAD_LARGEUR;

  const svg = `
<svg viewBox="0 0 ${LARGEUR} ${HAUTEUR}" xmlns="http://www.w3.org/2000/svg" id="plateau-svg">
  <rect x="0" y="0" width="${LARGEUR}" height="${HAUTEUR}" rx="14" fill="var(--cadre-bois)"></rect>
  <rect x="${INTERIEUR_X}" y="${INTERIEUR_Y}" width="${INTERIEUR_LARGEUR}" height="${INTERIEUR_HAUTEUR}" rx="4" fill="var(--surface-bois)"></rect>
  <rect x="${xBarre}" y="${INTERIEUR_Y}" width="${BARRE}" height="${INTERIEUR_HAUTEUR}" fill="var(--barre-bois)"></rect>
  ${polys.join('\n  ')}
</svg>`.trim();

  return { svg, points };
}
