import { eq } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import type { UserRepository } from '../domain/ports';
import type { User, Group } from '../domain/types';
import { users, groups, userGroups } from '../db/schema';

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.userId, id)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(users.name);
  }

  async findGroupsByUserId(userId: string): Promise<Group[]> {
    const rows = await this.db
      .select({
        groupId: groups.groupId,
        name: groups.name,
        description: groups.description,
        createdAt: groups.createdAt,
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.groupId))
      .where(eq(userGroups.userId, userId));
    return rows;
  }
}
