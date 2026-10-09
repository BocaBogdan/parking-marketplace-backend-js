import { Test, TestingModule } from '@nestjs/testing';
import { BuildingController } from './building.controller.js';
import { BuildingService } from './building.service.js';

describe('BuildingController', () => {
  let controller: BuildingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingController],
      providers: [BuildingService],
    }).compile();

    controller = module.get<BuildingController>(BuildingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
