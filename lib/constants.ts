export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

// TODO: Remove guest regex when implementing Supabase auth (no guest mode)
export const guestRegex = /^guest-\d+$/;

// TODO: Remove DUMMY_PASSWORD when implementing Supabase auth (NextAuth specific)
// export const DUMMY_PASSWORD = generateDummyPassword();
