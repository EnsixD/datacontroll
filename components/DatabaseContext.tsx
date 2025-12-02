import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseSchema, TableName, ValidationResult } from '../types';
import { supabase, mapRecordFromDb, mapRecordToDb, mapUserToDb, mapCategoryToDb } from '../services/supabaseClient';

interface DatabaseContextType {
  db: DatabaseSchema;
  isConnected: boolean;
  isRealDbConnected: boolean; // True if Supabase is actually reachable
  lastError: string | null;
  toggleConnection: () => void;
  clearError: () => void;
  addItem: <T>(table: TableName, item: T) => Promise<void>;
  updateItem: <T>(table: TableName, id: number, item: Partial<T>) => Promise<void>;
  deleteItem: (table: TableName, id: number) => Promise<void>;
  resetDb: () => void;
  refreshData: () => Promise<void>;
}

const initialDb: DatabaseSchema = {
  users: [],
  categories: [],
  records: [],
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const validateEntry = (table: TableName, item: any): ValidationResult => {
  if (table === 'users') {
    if (!item.name || item.name.length < 2) return { valid: false, message: 'Имя должно содержать минимум 2 символа.' };
    if (!item.email || !item.email.includes('@')) return { valid: false, message: 'Некорректный адрес электронной почты.' };
  }
  if (table === 'categories') {
    if (!item.name || item.name.length < 3) return { valid: false, message: 'Название категории должно содержать минимум 3 символа.' };
  }
  if (table === 'records') {
    if (!item.title || item.title.length < 3) return { valid: false, message: 'Заголовок должен содержать минимум 3 символа.' };
    if (!item.content) return { valid: false, message: 'Содержание не может быть пустым.' };
  }
  return { valid: true };
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseSchema>(initialDb);
  // 'isConnected' is the UI Toggle for simulation
  const [isConnected, setIsConnected] = useState(true); 
  // 'isRealDbConnected' tracks actual Supabase health
  const [isRealDbConnected, setIsRealDbConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const [usersRes, catsRes, recordsRes] = await Promise.all([
        supabase.from('users').select('*').order('id'),
        supabase.from('categories').select('*').order('id'),
        supabase.from('records').select('*').order('id')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (catsRes.error) throw catsRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setDb({
        users: usersRes.data || [],
        categories: catsRes.data || [],
        records: (recordsRes.data || []).map(mapRecordFromDb)
      });
      setIsRealDbConnected(true);
      setLastError(null);
    } catch (e: any) {
      console.error("Supabase Fetch Error:", e);
      setIsRealDbConnected(false);
      
      const msg = e.message || e.error_description || JSON.stringify(e);
      const code = e.code || "";

      // 42P01 is PostgreSQL code for "undefined_table"
      if (code === '42P01' || (typeof msg === 'string' && msg.includes('does not exist'))) {
         setLastError("БАЗА ДАННЫХ ПУСТА (Код 42P01). Таблицы не найдены. Пожалуйста, перейдите в 'SQL Лаборатория', сгенерируйте код и выполните его в панели Supabase.");
      } else {
         setLastError(`Ошибка подключения к Supabase: ${msg}`);
      }
    }
  };

  // Initial Fetch
  useEffect(() => {
    refreshData();
  }, []);

  const toggleConnection = () => {
    setIsConnected(prev => !prev);
    setLastError(null);
  };

  const clearError = () => setLastError(null);

  const addItem = async <T,>(table: TableName, item: T) => {
    setLastError(null);
    
    // 1. Simulation Check
    if (!isConnected) {
      const err = "ОШИБКА СОЕДИНЕНИЯ (Симуляция): Связь с сервером потеряна. Проверьте статус 'Онлайн'.";
      setLastError(err);
      throw new Error(err);
    }

    // 2. Validation
    const validation = validateEntry(table, item);
    if (!validation.valid) {
      setLastError(`ОШИБКА ВАЛИДАЦИИ: ${validation.message}`);
      throw new Error(validation.message);
    }

    // 3. Real DB Operation
    try {
      let dbItem;
      if (table === 'records') dbItem = mapRecordToDb(item);
      else if (table === 'users') dbItem = mapUserToDb(item);
      else if (table === 'categories') dbItem = mapCategoryToDb(item);

      const { error } = await supabase.from(table).insert(dbItem);
      
      if (error) throw error;
      
      // Refresh local state
      await refreshData();

    } catch (e: any) {
      console.error("Add Item Error:", e);
      
      // Handle RLS Policy Violation (42501)
      if (e.code === '42501' || e.message?.includes('row-level security')) {
         const friendlyMsg = "ОШИБКА ДОСТУПА (RLS): Supabase блокирует добавление данных. Перейдите в 'SQL Лаборатория', сгенерируйте код (в нем есть команда отключения защиты) и выполните его в Supabase.";
         setLastError(friendlyMsg);
         throw new Error(friendlyMsg);
      }

      const msg = e.message || JSON.stringify(e);
      setLastError(`DB Error: ${msg}`);
      throw new Error(msg);
    }
  };

  const updateItem = async <T,>(table: TableName, id: number, updates: Partial<T>) => {
    setLastError(null);
    
    if (!isConnected) {
       const err = "ОШИБКА СОЕДИНЕНИЯ (Симуляция): Связь с сервером потеряна.";
       setLastError(err);
       throw new Error(err);
    }

    try {
       let dbUpdates: any = { ...updates };
       
       if (table === 'records') {
          if ('userId' in updates) { dbUpdates.user_id = (updates as any).userId; delete dbUpdates.userId; }
          if ('categoryId' in updates) { dbUpdates.category_id = (updates as any).categoryId; delete dbUpdates.categoryId; }
          if ('createdAt' in updates) { dbUpdates.created_at = (updates as any).createdAt; delete dbUpdates.createdAt; }
       }

       const { error } = await supabase.from(table).update(dbUpdates).eq('id', id);
       if (error) throw error;
       
       await refreshData();
    } catch (e: any) {
      console.error("Update Item Error:", e);
      
      // Handle RLS Policy Violation (42501)
      if (e.code === '42501' || e.message?.includes('row-level security')) {
         const friendlyMsg = "ОШИБКА ДОСТУПА (RLS): Supabase блокирует изменение данных. Обновите структуру БД через 'SQL Лаборатория'.";
         setLastError(friendlyMsg);
         throw new Error(friendlyMsg);
      }

      const msg = e.message || JSON.stringify(e);
      setLastError(`DB Error: ${msg}`);
      throw new Error(msg);
    }
  };

  const deleteItem = async (table: TableName, id: number) => {
    setLastError(null);
    if (!isConnected) {
      const err = "ОШИБКА СОЕДИНЕНИЯ (Симуляция): Связь с сервером потеряна.";
      setLastError(err);
      throw new Error(err);
    }

    try {
      // We use .select() to get the deleted rows. 
      // If RLS blocks deletion, or if the ID doesn't exist, 'data' will be empty or null.
      const { error, data } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        throw new Error("Запись не была удалена. Возможно, включена политика защиты (RLS) в Supabase, запись уже удалена, или произошла тихая ошибка.");
      }

      await refreshData();
    } catch (e: any) {
       console.error("Delete Item Error:", e);
       const msg = e.message || JSON.stringify(e);
       
       // Handle Foreign Key Violation
       if (e.code === '23503') {
           const friendlyMsg = "Невозможно удалить запись: на неё ссылаются другие данные (например, у пользователя есть записи). Удалите зависимые записи вручную или обновите структуру БД (ON DELETE CASCADE).";
           setLastError(friendlyMsg);
           throw new Error(friendlyMsg);
       }
       
       // Handle RLS Policy Violation (42501)
       if (e.code === '42501' || e.message?.includes('row-level security')) {
         const friendlyMsg = "ОШИБКА ДОСТУПА (RLS): Supabase блокирует удаление. Обновите структуру БД через 'SQL Лаборатория', чтобы отключить RLS.";
         setLastError(friendlyMsg);
         throw new Error(friendlyMsg);
      }

       setLastError(`DB Ошибка удаления: ${msg}`);
       throw new Error(msg);
    }
  };

  const resetDb = () => {
    setLastError("Внимание: Вы подключены к реальной БД Supabase. Функция 'Сброс' отключена во избежание потери данных. Используйте удаление вручную.");
    refreshData(); 
  }

  return (
    <DatabaseContext.Provider value={{ db, isConnected, isRealDbConnected, lastError, toggleConnection, clearError, addItem, updateItem, deleteItem, resetDb, refreshData }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
};