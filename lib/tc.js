export function tcDogrula(tc) {
  if (!tc || tc.length !== 11 || !/^\d+$/.test(tc)) return false;
  if (tc[0] === "0") return false;
  const digits = tc.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenth = ((oddSum * 7) - evenSum) % 10;
  if (tenth !== digits[9]) return false;
  const total = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (total % 10 !== digits[10]) return false;
  return true;
}

export function tcToEmail(tc) {
  return tc + "@hastane.local";
}
