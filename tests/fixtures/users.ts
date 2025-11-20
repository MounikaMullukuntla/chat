/**
 * Test fixtures for users
 */

export const testUsers = {
  regularUser: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "user@test.com",
    password: "TestPassword123!",
    raw_user_meta_data: {
      role: "user",
      isActive: true,
    },
  },
  adminUser: {
    id: "550e8400-e29b-41d4-a716-446655440002",
    email: "admin@test.com",
    password: "AdminPassword123!",
    raw_user_meta_data: {
      role: "admin",
      isActive: true,
    },
  },
  inactiveUser: {
    id: "550e8400-e29b-41d4-a716-446655440003",
    email: "inactive@test.com",
    password: "InactivePassword123!",
    raw_user_meta_data: {
      role: "user",
      isActive: false,
    },
  },
};
