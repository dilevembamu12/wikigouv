import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from './permissions.enum';

describe('PermissionsGuard', () => {
  it('allows when user has required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Permission.COURSE_READ])
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { roles: ['AGENT'], permissions: [Permission.COURSE_READ] }
        })
      })
    } as never;

    expect(guard.canActivate(context)).toBe(true);
  });
});

