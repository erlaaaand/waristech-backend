import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from '../entities/audit-log.schema';
import {
  AuditActorDomain,
  AuditLogDomain,
} from '../../domains/entities/audit-log.entity';
import { IAuditLogRepository } from '../../domains/repositories/audit-log.repository.interface';
import { CreateAuditLogDto } from '../../applications/dto/create-audit-log.dto';
import {
  PaginatedAuditResult,
  QueryAuditLogDto,
} from '../../applications/dto/query-audit-log.dto';

type AuditLogRecord = AuditLog & { _id: unknown };

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  private toDomain(record: AuditLogRecord): AuditLogDomain {
    return new AuditLogDomain(
      String(record._id),
      record.action,
      record.category,
      record.severity,
      record.status,
      new AuditActorDomain(
        record.actor.userId ?? null,
        record.actor.email ?? null,
        record.actor.fullName ?? null,
        record.actor.role ?? 'ANONYMOUS',
      ),
      record.resource,
      record.resourceId ?? null,
      record.description,
      record.ipAddress,
      record.userAgent,
      record.beforeState ?? null,
      record.afterState ?? null,
      record.metadata ?? null,
      record.errorMessage ?? null,
      record.timestamp,
    );
  }

  async create(dto: CreateAuditLogDto): Promise<AuditLogDomain> {
    const log = new this.auditLogModel({
      ...dto,
      timestamp: new Date(),
    });
    const saved = await log.save();
    return this.toDomain(saved);
  }

  async findAllPaginated(
    query: QueryAuditLogDto,
  ): Promise<PaginatedAuditResult<AuditLogDomain>> {
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

    const [records, total] = await Promise.all([
      queryBuilder
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data: (records as unknown as AuditLogRecord[]).map((r) =>
        this.toDomain(r),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<AuditLogDomain | null> {
    const record = await this.auditLogModel.findById(id).lean().exec();
    return record ? this.toDomain(record) : null;
  }
}
