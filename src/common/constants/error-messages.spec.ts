import { getPrismaErrorMessage } from './error-messages';

describe('getPrismaErrorMessage / P2002', () => {
  it('пропуска companyId в съставен ключ и казва кое поле е дублирано', () => {
    const msg = getPrismaErrorMessage({
      code: 'P2002',
      meta: { target: ['companyId', 'offerNumber'] },
    });
    expect(msg).toBe('Запис с този номер на оферта вече съществува');
  });

  it('работи и с единично поле', () => {
    const msg = getPrismaErrorMessage({
      code: 'P2002',
      meta: { target: ['email'] },
    });
    expect(msg).toBe('Запис с този имейл вече съществува');
  });

  it('без target дава общото съобщение', () => {
    const msg = getPrismaErrorMessage({ code: 'P2002', meta: {} });
    expect(msg).toBe('Запис с тези данни вече съществува');
  });
});
