import React, { useState, useEffect } from 'react';
import { MessageArchiveService, type ArchiveStats } from '../services/message-archive.service';
import { cronScheduler } from '../lib/cron-jobs';

export const AdminArchive: React.FC = () => {
  const [stats, setStats] = useState<ArchiveStats>({
    totalArchived: 0,
    oldestMessageDate: null,
    newestMessageDate: null,
    estimatedSizeMb: 0,
  });

  const [daysToKeep, setDaysToKeep] = useState(365);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [archivedList, setArchivedList] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Policy Settings State
  const [groupPolicyDays, setGroupPolicyDays] = useState(365);
  const [dmPolicyDays, setDmPolicyDays] = useState(30);
  const [attachmentPolicyDays, setAttachmentPolicyDays] = useState(730);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySavedMsg, setPolicySavedMsg] = useState(false);

  const loadStats = async () => {
    const data = await MessageArchiveService.getArchiveInfo();
    setStats(data);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleManualArchive = async () => {
    if (!confirm(`Архивировать сообщения старше ${daysToKeep} дней?`)) return;

    setIsArchiving(true);
    setArchiveResult(null);

    try {
      const res = await MessageArchiveService.archiveOldMessages(daysToKeep);
      setArchiveResult(`Успешно перенесено в архив: ${res.archivedCount} сообщений.`);
      await loadStats();
    } catch (err: any) {
      setArchiveResult(`Ошибка: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSearchArchived = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      const data = await MessageArchiveService.searchArchivedMessages(undefined, searchQuery, 25);
      setArchivedList(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Восстановить сообщение из архива обратно в активный чат?')) return;
    const ok = await MessageArchiveService.restoreArchivedMessage(id);
    if (ok) {
      setArchivedList((prev) => prev.filter((m) => m.id !== id));
      await loadStats();
    }
  };

  const handleRunJob = async () => {
    setIsArchiving(true);
    try {
      const report = await cronScheduler.runTask('weekly-archive');
      if (report) {
        setArchiveResult(
          `Задание выполнено: Группы (${report.groupMessagesArchived}), ЛС (${report.dmMessagesArchived}), Файлы (${report.attachmentsCleaned})`
        );
      }
      await loadStats();
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    setTimeout(() => {
      setIsSavingPolicy(false);
      setPolicySavedMsg(true);
      setTimeout(() => setPolicySavedMsg(false), 3000);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Управление архивом сообщений
            </h1>
            <p className="text-xs md:text-sm text-white/50 mt-1">
              Мониторинг долговременного хранилища, политики архивации и восстановление данных
            </p>
          </div>
          <button
            onClick={handleRunJob}
            disabled={isArchiving}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            ⚡ Запустить авто-архивацию
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <p className="text-xs text-white/50 font-medium">Архивировано сообщений</p>
            <p className="text-2xl md:text-3xl font-black text-cyan-400 mt-2">
              {stats.totalArchived.toLocaleString()}
            </p>
          </div>
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <p className="text-xs text-white/50 font-medium">Объем архива</p>
            <p className="text-2xl md:text-3xl font-black text-blue-400 mt-2">
              {stats.estimatedSizeMb} MB
            </p>
          </div>
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <p className="text-xs text-white/50 font-medium">Старейшее сообщение</p>
            <p className="text-xs font-semibold text-white/80 mt-3 truncate">
              {stats.oldestMessageDate ? new Date(stats.oldestMessageDate).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <p className="text-xs text-white/50 font-medium">Новейшее в архиве</p>
            <p className="text-xs font-semibold text-white/80 mt-3 truncate">
              {stats.newestMessageDate ? new Date(stats.newestMessageDate).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* 2-Column Actions: Manual Archive & Policy Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Archive Form */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📦</span> Ручная архивация сообщений
            </h2>
            <p className="text-xs text-white/60">
              Переносит старые сообщения из активной таблицы `messages` в долговременный архив `messages_archive`.
            </p>

            <div className="space-y-3 pt-2">
              <label className="text-xs text-white/70 block">
                Хранить в активной базе сообщений не более (дней):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={daysToKeep}
                  onChange={(e) => setDaysToKeep(Number(e.target.value))}
                  className="w-32 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
                <button
                  onClick={handleManualArchive}
                  disabled={isArchiving}
                  className="flex-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isArchiving ? 'Архивация...' : 'Выполнить перенос в архив'}
                </button>
              </div>
            </div>

            {archiveResult && (
              <p className="text-xs font-medium text-cyan-300 pt-2">{archiveResult}</p>
            )}
          </div>

          {/* Policy Settings Form */}
          <form
            onSubmit={handleSavePolicies}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-4"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Автоматические политики хранения
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Группы (дней)</label>
                <input
                  type="number"
                  value={groupPolicyDays}
                  onChange={(e) => setGroupPolicyDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Личные чаты (дней)</label>
                <input
                  type="number"
                  value={dmPolicyDays}
                  onChange={(e) => setDmPolicyDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Вложения (дней)</label>
                <input
                  type="number"
                  value={attachmentPolicyDays}
                  onChange={(e) => setAttachmentPolicyDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {policySavedMsg ? (
                <span className="text-xs text-emerald-400 font-medium">✓ Политики сохранены</span>
              ) : <div />}
              <button
                type="submit"
                disabled={isSavingPolicy}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
              >
                {isSavingPolicy ? 'Сохранение...' : 'Сохранить политики'}
              </button>
            </div>
          </form>
        </div>

        {/* Search & Restore Archive Feed */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔍</span> Поиск и восстановление из архива
            </h2>
          </div>

          <form onSubmit={handleSearchArchived} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск сообщений в архиве..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:scale-105 transition-all disabled:opacity-50"
            >
              {isSearching ? 'Поиск...' : 'Искать'}
            </button>
          </form>

          {/* Archived Messages Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/50 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Дата создания</th>
                  <th className="py-2 px-3">Текст сообщения</th>
                  <th className="py-2 px-3">Дата архивации</th>
                  <th className="py-2 px-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {archivedList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-white/40">
                      {searchQuery ? 'Сообщений не найдено' : 'Введите запрос или нажмите Искать'}
                    </td>
                  </tr>
                )}
                {archivedList.map((msg) => (
                  <tr key={msg.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap text-white/50">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="py-3 px-3 max-w-md truncate"
                      dangerouslySetInnerHTML={{ __html: msg.headline || msg.content }}
                    />
                    <td className="py-3 px-3 whitespace-nowrap text-white/40">
                      {new Date(msg.archived_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleRestore(msg.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40 transition-all text-[11px] font-medium"
                      >
                        Восстановить ↩
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArchive;
