/** Distancia de Levenshtein simple, para detectar nombres parecidos (typos, variantes). */
function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, (_, i) => [i, ...Array(columnas - 1).fill(0)]);
  for (let j = 0; j < columnas; j++) matriz[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo
      );
    }
  }

  return matriz[filas - 1][columnas - 1];
}

/** true si dos nombres (ya normalizados) probablemente pertenecen a la misma persona. */
export function nombresParecidos(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const distancia = distanciaLevenshtein(a, b);
  const limite = Math.max(a.length, b.length) <= 6 ? 1 : 2;
  return distancia <= limite;
}
