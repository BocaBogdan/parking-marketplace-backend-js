import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BuildingMembership,
  MembershipRole,
} from '../../membership/entities/building-membership.entity.js';

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

  /**
   * Promotes a member to building admin or back to resident. Access is read from
   * memberships on every request, so it applies from the member's next request.
   */
  async updateRole(
    buildingId: string,
    membershipId: string,
    role: MembershipRole,
  ) {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, buildingId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('This member is not in this building');
    }
    if (membership.role !== role) {
      await this.membershipRepository.update(membership.id, { role });
      membership.role = role;
    }
    return membership;
  }
}
