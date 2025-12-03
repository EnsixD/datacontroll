import { DatabaseSchema } from "../types";

const API_KEY = "YOUR API KEY FROM A4F";
const BASE_URL = "https://api.a4f.co/v1/chat/completions";
const MODEL_NAME = "provider-5/gpt-4.1-mini";

async function callAI(prompt: string): Promise<string> {
  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw error;
  }
}

export const generateSQLQueries = async (
  schema: DatabaseSchema
): Promise<string> => {
  const prompt = `
    Ты эксперт по PostgreSQL и Supabase.

    Задача: Сгенерировать SQL-скрипт для инициализации базы данных для этого учебного приложения.

    Необходимая схема таблиц:
    1. users (id SERIAL PRIMARY KEY, name TEXT, email TEXT, role TEXT)
    2. categories (id SERIAL PRIMARY KEY, name TEXT, description TEXT)
    3. records (id SERIAL PRIMARY KEY, title TEXT, content TEXT, user_id INTEGER, category_id INTEGER, created_at TIMESTAMP DEFAULT NOW())

    ВАЖНОЕ ТРЕБОВАНИЕ 1: Добавь "ON DELETE CASCADE" к внешним ключам (records.user_id и records.category_id). Это обязательно, чтобы при удалении пользователя не возникало ошибок Foreign Key Constraint.

    ВАЖНОЕ ТРЕБОВАНИЕ 2: Для каждой таблицы добавь команду "ALTER TABLE ... DISABLE ROW LEVEL SECURITY;".
    В Supabase по умолчанию RLS включен, что блокирует INSERT/UPDATE/DELETE для анонимных пользователей.
    Мы ОБЯЗАНЫ отключить RLS, чтобы учебное приложение заработало без настройки сложных политик.

    Обрати внимание на naming convention: в React приложении мы используем camelCase (userId), но в Postgres мы используем snake_case (user_id).

    Сгенерируй одним блоком:
    1. -- Комментарий: ВНИМАНИЕ! Выполните этот скрипт, чтобы исправить ошибку "violates row-level security policy".
    2. DROP TABLE IF EXISTS ... CASCADE;
    3. CREATE TABLE ...
    4. ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
    5. INSERT тестовые данные.

    Выведи ТОЛЬКО чистый SQL код без markdown-обертки.
    Добавь комментарии на русском.
  `;

  try {
    let text = await callAI(prompt);
    // Clean up markdown code blocks if present
    text = text
      .replace(/```sql/g, "")
      .replace(/```/g, "")
      .trim();
    return text || "-- Нет ответа от ИИ";
  } catch (error: any) {
    return `-- Ошибка вызова AI Service: ${error.message}`;
  }
};

export const generateDocumentation = async (
  schema: DatabaseSchema
): Promise<string> => {
  const prompt = `
    Ты технический писатель. Напиши документацию для системы «Учет данных» (Supabase Edition) на русском языке.

    Структурируй ответ в формате Markdown с использованием Таблиц.

    # Документация системы

    ## 1. Архитектура
    Приложение подключено к облачной базе данных **Supabase (PostgreSQL)**.
    Frontend взаимодействует с БД через библиотеку \`@supabase/supabase-js\`.

    ## 2. Структура Базы Данных (PostgreSQL)
    Опиши 3 таблицы, используя snake_case для полей (так как это Postgres).

    **Таблица: users**
    | Поле | Тип | Описание |
    |---|---|---|
    | id | SERIAL | PK |
    | name | TEXT | Имя |
    | email | TEXT | Почта |
    | role | TEXT | Роль |

    (Опиши так же categories и records, указав Foreign Keys для records: user_id, category_id).

    ## 3. Режимы работы
    Приложение поддерживает симуляцию разрыва соединения для учебных целей.

    **Онлайн режим:**
    Запросы отправляются напрямую в Supabase.

    **Оффлайн режим (Тестовый):**
    При переключении тумблера в положение "Оффлайн", приложение программно блокирует любые попытки записи (INSERT/UPDATE/DELETE), выбрасывая ошибку, даже если интернет есть.

    ## 4. Решение проблем (Troubleshooting)
    * **Ошибка "violates row-level security policy"**:
      Означает, что в базе данных включена защита, но нет правил. Решение: Зайдите в SQL Лабораторию, сгенерируйте код и выполните его в Supabase. Это отключит RLS.
    * **Ошибка удаления (Foreign Key)**:
      Означает, что удаляемый объект используется в других таблицах. Решение: Обновите БД скриптом с \`ON DELETE CASCADE\`.

    Пиши четко и профессионально.
  `;

  try {
    return await callAI(prompt);
  } catch (error: any) {
    return `# Ошибка\n\nНе удалось сгенерировать документацию: ${error.message}`;
  }
};
