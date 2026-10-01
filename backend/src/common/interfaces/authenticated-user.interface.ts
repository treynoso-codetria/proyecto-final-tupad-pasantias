import { UserRole } from '../../generated/prisma/enums.js';

// Shape of `request.user` once JwtAuthGuard has validated the token.
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
