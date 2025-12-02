import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uhrsyrkreedalhiwxjtj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVocnN5cmtyZWVkYWxoaXd4anRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Njk5NTUsImV4cCI6MjA4MDI0NTk1NX0.sBOzqsX6nF4QG5g-kg_ZLGWw5qyhCdjgou_Al18qc7Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helpers to map between App (CamelCase) and DB (Snake_Case)

export const mapRecordFromDb = (record: any) => ({
  id: record.id,
  title: record.title,
  content: record.content,
  userId: record.user_id, // Map snake_case to camelCase
  categoryId: record.category_id,
  createdAt: record.created_at
});

export const mapRecordToDb = (item: any) => ({
  title: item.title,
  content: item.content,
  user_id: item.userId,
  category_id: item.categoryId,
  // created_at is usually handled by default value in DB, but we pass it if it exists
  ...(item.createdAt ? { created_at: item.createdAt } : {})
});

// Users and Categories usually match 1:1 except for created_at which we don't strictly use in UI for them
export const mapUserToDb = (item: any) => ({
  name: item.name,
  email: item.email,
  role: item.role
});

export const mapCategoryToDb = (item: any) => ({
  name: item.name,
  description: item.description
});