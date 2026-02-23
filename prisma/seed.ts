import { PrismaClient, CompanyRole, SettlementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createFullPermissions } from '../src/common/config/permissions.config';

const prisma = new PrismaClient();

// Списък с валути
const currencies = [
  { code: 'BGN', name: 'Български лев', symbol: 'лв.' },
  { code: 'EUR', name: 'Евро', symbol: '€' },
  { code: 'USD', name: 'Американски долар', symbol: '$' },
  { code: 'GBP', name: 'Британски паунд', symbol: '£' },
  { code: 'CHF', name: 'Швейцарски франк', symbol: 'CHF' },
  { code: 'RON', name: 'Румънска лея', symbol: 'RON' },
  { code: 'TRY', name: 'Турска лира', symbol: '₺' },
  { code: 'RSD', name: 'Сръбски динар', symbol: 'RSD' },
  { code: 'MKD', name: 'Македонски денар', symbol: 'ден' },
  { code: 'PLN', name: 'Полска злота', symbol: 'zł' },
  { code: 'CZK', name: 'Чешка крона', symbol: 'Kč' },
  { code: 'HUF', name: 'Унгарски форинт', symbol: 'Ft' },
];

// Списък с държави
const countries = [
  { code: 'BG', name: 'Bulgaria', nativeName: 'България', phoneCode: '+359', isEU: true },
  { code: 'DE', name: 'Germany', nativeName: 'Deutschland', phoneCode: '+49', isEU: true },
  { code: 'AT', name: 'Austria', nativeName: 'Österreich', phoneCode: '+43', isEU: true },
  { code: 'BE', name: 'Belgium', nativeName: 'België', phoneCode: '+32', isEU: true },
  { code: 'CZ', name: 'Czech Republic', nativeName: 'Česká republika', phoneCode: '+420', isEU: true },
  { code: 'DK', name: 'Denmark', nativeName: 'Danmark', phoneCode: '+45', isEU: true },
  { code: 'EE', name: 'Estonia', nativeName: 'Eesti', phoneCode: '+372', isEU: true },
  { code: 'ES', name: 'Spain', nativeName: 'España', phoneCode: '+34', isEU: true },
  { code: 'FI', name: 'Finland', nativeName: 'Suomi', phoneCode: '+358', isEU: true },
  { code: 'FR', name: 'France', nativeName: 'France', phoneCode: '+33', isEU: true },
  { code: 'GR', name: 'Greece', nativeName: 'Ελλάδα', phoneCode: '+30', isEU: true },
  { code: 'HR', name: 'Croatia', nativeName: 'Hrvatska', phoneCode: '+385', isEU: true },
  { code: 'HU', name: 'Hungary', nativeName: 'Magyarország', phoneCode: '+36', isEU: true },
  { code: 'IE', name: 'Ireland', nativeName: 'Éire', phoneCode: '+353', isEU: true },
  { code: 'IT', name: 'Italy', nativeName: 'Italia', phoneCode: '+39', isEU: true },
  { code: 'LT', name: 'Lithuania', nativeName: 'Lietuva', phoneCode: '+370', isEU: true },
  { code: 'LU', name: 'Luxembourg', nativeName: 'Luxembourg', phoneCode: '+352', isEU: true },
  { code: 'LV', name: 'Latvia', nativeName: 'Latvija', phoneCode: '+371', isEU: true },
  { code: 'MT', name: 'Malta', nativeName: 'Malta', phoneCode: '+356', isEU: true },
  { code: 'NL', name: 'Netherlands', nativeName: 'Nederland', phoneCode: '+31', isEU: true },
  { code: 'PL', name: 'Poland', nativeName: 'Polska', phoneCode: '+48', isEU: true },
  { code: 'PT', name: 'Portugal', nativeName: 'Portugal', phoneCode: '+351', isEU: true },
  { code: 'RO', name: 'Romania', nativeName: 'România', phoneCode: '+40', isEU: true },
  { code: 'SE', name: 'Sweden', nativeName: 'Sverige', phoneCode: '+46', isEU: true },
  { code: 'SI', name: 'Slovenia', nativeName: 'Slovenija', phoneCode: '+386', isEU: true },
  { code: 'SK', name: 'Slovakia', nativeName: 'Slovensko', phoneCode: '+421', isEU: true },
  { code: 'CY', name: 'Cyprus', nativeName: 'Κύπρος', phoneCode: '+357', isEU: true },
  // Държави извън ЕС
  { code: 'GB', name: 'United Kingdom', nativeName: 'United Kingdom', phoneCode: '+44', isEU: false },
  { code: 'CH', name: 'Switzerland', nativeName: 'Schweiz', phoneCode: '+41', isEU: false },
  { code: 'NO', name: 'Norway', nativeName: 'Norge', phoneCode: '+47', isEU: false },
  { code: 'RS', name: 'Serbia', nativeName: 'Србија', phoneCode: '+381', isEU: false },
  { code: 'MK', name: 'North Macedonia', nativeName: 'Северна Македонија', phoneCode: '+389', isEU: false },
  { code: 'TR', name: 'Turkey', nativeName: 'Türkiye', phoneCode: '+90', isEU: false },
  { code: 'UA', name: 'Ukraine', nativeName: 'Україна', phoneCode: '+380', isEU: false },
  { code: 'MD', name: 'Moldova', nativeName: 'Moldova', phoneCode: '+373', isEU: false },
  { code: 'AL', name: 'Albania', nativeName: 'Shqipëri', phoneCode: '+355', isEU: false },
  { code: 'BA', name: 'Bosnia and Herzegovina', nativeName: 'Bosna i Hercegovina', phoneCode: '+387', isEU: false },
  { code: 'ME', name: 'Montenegro', nativeName: 'Crna Gora', phoneCode: '+382', isEU: false },
  { code: 'XK', name: 'Kosovo', nativeName: 'Kosovë', phoneCode: '+383', isEU: false },
  { code: 'US', name: 'United States', nativeName: 'United States', phoneCode: '+1', isEU: false },
  { code: 'CN', name: 'China', nativeName: '中国', phoneCode: '+86', isEU: false },
  { code: 'RU', name: 'Russia', nativeName: 'Россия', phoneCode: '+7', isEU: false },
];

