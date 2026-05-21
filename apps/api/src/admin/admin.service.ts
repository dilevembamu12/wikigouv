import { Injectable } from '@nestjs/common';
import { FindOptions, Op, Order, WhereOptions } from 'sequelize';
import { SequelizeService } from '@/database/sequelize.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';

type ListOptions = {
  searchColumns?: string[];
  defaultOrder?: Order;
  extraWhere?: WhereOptions;
};

@Injectable()
export class AdminService {
  constructor(private readonly db: SequelizeService) {}

  parsePagination(query: AdminListQueryDto) {
    const page = Math.max(1, Number(query.page ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? '10') || 10));
    return { page, pageSize, offset: (page - 1) * pageSize };
  }

  buildWhere(query: AdminListQueryDto, options?: ListOptions): WhereOptions {
    const where: WhereOptions = { ...(options?.extraWhere ?? {}) };

    if (query.status) {
      (where as Record<string, unknown>).status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (query.dateFrom) createdAt[Op.gte as unknown as string] = new Date(query.dateFrom);
      if (query.dateTo) createdAt[Op.lte as unknown as string] = new Date(query.dateTo);
      (where as Record<string, unknown>).createdAt = createdAt;
    }

    if (query.q && options?.searchColumns?.length) {
      (where as Record<string, unknown>)[Op.or as unknown as string] = options.searchColumns.map((column: string) => ({
        [column]: { [Op.like]: `%${query.q}%` }
      }));
    }

    return where;
  }

  async listModel(
    modelName: keyof SequelizeService['models'],
    query: AdminListQueryDto,
    options?: ListOptions
  ) {
    const { page, pageSize, offset } = this.parsePagination(query);
    const where = this.buildWhere(query, options);
    const model = this.db.models[modelName];

    const findOptions: FindOptions = {
      where,
      limit: pageSize,
      offset,
      order: options?.defaultOrder ?? [['createdAt', 'DESC']]
    };

    const { rows, count } = await model.findAndCountAll(findOptions);
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    return {
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages
    };
  }

  async dashboardSummary() {
    const [courses, quizzes, certificates, users, supports, forums, blogs] = await Promise.all([
      this.db.models.Course.count(),
      this.db.models.Quiz.count(),
      this.db.models.Certificate.count(),
      this.db.models.UserProfile.count(),
      this.db.models.SupportTicket.count(),
      this.db.models.ForumTopic.count(),
      this.db.models.Blog.count()
    ]);

    return {
      courses,
      quizzes,
      certificates,
      users,
      supports,
      forums,
      blogs
    };
  }
}
