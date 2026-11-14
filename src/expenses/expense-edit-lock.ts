// Заключване на приключените разходи.
//
// Платен разход се редактира до края на месеца, в който е станал платен;
// анулиран се възстановява до края на месеца на анулирането. Чакащите и
// одобрените не се заключват. Разход, въведен направо като платен, носи за
// дата на плащане датата на документа — затова се взима по-късното от
// плащането и въвеждането (бележка от миналия месец, въведена днес, остава
// отворена до края на този месец).

const TIME_ZONE = 'Europe/Sofia';

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  hourCycle: 'h23',
});

function localParts(date: Date) {
  const parts: Record<string, number> = {};
  for (const p of partsFormat.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts as { year: number; month: number; day: number; hour: number };
}

/** Началото (местно време) на месеца след този, в който е `date`. */
export function startOfNextLocalMonth(date: Date): Date {
  const { year, month } = localParts(date);
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  // Полунощ в София е 21:00 или 22:00 UTC на предния ден (лятно/зимно време)
  for (const offsetHours of [2, 3]) {
    const candidate = new Date(Date.UTC(y, m - 1, 1) - offsetHours * 3600_000);
    const local = localParts(candidate);
    if (local.day === 1 && local.hour === 0) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, 1) - 2 * 3600_000);
}

export interface ExpenseLockSource {
  status: string;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Моментът, от който разходът е заключен; null = не се заключва. */
export function expenseEditableUntil(expense: ExpenseLockSource): Date | null {
  if (expense.status === 'PAID') {
    const paid = expense.paidAt ?? expense.createdAt;
    return startOfNextLocalMonth(
      paid > expense.createdAt ? paid : expense.createdAt,
    );
  }
  if (expense.status === 'CANCELLED') {
    return startOfNextLocalMonth(expense.cancelledAt ?? expense.updatedAt);
  }
  return null;
}

export function isExpenseEditLocked(
  expense: ExpenseLockSource,
  now: Date = new Date(),
): boolean {
  const until = expenseEditableUntil(expense);
  return until !== null && now >= until;
}

/** Добавя към разхода `editableUntil` и `editLocked` за клиента. */
export function withEditLock<T extends ExpenseLockSource>(expense: T) {
  const editableUntil = expenseEditableUntil(expense);
  return {
    ...expense,
    editableUntil,
    editLocked: editableUntil !== null && new Date() >= editableUntil,
  };
}
