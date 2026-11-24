import type { RequestHandler } from 'express';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { buildPaginationMeta } from '../../shared/query/pagination.js';
import { rbacService } from '../rbac/rbac.service.js';
import { userService } from './user.service.js';

async function presentUser(user: Awaited<ReturnType<typeof userService.findById>>) {
  if (user === null) {
    return null;
  }

  const access = await rbacService.getAccessForRoles(user.roleIds);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    roles: access.roles,
    permissions: access.permissions,
    emailVerified: user.emailVerifiedAt !== null,
    instructorApplicationStatus: user.instructorApplicationStatus,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createUserController() {
  const list: RequestHandler = async (req, res) => {
    const query = getValidated<{
      page: number;
      limit: number;
      sort: { field: 'createdAt' | 'name' | 'email' | 'status'; direction: 1 | -1 };
      status?: 'pending_verification' | 'active' | 'suspended';
      role?: string;
      applicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
      q?: string;
      includeDeleted?: boolean;
    }>(req, 'query');

    const sortDirection = query.sort.direction === 1 ? 'asc' : 'desc';

    const result = await userService.list({
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection,
      status: query.status,
      roleId: query.role,
      applicationStatus: query.applicationStatus,
      search: query.q,
      includeDeleted: query.includeDeleted,
    });

    const items = await Promise.all(result.items.map((user) => presentUser(user)));

    sendSuccess(res, {
      message: 'Users',
      data: { items },
      meta: buildPaginationMeta({ page: query.page, limit: query.limit }, result.total),
    });
  };

  const get: RequestHandler = async (req, res) => {
    const user = await userService.findById(String(req.params.id));

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'User', data: { user: await presentUser(user) } });
  };

  const update: RequestHandler = async (req, res) => {
    const input = getValidated<{
      name?: string;
      email?: string;
      status?: 'pending_verification' | 'active' | 'suspended';
      roleIds?: string[];
      instructorApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    }>(req, 'body');

    const user = await userService.updateUser(String(req.params.id), input);

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'User updated', data: { user: await presentUser(user) } });
  };

  const suspend: RequestHandler = async (req, res) => {
    const user = await userService.suspend(String(req.params.id), req.auth!.userId, new Date());

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'User suspended', data: { user: await presentUser(user) } });
  };

  const reactivate: RequestHandler = async (req, res) => {
    const user = await userService.reactivate(String(req.params.id));

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'User reactivated', data: { user: await presentUser(user) } });
  };

  const remove: RequestHandler = async (req, res) => {
    const user = await userService.softDelete(String(req.params.id), req.auth!.userId, new Date());

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'User deleted', data: {} });
  };

  const applyInstructor: RequestHandler = async (req, res) => {
    const user = await userService.applyInstructorApplication(req.auth!.userId);

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, {
      message: 'Instructor application submitted',
      data: { user: await presentUser(user) },
    });
  };

  const approveInstructor: RequestHandler = async (req, res) => {
    const roles = await rbacService.getRoleBySlug('instructor');

    if (roles === null) {
      res
        .status(503)
        .json({ success: false, message: 'RBAC is not configured', code: 'AUTH_NOT_CONFIGURED' });
      return;
    }

    const user = await userService.approveInstructorApplication(String(req.params.id), roles.id);

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, { message: 'Instructor approved', data: { user: await presentUser(user) } });
  };

  const rejectInstructor: RequestHandler = async (req, res) => {
    const user = await userService.rejectInstructorApplication(String(req.params.id));

    if (user === null) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    sendSuccess(res, {
      message: 'Instructor application rejected',
      data: { user: await presentUser(user) },
    });
  };

  return {
    list,
    get,
    update,
    suspend,
    reactivate,
    remove,
    applyInstructor,
    approveInstructor,
    rejectInstructor,
  };
}

export const userController = createUserController();
