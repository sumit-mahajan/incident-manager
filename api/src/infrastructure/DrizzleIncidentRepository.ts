import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import type { IncidentRepository } from '../domain/ports';
import type {
  Incident,
  NewIncident,
  IncidentFilter,
  Pagination,
  Paginated,
  UpdateableIncidentFields,
  AiCachePatch,
} from '../domain/types';
import { incidents } from '../db/schema';

export class DrizzleIncidentRepository implements IncidentRepository {
  constructor(private db: DbClient) {}

  async nextKey(): Promise<string> {
    const result = await this.db.execute(
      sql`SELECT 'INC-' || LPAD(nextval('incident_key_seq')::text, 4, '0') AS key`
    );
    return result.rows[0].key as string;
  }

  async create(input: NewIncident): Promise<Incident> {
    const rows = await this.db
      .insert(incidents)
      .values({
        key: input.key,
        title: input.title,
        description: input.description,
        severity: input.severity,
        targetGroupId: input.targetGroupId,
        reporterId: input.reporterId,
      })
      .returning();
    return rows[0];
  }

  async findById(id: string): Promise<Incident | null> {
    const rows = await this.db.select().from(incidents).where(eq(incidents.incidentId, id)).limit(1);
    return rows[0] ?? null;
  }

  async findMany(filter: IncidentFilter, pagination: Pagination): Promise<Paginated<Incident>> {
    const conditions = [];
    if (filter.severity) conditions.push(eq(incidents.severity, filter.severity));
    if (filter.status) conditions.push(eq(incidents.status, filter.status));
    if (filter.groupId) conditions.push(eq(incidents.targetGroupId, filter.groupId));
    if (filter.q) {
      conditions.push(
        or(ilike(incidents.title, `%${filter.q}%`), ilike(incidents.description, `%${filter.q}%`))!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(incidents).where(where),
      this.db
        .select()
        .from(incidents)
        .where(where)
        .orderBy(desc(incidents.createdAt))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit),
    ]);

    return {
      data: rows,
      total: countResult[0].count,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async update(id: string, patch: UpdateableIncidentFields): Promise<Incident> {
    const rows = await this.db
      .update(incidents)
      .set(patch)
      .where(eq(incidents.incidentId, id))
      .returning();
    return rows[0];
  }

  async updateAiCache(id: string, patch: AiCachePatch): Promise<void> {
    await this.db.update(incidents).set(patch).where(eq(incidents.incidentId, id));
  }
}
