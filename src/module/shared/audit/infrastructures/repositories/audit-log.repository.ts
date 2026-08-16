import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from '../../domains/entities/audit-log.schema';
import { IAuditLogRepository } from './audit-log.repository.interface';
import { CreateAuditLogDto } from '../../applications/dto/create-audit-log.dto';
import {
  PaginatedAuditResult,
  QueryAuditLogDto,
} from '../../applications/dto/query-audit-log.dto';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLogDocument> {
    const log = new this.auditLogModel({
      ...dto,
      timestamp: new Date(),
    });
    return log.save();
  }

  async findAllPaginated(
    query: QueryAuditLogDto,
  ): Promise<PaginatedAuditResult<AuditLogDocument>> {
    const {
      page = 1,
      limit = 20,
      category,
      severity,
      status,
      action,
      userId,
      resource,
      resourceId,
      startDate,
      endDate,
      search,
    } = query;

    let queryBuilder = this.auditLogModel.find();

    if (category) queryBuilder = queryBuilder.where('category', category);
    if (severity) queryBuilder = queryBuilder.where('severity', severity);
    if (status) queryBuilder = queryBuilder.where('status', status);
    if (action) queryBuilder = queryBuilder.where('action', action);
    if (userId) queryBuilder = queryBuilder.where('actor.userId', userId);
    if (resource) queryBuilder = queryBuilder.where('resource', resource);
    if (resourceId) queryBuilder = queryBuilder.where('resourceId', resourceId);

    if (startDate) {
      queryBuilder = queryBuilder
        .where('timestamp')
        .gte(new Date(startDate).getTime());
    }
    if (endDate) {
      queryBuilder = queryBuilder
        .where('timestamp')
        .lte(new Date(endDate).getTime());
    }

    if (search) {
      queryBuilder = queryBuilder.or([
        { description: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') },
        { 'actor.email': new RegExp(search, 'i') },
        { 'actor.fullName': new RegExp(search, 'i') },
        { resource: new RegExp(search, 'i') },
      ]);
    }

    const skip = (page - 1) * limit;
    const filter = queryBuilder.getFilter();

    const [data, total] = await Promise.all([
      queryBuilder
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data as unknown as AuditLogDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    const log = await this.auditLogModel.findById(id).lean().exec();
    return log ? (log as unknown as AuditLogDocument) : null;
  }
}