// Списък с населени места в България (областни центрове и големи градове)
const bulgarianSettlements: Array<{
  name: string;
  type: SettlementType;
  postalCode: string;
  municipality: string;
  region: string;
  ekatte: string;
}> = [
  // Столица
  { name: 'София', type: 'CAPITAL', postalCode: '1000', municipality: 'Столична', region: 'София (столица)', ekatte: '68134' },
  // Областни центрове
  { name: 'Пловдив', type: 'CITY', postalCode: '4000', municipality: 'Пловдив', region: 'Пловдив', ekatte: '56784' },
  { name: 'Варна', type: 'CITY', postalCode: '9000', municipality: 'Варна', region: 'Варна', ekatte: '10135' },
  { name: 'Бургас', type: 'CITY', postalCode: '8000', municipality: 'Бургас', region: 'Бургас', ekatte: '07079' },
  { name: 'Русе', type: 'CITY', postalCode: '7000', municipality: 'Русе', region: 'Русе', ekatte: '63427' },
  { name: 'Стара Загора', type: 'CITY', postalCode: '6000', municipality: 'Стара Загора', region: 'Стара Загора', ekatte: '68850' },
  { name: 'Плевен', type: 'CITY', postalCode: '5800', municipality: 'Плевен', region: 'Плевен', ekatte: '56722' },
  { name: 'Сливен', type: 'CITY', postalCode: '8800', municipality: 'Сливен', region: 'Сливен', ekatte: '67338' },
  { name: 'Добрич', type: 'CITY', postalCode: '9300', municipality: 'Добрич', region: 'Добрич', ekatte: '72624' },
  { name: 'Шумен', type: 'CITY', postalCode: '9700', municipality: 'Шумен', region: 'Шумен', ekatte: '83510' },
  { name: 'Перник', type: 'CITY', postalCode: '2300', municipality: 'Перник', region: 'Перник', ekatte: '55871' },
  { name: 'Хасково', type: 'CITY', postalCode: '6300', municipality: 'Хасково', region: 'Хасково', ekatte: '77195' },
  { name: 'Ямбол', type: 'CITY', postalCode: '8600', municipality: 'Ямбол', region: 'Ямбол', ekatte: '87374' },
  { name: 'Пазарджик', type: 'CITY', postalCode: '4400', municipality: 'Пазарджик', region: 'Пазарджик', ekatte: '55155' },
  { name: 'Благоевград', type: 'CITY', postalCode: '2700', municipality: 'Благоевград', region: 'Благоевград', ekatte: '04279' },
  { name: 'Велико Търново', type: 'CITY', postalCode: '5000', municipality: 'Велико Търново', region: 'Велико Търново', ekatte: '10447' },
  { name: 'Враца', type: 'CITY', postalCode: '3000', municipality: 'Враца', region: 'Враца', ekatte: '12259' },
  { name: 'Габрово', type: 'CITY', postalCode: '5300', municipality: 'Габрово', region: 'Габрово', ekatte: '14218' },
  { name: 'Видин', type: 'CITY', postalCode: '3700', municipality: 'Видин', region: 'Видин', ekatte: '10971' },
  { name: 'Монтана', type: 'CITY', postalCode: '3400', municipality: 'Монтана', region: 'Монтана', ekatte: '48489' },
  { name: 'Ловеч', type: 'CITY', postalCode: '5500', municipality: 'Ловеч', region: 'Ловеч', ekatte: '43952' },
  { name: 'Кърджали', type: 'CITY', postalCode: '6600', municipality: 'Кърджали', region: 'Кърджали', ekatte: '40909' },
  { name: 'Търговище', type: 'CITY', postalCode: '7700', municipality: 'Търговище', region: 'Търговище', ekatte: '73626' },
  { name: 'Разград', type: 'CITY', postalCode: '7200', municipality: 'Разград', region: 'Разград', ekatte: '61710' },
  { name: 'Силистра', type: 'CITY', postalCode: '7500', municipality: 'Силистра', region: 'Силистра', ekatte: '66425' },
  { name: 'Смолян', type: 'CITY', postalCode: '4700', municipality: 'Смолян', region: 'Смолян', ekatte: '67653' },
  { name: 'Кюстендил', type: 'CITY', postalCode: '2500', municipality: 'Кюстендил', region: 'Кюстендил', ekatte: '41112' },
  // Големи градове (не са областни центрове)
  { name: 'Асеновград', type: 'CITY', postalCode: '4230', municipality: 'Асеновград', region: 'Пловдив', ekatte: '00702' },
  { name: 'Казанлък', type: 'CITY', postalCode: '6100', municipality: 'Казанлък', region: 'Стара Загора', ekatte: '35167' },
  { name: 'Димитровград', type: 'CITY', postalCode: '6400', municipality: 'Димитровград', region: 'Хасково', ekatte: '21052' },
  { name: 'Горна Оряховица', type: 'CITY', postalCode: '5100', municipality: 'Горна Оряховица', region: 'Велико Търново', ekatte: '16359' },
  { name: 'Дупница', type: 'CITY', postalCode: '2600', municipality: 'Дупница', region: 'Кюстендил', ekatte: '68789' },
  { name: 'Петрич', type: 'CITY', postalCode: '2850', municipality: 'Петрич', region: 'Благоевград', ekatte: '56126' },
  { name: 'Сандански', type: 'CITY', postalCode: '2800', municipality: 'Сандански', region: 'Благоевград', ekatte: '65334' },
  { name: 'Карлово', type: 'CITY', postalCode: '4300', municipality: 'Карлово', region: 'Пловдив', ekatte: '36498' },
  { name: 'Свищов', type: 'CITY', postalCode: '5250', municipality: 'Свищов', region: 'Велико Търново', ekatte: '65766' },
  { name: 'Несебър', type: 'TOWN', postalCode: '8230', municipality: 'Несебър', region: 'Бургас', ekatte: '51500' },
  { name: 'Банско', type: 'TOWN', postalCode: '2770', municipality: 'Банско', region: 'Благоевград', ekatte: '02676' },
  { name: 'Велинград', type: 'CITY', postalCode: '4600', municipality: 'Велинград', region: 'Пазарджик', ekatte: '10450' },
  { name: 'Севлиево', type: 'CITY', postalCode: '5400', municipality: 'Севлиево', region: 'Габрово', ekatte: '65927' },
  { name: 'Самоков', type: 'CITY', postalCode: '2000', municipality: 'Самоков', region: 'София', ekatte: '65231' },
  { name: 'Троян', type: 'CITY', postalCode: '5600', municipality: 'Троян', region: 'Ловеч', ekatte: '73198' },
  { name: 'Лом', type: 'CITY', postalCode: '3600', municipality: 'Лом', region: 'Монтана', ekatte: '44238' },
  { name: 'Ботевград', type: 'CITY', postalCode: '2140', municipality: 'Ботевград', region: 'София', ekatte: '05815' },
  { name: 'Нова Загора', type: 'CITY', postalCode: '8900', municipality: 'Нова Загора', region: 'Сливен', ekatte: '51809' },
  { name: 'Айтос', type: 'CITY', postalCode: '8500', municipality: 'Айтос', region: 'Бургас', ekatte: '00151' },
  { name: 'Карнобат', type: 'CITY', postalCode: '8400', municipality: 'Карнобат', region: 'Бургас', ekatte: '36525' },
  { name: 'Поморие', type: 'TOWN', postalCode: '8200', municipality: 'Поморие', region: 'Бургас', ekatte: '57491' },
  { name: 'Созопол', type: 'TOWN', postalCode: '8130', municipality: 'Созопол', region: 'Бургас', ekatte: '67800' },
  { name: 'Приморско', type: 'TOWN', postalCode: '8180', municipality: 'Приморско', region: 'Бургас', ekatte: '58356' },
  { name: 'Балчик', type: 'TOWN', postalCode: '9600', municipality: 'Балчик', region: 'Добрич', ekatte: '02508' },
  { name: 'Каварна', type: 'TOWN', postalCode: '9650', municipality: 'Каварна', region: 'Добрич', ekatte: '35064' },
];

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const fullPermissions = createFullPermissions();

  // Създаване на валути
  console.log('📦 Creating currencies...');
  const createdCurrencies: Record<string, string> = {};
  for (const currency of currencies) {
    const created = await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol },
      create: currency,
    });
    createdCurrencies[currency.code] = created.id;
  }
  console.log('✅ Currencies created:', Object.keys(createdCurrencies).join(', '));

  // Създаване на държави
  console.log('🌍 Creating countries...');
  const createdCountries: Record<string, string> = {};
  for (const country of countries) {
    const created = await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name, nativeName: country.nativeName, phoneCode: country.phoneCode, isEU: country.isEU },
      create: country,
    });
    createdCountries[country.code] = created.id;
  }
  console.log('✅ Countries created:', Object.keys(createdCountries).length, 'countries');

  // Създаване на населени места в България
  console.log('🏘️ Creating settlements...');
  const createdSettlements: Record<string, string> = {};
  for (const settlement of bulgarianSettlements) {
    const created = await prisma.settlement.upsert({
      where: { ekatte: settlement.ekatte },
      update: {
        name: settlement.name,
        type: settlement.type,
        postalCode: settlement.postalCode,
        municipality: settlement.municipality,
        region: settlement.region,
      },
      create: {
        ...settlement,
        countryId: createdCountries['BG'],
      },
    });
    createdSettlements[settlement.name] = created.id;
  }
  console.log('✅ Settlements created:', Object.keys(createdSettlements).length, 'settlements');

  // Създаване на компанията собственик - Електрик експрес ЕООД
  const ownerCompany = await prisma.company.upsert({
    where: { eik: '123456789' },
    update: {},
    create: {
      name: 'Електрик експрес ЕООД',
      eik: '123456789',
      vatNumber: 'BG123456789',
      address: 'бул. Витоша 100',
      city: 'София',
      postalCode: '1000',
      countryId: createdCountries['BG'],
      molName: 'Светлозар Росенов',
      phone: '+359 888 123 456',
      email: 'office@elektrik-ekspres.bg',
      role: CompanyRole.OWNER,
      isActive: true,
    },
  });

  console.log('✅ Owner company created:', ownerCompany.name);

  // Създаване на Super Admin роля за собственика
  const superAdminRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: ownerCompany.id,
        name: 'Super Admin',
      },
    },
    update: {
      permissions: fullPermissions as any, // Винаги обновяваме правата при seed
    },
    create: {
      name: 'Super Admin',
      description: 'Пълен достъп до системата',
      companyId: ownerCompany.id,
      permissions: fullPermissions as any,
      isDefault: true,
    },
  });

  console.log('✅ Super Admin role created:', superAdminRole.name);

  // Създаване на Super Admin потребител
  const superAdmin = await prisma.user.upsert({
    where: { email: 'svetlozarrosenov@gmail.com' },
    update: {},
    create: {
      email: 'svetlozarrosenov@gmail.com',
      password: hashedPassword,
      firstName: 'Светлозар',
      lastName: 'Росенов',
      isActive: true,
    },
  });

  console.log('✅ Super Admin user created:', superAdmin.email);

  // Свързване на Super Admin към компанията собственик
  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: superAdmin.id,
        companyId: ownerCompany.id,
      },
    },
    update: { roleId: superAdminRole.id },
    create: {
      userId: superAdmin.id,
      companyId: ownerCompany.id,
      roleId: superAdminRole.id,
      isDefault: true,
    },
  });

  console.log('✅ Super Admin User-Company relation created');

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
