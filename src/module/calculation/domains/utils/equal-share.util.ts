/**
 * Membagi `total` secara merata ke `count` bagian, dibulatkan 2 desimal per
 * bagian dengan bagian TERAKHIR menyerap sisa pembulatan — sehingga jumlah
 * seluruh bagian selalu tepat sama dengan `total` (menghindari total tampil
 * 99.99/100.01 akibat pembulatan independen per bagian di sisi klien).
 */
export function distributeEqualShares(total: number, count: number): number[] {
  if (count <= 0) return [];

  const rounded = Math.round((total / count) * 100) / 100;
  const shares = new Array<number>(count).fill(rounded);
  const sumExceptLast = rounded * (count - 1);
  shares[count - 1] = Math.round((total - sumExceptLast) * 100) / 100;
  return shares;
}
