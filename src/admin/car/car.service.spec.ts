import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Car } from '../../car/entities/car.entity.js';
import { AdminCarService } from './car.service.js';

/** A chainable query builder recording what the service asked for */
function fakeBuilder(rows: unknown[], total: number) {
  const calls: Record<string, unknown[][]> = {};
  const builder: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return builder;
    };
  for (const name of [
    'innerJoin',
    'leftJoin',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ]) {
    builder[name] = record(name);
  }
  builder.clone = () => builder;
  builder.getCount = () => Promise.resolve(total);
  builder.getRawMany = () => Promise.resolve(rows);
  return { builder, calls };
}

describe('AdminCarService', () => {
  let service: AdminCarService;
  let fake: ReturnType<typeof fakeBuilder>;
  const carRepository = { createQueryBuilder: vi.fn(() => fake.builder) };
  const row = {
    id: 'car',
    userId: 'user',
    plate: 'B12ABC',
    phone: '0712',
    description: 'Blue',
    createdAt: new Date('2026-01-01'),
    apartment: '4',
    ownerId: 'user',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: null,
  };

  beforeEach(async () => {
    fake = fakeBuilder([row], 41);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCarService,
        { provide: getRepositoryToken(Car), useValue: carRepository },
      ],
    }).compile();
    service = module.get(AdminCarService);
  });

  it("only lists the building's members' cars", async () => {
    await service.findByBuilding('b', {});
    const [[table, alias, condition, params]] = fake.calls.innerJoin;
    expect([table, alias]).toEqual(['building_membership', 'member']);
    expect(condition).toContain(
      'member."buildingId" = CAST(:buildingId AS uuid)',
    );
    expect(params).toEqual({ buildingId: 'b' });
  });

  it('defaults to the first 20 by plate', async () => {
    const result = await service.findByBuilding('b', {});
    expect(fake.calls.andWhere).toBeUndefined();
    expect(fake.calls.addSelect).toEqual([['car.plate', 'sortkey']]);
    expect(fake.calls.orderBy).toEqual([['sortkey', 'ASC', 'NULLS LAST']]);
    expect(fake.calls.offset).toEqual([[0]]);
    expect(fake.calls.limit).toEqual([[20]]);
    expect(result).toMatchObject({ total: 41, page: 1, pageSize: 20 });
  });

  it('pages and sorts as asked', async () => {
    await service.findByBuilding('b', {
      page: 3,
      pageSize: 10,
      sort: 'owner',
      dir: 'desc',
    });
    expect(fake.calls.offset).toEqual([[20]]);
    expect(fake.calls.limit).toEqual([[10]]);
    expect(fake.calls.addSelect[0][0]).toContain('owner.email');
    expect(fake.calls.orderBy).toEqual([['sortkey', 'DESC', 'NULLS LAST']]);
  });

  it('matches the plate without spaces or dashes', async () => {
    await service.findByBuilding('b', { q: ' b 12-abc ' });
    const [[where, params]] = fake.calls.andWhere;
    expect(where).toContain('ILIKE :plate');
    expect(where).toContain('owner.email ILIKE :q');
    expect(params).toEqual({ q: '%b 12-abc%', plate: '%b12abc%' });
  });

  it('treats % and _ literally', async () => {
    await service.findByBuilding('b', { q: '50%_' });
    const [[, params]] = fake.calls.andWhere;
    expect(params).toMatchObject({ q: '%50\\%\\_%' });
  });

  it('ignores a blank search', async () => {
    await service.findByBuilding('b', { q: '   ' });
    expect(fake.calls.andWhere).toBeUndefined();
  });

  it('nests the owner, or null without an account', async () => {
    fake = fakeBuilder([row, { ...row, id: 'car2', ownerId: null }], 2);
    const { items } = await service.findByBuilding('b', {});
    expect(items[0]).toMatchObject({
      plate: 'B12ABC',
      apartment: '4',
      owner: { id: 'user', email: 'ana@example.com', firstName: 'Ana' },
    });
    expect(items[1].owner).toBeNull();
  });
});
