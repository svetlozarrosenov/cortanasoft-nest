import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { ExportService } from '../common/export/export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '../common/guards/permissions.guard';

const mockCustomersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  transferReferrals: jest.fn(),
};

// Роля с право „Партньори (редакция)"
const partnersEditRole = {
  permissions: {
    modules: {
      crm: {
        enabled: true,
        pages: {
          partners: {
            enabled: true,
            actions: { view: true, create: false, edit: true, delete: false },
          },
        },
      },
    },
  },
};

const plainUser = { id: 'u1', partnerCustomerId: null, currentRole: null };
const partnerAccount = {
  id: 'u2',
  partnerCustomerId: 'partner-1',
  currentRole: null,
};
const partnersManager = {
  id: 'u3',
  partnerCustomerId: null,
  currentRole: partnersEditRole,
};

describe('CustomersController', () => {
  let controller: CustomersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: ExportService, useValue: { generateFile: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(CustomersController);
  });

  // Всеки endpoint приема или правото Клиенти, или правото Лийдове (contacts)
  // със съответното действие — това пази роля само с Лийдове да работи.
  describe('права по endpoint', () => {
    const anyOf = (method: string) =>
      Reflect.getMetadata(PERMISSIONS_ANY_KEY, (controller as any)[method]);
    const allOf = (method: string) =>
      Reflect.getMetadata(PERMISSIONS_KEY, (controller as any)[method]);

    it.each([
      ['create', 'create'],
      ['findAll', 'view'],
      ['export', 'view'],
      ['getStages', 'view'],
      ['getSources', 'view'],
      ['findOne', 'view'],
      ['update', 'edit'],
      ['remove', 'delete'],
    ])(
      '%s изисква customers ИЛИ contacts със действие %s',
      (method, action) => {
        expect(anyOf(method)).toEqual([
          { module: 'crm', page: 'customers', action },
          { module: 'crm', page: 'contacts', action },
        ]);
        expect(allOf(method)).toBeUndefined();
      },
    );

    it('transferReferrals изисква само Партньори (редакция)', () => {
      expect(allOf('transferReferrals')).toEqual([
        { module: 'crm', page: 'partners', action: 'edit' },
      ]);
      expect(anyOf('transferReferrals')).toBeUndefined();
    });
  });

  describe('партньорски scope и право за партньори', () => {
    it('обикновен потребител: без scope, без право за партньори', async () => {
      await controller.create('c1', { type: 'INDIVIDUAL' } as any, plainUser);
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        'c1',
        { type: 'INDIVIDUAL' },
        null,
        false,
      );
    });

    it('партньорски акаунт: scope = неговият партньор', async () => {
      await controller.create('c1', {} as any, partnerAccount);
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        'c1',
        {},
        'partner-1',
        false,
      );
    });

    it('роля с Партньори (редакция): canManagePartners = true', async () => {
      await controller.create('c1', {} as any, partnersManager);
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        'c1',
        {},
        null,
        true,
      );

      await controller.update(
        'c1',
        'cust-1',
        { isPartner: true } as any,
        partnersManager,
      );
      expect(mockCustomersService.update).toHaveBeenCalledWith(
        'c1',
        'cust-1',
        { isPartner: true },
        null,
        true,
      );
    });

    it('findAll / findOne / remove подават scope-а на сервиза', async () => {
      await controller.findAll('c1', {} as any, partnerAccount);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'c1',
        {},
        'partner-1',
      );

      await controller.findOne('c1', 'cust-1', partnerAccount);
      expect(mockCustomersService.findOne).toHaveBeenCalledWith(
        'c1',
        'cust-1',
        'partner-1',
      );

      await controller.remove('c1', 'cust-1', plainUser);
      expect(mockCustomersService.remove).toHaveBeenCalledWith(
        'c1',
        'cust-1',
        null,
      );
    });
  });
});
