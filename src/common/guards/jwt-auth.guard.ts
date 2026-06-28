import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_MUST_CHANGE_PASSWORD_KEY } from '../decorators/allow-password-change.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    const allowWhenMustChangePassword = this.reflector.getAllAndOverride<boolean>(ALLOW_MUST_CHANGE_PASSWORD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowWhenMustChangePassword) {
      const request = context.switchToHttp().getRequest();
      if (request.user?.mustChangePassword) {
        throw new ForbiddenException('Mot de passe temporaire detecte. Changement obligatoire avant acces normal.');
      }
    }

    return canActivate;
  }
}
