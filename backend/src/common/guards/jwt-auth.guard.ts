import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

// Registered globally: every route requires a valid JWT unless marked
// @Public(). On a public route a valid token is still read, so the handler can
// tailor the answer to the user (e.g. an employer viewing its own offer), but
// a missing or invalid one is not an error.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return (await super.canActivate(context)) as boolean;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers.authorization) {
      try {
        await super.canActivate(context);
      } catch {
        // Anonymous access: the route is public.
      }
    }
    return true;
  }
}
