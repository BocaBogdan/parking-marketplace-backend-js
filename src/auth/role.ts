/**
 * Stored as `role` in the Clerk user's public metadata. ADMIN manages every building and
 * is set by hand in the Clerk dashboard; BUILDING_ADMIN manages only the building in their
 * `buildingId` (where they also live) and is given through an invitation. No role is USER.
 */
export enum Role {
  ADMIN = 'ADMIN',
  BUILDING_ADMIN = 'BUILDING_ADMIN',
  USER = 'USER',
}
