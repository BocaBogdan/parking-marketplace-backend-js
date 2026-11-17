import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CarService } from './car.service.js';
import { Car } from './entities/car.entity.js';

describe('CarService', () => {
  let service: CarService;
  const carRepository = { query: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarService,
        { provide: getRepositoryToken(Car), useValue: carRepository },
      ],
    }).compile();
    service = module.get(CarService);
  });

  it('cleans up plates saved with spaces or dashes on startup', async () => {
    carRepository.query.mockResolvedValue([[], 2]);
    await service.onModuleInit();
    const [sql] = carRepository.query.mock.calls[0] as [string];
    expect(sql).toContain(
      "upper(regexp_replace(plate, '[[:space:]-]', '', 'g'))",
    );
    // Only rows that need it, so it's a no-op once every plate is clean
    expect(sql).toContain(
      "WHERE plate ~ '[[:space:]-]' OR plate <> upper(plate)",
    );
  });
});
