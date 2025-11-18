/**
 * Database testing helpers
 * Provides utilities for setting up and tearing down test data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

/**
 * Create a Supabase client for testing with service role key
 */
export function createTestSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Create a test user for authentication tests
 */
export async function createTestUser(email: string, password: string) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user;
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string) {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

/**
 * Clean up all test data from a table
 */
export async function cleanupTable(tableName: string) {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except system records

  if (error) throw error;
}

/**
 * Create a test chat
 */
export async function createTestChat(userId: string, title: string = 'Test Chat') {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase
    .from('Chat')
    .insert({
      userId,
      title,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test message
 */
export async function createTestMessage(chatId: string, role: 'user' | 'assistant', content: string) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase
    .from('Message_v2')
    .insert({
      chatId,
      role,
      content: { type: 'text', text: content },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test document
 */
export async function createTestDocument(
  chatId: string,
  userId: string,
  title: string,
  kind: 'text' | 'code',
  content: string
) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase
    .from('Document')
    .insert({
      chatId,
      userId,
      title,
      kind,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
