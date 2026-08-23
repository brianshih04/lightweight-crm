import "server-only";

import { Prisma } from "@prisma/client";

type MoneyValue = Prisma.Decimal | number | string;

export function moneyToNumber(value: MoneyValue | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const result = new Prisma.Decimal(value).toNumber();
  if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Money value cannot be represented as a safe API number");
  }
  return result;
}

export function sumMoney<T extends { value: MoneyValue }>(items: T[]): number {
  const total = items.reduce(
    (sum, item) => sum.add(item.value),
    new Prisma.Decimal(0)
  );
  return moneyToNumber(total);
}
