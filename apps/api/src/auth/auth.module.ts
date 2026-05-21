import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [JwtVerifierService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [JwtVerifierService, JwtAuthGuard, RolesGuard, PermissionsGuard]
})
export class AuthModule {}
