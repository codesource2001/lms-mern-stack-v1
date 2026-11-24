/* eslint-disable */
import { describe, expect, it, vi } from 'vitest';

import { UserService } from '../src/modules/users/user.service.js';
import type { UserRecord } from '../src/modules/users/user.repository.js';

function makeRepository() {
  const users = new Map<string, UserRecord>();

  const base: UserRecord = {
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    status: 'active',
    roleIds: [],
    emailVerifiedAt: new Date(),
    passwordChangedAt: new Date(),
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockoutLevel: 0,
    lockUntil: null,
    tokenVersion: 0,
    instructorApplicationStatus: 'none',
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set('user-1', { ...base });
  users.set('user-2', {
    ...base,
    id: 'user-2',
    name: 'Grace',
    email: 'grace@example.com',
    status: 'suspended',
    deletedAt: new Date(),
  });

  const revokeSessions = vi.fn(async () => undefined);

  const repository = {
    async list(input: any) {
      let items = [...users.values()];
      if (input.status !== undefined) {
        items = items.filter((user) => user.status === input.status);
      }
      if (input.search !== undefined) {
        items = items.filter((user) =>
          user.name.toLowerCase().includes(input.search.toLowerCase()),
        );
      }
      if (input.includeDeleted !== true) {
        items = items.filter((user) => user.deletedAt === null);
      }
      return { items, total: items.length };
    },
    async findById(id: string) {
      return users.get(id) ?? null;
    },
    async update(id: string, input: any) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      Object.assign(user, input);
      if (input.roleIds !== undefined) {
        user.roleIds = input.roleIds;
      }
      if (input.status !== undefined) {
        user.status = input.status;
      }
      return user;
    },
    async softDelete(id: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.deletedAt = new Date();
      user.status = 'suspended';
      return user;
    },
    async restore(id: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.deletedAt = null;
      return user;
    },
    async incrementTokenVersion(id: string) {
      const user = users.get(id);
      if (user !== undefined) {
        user.tokenVersion += 1;
      }
    },
    async recordLoginSuccess() {},
    async recordFailedLogin() {
      return null;
    },
    async updateName(id: string, name: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.name = name;
      return user;
    },
    async updatePassword() {
      return null;
    },
    async findByEmail() {
      return null;
    },
    async findByEmailWithPassword() {
      return null;
    },
    async findByIdWithPassword() {
      return null;
    },
    async create() {
      return null;
    },
    async setEmailVerification() {},
    async markEmailVerified() {
      return null;
    },
    async setPasswordReset() {
      return null;
    },
    async resetPasswordWithToken() {
      return null;
    },
  };

  return { repository, users, revokeSessions };
}

describe('UserService management', () => {
  it('filters active users by status', async () => {
    const { repository } = makeRepository();
    const service = new UserService(repository as any, undefined, async () => undefined);

    const result = await service.list({
      page: 1,
      limit: 10,
      sortField: 'createdAt',
      sortDirection: 'desc',
      status: 'active',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('user-1');
  });

  it('excludes soft-deleted users by default', async () => {
    const { repository } = makeRepository();
    const service = new UserService(repository as any, undefined, async () => undefined);

    const result = await service.list({
      page: 1,
      limit: 10,
      sortField: 'createdAt',
      sortDirection: 'desc',
    });

    expect(result.items).toHaveLength(1);
  });

  it('suspends a user and revokes sessions', async () => {
    const { repository, revokeSessions } = makeRepository();
    const service = new UserService(repository as any, undefined, revokeSessions);

    const user = await service.suspend('user-1', 'admin-1', new Date());

    expect(user?.status).toBe('suspended');
    expect(revokeSessions).toHaveBeenCalledWith('user-1', 'user_suspended', expect.any(Date));
  });

  it('soft-deletes a user', async () => {
    const { repository } = makeRepository();
    const service = new UserService(repository as any, undefined, async () => undefined);

    const user = await service.softDelete('user-1', 'admin-1', new Date());

    expect(user?.deletedAt).not.toBeNull();
    expect(user?.status).toBe('suspended');
  });

  it('approves an instructor application', async () => {
    const { repository } = makeRepository();
    const service = new UserService(repository as any, undefined, async () => undefined);

    const user = await service.approveInstructorApplication('user-1', 'role-instructor');

    expect(user?.instructorApplicationStatus).toBe('approved');
    expect(user?.roleIds).toContain('role-instructor');
    expect(user?.status).toBe('active');
  });
});
