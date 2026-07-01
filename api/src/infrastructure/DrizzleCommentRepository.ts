import { asc, eq } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import type { CommentRepository } from '../domain/ports';
import type { IncidentComment, NewComment } from '../domain/types';
import { incidentComments } from '../db/schema';

export class DrizzleCommentRepository implements CommentRepository {
  constructor(private db: DbClient) {}

  async create(input: NewComment): Promise<IncidentComment> {
    const rows = await this.db
      .insert(incidentComments)
      .values({
        incidentId: input.incidentId,
        authorId: input.authorId,
        body: input.body,
      })
      .returning();
    return rows[0];
  }

  async findByIncidentId(incidentId: string): Promise<IncidentComment[]> {
    return this.db
      .select()
      .from(incidentComments)
      .where(eq(incidentComments.incidentId, incidentId))
      .orderBy(asc(incidentComments.createdAt));
  }
}
