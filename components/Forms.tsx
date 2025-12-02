import React, { useState } from 'react';
import { User, Category, RecordItem } from '../types';
import { useDatabase } from './DatabaseContext';

// Minimalist Input Style
const inputClass = "mt-1 block w-full rounded-lg border-2 border-zinc-200 bg-white text-zinc-900 px-4 py-2.5 shadow-sm transition-all duration-200 focus:border-black focus:ring-0 focus:outline-none placeholder-zinc-400 hover:border-zinc-300";
const labelClass = "block text-sm font-semibold text-zinc-700 mb-1";
const errorClass = "bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 animate-fade-in-up mb-4";
const buttonClass = "w-full bg-black text-white py-3 rounded-lg hover:bg-zinc-800 active:scale-[0.98] transition-all duration-200 font-bold shadow-lg shadow-zinc-200/50";

// --- User Form ---
interface UserFormProps {
  initialData?: User;
  onClose: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ initialData, onClose }) => {
  const { addItem, updateItem } = useDatabase();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'Viewer',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (initialData?.id) {
        updateItem('users', initialData.id, formData);
      } else {
        addItem('users', formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={errorClass}>{error}</div>}
      <div>
        <label className={labelClass}>ФИО</label>
        <input required type="text" placeholder="Иван Иванов" className={inputClass}
          value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input required type="email" placeholder="ivan@example.com" className={inputClass}
          value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Роль</label>
        <div className="relative">
          <select className={`${inputClass} appearance-none`}
            value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
            <option value="Admin">Администратор</option>
            <option value="Editor">Редактор</option>
            <option value="Viewer">Читатель</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
          </div>
        </div>
      </div>
      <button type="submit" className={buttonClass}>
        Сохранить
      </button>
    </form>
  );
};

// --- Category Form ---
interface CategoryFormProps {
  initialData?: Category;
  onClose: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onClose }) => {
  const { addItem, updateItem } = useDatabase();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (initialData?.id) {
        updateItem('categories', initialData.id, formData);
      } else {
        addItem('categories', formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={errorClass}>{error}</div>}
      <div>
        <label className={labelClass}>Название категории</label>
        <input required type="text" placeholder="Например: Работа" className={inputClass}
          value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Описание</label>
        <textarea required rows={3} placeholder="Краткое описание..." className={inputClass}
          value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <button type="submit" className={buttonClass}>
        Сохранить
      </button>
    </form>
  );
};

// --- Record Form ---
interface RecordFormProps {
  initialData?: RecordItem;
  onClose: () => void;
}

export const RecordForm: React.FC<RecordFormProps> = ({ initialData, onClose }) => {
  const { db, addItem, updateItem } = useDatabase();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RecordItem>>({
    title: '',
    content: '',
    userId: db.users[0]?.id || 0,
    categoryId: db.categories[0]?.id || 0,
    createdAt: new Date().toISOString().split('T')[0],
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (initialData?.id) {
        updateItem('records', initialData.id, formData);
      } else {
        addItem('records', formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={errorClass}>{error}</div>}
      <div>
        <label className={labelClass}>Заголовок</label>
        <input required type="text" placeholder="Введите заголовок" className={inputClass}
          value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Содержание</label>
        <textarea required rows={4} placeholder="Текст записи..." className={inputClass}
          value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Пользователь</label>
          <div className="relative">
            <select className={`${inputClass} appearance-none`}
              value={formData.userId} onChange={e => setFormData({ ...formData, userId: Number(e.target.value) })}>
              {db.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Категория</label>
          <div className="relative">
            <select className={`${inputClass} appearance-none`}
              value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}>
              {db.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Дата создания</label>
        <input required type="date" className={inputClass}
          value={formData.createdAt} onChange={e => setFormData({ ...formData, createdAt: e.target.value })} />
      </div>

      <button type="submit" className={buttonClass}>
        Сохранить
      </button>
    </form>
  );
};