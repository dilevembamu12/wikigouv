import { Injectable } from '@nestjs/common';
import { SequelizeService } from '@/database/sequelize.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: SequelizeService) {}

  async findAll() {
    const EmployeeProfile = this.db.models.EmployeeProfile;
    const rows = await EmployeeProfile.findAll({ order: [['full_name', 'ASC']] });
    return rows.map((r) => r.toJSON());
  }
}
