import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

// Runs after JwtAuthGuard. Routes without @Roles() are open to any role.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    return user !== undefined && requiredRoles.includes(user.role);
  }
}
