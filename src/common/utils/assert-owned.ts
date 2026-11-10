import { NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Проверки за принадлежност към фирмата.
 *
 * Правило: всяко `*Id`, което идва от тялото на заявка и се записва като
 * външен ключ, минава през `assertOwned` преди записа. Иначе потребител на
 * една фирма може да закачи (и през `include` да прочете) запис на друга.
 */

type Db = PrismaClient | Prisma.TransactionClient;

// Модели с директна колона companyId → текст за грешката.
const OWNED_MODELS = {
  customer: 'Клиентът не е намерен',
  product: 'Продуктът не е намерен',
  order: 'Продажбата не е намерена',
  invoice: 'Фактурата не е намерена',
  serviceOrder: 'Сервизната заявка не е намерена',
  sprint: 'Спринтът не е намерен',
  ticket: 'Задачата не е намерена',
  inventoryBatch: 'Партидата не е намерена',
  billOfMaterial: 'Рецептурата не е намерена',
  location: 'Складът не е намерен',
  issuedWarranty: 'Гаранцията не е намерена',
} as const;

export type OwnedModel = keyof typeof OWNED_MODELS;

/**
 * Хвърля 404, ако записът не е на фирмата. Празно id (null/undefined/'')
 * се пропуска — полето не е подадено или се изчиства.
 */
export async function assertOwned(
  db: Db,
  model: OwnedModel,
  id: string | null | undefined,
  companyId: string,
  extraWhere: Record<string, unknown> = {},
): Promise<void> {
  if (!id) return;
  const row = await (db as any)[model].findFirst({
    where: { ...extraWhere, id, companyId },
    select: { id: true },
  });
  if (!row) throw new NotFoundException(OWNED_MODELS[model]);
}

/** Същото за списък от id-та (напр. productId по редовете на документ). */
export async function assertAllOwned(
  db: Db,
  model: OwnedModel,
  ids: Array<string | null | undefined>,
  companyId: string,
): Promise<void> {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (unique.length === 0) return;
  const count = await (db as any)[model].count({
    where: { id: { in: unique }, companyId },
  });
  if (count !== unique.length) {
    throw new NotFoundException(OWNED_MODELS[model]);
  }
}

/** Хвърля 404, ако потребителят не е член на фирмата. */
export async function assertCompanyMember(
  db: Db,
  userId: string | null | undefined,
  companyId: string,
): Promise<void> {
  if (!userId) return;
  const member = await db.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { userId: true },
  });
  if (!member) throw new NotFoundException('Потребителят не е намерен');
}
