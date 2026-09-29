export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "Q0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Q0.00";
  return `Q${num.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatWeight(weight: number | string | null | undefined): string {
  if (weight === null || weight === undefined) return "-";
  const num = typeof weight === "string" ? parseFloat(weight) : Number(weight);
  if (isNaN(num)) return "-";
  return `${num.toFixed(2)} lb`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calculateCostByWeight(
  itemWeight: number,
  totalWeight: number,
  totalCost: number
): number {
  if (!itemWeight || !totalWeight || totalWeight <= 0) return 0;
  const cost = (itemWeight / totalWeight) * totalCost;
  return Math.round(cost * 100) / 100;
}
