import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AppRole } from './roles.enum';

describe('RolesGuard', () => {
  it('allows when user has required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AppRole.ADMIN])
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { roles: [AppRole.ADMIN], permissions: [] }
        })
      })
    } as never;

    expect(guard.canActivate(context)).toBe(true);
  });
});
