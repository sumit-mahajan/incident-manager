import { and, eq } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import type { GroupRepository } from '../domain/ports';
import type { Group } from '../domain/types';
import { groups, userGroups } from '../db/schema';

export class DrizzleGroupRepository implements GroupRepository {
  constructor(private db: DbClient) {}

  async findAll(): Promise<Group[]> {
    return this.db.select().from(groups).orderBy(groups.name);
  }

  async findById(id: string): Promise<Group | null> {
    const rows = await this.db.select().from(groups).where(eq(groups.groupId, id)).limit(1);
    return rows[0] ?? null;
  }

  async isMember(userId: string, groupId: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
      .limit(1);
    return rows.length > 0;
  }
}
