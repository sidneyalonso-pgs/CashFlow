import Decimal from "decimal.js";

// Nunca somar/subtrair valores monetários com number puro — usar sempre estas funções.

export function toDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function sumMoney(values: Array<string | number>): Decimal {
  return values.reduce((acc: Decimal, v) => acc.plus(v), new Decimal(0));
}

export function netPaymentValue(params: {
  grossAmount: string | number;
  interest?: string | number;
  fine?: string | number;
  discount?: string | number;
  withheldTax?: string | number;
}): Decimal {
  const { grossAmount, interest = 0, fine = 0, discount = 0, withheldTax = 0 } = params;
  return toDecimal(grossAmount).plus(interest).plus(fine).minus(discount).minus(withheldTax);
}

export function weightedRevenue(estimatedAmount: string | number, probabilityPct: number): Decimal {
  return toDecimal(estimatedAmount).times(probabilityPct).dividedBy(100);
}

export function formatBRL(value: string | number | Decimal): string {
  const n = value instanceof Decimal ? value.toNumber() : Number(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
