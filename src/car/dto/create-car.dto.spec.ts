import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCarDto } from './create-car.dto.js';
import { UpdateCarDto } from './update-car.dto.js';

const car = { phone: '0712345678', description: 'Blue Dacia' };

describe('CreateCarDto', () => {
  it('saves the plate without spaces or dashes', async () => {
    const dto = plainToInstance(CreateCarDto, {
      ...car,
      plate: ' tm 54-atm ',
    });
    expect(dto.plate).toBe('TM54ATM');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a plate that is only spaces and dashes', async () => {
    const dto = plainToInstance(CreateCarDto, { ...car, plate: ' - ' });
    const [error] = await validate(dto);
    expect(error.property).toBe('plate');
  });

  it('rejects other symbols', async () => {
    const dto = plainToInstance(CreateCarDto, { ...car, plate: 'TM54ATM!' });
    const [error] = await validate(dto);
    expect(error.constraints).toHaveProperty('matches');
  });
});

describe('UpdateCarDto', () => {
  it('normalizes a new plate', async () => {
    const dto = plainToInstance(UpdateCarDto, { plate: 'B 1 X' });
    expect(dto.plate).toBe('B1X');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('leaves the plate alone when it is not changed', async () => {
    const dto = plainToInstance(UpdateCarDto, { phone: '0700000000' });
    expect(dto.plate).toBeUndefined();
    expect(await validate(dto)).toHaveLength(0);
  });
});
