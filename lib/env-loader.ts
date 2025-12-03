import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Load environment variables from shared docker/.env if available,
 * otherwise fall back to local .env file.
 *
 * This allows the chat application to use centralized configuration
 * when running within the webroot structure.
 */
export function loadEnvironment() {
  // Use process.cwd() to get project root (works in both dev and build)
  const projectRoot = process.cwd();

  // Path to shared docker/.env (relative to project root)
  const dockerEnvPath = resolve(projectRoot, '../webroot/docker/.env');

  // Path to local .env (project root)
  const localEnvPath = resolve(projectRoot, '.env');

  // Try to load from docker/.env first
  if (existsSync(dockerEnvPath)) {
    console.log('[env-loader] Loading environment from shared docker/.env');
    config({ path: dockerEnvPath });
    return dockerEnvPath;
  }

  // Fall back to local .env
  if (existsSync(localEnvPath)) {
    console.log('[env-loader] Loading environment from local .env');
    config({ path: localEnvPath });
    return localEnvPath;
  }

  console.log('[env-loader] No .env file found, using system environment variables');
  return null;
}

// Auto-load when this module is imported
loadEnvironment();
