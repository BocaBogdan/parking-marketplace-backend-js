import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Spot } from './entities/spot.entity.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { Schedule } from './schedule/entities/schedule.entity.js';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SpotService {
  private readonly s3;
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client([
      {
        region: 'auto', // Required by AWS SDK, not used by R2
        endpoint: this.configService.get<string>('JURISDICTION_SPECIFIC_URL'),
        credentials: {
          accessKeyId: this.configService.get<string>('ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get<string>('SECRET_ACCESS_KEY'),
        },
      },
    ]);
  }

  async create(userId: string, buildingId: string, createSpotDto: CreateSpotDto) {
    // const fileId = await new PutObjectCommand({
    //   Bucket: this.configService.get<string>('R2_BUCKET_NAME'),
    //   Key: 'myfile.txt',
    //   Body: createSpotDto.fileId,
    // });

    const newSpot = this.spotRepository.create({
      userId,
      buildingId,
      number: createSpotDto.number,
      description: createSpotDto.description,
      long: createSpotDto.location.long,
      lat: createSpotDto.location.lat,
      // fileId: 'TO_DO'
    });

    return this.spotRepository.save(newSpot);
  }

  findAll() {
    return this.spotRepository.find();
  }

  findOne(id: string) {
    return this.spotRepository.findOneBy({ id });
  }

  findByInterval(dayOfWeek: number, startMinute: number, endMinute: number) {
    return this.scheduleRepository.find({
      where: {
        dayOfWeek,
        startMinute: LessThanOrEqual(startMinute),
        endMinute: MoreThanOrEqual(endMinute),
      },
    });
  }

  async update(id: string, updateSpotDto: UpdateSpotDto) {
    await this.spotRepository.update(id, updateSpotDto);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.spotRepository.delete(id);
  }
}
