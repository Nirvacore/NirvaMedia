import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiClient } from '@api/client';

const TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  avatar?: string;
}

export class AuthService {
  private tokens: AuthTokens | null = null;
  private user: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  async initialize() {
    try {
      // Restore tokens from secure storage
      const storedTokens = await SecureStore.getItemAsync(TOKENS_KEY);
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens);
      }

      // Restore user data from async storage
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }

      // Check if tokens are still valid
      if (this.tokens) {
        const isValid = await this.validateTokens();
        if (!isValid) {
          // Try to refresh
          await this.refreshAccessToken();
        }

        // Schedule token refresh before expiry
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await apiClient.post<{
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>('/api/auth/login', {
        email,
        password,
      });

      const { user, accessToken, refreshToken, expiresIn } = response.data;

      // Store tokens securely
      this.tokens = { accessToken, refreshToken, expiresIn };
      await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(this.tokens));

      // Store user data
      this.user = user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      // Schedule token refresh
      this.scheduleTokenRefresh();

      return user;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async signup(
    email: string,
    password: string,
    name: string
  ): Promise<User> {
    try {
      const response = await apiClient.post<{
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>('/api/auth/signup', {
        email,
        password,
        name,
      });

      const { user, accessToken, refreshToken, expiresIn } = response.data;

      // Store tokens and user
      this.tokens = { accessToken, refreshToken, expiresIn };
      await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(this.tokens));

      this.user = user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      this.scheduleTokenRefresh();

      return user;
    } catch (error) {
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  async checkBiometricAvailability(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  }

  async enableBiometric(): Promise<boolean> {
    try {
      const available = await this.checkBiometricAvailability();
      if (!available) {
        throw new Error('Biometric not available on this device');
      }

      // Authenticate with biometric first
      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Enable biometric authentication',
      });

      if (!authenticated.success) {
        throw new Error('Biometric authentication failed');
      }

      // Store flag
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

      return true;
    } catch (error) {
      throw new Error(`Failed to enable biometric: ${error.message}`);
    }
  }

  async disableBiometric(): Promise<void> {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  async biometricLogin(): Promise<User> {
    try {
      const enabled = await this.isBiometricEnabled();
      if (!enabled) {
        throw new Error('Biometric not enabled');
      }

      // Authenticate with biometric
      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Login to NMD Platform',
      });

      if (!authenticated.success) {
        throw new Error('Biometric authentication failed');
      }

      // Get stored tokens
      if (!this.tokens) {
        throw new Error('No stored authentication tokens');
      }

      // Validate tokens with API
      const isValid = await this.validateTokens();
      if (!isValid) {
        // Try to refresh
        await this.refreshAccessToken();
      }

      if (!this.user) {
        throw new Error('User data not found');
      }

      return this.user;
    } catch (error) {
      throw new Error(`Biometric login failed: ${error.message}`);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      if (this.tokens) {
        try {
          await apiClient.post('/api/auth/logout', {
            refreshToken: this.tokens.refreshToken,
          });
        } catch (error) {
          // Endpoint might fail, but still proceed with local logout
          console.warn('Logout endpoint error:', error);
        }
      }

      // Clear stored data
      this.tokens = null;
      this.user = null;

      await SecureStore.deleteItemAsync(TOKENS_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  async refreshAccessToken(): Promise<string> {
    try {
      if (!this.tokens) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<{
        accessToken: string;
        expiresIn: number;
      }>('/api/auth/refresh', {
        refreshToken: this.tokens.refreshToken,
      });

      const { accessToken, expiresIn } = response.data;

      // Update tokens
      this.tokens.accessToken = accessToken;
      this.tokens.expiresIn = expiresIn;

      await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(this.tokens));

      // Reschedule refresh
      this.scheduleTokenRefresh();

      return accessToken;
    } catch (error) {
      // If refresh fails, logout user
      await this.logout();
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async validateTokens(): Promise<boolean> {
    try {
      if (!this.tokens) return false;

      const response = await apiClient.post<{ valid: boolean }>(
        '/api/auth/validate',
        {}
      );

      return response.data.valid;
    } catch {
      return false;
    }
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.tokens && !!this.user;
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokens) return;

    // Refresh 5 minutes before expiry
    const refreshTime = Math.max(0, this.tokens.expiresIn * 1000 - 5 * 60 * 1000);

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().catch(error => {
        console.error('Automatic token refresh failed:', error);
      });
    }, refreshTime);
  }
}

export const authService = new AuthService();
