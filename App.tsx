import React, { useState } from "react";
import {
  Database,
  Users,
  Tags,
  FileText,
  Code,
  BookOpen,
  Wifi,
  WifiOff,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  LayoutGrid,
  Info,
  ChevronRight,
  Terminal,
  Copy,
  Check,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { DatabaseProvider, useDatabase } from "./components/DatabaseContext";
import { UserForm, CategoryForm, RecordForm } from "./components/Forms";
import { Modal } from "./components/Modal";
import {
  generateSQLQueries,
  generateDocumentation,
} from "./services/aiService";

// --- Utils & Custom Renderers ---

// 1. Advanced SQL Syntax Highlighter
const SqlHighlighter = ({ code }: { code: string }) => {
  if (!code) return null;

  const lines = code.split("\n");

  const colorizeLine = (line: string) => {
    // 1. Handle Comments (Whole line or end of line)
    const commentIndex = line.indexOf("--");
    let codePart = line;
    let commentPart = "";

    if (commentIndex !== -1) {
      codePart = line.substring(0, commentIndex);
      commentPart = line.substring(commentIndex);
    }

    // 2. Tokenize Code Part
    // Split by delimiters: strings, spaces, punctuation
    const tokens = codePart.split(/('.*?'|\b\d+\b|[(),;=<>*]|\s+)/g);

    const renderedTokens = tokens.map((token, i) => {
      if (!token) return null;

      const upper = token.toUpperCase();

      // SQL Keywords
      const keywords = [
        "SELECT",
        "FROM",
        "WHERE",
        "INSERT",
        "INTO",
        "VALUES",
        "UPDATE",
        "SET",
        "DELETE",
        "CREATE",
        "TABLE",
        "JOIN",
        "ON",
        "AND",
        "OR",
        "ORDER",
        "BY",
        "LIMIT",
        "PRIMARY",
        "KEY",
        "FOREIGN",
        "REFERENCES",
        "NOT",
        "NULL",
        "AS",
        "GROUP",
        "HAVING",
        "DISTINCT",
        "UNION",
        "ALL",
        "INNER",
        "LEFT",
        "RIGHT",
        "DROP",
        "ALTER",
        "ADD",
        "CONSTRAINT",
        "DEFAULT",
      ];

      // SQL Data Types & Functions
      const typesAndFuncs = [
        "INT",
        "INTEGER",
        "VARCHAR",
        "TEXT",
        "SERIAL",
        "TIMESTAMP",
        "DATE",
        "BOOLEAN",
        "COUNT",
        "SUM",
        "AVG",
        "MAX",
        "MIN",
        "NOW",
        "COALESCE",
      ];

      if (keywords.includes(upper)) {
        return (
          <span key={i} className="text-[#ff79c6] font-bold">
            {token}
          </span>
        ); // Pink/Purple for keywords
      } else if (typesAndFuncs.includes(upper)) {
        return (
          <span key={i} className="text-[#8be9fd] italic">
            {token}
          </span>
        ); // Cyan for types/funcs
      } else if (token.match(/^\d+$/)) {
        return (
          <span key={i} className="text-[#bd93f9]">
            {token}
          </span>
        ); // Purple for numbers
      } else if (token.startsWith("'") && token.endsWith("'")) {
        return (
          <span key={i} className="text-[#f1fa8c]">
            {token}
          </span>
        ); // Yellow for strings
      } else if (token.match(/[(),;=<>*]/)) {
        return (
          <span key={i} className="text-[#6272a4]">
            {token}
          </span>
        ); // Blueish gray for operators
      } else {
        return (
          <span key={i} className="text-[#f8f8f2]">
            {token}
          </span>
        ); // White for identifiers
      }
    });

    return (
      <>
        {renderedTokens}
        {commentPart && (
          <span className="text-[#6272a4] italic">{commentPart}</span>
        )}
      </>
    );
  };

  return (
    <div className="font-mono text-[13px] leading-6">
      {lines.map((line, idx) => (
        <div key={idx} className="flex group">
          {/* Line Number */}
          <div className="select-none w-8 md:w-10 text-right pr-2 md:pr-4 text-[#6272a4] group-hover:text-[#f8f8f2] transition-colors text-xs pt-[2px]">
            {idx + 1}
          </div>
          {/* Code */}
          <div className="flex-1 whitespace-pre-wrap pl-2 border-l border-[#282a36] group-hover:border-[#44475a] transition-colors break-all md:break-normal">
            {colorizeLine(line)}
          </div>
        </div>
      ))}
    </div>
  );
};

// 2. Simple Markdown Table & Content Renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const parseTableLine = (line: string) => {
    const trimmed = line.trim();
    let cells = trimmed.split("|");
    if (trimmed.startsWith("|")) cells.shift();
    if (trimmed.endsWith("|")) cells.pop();
    return cells;
  };

  const flushTable = (key: number) => {
    if (!inTable) return null;
    inTable = false;

    let rowsToRender = tableRows;
    if (
      tableRows.length > 0 &&
      tableRows[0].some((cell) => cell.includes("---"))
    ) {
      rowsToRender = tableRows.slice(1);
    }

    const res = (
      <div
        key={`table-${key}`}
        className="my-8 overflow-hidden rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-black text-white">
              <tr>
                {tableHeader.map((h, i) => (
                  <th
                    key={i}
                    className="px-6 py-4 font-bold tracking-wider border-b border-zinc-800"
                  >
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {rowsToRender.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-6 py-3 text-zinc-700 align-top"
                    >
                      {cell.trim() || (
                        <span className="text-zinc-300 italic">пусто</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
    tableHeader = [];
    tableRows = [];
    return res;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("|")) {
      const cells = parseTableLine(line);
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      elements.push(flushTable(i));
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="text-2xl md:text-3xl font-extrabold mt-10 mb-6 text-black tracking-tight border-b-4 border-black inline-block pb-2"
        >
          {line.replace("# ", "")}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-lg md:text-xl font-bold mt-8 mb-4 text-black flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-black rounded-full"></div>
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-base md:text-lg font-bold mt-6 mb-3 text-zinc-800"
        >
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li
          key={i}
          className="ml-6 list-disc text-zinc-700 py-1 pl-1 marker:text-black"
        >
          {line.replace("- ", "")}
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li
          key={i}
          className="ml-6 list-decimal text-zinc-700 py-1 pl-1 marker:font-bold marker:text-black"
        >
          {line.replace(/^\d+\. /, "")}
        </li>
      );
    } else if (line === "") {
      elements.push(<div key={i} className="h-2"></div>);
    } else {
      elements.push(
        <p
          key={i}
          className="text-zinc-600 leading-relaxed mb-2 max-w-4xl text-sm md:text-base"
        >
          {line}
        </p>
      );
    }
  }

  if (inTable) elements.push(flushTable(lines.length));

  return <div className="animate-fade-in-up">{elements}</div>;
};

// --- Sidebar Navigation Item ---
const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`group w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
      active
        ? "bg-black text-white shadow-lg shadow-zinc-300 transform scale-[1.02]"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-black hover:translate-x-1"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={20}
        strokeWidth={active ? 2.5 : 2}
        className="transition-transform group-hover:scale-110"
      />
      <span className="font-medium tracking-tight">{label}</span>
    </div>
    {active && <ChevronRight size={16} className="opacity-50" />}
  </button>
);

// --- Table Component ---
const EntityTable = ({
  title,
  columns,
  data,
  onDelete,
  onEdit,
  onAdd,
}: any) => {
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    if (window.confirm("Вы уверены, что хотите удалить эту запись?")) {
      try {
        setError(null);
        await onDelete(id);
      } catch (e: any) {
        console.error("Delete failed:", e);
        // Error is usually handled by DatabaseContext setting lastError globally,
        // but we can also catch local rejection if needed
        setError(e.message || "Ошибка при удалении");
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  return (
    <div className="space-y-6 opacity-0 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-black tracking-tight">
            {title}
          </h2>
          <p className="text-zinc-500 mt-1">Всего записей: {data.length}</p>
        </div>
        <button
          onClick={onAdd}
          className="group w-full md:w-auto flex items-center justify-center space-x-2 bg-black text-white px-6 py-3 rounded-full hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-200"
        >
          <Plus
            size={18}
            strokeWidth={3}
            className="group-hover:rotate-90 transition-transform duration-300"
          />
          <span className="font-bold">Добавить</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden relative">
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-3 text-center text-sm font-bold z-20 animate-fade-in-up shadow-md">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-zinc-50/50 border-b border-zinc-200">
              <tr>
                {columns.map((col: string) => (
                  <th
                    key={col}
                    className="px-6 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-6 py-5 text-right text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-16 text-center text-zinc-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Database
                        size={48}
                        strokeWidth={1}
                        className="opacity-20"
                      />
                      <span className="font-medium">
                        Нет данных для отображения
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row: any) => (
                  <tr
                    key={row.id}
                    className="group hover:bg-zinc-50 transition-colors duration-200"
                  >
                    {columns.map((col: string) => {
                      let val = "";
                      if (col === "Имя" || col === "Название") val = row.name;
                      else if (col === "Email") val = row.email;
                      else if (col === "Роль") val = row.role;
                      else if (col === "Описание") val = row.description;
                      else if (col === "Заголовок") val = row.title;
                      else if (col === "Пользователь") val = row.user;
                      else if (col === "Категория") val = row.category;
                      else if (col === "Дата") val = row.createdAt;

                      return (
                        <td
                          key={`${row.id}-${col}`}
                          className="px-6 py-4 text-sm font-medium text-zinc-700 group-hover:text-black transition-colors"
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-2 text-zinc-400 hover:text-black hover:bg-white rounded-full transition-all shadow-sm ring-1 ring-zinc-200"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.id);
                          }}
                          type="button"
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-white rounded-full transition-all shadow-sm ring-1 ring-zinc-200"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- SQL View ---
interface SQLViewerProps {
  sql: string;
  setSql: (val: string) => void;
}

const SQLViewer: React.FC<SQLViewerProps> = ({ sql, setSql }) => {
  const { db, isConnected } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!isConnected) {
      setSql(
        "-- Ошибка: Нет соединения с базой данных.\n-- Проверьте статус подключения в меню."
      );
      return;
    }
    setLoading(true);
    const result = await generateSQLQueries(db);
    setSql(result);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 opacity-0 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-black tracking-tight flex items-center gap-3">
            SQL Лаборатория
          </h2>
          <p className="text-zinc-500 mt-1">
            Генерация запросов на основе текущего состояния базы
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center space-x-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Terminal size={20} />
            )}
            <span className="font-bold">Сгенерировать</span>
          </button>
        </div>
      </div>

      {/* IDE Container */}
      <div className="flex-1 bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col relative group ring-4 ring-zinc-100">
        {/* IDE Header */}
        <div className="bg-[#2d2d2d] px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="flex items-center space-x-2 group-hover:opacity-100 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5555] hover:bg-[#ff5555]/80 transition-colors shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-[#f1fa8c] hover:bg-[#f1fa8c]/80 transition-colors shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-[#50fa7b] hover:bg-[#50fa7b]/80 transition-colors shadow-sm"></div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 text-xs font-medium text-zinc-400 flex items-center gap-2">
            <Database size={12} />
            <span className="hidden md:inline">postgres — queries.sql</span>
            <span className="md:hidden">queries.sql</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="text-zinc-500 hover:text-white transition-colors"
            title="Копировать код"
          >
            {copied ? (
              <Check size={16} className="text-[#50fa7b]" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        {/* IDE Content */}
        <div className="flex-1 overflow-auto custom-scrollbar p-2 md:p-4 bg-[#282a36]">
          <SqlHighlighter code={sql} />
        </div>

        {/* IDE Status Bar */}
        <div className="bg-[#191a21] px-4 py-1.5 border-t border-[#44475a] flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-[#6272a4]">
          <div className="flex gap-4">
            <span>UTF-8</span>
            <span className="hidden md:inline">PostgreSQL</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className={isConnected ? "text-[#50fa7b]" : "text-[#ff5555]"}>
              ● {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Documentation View ---
interface DocsViewerProps {
  docs: string;
  setDocs: (val: string) => void;
}

const DocumentationViewer: React.FC<DocsViewerProps> = ({ docs, setDocs }) => {
  const { db, isConnected } = useDatabase();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!isConnected) {
      setDocs(
        "# Ошибка подключения\nНет соединения с БД. Перейдите в онлайн режим."
      );
      return;
    }
    setLoading(true);
    const result = await generateDocumentation(db);
    setDocs(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col space-y-6 opacity-0 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-black flex items-center gap-2">
            <BookOpen className="text-zinc-400" size={24} />
            Техническая документация
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Автоматическое описание структуры
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full md:w-auto flex items-center justify-center space-x-2 bg-white text-black border-2 border-black px-5 py-2.5 rounded-xl hover:bg-black hover:text-white transition-all font-bold disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <FileText size={18} />
          )}
          <span>Создать документ</span>
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 md:p-12 overflow-auto">
        {docs ? (
          <MarkdownRenderer content={docs} />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 md:h-full text-zinc-400 space-y-4">
            <BookOpen size={48} strokeWidth={1} />
            <p>Нажмите "Создать документ" для генерации отчета</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Dashboard ---
const Dashboard = () => {
  const { db } = useDatabase();

  const StatCard = ({ icon: Icon, title, value, delay }: any) => (
    <div
      className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-in-up h-40"
      style={{ animationDelay: delay }}
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-zinc-50 rounded-xl text-black">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <span className="text-5xl font-extrabold tracking-tighter text-black">
          {value}
        </span>
      </div>
      <p className="text-zinc-500 font-medium text-sm uppercase tracking-wider mt-4">
        {title}
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Users}
          title="Пользователи"
          value={db.users.length}
          delay="0ms"
        />
        <StatCard
          icon={Tags}
          title="Категории"
          value={db.categories.length}
          delay="100ms"
        />
        <StatCard
          icon={FileText}
          title="Всего Записей"
          value={db.records.length}
          delay="200ms"
        />
      </div>

      <div
        className="bg-black text-white p-6 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: "300ms" }}
      >
        {/* Decorative background circle */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-zinc-800 rounded-full blur-3xl opacity-30"></div>

        <div className="relative z-10 max-w-2xl">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Учет Данных</h3>
          <p className="text-zinc-300 mb-8 text-base md:text-lg leading-relaxed">
            Учебная система для практики управления данными. Используйте меню
            слева для навигации между таблицами, генерируйте SQL-запросы в
            лаборатории или создавайте документацию.
          </p>

          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <Info className="text-white shrink-0" size={24} />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Совет
              </span>
              <span className="text-sm font-medium leading-tight">
                Переключайте статус подключения для проверки обработки ошибок.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lifted state for persistence
  const [sqlContent, setSqlContent] = useState<string>(
    "-- Нажмите 'Сгенерировать' для создания SQL"
  );
  const [docsContent, setDocsContent] = useState<string>("");

  const {
    db,
    isConnected,
    toggleConnection,
    deleteItem,
    lastError,
    clearError,
  } = useDatabase();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <EntityTable
            title="Пользователи"
            columns={["Имя", "Email", "Роль"]}
            data={db.users}
            onDelete={(id: number) => deleteItem("users", id)}
            onEdit={(item: any) => {
              setEditingItem(item);
              setModalOpen(true);
            }}
            onAdd={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          />
        );
      case "categories":
        return (
          <EntityTable
            title="Категории"
            columns={["Название", "Описание"]}
            data={db.categories}
            onDelete={(id: number) => deleteItem("categories", id)}
            onEdit={(item: any) => {
              setEditingItem(item);
              setModalOpen(true);
            }}
            onAdd={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          />
        );
      case "records":
        const recordsWithRelations = db.records.map((r) => ({
          ...r,
          user: db.users.find((u) => u.id === r.userId)?.name || "Неизвестно",
          category:
            db.categories.find((c) => c.id === r.categoryId)?.name ||
            "Без категории",
        }));
        return (
          <EntityTable
            title="Записи"
            columns={["Заголовок", "Пользователь", "Категория", "Дата"]}
            data={recordsWithRelations}
            onDelete={(id: number) => deleteItem("records", id)}
            onEdit={(item: any) => {
              setEditingItem(item);
              setModalOpen(true);
            }}
            onAdd={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          />
        );
      case "sql":
        return <SQLViewer sql={sqlContent} setSql={setSqlContent} />;
      case "docs":
        return (
          <DocumentationViewer docs={docsContent} setDocs={setDocsContent} />
        );
      default:
        return <Dashboard />;
    }
  };

  const renderModalContent = () => {
    if (activeTab === "users")
      return (
        <UserForm
          initialData={editingItem}
          onClose={() => setModalOpen(false)}
        />
      );
    if (activeTab === "categories")
      return (
        <CategoryForm
          initialData={editingItem}
          onClose={() => setModalOpen(false)}
        />
      );
    if (activeTab === "records")
      return (
        <RecordForm
          initialData={editingItem}
          onClose={() => setModalOpen(false)}
        />
      );
    return null;
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "users":
        return "Управление";
      case "categories":
        return "Справочник";
      case "records":
        return "Журнал";
      case "sql":
        return "Разработка";
      case "docs":
        return "Информация";
      default:
        return "Обзор";
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-black selection:text-white overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-zinc-200 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-xl">
              <Database size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-black leading-none">
                УЧЕТ ДАННЫХ
              </h1>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                Система v1.0
              </span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-zinc-400"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 md:px-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 mt-2 px-2">
            Основное
          </div>
          <NavItem
            icon={LayoutGrid}
            label="Дашборд"
            active={activeTab === "dashboard"}
            onClick={() => handleTabChange("dashboard")}
          />
          <NavItem
            icon={Users}
            label="Пользователи"
            active={activeTab === "users"}
            onClick={() => handleTabChange("users")}
          />
          <NavItem
            icon={Tags}
            label="Категории"
            active={activeTab === "categories"}
            onClick={() => handleTabChange("categories")}
          />
          <NavItem
            icon={FileText}
            label="Записи"
            active={activeTab === "records"}
            onClick={() => handleTabChange("records")}
          />

          <div className="mt-8 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 px-2">
            Инструменты
          </div>
          <NavItem
            icon={Code}
            label="SQL Лаборатория"
            active={activeTab === "sql"}
            onClick={() => handleTabChange("sql")}
          />
          <NavItem
            icon={BookOpen}
            label="Документация"
            active={activeTab === "docs"}
            onClick={() => handleTabChange("docs")}
          />
        </nav>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={toggleConnection}
            className={`w-full group flex items-center justify-between px-4 py-3 rounded-xl transition-all border-2 ${
              isConnected
                ? "bg-white border-zinc-200 text-black hover:border-black"
                : "bg-zinc-100 border-zinc-300 text-zinc-500 hover:bg-white hover:text-red-500 hover:border-red-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  isConnected
                    ? "bg-black text-white"
                    : "bg-zinc-300 text-zinc-500 group-hover:bg-red-500 group-hover:text-white"
                }`}
              >
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              </div>
              <span className="text-sm font-bold tracking-tight">
                {isConnected ? "ОНЛАЙН" : "ОФФЛАЙН"}
              </span>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Global Error Banner */}
        {lastError && (
          <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between animate-fade-in-up z-50 shadow-md">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="stroke-2" />
              <span className="font-bold text-sm md:text-base">
                {lastError}
              </span>
            </div>
            <button
              onClick={clearError}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
              <span className="hidden md:inline">Приложение</span>
              <ChevronRight size={14} className="hidden md:inline" />
              <span className="text-black font-bold">
                {getTabTitle(activeTab)}
              </span>
            </div>
          </div>

          {!isConnected && (
            <div className="absolute left-1/2 transform -translate-x-1/2 bg-black text-white px-4 md:px-6 py-2 rounded-full shadow-xl flex items-center gap-2 opacity-0 animate-fade-in-up whitespace-nowrap">
              <WifiOff size={16} />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">
                Нет соединения
              </span>
              <span className="text-xs font-bold uppercase tracking-widest md:hidden">
                Оффлайн
              </span>
            </div>
          )}

          <div className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-200">
            A
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Редактирование" : "Создание новой записи"}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
};

const App = () => {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
};

export default App;
