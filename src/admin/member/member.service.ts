import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingMembership } from '../../membership/entities/building-membership.entity.js';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
  ) {}

  /** The building's residents with their name and email, earliest first */
  findByBuilding(buildingId: string) {
    return this.membershipRepository.find({
      where: { buildingId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }
}
