import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

// Restricts a route (or a whole controller) to the given roles. See RolesGuard.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
