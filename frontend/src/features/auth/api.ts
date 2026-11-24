import { api } from '@/lib/api';
import type { AuthUser } from '@/stores/auth-store';

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

interface MessageResponse {
  message: string;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<MessageResponse> {
  const response = await api.post('/auth/register', input);
  const data = response.data as unknown as MessageResponse;
  return data.message ? data : { message: 'Account created' };
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  const response = await api.post('/auth/verify-email', { token });
  const data = response.data as unknown as MessageResponse;
  return data;
}

export async function resendVerification(email: string): Promise<MessageResponse> {
  const response = await api.post('/auth/resend-verification', { email });
  const data = response.data as unknown as MessageResponse;
  return data;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const response = await api.post('/auth/login', input);
  const data = response.data as unknown as { data: AuthResponse };
  return data.data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get('/auth/me');
  const data = response.data as unknown as { data: { user: AuthUser } };
  return data.data.user;
}

export async function updateProfile(name: string): Promise<AuthUser> {
  const response = await api.patch('/auth/me', { name });
  const data = response.data as unknown as { data: { user: AuthUser } };
  return data.data.user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<MessageResponse> {
  const response = await api.post('/auth/change-password', input);
  const data = response.data as unknown as MessageResponse;
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await api.post('/auth/logout-all');
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const response = await api.post('/auth/forgot-password', { email });
  const data = response.data as unknown as MessageResponse;
  return data;
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<MessageResponse> {
  const response = await api.post('/auth/reset-password', input);
  const data = response.data as unknown as MessageResponse;
  return data;
}
