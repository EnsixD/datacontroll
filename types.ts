export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface RecordItem {
  id: number;
  title: string;
  content: string;
  userId: number; // Foreign Key to User
  categoryId: number; // Foreign Key to Category
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  records: RecordItem[];
}

export type TableName = keyof DatabaseSchema;

export interface ValidationResult {
  valid: boolean;
  message?: string;
}