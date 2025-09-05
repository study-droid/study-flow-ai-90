/**
 * Test User Setup
 * Creates and manages test users for E2E testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client for user operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
  profile?: {
    display_name: string;
    full_name: string;
    setup_completed: boolean;
  };
}

export const TEST_USERS: Record<string, TestUser> = {
  regular: {
    id: 'test-user-regular',
    email: process.env.TEST_USER_EMAIL || 'test@studyflow.ai',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    profile: {
      display_name: 'Test User',
      full_name: 'Test Regular User',
      setup_completed: true,
    },
  },
  admin: {
    id: 'test-user-admin',
    email: process.env.TEST_ADMIN_EMAIL || 'admin@studyflow.ai',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    profile: {
      display_name: 'Test Admin',
      full_name: 'Test Admin User',
      setup_completed: true,
    },
  },
  new_user: {
    id: 'test-user-new',
    email: 'newuser@studyflow.ai',
    password: 'NewUserPassword123!',
    profile: {
      display_name: 'New User',
      full_name: 'Test New User',
      setup_completed: false,
    },
  },
};

export async function createTestUsers() {
  console.log('👤 Creating test users...');

  try {
    for (const [key, user] of Object.entries(TEST_USERS)) {
      await createTestUser(user, key);
    }

    console.log('✅ All test users created successfully');

  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  }
}

async function createTestUser(user: TestUser, userType: string) {
  try {
    console.log(`👤 Creating test user ${userType}: ${user.email}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users?.find(u => u.email === user.email);
    
    if (existingUser) {
      console.log(`👤 Test user ${userType} already exists: ${user.email}`);
      
      // Update profile if needed
      if (user.profile) {
        await createUserProfile(existingUser.id, user.profile);
      }
      
      return existingUser;
    }

    // Create new user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Skip email confirmation in tests
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Created test user ${userType}: ${user.email}`);

    // Create user profile
    if (user.profile && data.user) {
      await createUserProfile(data.user.id, user.profile);
    }

    return data.user;

  } catch (error) {
    console.error(`❌ Failed to create user ${userType}:`, error);
    throw error;
  }
}

async function createUserProfile(userId: string, profileData: TestUser['profile']) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        user_id: userId,
        display_name: profileData?.display_name,
        full_name: profileData?.full_name,
        setup_completed: profileData?.setup_completed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Created profile for user: ${userId}`);

  } catch (error) {
    console.error('❌ Failed to create user profile:', error);
    throw error;
  }
}

async function updateUserProfile(userId: string, profileData: TestUser['profile']) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: profileData?.display_name,
        full_name: profileData?.full_name,
        setup_completed: profileData?.setup_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log(`✅ Updated profile for user: ${userId}`);

  } catch (error) {
    console.error('❌ Failed to update user profile:', error);
    throw error;
  }
}

/**
 * Clean up test users (optional - usually not needed)
 */
export async function cleanupTestUsers() {
  console.log('👤 Cleaning up test users...');

  try {
    for (const user of Object.values(TEST_USERS)) {
      try {
        // List all users and find by email
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users?.find(u => u.email === user.email);
        
        if (existingUser) {
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          console.log(`✅ Deleted test user: ${user.email}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to delete user ${user.email}:`, error.message);
      }
    }

    console.log('✅ Test users cleanup completed');

  } catch (error) {
    console.error('❌ Failed to cleanup test users:', error);
    throw error;
  }
}

/**
 * Get test user credentials for specific test scenarios
 */
export function getTestUserCredentials(userType: keyof typeof TEST_USERS = 'regular') {
  const user = TEST_USERS[userType];
  
  if (!user) {
    throw new Error(`Test user type '${userType}' not found`);
  }

  return {
    email: user.email,
    password: user.password,
    profile: user.profile,
  };
}