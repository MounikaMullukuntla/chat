/**
 * Common types and interfaces for API key verification services
 */

export type VerificationResult = {
  success: boolean;
  error?: string;
  details?: {
    model?: string;
    usage?: object;
    provider?: string;
  };
};

export type RateLimitInfo = {
  remaining?: number;
  resetTime?: Date;
  retryAfter?: number;
};

export class VerificationError extends Error {
  code?: string;
  statusCode?: number;
  rateLimitInfo?: RateLimitInfo;

  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    rateLimitInfo?: RateLimitInfo
  ) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
    this.statusCode = statusCode;
    this.rateLimitInfo = rateLimitInfo;
  }
}

export type BaseVerificationService = {
  verify(apiKey: string): Promise<VerificationResult>;
};

export type GitHubVerificationResult = {
  success: boolean;
  error?: string;
  user?: {
    login: string;
    name: string;
    avatar_url?: string;
  };
  repositories?: Array<{
    name: string;
    full_name: string;
    private: boolean;
    permissions?: {
      admin: boolean;
      push: boolean;
      pull: boolean;
    };
  }>;
  scopes?: string[];
  expiresAt?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
};

export enum VerificationErrorCode {
  INVALID_KEY = "INVALID_KEY",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  RATE_LIMITED = "RATE_LIMITED",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  INSUFFICIENT_QUOTA = "INSUFFICIENT_QUOTA",
  INVALID_FORMAT = "INVALID_FORMAT",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
}
