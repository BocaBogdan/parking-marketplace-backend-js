/**
 * ADMIN manages every building (`app_user.isAdmin`, set in the database); BUILDING_ADMIN
 * manages the buildings where their membership has that role, given through an invitation.
 * Roles come from the database, not Clerk. No role is USER.
 */
export enum Role {
  ADMIN = 'ADMIN',
  BUILDING_ADMIN = 'BUILDING_ADMIN',
  USER = 'USER',
}
