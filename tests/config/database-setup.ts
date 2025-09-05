/**
 * Test Database Setup
 * Manages test database initialization and cleanup
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client for database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function setupTestDatabase() {
  console.log('🗄️  Initializing test database...');

  try {
    // 1. Clean existing test data
    await cleanupTestData();

    // 2. Insert test data fixtures
    await insertTestFixtures();

    console.log('✅ Test database setup completed');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  console.log('🗄️  Cleaning up test database...');

  try {
    await cleanupTestData();
    console.log('✅ Test database cleanup completed');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Clean up all test data
 */
async function cleanupTestData() {
  // Order matters due to foreign key constraints
  const tables = [
    'study_sessions',
    'flashcards',
    'assignments',
    'tasks',
    'goals',
    'timetable_entries',
    'subjects',
    'profiles',
    // Don't delete users as they might be system users
  ];

  for (const table of tables) {
    try {
      // Delete test data (keep system data)
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .like('id', 'test-%'); // Only delete test records with test- prefix

      if (error) {
        console.warn(`⚠️  Warning cleaning ${table}:`, error.message);
      } else {
        console.log(`✅ Cleaned table: ${table}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to clean ${table}:`, error.message);
    }
  }
}

/**
 * Insert test fixtures
 */
async function insertTestFixtures() {
  console.log('📋 Inserting test fixtures...');

  try {
    // Test subjects
    const testSubjects = [
      {
        id: 'test-subject-math',
        name: 'Mathematics',
        code: 'MATH101',
        color: '#3B82F6',
        icon: '📐',
        credits: 3,
        instructor: 'Dr. Smith',
        room: 'Room 101',
      },
      {
        id: 'test-subject-science',
        name: 'Computer Science',
        code: 'CS101',
        color: '#10B981',
        icon: '💻',
        credits: 4,
        instructor: 'Prof. Johnson',
        room: 'Lab 201',
      },
    ];

    for (const subject of testSubjects) {
      const { error } = await supabaseAdmin
        .from('subjects')
        .upsert(subject);
      
      if (error) {
        console.warn('⚠️  Warning inserting subject:', error.message);
      }
    }

    // Test tasks
    const testTasks = [
      {
        id: 'test-task-1',
        title: 'Complete Chapter 1 Reading',
        description: 'Read and summarize Chapter 1 of the textbook',
        priority: 'medium',
        status: 'pending',
        subject_id: 'test-subject-math',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'test-task-2',
        title: 'Programming Assignment',
        description: 'Complete the sorting algorithms assignment',
        priority: 'high',
        status: 'in_progress',
        subject_id: 'test-subject-science',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const task of testTasks) {
      const { error } = await supabaseAdmin
        .from('tasks')
        .upsert(task);
      
      if (error) {
        console.warn('⚠️  Warning inserting task:', error.message);
      }
    }

    // Test goals
    const testGoals = [
      {
        id: 'test-goal-1',
        title: 'Improve Math Grade',
        description: 'Get at least 85% in all math assignments',
        target_value: 85,
        current_value: 75,
        unit: 'percentage',
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'academic',
      },
      {
        id: 'test-goal-2',
        title: 'Study Consistency',
        description: 'Study for at least 2 hours every day',
        target_value: 14, // 2 hours × 7 days
        current_value: 8,
        unit: 'hours',
        target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'habit',
      },
    ];

    for (const goal of testGoals) {
      const { error } = await supabaseAdmin
        .from('goals')
        .upsert(goal);
      
      if (error) {
        console.warn('⚠️  Warning inserting goal:', error.message);
      }
    }

    console.log('✅ Test fixtures inserted successfully');

  } catch (error) {
    console.error('❌ Failed to insert test fixtures:', error);
    throw error;
  }
}

/**
 * Get test data for use in tests
 */
export function getTestData() {
  return {
    subjects: [
      {
        id: 'test-subject-math',
        name: 'Mathematics',
        code: 'MATH101',
      },
      {
        id: 'test-subject-science',
        name: 'Computer Science',
        code: 'CS101',
      },
    ],
    tasks: [
      {
        id: 'test-task-1',
        title: 'Complete Chapter 1 Reading',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'test-task-2',
        title: 'Programming Assignment',
        priority: 'high',
        status: 'in_progress',
      },
    ],
    goals: [
      {
        id: 'test-goal-1',
        title: 'Improve Math Grade',
        target_value: 85,
        current_value: 75,
      },
      {
        id: 'test-goal-2',
        title: 'Study Consistency',
        target_value: 14,
        current_value: 8,
      },
    ],
  };
}