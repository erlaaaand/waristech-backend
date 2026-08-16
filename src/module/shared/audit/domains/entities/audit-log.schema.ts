import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { AuditCategory, AuditSeverity, AuditStatus } from '../enums/audit.enum';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ _id: false })
export class AuditActor {
  @Prop({ type: String, required: false, default: null })
  userId?: string | null;

  @Prop({ type: String, required: false, default: null })
  email?: string | null;

  @Prop({ type: String, required: false, default: null })
  fullName?: string | null;

  @Prop({ type: String, required: false, default: 'ANONYMOUS' })
  role?: string;
}

export const AuditActorSchema = SchemaFactory.createForClass(AuditActor);

@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: 'timestamp', updatedAt: false }, // Immutable append-only audit trail
  versionKey: false,
})
export class AuditLog {
  @Prop({ type: String, required: true, index: true })
  action: string = '';

  @Prop({
    type: String,
    enum: Object.values(AuditCategory),
    required: true,
    index: true,
  })
  category: AuditCategory = AuditCategory.SYSTEM;

  @Prop({
    type: String,
    enum: Object.values(AuditSeverity),
    required: true,
    default: AuditSeverity.INFO,
    index: true,
  })
  severity: AuditSeverity = AuditSeverity.INFO;

  @Prop({
    type: String,
    enum: Object.values(AuditStatus),
    required: true,
    default: AuditStatus.SUCCESS,
  })
  status: AuditStatus = AuditStatus.SUCCESS;

  @Prop({ type: AuditActorSchema, required: true })
  actor: AuditActor = new AuditActor();

  @Prop({ type: String, required: true })
  resource: string = '';

  @Prop({ type: String, required: false, default: null, index: true })
  resourceId?: string | null;

  @Prop({ type: String, required: true })
  description: string = '';

  @Prop({ type: String, required: false, default: '' })
  ipAddress: string = '';

  @Prop({ type: String, required: false, default: '' })
  userAgent: string = '';

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: null })
  beforeState?: Record<string, unknown> | null;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: null })
  afterState?: Record<string, unknown> | null;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: null })
  metadata?: Record<string, unknown> | null;

  @Prop({ type: String, required: false, default: null })
  errorMessage?: string | null;

  @Prop({ type: Date, default: () => new Date(), index: -1 })
  timestamp: Date = new Date();
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// ── Compound Indexes for Fast Audit Querying & Forensic Analysis ──
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
