/**
 * Materials and Assignments Service
 * Manages subject materials, assignments, and study hours tracking
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/secure-logger';

export interface Material {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'note' | 'other';
  url?: string;
  content?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  points?: number;
  grade?: number;
  submission_url?: string;
  submission_date?: string;
  notes?: string;
  reminder_date?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyHours {
  id: string;
  subject_id: string;
  user_id: string;
  date: string;
  hours: number;
  minutes: number;
  session_count: number;
  focus_score?: number;
  notes?: string;
  created_at: string;
}

class MaterialsService {
  private static instance: MaterialsService;
  
  private constructor() {}
  
  static getInstance(): MaterialsService {
    if (!MaterialsService.instance) {
      MaterialsService.instance = new MaterialsService();
    }
    return MaterialsService.instance;
  }
  
  // ============= MATERIALS METHODS =============
  
  /**
   * Fetch materials for a subject
   */
  async getMaterials(subjectId: string): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Error fetching materials:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Create a new material
   */
  async createMaterial(material: Partial<Material>): Promise<Material> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('materials')
      .insert({
        ...material,
        user_id: userData.user.id
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating material:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update a material
   */
  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating material:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data;
  }
  
  /**
   * Delete a material
   */
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Error deleting material:', error, { context: 'MaterialsService' });
      throw error;
    }
  }
  
  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<Material> {
    // First get current status
    const { data: current } = await supabase
      .from('materials')
      .select('is_favorite')
      .eq('id', id)
      .single();
    
    // Toggle the status
    const { data, error } = await supabase
      .from('materials')
      .update({ is_favorite: !current?.is_favorite })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error toggling favorite:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data;
  }
  
  /**
   * Upload material file
   */
  async uploadMaterialFile(
    file: File,
    subjectId: string
  ): Promise<{ url: string; path: string }> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.user.id}/${subjectId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('materials')
      .upload(fileName, file);
    
    if (error) {
      logger.error('Error uploading file:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from('materials')
      .getPublicUrl(fileName);
    
    return {
      url: urlData.publicUrl,
      path: data.path
    };
  }
  
  // ============= ASSIGNMENTS METHODS =============
  
  /**
   * Fetch assignments for a subject
   */
  async getAssignments(subjectId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('subject_id', subjectId)
      .order('due_date', { ascending: true });
    
    if (error) {
      logger.error('Error fetching assignments:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    // Check and update overdue assignments
    this.checkOverdueAssignments(data || []);
    
    return data || [];
  }
  
  /**
   * Get all assignments for user
   */
  async getAllAssignments(): Promise<Assignment[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('due_date', { ascending: true });
    
    if (error) {
      logger.error('Error fetching all assignments:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Get upcoming assignments
   */
  async getUpcomingAssignments(days: number = 7): Promise<Assignment[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('due_date', new Date().toISOString())
      .lte('due_date', futureDate.toISOString())
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });
    
    if (error) {
      logger.error('Error fetching upcoming assignments:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Create a new assignment
   */
  async createAssignment(assignment: Partial<Assignment>): Promise<Assignment> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        ...assignment,
        user_id: userData.user.id
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating assignment:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update an assignment
   */
  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating assignment:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data;
  }
  
  /**
   * Mark assignment as completed
   */
  async completeAssignment(
    id: string,
    submission_url?: string,
    grade?: number
  ): Promise<Assignment> {
    const updates: Partial<Assignment> = {
      status: 'completed',
      submission_date: new Date().toISOString()
    };
    
    if (submission_url) updates.submission_url = submission_url;
    if (grade !== undefined) updates.grade = grade;
    
    return this.updateAssignment(id, updates);
  }
  
  /**
   * Delete an assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Error deleting assignment:', error, { context: 'MaterialsService' });
      throw error;
    }
  }
  
  /**
   * Check and update overdue assignments
   */
  private async checkOverdueAssignments(assignments: Assignment[]) {
    const now = new Date();
    const overdueIds: string[] = [];
    
    assignments.forEach(assignment => {
      if (
        ['pending', 'in_progress'].includes(assignment.status) &&
        new Date(assignment.due_date) < now
      ) {
        overdueIds.push(assignment.id);
      }
    });
    
    if (overdueIds.length > 0) {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'overdue' })
        .in('id', overdueIds);
      
      if (error) {
        logger.error('Error updating overdue assignments:', error, { context: 'MaterialsService' });
      }
    }
  }
  
  // ============= STUDY HOURS METHODS =============
  
  /**
   * Get study hours for a subject
   */
  async getStudyHours(
    subjectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StudyHours[]> {
    let query = supabase
      .from('study_hours')
      .select('*')
      .eq('subject_id', subjectId);
    
    if (startDate) {
      query = query.gte('date', startDate.toISOString().split('T')[0]);
    }
    
    if (endDate) {
      query = query.lte('date', endDate.toISOString().split('T')[0]);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      logger.error('Error fetching study hours:', error, { context: 'MaterialsService' });
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Record study hours for a subject
   */
  async recordStudyHours(
    subjectId: string,
    hours: number,
    focusScore?: number,
    notes?: string
  ): Promise<StudyHours> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Try to update existing record for today
    const { data: existing } = await supabase
      .from('study_hours')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('date', today)
      .single();
    
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('study_hours')
        .update({
          hours: existing.hours + hours,
          minutes: existing.minutes + Math.floor(hours * 60),
          session_count: existing.session_count + 1,
          focus_score: focusScore 
            ? (existing.focus_score 
              ? (existing.focus_score + focusScore) / 2 
              : focusScore)
            : existing.focus_score,
          notes: notes || existing.notes
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('study_hours')
        .insert({
          subject_id: subjectId,
          user_id: userData.user.id,
          date: today,
          hours,
          minutes: Math.floor(hours * 60),
          session_count: 1,
          focus_score: focusScore,
          notes
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Get total study hours for a subject
   */
  async getTotalStudyHours(subjectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('study_hours')
      .select('hours')
      .eq('subject_id', subjectId);
    
    if (error) {
      logger.error('Error fetching total study hours:', error, { context: 'MaterialsService' });
      return 0;
    }
    
    return (data || []).reduce((sum, record) => sum + (record.hours || 0), 0);
  }
  
  /**
   * Get study statistics for a subject
   */
  async getStudyStatistics(subjectId: string) {
    const { data } = await supabase
      .from('study_hours')
      .select('*')
      .eq('subject_id', subjectId)
      .order('date', { ascending: false })
      .limit(30);
    
    const records = data || [];
    
    const totalHours = records.reduce((sum, r) => sum + r.hours, 0);
    const averageFocus = records.reduce((sum, r) => sum + (r.focus_score || 0), 0) / records.length || 0;
    const totalSessions = records.reduce((sum, r) => sum + r.session_count, 0);
    const studyDays = records.length;
    
    // Calculate streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < records.length; i++) {
      const recordDate = new Date(records[i].date);
      const daysDiff = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      averageFocus: Math.round(averageFocus),
      totalSessions,
      studyDays,
      currentStreak: streak,
      averagePerDay: studyDays > 0 ? Math.round((totalHours / studyDays) * 10) / 10 : 0
    };
  }
}

export const materialsService = MaterialsService.getInstance();