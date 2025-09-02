import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Error: SUPABASE_ANON_KEY environment variable is not set');
  console.log('Please set the environment variable before running this script.');
  console.log('Example: SUPABASE_ANON_KEY="your-key" node setup-storage.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupStorage() {
  console.log('🚀 Setting up storage buckets...');
  
  try {
    // Create avatars bucket
    console.log('\n📦 Creating avatars bucket...');
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage
      .createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      });
    
    if (avatarsError && !avatarsError.message.includes('already exists')) {
      console.error('❌ Error creating avatars bucket:', avatarsError);
    } else if (avatarsError && avatarsError.message.includes('already exists')) {
      console.log('✅ Avatars bucket already exists');
    } else {
      console.log('✅ Avatars bucket created successfully');
    }
    
    // Create study-materials bucket
    console.log('\n📦 Creating study-materials bucket...');
    const { data: materialsBucket, error: materialsError } = await supabase.storage
      .createBucket('study-materials', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf', 'image/*', 'text/*', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });
    
    if (materialsError && !materialsError.message.includes('already exists')) {
      console.error('❌ Error creating study-materials bucket:', materialsError);
    } else if (materialsError && materialsError.message.includes('already exists')) {
      console.log('✅ Study-materials bucket already exists');
    } else {
      console.log('✅ Study-materials bucket created successfully');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 IMPORTANT: Manual Configuration Required');
    console.log('='.repeat(60));
    console.log('\nSince we cannot create storage buckets programmatically with');
    console.log('the anon key, please follow these steps:\n');
    console.log('1. Go to your Supabase dashboard:');
    console.log('   https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/storage/buckets\n');
    console.log('2. Create a new bucket called "avatars":');
    console.log('   - Name: avatars');
    console.log('   - Public: Yes (enable public access)');
    console.log('   - File size limit: 5MB');
    console.log('   - Allowed MIME types: image/*\n');
    console.log('3. Create RLS policies for the avatars bucket:');
    console.log('   - Allow authenticated users to upload their own avatars');
    console.log('   - Allow public to view all avatars\n');
    console.log('4. (Optional) Create a "study-materials" bucket:');
    console.log('   - Name: study-materials');
    console.log('   - Public: No');
    console.log('   - File size limit: 50MB\n');
    console.log('This will fix the 404 error when uploading avatars!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error setting up storage:', error);
  }
}

// Run the setup
setupStorage().catch(console.error);