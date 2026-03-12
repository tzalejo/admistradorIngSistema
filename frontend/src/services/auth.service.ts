import { api } from './api';
import type { LoginRequest, RegisterRequest, Tokens } from '../types/auth';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const authService = {
  async login(credentials: LoginRequest): Promise<Tokens> {
    const tokens = await api.post<Tokens>('/auth/login', credentials);
    this.saveTokens(tokens);
    return tokens;
  },

  async register(data: RegisterRequest): Promise<Tokens> {
    const tokens = await api.post<Tokens>('/auth/register', data);
    this.saveTokens(tokens);
    return tokens;
  },

  async logout(): Promise<void> {
    const token = this.getAccessToken();
    if (token) {
      await api.post('/auth/logout', {}, { token }).catch(() => {});
    }
    this.clearTokens();
  },

  async refreshTokens(): Promise<Tokens> {
    const refreshToken = this.getRefreshToken();
    const tokens = await api.post<Tokens>('/auth/refresh', {}, { token: refreshToken || '' });
    this.saveTokens(tokens);
    return tokens;
  },

  saveTokens(tokens: Tokens): void {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};
