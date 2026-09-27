/**
 * Ротация на ключа за шифроване на тайните в базата.
 *
 *   node dist/src/cli/reencrypt-secrets.js [--dry-run]
 *
 * Очаква ENCRYPTION_KEY (новият ключ) и ENCRYPTION_KEY_PREVIOUS (старият —
 * при първата ротация това е стойността на JWT_SECRET). За всеки шифрован ред:
 * - чете се с текущия ключ → нищо не се прави;
 * - чете се с предишния → презаписва се с текущия;
 * - plaintext (легаси Еконт/Спиди пароли, AI ключове) → шифрова се;
 * - не се чете с нито един → остава, изписва се id-то (ръчна намеса).
 * Записите от старите модулни helper-и (без 'enc:v1:' префикс) се уеднаквяват.
 * Идемпотентно — може да се пуска многократно. Не пипа JWT_SECRET/сесиите.
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';

if (existsSync('.env.local')) config({ path: '.env.local', override: true });
config();

import { PrismaClient } from '@prisma/client';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isEncryptedWithCurrentKey,
} from '../common/utils/secret-crypto.util';

type Mode = 'encrypted-or-plaintext' | 'encrypted';

interface Target {
  label: string;
  column: string;
  /** encrypted-or-plaintext: непрефиксирана стойност = plaintext (шифрова се);
   *  encrypted: непрефиксирана стойност = стар формат без префикс (дешифрира се). */
  mode: Mode;
  rows: () => Promise<Array<{ id: string; value: string | null }>>;
  write: (id: string, value: string) => Promise<unknown>;
}

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const pick =
  (column: string) =>
  (r: Record<string, unknown>): { id: string; value: string | null } => ({
    id: r.id as string,
    value: (r[column] as string | null) ?? null,
  });

const targets: Target[] = [
  {
    label: 'EcontConfig.password',
    column: 'password',
    mode: 'encrypted-or-plaintext',
    rows: async () =>
      (
        await prisma.econtConfig.findMany({
          select: { id: true, password: true },
        })
      ).map(pick('password')),
    write: (id, password) =>
      prisma.econtConfig.update({ where: { id }, data: { password } }),
  },
  {
    label: 'SpeedyConfig.password',
    column: 'password',
    mode: 'encrypted-or-plaintext',
    rows: async () =>
      (
        await prisma.speedyConfig.findMany({
          select: { id: true, password: true },
        })
      ).map(pick('password')),
    write: (id, password) =>
      prisma.speedyConfig.update({ where: { id }, data: { password } }),
  },
  {
    label: 'AiSettings.apiKey',
    column: 'apiKey',
    mode: 'encrypted-or-plaintext',
    rows: async () =>
      (
        await prisma.aiSettings.findMany({ select: { id: true, apiKey: true } })
      ).map(pick('apiKey')),
    write: (id, apiKey) =>
      prisma.aiSettings.update({ where: { id }, data: { apiKey } }),
  },
  {
    label: 'User.twoFactorSecret',
    column: 'twoFactorSecret',
    mode: 'encrypted-or-plaintext',
    rows: async () =>
      (
        await prisma.user.findMany({
          where: { twoFactorSecret: { not: null } },
          select: { id: true, twoFactorSecret: true },
        })
      ).map(pick('twoFactorSecret')),
    write: (id, twoFactorSecret) =>
      prisma.user.update({ where: { id }, data: { twoFactorSecret } }),
  },
  {
    label: 'TwoFactorChallenge.pendingSecret',
    column: 'pendingSecret',
    mode: 'encrypted-or-plaintext',
    rows: async () =>
      (
        await prisma.twoFactorChallenge.findMany({
          where: { pendingSecret: { not: null } },
          select: { id: true, pendingSecret: true },
        })
      ).map(pick('pendingSecret')),
    write: (id, pendingSecret) =>
      prisma.twoFactorChallenge.update({
        where: { id },
        data: { pendingSecret },
      }),
  },
  {
    label: 'UserCompany.personalIdEncrypted',
    column: 'personalIdEncrypted',
    mode: 'encrypted',
    rows: async () =>
      (
        await prisma.userCompany.findMany({
          where: { personalIdEncrypted: { not: null } },
          select: { id: true, personalIdEncrypted: true },
        })
      ).map(pick('personalIdEncrypted')),
    write: (id, personalIdEncrypted) =>
      prisma.userCompany.update({
        where: { id },
        data: { personalIdEncrypted },
      }),
  },
  {
    label: 'GoogleAnalyticsConfig.serviceAccountJsonEncrypted',
    column: 'serviceAccountJsonEncrypted',
    mode: 'encrypted',
    rows: async () =>
      (
        await prisma.googleAnalyticsConfig.findMany({
          where: { serviceAccountJsonEncrypted: { not: null } },
          select: { id: true, serviceAccountJsonEncrypted: true },
        })
      ).map(pick('serviceAccountJsonEncrypted')),
    write: (id, serviceAccountJsonEncrypted) =>
      prisma.googleAnalyticsConfig.update({
        where: { id },
        data: { serviceAccountJsonEncrypted },
      }),
  },
  {
    label: 'MetaPixelConfig.accessTokenEncrypted',
    column: 'accessTokenEncrypted',
    mode: 'encrypted',
    rows: async () =>
      (
        await prisma.metaPixelConfig.findMany({
          where: { accessTokenEncrypted: { not: null } },
          select: { id: true, accessTokenEncrypted: true },
        })
      ).map(pick('accessTokenEncrypted')),
    write: (id, accessTokenEncrypted) =>
      prisma.metaPixelConfig.update({
        where: { id },
        data: { accessTokenEncrypted },
      }),
  },
];

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error(
      'ENCRYPTION_KEY is not set — nothing to rotate to. Aborting.',
    );
    process.exit(1);
  }
  console.log(
    `${dryRun ? '[DRY RUN] ' : ''}Re-encrypting secrets with ENCRYPTION_KEY` +
      (process.env.ENCRYPTION_KEY_PREVIOUS
        ? ' (previous key configured)'
        : ' (no previous key)'),
  );

  let failed = 0;
  for (const t of targets) {
    const rows = await t.rows();
    let current = 0;
    let rotated = 0;
    let encrypted = 0;
    const unreadable: string[] = [];
    for (const row of rows) {
      if (!row.value) continue;
      if (isEncryptedSecret(row.value) || t.mode === 'encrypted') {
        if (
          isEncryptedWithCurrentKey(row.value) &&
          isEncryptedSecret(row.value)
        ) {
          current++;
          continue;
        }
        let plain: string;
        try {
          plain = decryptSecret(row.value);
        } catch {
          unreadable.push(row.id);
          continue;
        }
        if (!dryRun) await t.write(row.id, encryptSecret(plain));
        rotated++;
      } else {
        // plaintext легаси стойност
        if (!dryRun) await t.write(row.id, encryptSecret(row.value));
        encrypted++;
      }
    }
    failed += unreadable.length;
    console.log(
      `${t.label.padEnd(52)} rows=${rows.length} current=${current} rotated=${rotated} encrypted=${encrypted} unreadable=${unreadable.length}`,
    );
    for (const id of unreadable) console.log(`   unreadable id: ${id}`);
  }
  if (dryRun) {
    console.log('Dry run complete — nothing was written.');
  } else if (failed) {
    console.log(
      `Done with ${failed} unreadable row(s) — they were left untouched.`,
    );
  } else {
    console.log('Done. Remove ENCRYPTION_KEY_PREVIOUS from .env and restart.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
