/**
 * API key verification services
 */

export * from "./anthropic-verification-service";
export { BaseVerificationService } from "./base-verification-service";
export * from "./github-verification-service";
export * from "./google-verification-service";
export * from "./openai-verification-service";
export * from "./types";

// Convenience factory function for API key services
export function createVerificationService(
  provider: "google" | "anthropic" | "openai"
) {
  switch (provider) {
    case "google": {
      const {
        GoogleVerificationService,
      } = require("./google-verification-service");
      return new GoogleVerificationService();
    }
    case "anthropic": {
      const {
        AnthropicVerificationService,
      } = require("./anthropic-verification-service");
      return new AnthropicVerificationService();
    }
    case "openai": {
      const {
        OpenAIVerificationService,
      } = require("./openai-verification-service");
      return new OpenAIVerificationService();
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// GitHub verification service factory
export function createGitHubVerificationService() {
  const {
    GitHubVerificationService,
  } = require("./github-verification-service");
  return new GitHubVerificationService();
}
