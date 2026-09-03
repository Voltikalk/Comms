import React, { useState, useRef } from 'react';
import { IconX, IconPlus, IconTrash, IconChartBar, IconHelpCircle, IconCheck } from '@tabler/icons-react';
import type { Poll } from '../../types';

interface PollCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (poll: Poll) => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

const createOptionId = () => `opt-${Math.random().toString(36).substring(2, 9)}`;

export const PollCreateModal: React.FC<PollCreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([
    { id: createOptionId(), text: '' },
    { id: createOptionId(), text: '' }
  ]);
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [correctOptionId, setCorrectOptionId] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

  const filledOptions = options.map((opt) => ({ ...opt, text: opt.text.trim() })).filter((o) => o.text.length > 0);
  const hasMinOptions = filledOptions.length >= MIN_OPTIONS;
  const isQuizValid = !quiz || (correctOptionId && filledOptions.some((o) => o.id === correctOptionId));
  const canCreate = question.trim().length > 0 && hasMinOptions && isQuizValid;

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, text: value } : opt)));
  };

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      const newOpt = { id: createOptionId(), text: '' };
      setOptions((prev) => [...prev, newOpt]);
      setTimeout(() => {
        const nextIndex = options.length;
        optionInputRefs.current[nextIndex]?.focus();
      }, 50);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > MIN_OPTIONS) {
      const removedId = options[index].id;
      setOptions((prev) => prev.filter((_, i) => i !== index));
      if (correctOptionId === removedId) {
        setCorrectOptionId('');
      }
    }
  };

  const toggleQuiz = (val: boolean) => {
    setQuiz(val);
    if (val) {
      setMultiple(false);
      if (!correctOptionId && options[0]) {
        setCorrectOptionId(options[0].id);
      }
    }
  };

  const handleCreate = () => {
    if (!canCreate) return;
    const finalOptions = options
      .map((opt) => ({ id: opt.id, text: opt.text.trim() }))
      .filter((opt) => opt.text.length > 0);

    const poll: Poll = {
      question: question.trim(),
      options: finalOptions,
      votes: {},
      multiple: quiz ? false : multiple,
      anonymous,
      closed: false,
      quiz: quiz || undefined,
      correctOptionId: quiz ? correctOptionId : undefined,
      explanation: quiz && explanation.trim() ? explanation.trim() : undefined
    };

    onCreate(poll);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setQuestion('');
    setOptions([
      { id: createOptionId(), text: '' },
      { id: createOptionId(), text: '' }
    ]);
    setMultiple(false);
    setAnonymous(false);
    setQuiz(false);
    setCorrectOptionId('');
    setExplanation('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < options.length - 1) {
        optionInputRefs.current[index + 1]?.focus();
      } else if (options.length < MAX_OPTIONS) {
        addOption();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#17212b] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-pop-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-3 shrink-0">
          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${
            quiz ? 'bg-amber-500' : 'tg-btn-primary'
          }`}>
            {quiz ? <IconHelpCircle size={18} /> : <IconChartBar size={18} />}
          </span>
          <h2 className="flex-1 text-lg font-bold text-slate-900 dark:text-white">
            {quiz ? 'Новая викторина' : 'Новый опрос'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-5 pb-4 flex flex-col gap-4 overflow-y-auto tg-scrollbar flex-1">
          {/* Question Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Вопрос
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задайте вопрос"
              autoFocus
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-none text-[15px] text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Options Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Варианты ответа
              </label>
              {quiz && (
                <span className="text-[11px] font-medium text-emerald-500">
                  Выберите верный ответ
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-1.5">
                  {/* Quiz Correct Option Selector */}
                  {quiz && (
                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(option.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${
                        correctOptionId === option.id
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-white/20 text-transparent hover:border-emerald-400'
                      }`}
                      title="Выбрать как правильный ответ"
                    >
                      <IconCheck size={14} stroke={3} />
                    </button>
                  )}

                  <input
                    ref={(el) => { optionInputRefs.current[index] = el; }}
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Вариант ${index + 1}`}
                    maxLength={100}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-none text-[14px] text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
                  />

                  {options.length > MIN_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Удалить вариант"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#3390ec] hover:underline cursor-pointer"
              >
                <IconPlus size={15} />
                Добавить вариант
              </button>
            )}
          </div>

          {/* Settings Toggles */}
          <div className="flex flex-col gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
            {/* Anonymous Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">
                Анонимное голосование
              </span>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-[38px] h-[22px] appearance-none rounded-full bg-slate-300 dark:bg-white/15 checked:bg-[#3390ec] relative cursor-pointer transition-colors before:absolute before:top-[2px] before:left-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-[16px]"
              />
            </label>

            {/* Multiple Answers Toggle */}
            <label className={`flex items-center justify-between select-none ${quiz ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <div>
                <span className="text-[14px] text-slate-700 dark:text-slate-200 font-medium block">
                  Несколько ответов
                </span>
                {quiz && (
                  <span className="text-[11px] text-slate-400">Недоступно в викторине</span>
                )}
              </div>
              <input
                type="checkbox"
                disabled={quiz}
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
                className="w-[38px] h-[22px] appearance-none rounded-full bg-slate-300 dark:bg-white/15 checked:bg-[#3390ec] relative cursor-pointer transition-colors before:absolute before:top-[2px] before:left-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-[16px]"
              />
            </label>

            {/* Quiz Mode Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="text-[14px] text-slate-700 dark:text-slate-200 font-medium block">
                  Режим викторины
                </span>
                <span className="text-[11px] text-slate-400">Один правильный ответ</span>
              </div>
              <input
                type="checkbox"
                checked={quiz}
                onChange={(e) => toggleQuiz(e.target.checked)}
                className="w-[38px] h-[22px] appearance-none rounded-full bg-slate-300 dark:bg-white/15 checked:bg-amber-500 relative cursor-pointer transition-colors before:absolute before:top-[2px] before:left-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-[16px]"
              />
            </label>
          </div>

          {/* Quiz Explanation Field */}
          {quiz && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Объяснение (необязательно)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Пользователи увидят это после ответа"
                rows={2}
                maxLength={200}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-none text-[13.5px] text-slate-900 dark:text-white placeholder-slate-400 transition-colors resize-none"
              />
              <span className="text-[10px] text-slate-400 float-right mt-0.5">
                {explanation.length}/200
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="px-5 pb-5 pt-2 shrink-0 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className={`w-full py-3 rounded-xl font-semibold text-[15px] transition-all ${
              canCreate
                ? quiz
                  ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-[0.98]'
                  : 'tg-btn-primary text-white cursor-pointer active:scale-[0.98]'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            {quiz ? 'Создать викторину' : 'Создать опрос'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollCreateModal;
