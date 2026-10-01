import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const contextFor = (user?: { role: UserRole }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('allows any role when the route has no @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor({ role: UserRole.STUDENT }))).toBe(
      true,
    );
  });

  it('allows a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.EMPLOYER,
      UserRole.ADMIN,
    ]);

    expect(guard.canActivate(contextFor({ role: UserRole.EMPLOYER }))).toBe(
      true,
    );
  });

  it('rejects a user whose role is not listed', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor({ role: UserRole.STUDENT }))).toBe(
      false,
    );
  });

  it('rejects a request without an authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor())).toBe(false);
  });
});
