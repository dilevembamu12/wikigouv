import { Global, Module } from '@nestjs/common';
import { SequelizeService } from './sequelize.service';

@Global()
@Module({
  providers: [SequelizeService],
  exports: [SequelizeService]
})
export class DatabaseModule {}
