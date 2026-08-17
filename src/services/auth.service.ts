import type { 
  AuthResponse, 
  AuthToken, 
  LoginRequest, 
  RegisterRequest, 
  UserSanitized 
} from '../types/auth.types';

import { SERVER_URL } from '../constants';

const ACCESS_TOKEN_KEY = 'chat_access_token_v2';
const REFRESH_TOKEN_KEY = 'chat_refresh_token_v2';
const USER_KEY = 'chat_auth_user_v2';

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   */
  public async register(payload: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${SERVER_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка при регистрации');
    }

    this.saveAuthData(data);
    return data;
  }

  /**
   * Log in existing user
   */
  public async login(payload: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка при входе');
    }

    this.saveAuthData(data);
    return data;
  }

  /**
   * Refresh expired access token using stored refresh token
   */
  public async refreshTokens(): Promise<AuthToken | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearAuthData();
      return null;
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.clearAuthData();
        return null;
      }

      this.saveTokens(data.tokens);
      return data.tokens;
    } catch {
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Log out current user & revoke server session
   */
  public async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    const accessToken = this.getAccessToken();

    try {
      if (refreshToken || accessToken) {
        await fetch(`${SERVER_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Fetch current authenticated user info
   */
  public async getMe(): Promise<UserSanitized | null> {
    const accessToken = this.getAccessToken();
    if (!accessToken) return null;

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        // Try refresh token
        const newTokens = await this.refreshTokens();
        if (newTokens) {
          return this.getMe();
        }
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      this.saveStoredUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }

  // ===== Local Storage Token Helpers =====

  public getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  public getStoredUser(): UserSanitized | null {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public saveAuthData(authResponse: AuthResponse): void {
    this.saveTokens(authResponse.tokens);
    this.saveStoredUser(authResponse.user);
  }

  public saveTokens(tokens: AuthToken): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  public saveStoredUser(user: UserSanitized): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public clearAuthData(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export const authService = AuthService.getInstance();
export default authService;
