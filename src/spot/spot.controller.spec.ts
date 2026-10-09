import { Test, TestingModule } from '@nestjs/testing';
import { SpotController } from './spot.controller.js';
import { SpotService } from './spot.service.js';

describe('SpotController', () => {
  let controller: SpotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotController],
      providers: [SpotService],
    }).compile();

    controller = module.get<SpotController>(SpotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
