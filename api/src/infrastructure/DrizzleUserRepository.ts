import { eq } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import type { UserRepository } from '../domain/ports';
import type { User, UserWithGroups, Group } from '../domain/types';
import { users, groups, userGroups } from '../db/schema';

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.userId, id)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<UserWithGroups[]> {
    const allUsers = await this.db.select().from(users).orderBy(users.name);

    const membershipRows = await this.db
      .select({
        userId: userGroups.userId,
        groupId: groups.groupId,
        name: groups.name,
        description: groups.description,
        createdAt: groups.createdAt,
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.groupId));

    const groupsByUserId = new Map<string, Group[]>();
    for (const row of membershipRows) {
      const group: Group = {
        groupId: row.groupId,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
      };
      const existing = groupsByUserId.get(row.userId);
      if (existing) existing.push(group);
      else groupsByUserId.set(row.userId, [group]);
    }

    return allUsers.map((user) => ({ ...user, groups: groupsByUserId.get(user.userId) ?? [] }));
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
