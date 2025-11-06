/**
 * GitHub Personal Access Token verification service
 */

import { BaseVerificationService } from './base-verification-service';
import { GitHubVerificationResult, VerificationErrorCode } from './types';

export class GitHubVerificationService extends BaseVerificationService {
  protected providerName = 'GitHub';
  private readonly baseUrl = 'https://api.github.com';

  async verify(token: string): Promise<GitHubVerificationResult> {
    try {
      // Validate token format
      if (!this.validateTokenFormat(token)) {
        throw this.createVerificationError(
          'Invalid GitHub token format',
          VerificationErrorCode.INVALID_FORMAT
        );
      }

      // Get user information and token details
      const userResponse = await this.makeRequest(
        `${this.baseUrl}/user`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Settings-Page-Integration'
          }
        }
      );

      if (userResponse.status === 200) {
        const userData = await userResponse.json();
        
        // Parse token scopes from response headers
        const scopes = this.parseTokenScopes(userResponse.headers);
        
        // Get rate limit information
        const rateLimitInfo = this.parseGitHubRateLimit(userResponse.headers);

        // Get accessible repositories (limited to first 30 for performance)
        const repositories = await this.getAccessibleRepositories(token);

        // Check token expiration if available
        const expiresAt = await this.getTokenExpiration(token);

        return {
          success: true,
          user: {
            login: userData.login,
            name: userData.name || userData.login,
            avatar_url: userData.avatar_url
          },
          repositories,
          scopes,
          expiresAt,
          rateLimitInfo
        };
      } else if (userResponse.status === 401) {
        const errorData = await userResponse.json().catch(() => ({}));
        
        if (errorData.message?.includes('Bad credentials')) {
          throw this.createVerificationError(
            'Invalid GitHub token',
            VerificationErrorCode.AUTHENTICATION_FAILED
          );
        } else if (errorData.message?.includes('token expired')) {
          throw this.createVerificationError(
            'GitHub token has expired',
            VerificationErrorCode.TOKEN_EXPIRED
          );
        }
        
        throw this.createVerificationError(
          'Authentication failed',
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      } else if (userResponse.status === 403) {
        const rateLimitInfo = this.parseRateLimitInfo(userResponse.headers);
        
        if (rateLimitInfo) {
          throw this.createVerificationError(
            'GitHub API rate limit exceeded',
            VerificationErrorCode.RATE_LIMITED,
            userResponse.status,
            rateLimitInfo
          );
        }
        
        throw this.createVerificationError(
          'Insufficient permissions or token scope',
          VerificationErrorCode.INSUFFICIENT_PERMISSIONS
        );
      } else if (userResponse.status >= 500) {
        throw this.createVerificationError(
          'GitHub service unavailable',
          VerificationErrorCode.SERVICE_UNAVAILABLE,
          userResponse.status
        );
      } else {
        const errorData = await userResponse.json().catch(() => ({}));
        throw this.createVerificationError(
          errorData.message || `HTTP ${userResponse.status}`,
          VerificationErrorCode.AUTHENTICATION_FAILED,
          userResponse.status
        );
      }
    } catch (error) {
      // Convert to GitHubVerificationResult format
      const baseResult = this.handleError(error);
      return {
        success: baseResult.success,
        error: baseResult.error
      };
    }
  }

  /**
   * Validate GitHub token format
   */
  private validateTokenFormat(token: string): boolean {
    if (!super.validateKeyFormat(token)) {
      return false;
    }

    const trimmedToken = token.trim();
    
    // GitHub tokens can be:
    // - Classic PATs: ghp_xxxx (40 chars total)
    // - Fine-grained PATs: github_pat_xxxx (longer)
    // - GitHub Apps: ghs_xxxx, ghu_xxxx, etc.
    
    const validPrefixes = ['ghp_', 'github_pat_', 'ghs_', 'ghu_', 'gho_'];
    const hasValidPrefix = validPrefixes.some(prefix => trimmedToken.startsWith(prefix));
    
    if (!hasValidPrefix) {
      return false;
    }

    // Check reasonable length (minimum 20 characters)
    if (trimmedToken.length < 20) {
      return false;
    }

    return true;
  }

  /**
   * Parse token scopes from GitHub response headers
   */
  private parseTokenScopes(headers: Headers): string[] {
    const scopesHeader = headers.get('x-oauth-scopes');
    if (!scopesHeader) {
      return [];
    }
    
    return scopesHeader
      .split(',')
      .map(scope => scope.trim())
      .filter(scope => scope.length > 0);
  }

  /**
   * Parse GitHub-specific rate limit information
   */
  private parseGitHubRateLimit(headers: Headers): { remaining: number; resetTime: Date } | undefined {
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    
    if (!remaining || !reset) {
      return undefined;
    }
    
    return {
      remaining: parseInt(remaining, 10),
      resetTime: new Date(parseInt(reset, 10) * 1000)
    };
  }

  /**
   * Get accessible repositories for the token
   */
  private async getAccessibleRepositories(token: string): Promise<GitHubVerificationResult['repositories']> {
    try {
      const reposResponse = await this.makeRequest(
        `${this.baseUrl}/user/repos?per_page=30&sort=updated`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Settings-Page-Integration'
          }
        }
      );

      if (reposResponse.status === 200) {
        const reposData = await reposResponse.json();
        
        return reposData.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          permissions: {
            admin: repo.permissions?.admin || false,
            push: repo.permissions?.push || false,
            pull: repo.permissions?.pull || false
          }
        }));
      }
    } catch (error) {
      // If we can't get repositories, it's not a fatal error
      console.warn('Failed to fetch repositories:', error);
    }
    
    return [];
  }

  /**
   * Get token expiration information if available
   */
  private async getTokenExpiration(token: string): Promise<string | undefined> {
    try {
      // For fine-grained tokens, we can check the token endpoint
      const tokenResponse = await this.makeRequest(
        `${this.baseUrl}/applications/grants`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Settings-Page-Integration'
          }
        }
      );

      if (tokenResponse.status === 200) {
        const grants = await tokenResponse.json();
        // This is a simplified approach - actual implementation may vary
        // based on GitHub's API response structure
        if (grants.length > 0 && grants[0].expires_at) {
          return grants[0].expires_at;
        }
      }
    } catch (error) {
      // Token expiration info is optional
      console.warn('Failed to fetch token expiration:', error);
    }
    
    return undefined;
  }

  /**
   * Validate required scopes for repository access
   */
  validateScopes(scopes: string[], requiredScopes: string[] = ['repo']): {
    valid: boolean;
    missing: string[];
    available: string[];
    recommendations: string[];
  } {
    const missing = requiredScopes.filter(required => !scopes.includes(required));
    const recommendations = this.getScopeRecommendations(scopes);
    
    return {
      valid: missing.length === 0,
      missing,
      available: scopes,
      recommendations
    };
  }

  /**
   * Get scope recommendations based on current scopes
   */
  private getScopeRecommendations(currentScopes: string[]): string[] {
    const recommendations: string[] = [];
    
    // Check for common scope combinations and suggest improvements
    if (!currentScopes.includes('repo') && !currentScopes.includes('public_repo')) {
      recommendations.push('Add "repo" scope for full repository access or "public_repo" for public repositories only');
    }
    
    if (!currentScopes.includes('user:email')) {
      recommendations.push('Add "user:email" scope to access user email information');
    }
    
    if (!currentScopes.includes('read:org')) {
      recommendations.push('Add "read:org" scope to access organization information');
    }
    
    return recommendations;
  }

  /**
   * Analyze repository permissions and access levels
   */
  analyzeRepositoryAccess(repositories: GitHubVerificationResult['repositories']): {
    totalCount: number;
    privateCount: number;
    publicCount: number;
    adminAccess: number;
    pushAccess: number;
    readOnlyAccess: number;
    accessSummary: string;
  } {
    if (!repositories || repositories.length === 0) {
      return {
        totalCount: 0,
        privateCount: 0,
        publicCount: 0,
        adminAccess: 0,
        pushAccess: 0,
        readOnlyAccess: 0,
        accessSummary: 'No repositories accessible with current token'
      };
    }

    const totalCount = repositories.length;
    const privateCount = repositories.filter(repo => repo.private).length;
    const publicCount = totalCount - privateCount;
    
    let adminAccess = 0;
    let pushAccess = 0;
    let readOnlyAccess = 0;
    
    repositories.forEach(repo => {
      if (repo.permissions?.admin) {
        adminAccess++;
      } else if (repo.permissions?.push) {
        pushAccess++;
      } else {
        readOnlyAccess++;
      }
    });

    const accessSummary = this.generateAccessSummary(
      totalCount, privateCount, publicCount, adminAccess, pushAccess, readOnlyAccess
    );

    return {
      totalCount,
      privateCount,
      publicCount,
      adminAccess,
      pushAccess,
      readOnlyAccess,
      accessSummary
    };
  }

  /**
   * Generate human-readable access summary
   */
  private generateAccessSummary(
    total: number, 
    privateCount: number, 
    publicCount: number, 
    admin: number, 
    push: number, 
    readOnly: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`${total} repositories accessible`);
    
    if (privateCount > 0) {
      parts.push(`${privateCount} private`);
    }
    
    if (publicCount > 0) {
      parts.push(`${publicCount} public`);
    }
    
    const permissions: string[] = [];
    if (admin > 0) permissions.push(`${admin} with admin access`);
    if (push > 0) permissions.push(`${push} with write access`);
    if (readOnly > 0) permissions.push(`${readOnly} read-only`);
    
    if (permissions.length > 0) {
      parts.push(`(${permissions.join(', ')})`);
    }
    
    return parts.join(', ');
  }

  /**
   * Check if token has sufficient permissions for common operations
   */
  checkPermissionsForOperations(scopes: string[]): {
    canReadRepos: boolean;
    canWriteRepos: boolean;
    canReadUser: boolean;
    canReadOrgs: boolean;
    canCreateRepos: boolean;
    canDeleteRepos: boolean;
    missingForFullAccess: string[];
  } {
    const hasRepo = scopes.includes('repo');
    const hasPublicRepo = scopes.includes('public_repo');
    const hasUser = scopes.includes('user');
    const hasUserEmail = scopes.includes('user:email');
    const hasReadOrg = scopes.includes('read:org');
    const hasDeleteRepo = scopes.includes('delete_repo');

    const canReadRepos = hasRepo || hasPublicRepo;
    const canWriteRepos = hasRepo;
    const canReadUser = hasUser || hasUserEmail;
    const canReadOrgs = hasReadOrg;
    const canCreateRepos = hasRepo;
    const canDeleteRepos = hasRepo && hasDeleteRepo;

    const missingForFullAccess: string[] = [];
    if (!hasRepo) missingForFullAccess.push('repo');
    if (!hasUser && !hasUserEmail) missingForFullAccess.push('user');
    if (!hasReadOrg) missingForFullAccess.push('read:org');

    return {
      canReadRepos,
      canWriteRepos,
      canReadUser,
      canReadOrgs,
      canCreateRepos,
      canDeleteRepos,
      missingForFullAccess
    };
  }

  /**
   * Validate token for specific use cases
   */
  validateForUseCase(
    scopes: string[], 
    repositories: GitHubVerificationResult['repositories'],
    useCase: 'basic' | 'development' | 'ci_cd' | 'admin'
  ): {
    suitable: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const permissions = this.checkPermissionsForOperations(scopes);
    const repoAnalysis = this.analyzeRepositoryAccess(repositories);

    switch (useCase) {
      case 'basic':
        if (!permissions.canReadRepos) {
          issues.push('Cannot read repositories');
          recommendations.push('Add "public_repo" or "repo" scope');
        }
        if (!permissions.canReadUser) {
          issues.push('Cannot read user information');
          recommendations.push('Add "user:email" scope');
        }
        break;

      case 'development':
        if (!permissions.canWriteRepos) {
          issues.push('Cannot write to repositories');
          recommendations.push('Add "repo" scope for full repository access');
        }
        if (repoAnalysis.pushAccess + repoAnalysis.adminAccess === 0) {
          issues.push('No write access to any repositories');
          recommendations.push('Ensure token has push access to target repositories');
        }
        break;

      case 'ci_cd':
        if (!permissions.canReadRepos) {
          issues.push('Cannot read repositories for CI/CD');
          recommendations.push('Add "repo" scope');
        }
        if (!scopes.includes('workflow')) {
          issues.push('Cannot manage GitHub Actions workflows');
          recommendations.push('Add "workflow" scope for GitHub Actions');
        }
        break;

      case 'admin':
        if (!permissions.canDeleteRepos) {
          issues.push('Cannot delete repositories');
          recommendations.push('Add "delete_repo" scope');
        }
        if (repoAnalysis.adminAccess === 0) {
          issues.push('No admin access to any repositories');
          recommendations.push('Ensure token has admin access to target repositories');
        }
        if (!permissions.canReadOrgs) {
          issues.push('Cannot read organization information');
          recommendations.push('Add "read:org" scope');
        }
        break;
    }

    return {
      suitable: issues.length === 0,
      issues,
      recommendations
    };
  }
}