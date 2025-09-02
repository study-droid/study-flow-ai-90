import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validateInput, profileSchema, sanitizeInput } from '@/lib/validation';
import { validateFile, sanitizeFilename } from '@/lib/file-validation';
import defaultAvatarImage from '@/assets/avatar_profile.png';
import { logger } from '@/services/logging/logger';

interface Profile {
  id: string;
  user_id: string;
  email?: string;
  display_name: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  bio?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  university?: string | null;
  major?: string | null;
  study_streak: number;
  total_study_time: number;
  preferred_session_length: number;
  current_semester?: string | null;
  setup_completed?: boolean | null;
  academic_year?: string | null;
  location?: string | null;
  website?: string | null;
  social_links?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  preferences?: {
    show_profile_public?: boolean;
    show_achievements?: boolean;
    show_study_stats?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // If no profile exists, create one
      if (!data) {
        
        const newProfile = {
          id: user.id,  // Add the id field that matches auth user id
          user_id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0] || 'Student',
          avatar_url: defaultAvatarImage,  // Set default avatar for new accounts
          study_streak: 0,
          total_study_time: 0,
          preferred_session_length: 25,
          setup_completed: null  // Explicitly set to null so new users see onboarding
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;

        // Use the created profile directly (should already have setup_completed: null)
        setProfile(createdProfile);
      } else {

        setProfile(data);
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        logger.error('Profile load error:', { message: error.message }, 'UseProfile');
      }
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    setUpdating(true);

    // Remove read-only fields
    const { id, user_id, created_at, updated_at, ...updateData } = updates as unknown;

    // Sanitize text fields
    const sanitizedUpdates = {
      ...updateData,
      display_name: updateData.display_name ? sanitizeInput.text(updateData.display_name) : undefined,
      full_name: updateData.full_name ? sanitizeInput.text(updateData.full_name) : undefined,
      bio: updateData.bio ? sanitizeInput.text(updateData.bio) : undefined,
      university: updateData.university ? sanitizeInput.text(updateData.university) : undefined,
      major: updateData.major ? sanitizeInput.text(updateData.major) : undefined,
      location: updateData.location ? sanitizeInput.text(updateData.location) : undefined,
    };

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let data;
      let error;

      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from('profiles')
          .update(sanitizedUpdates)
          .eq('user_id', user.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Create new profile
        const result = await supabase
          .from('profiles')
          .insert([{
            id: user.id,  // Add the id field that matches auth user id
            user_id: user.id,
            email: user.email,
            avatar_url: defaultAvatarImage,  // Set default avatar for new accounts
            ...sanitizedUpdates
          }])
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        throw error;
      }

      setProfile(data);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        logger.error('Profile update error:', { message: error.message }, 'UseProfile');
      }
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      // Validate file before upload
      const validation = validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB max for avatars
        category: 'images'
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      // Use sanitized filename
      const sanitizedName = validation.sanitizedFilename || sanitizeFilename(file.name);
      const fileExt = sanitizedName.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const result = await updateProfile({ avatar_url: publicUrl });
      
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated successfully.",
      });
      
      return result;
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        logger.error('Avatar upload error:', { message: error.message }, 'UseProfile');
      }
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile,
  };
};