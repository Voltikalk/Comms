import React, { useMemo, useState } from 'react';
import { IconChartBar, IconCheck, IconX, IconUsers, IconHelpCircle, IconBulb, IconChecks } from '@tabler/icons-react';
import type { Poll, UserId } from '../../types';
import { USER_NAMES } from '../../constants';

interface PollCardProps {
  poll: Poll;
  messageId: string;
  roomId: string;
  currentUser: UserId | null;
  isOwnPoll: boolean;
  onVote: (messageId: string, roomId: string, optionIds: string[]) => void;
  onClose?: (messageId: string) => void;
  timestamp?: number;
  deliveryStatus?: 'read' | 'delivered' | 'sent' | 'pending';
  isPending?: boolean;
  formatTime?: (ts: number) => string;
  getUserDisplayName?: (id: string) => string;
}

const POLL_BAR_COLORS = ['#3390ec', '#e6604c', '#4fae4e', '#ac8bdd', '#f2a33c', '#54c0ea'];

const pluralVotes = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'голосов';
  if (mod10 === 1) return 'голос';
  if (mod10 >= 2 && mod10 <= 4) return 'голоса';
  return 'голосов';
};

const defaultFormatTime = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  messageId,
  roomId,
  currentUser,
  isOwnPoll,
  onVote,
  onClose,
  timestamp,
  deliveryStatus,
  isPending,
  formatTime = defaultFormatTime,
  getUserDisplayName
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [justAnsweredWrong, setJustAnsweredWrong] = useState(false);

  const totalVotesCast = useMemo(
    () => Object.values(poll.votes || {}).flat().length,
    [poll.votes]
  );

  const uniqueVoters = useMemo(
    () => new Set(Object.values(poll.votes || {}).flat()).size,
    [poll.votes]
  );

  const myVotes = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(
      Object.entries(poll.votes || {})
        .filter(([, voters]) => voters.includes(currentUser))
        .map(([optionId]) => optionId)
    );
  }, [poll.votes, currentUser]);

  const hasVoted = myVotes.size > 0;
  const isQuiz = Boolean(poll.quiz);

  const handleOptionClick = (optionId: string) => {
    if (poll.closed) return;

    // In Quiz mode, answer cannot be changed once submitted
    if (isQuiz) {
      if (hasVoted) return;
      if (poll.correctOptionId && optionId !== poll.correctOptionId) {
        setJustAnsweredWrong(true);
        setTimeout(() => setJustAnsweredWrong(false), 800);
      }
      onVote(messageId, roomId, [optionId]);
      return;
    }

    // In Multiple choice mode: toggle option on/off
    if (poll.multiple) {
      const next = myVotes.has(optionId)
        ? [...myVotes].filter((id) => id !== optionId)
        : [...myVotes, optionId];
      onVote(messageId, roomId, next);
      return;
    }

    // In Single choice mode: clicking selected option retracts vote, clicking another changes it
    if (myVotes.has(optionId)) {
      onVote(messageId, roomId, []);
      return;
    }

    onVote(messageId, roomId, [optionId]);
  };

  const handleRetractVote = () => {
    if (poll.closed || isQuiz || !hasVoted) return;
    onVote(messageId, roomId, []);
  };

  const resolveVoterNames = (voterIds: UserId[]): string => {
    if (!voterIds || voterIds.length === 0) return '';
    return voterIds
      .map((id) => {
        if (id === currentUser) return 'Вы';
        if (getUserDisplayName) return getUserDisplayName(id);
        return USER_NAMES[id] || id;
      })
      .join(', ');
  };

  return (
    <div className={`w-full min-w-[240px] sm:min-w-[280px] max-w-[340px] select-none ${justAnsweredWrong ? 'animate-shake' : ''}`}>
      {/* Header Tag */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isQuiz ? (
            <IconHelpCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <IconChartBar size={15} className="shrink-0 text-[#3390ec] dark:text-[#70b1ff]" />
          )}
          <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
            isQuiz ? 'text-amber-600 dark:text-amber-400' : 'text-[#3390ec] dark:text-[#70b1ff]'
          }`}>
            {isQuiz
              ? 'Викторина'
              : poll.multiple
              ? 'Опрос · несколько ответов'
              : 'Опрос'}
            {poll.anonymous ? ' · анонимный' : ''}
            {poll.closed ? ' · завершён' : ''}
          </span>
        </div>

        {isQuiz && poll.explanation && (hasVoted || poll.closed) && (
          <button
            type="button"
            onClick={() => setShowExplanation((prev) => !prev)}
            className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="Показать объяснение"
          >
            <IconBulb size={13} />
          </button>
        )}
      </div>

      {/* Question */}
      <p className="text-[15px] font-semibold leading-snug mb-3 break-words text-inherit">{poll.question}</p>

      {/* Options List */}
      <div className="flex flex-col gap-1.5">
        {poll.options.map((option, index) => {
          const voters = poll.votes?.[option.id] || [];
          const count = voters.length;
          const divisor = poll.multiple ? (uniqueVoters || 1) : (totalVotesCast || 1);
          const percent = totalVotesCast > 0 ? Math.min(100, Math.round((count / divisor) * 100)) : 0;
          const isMyChoice = myVotes.has(option.id);
          const isCorrectAnswer = isQuiz && poll.correctOptionId === option.id;
          const isWrongChoice = isQuiz && isMyChoice && !isCorrectAnswer;
          const showQuizResults = isQuiz && (hasVoted || poll.closed);

          // Color calculation
          let barColor = POLL_BAR_COLORS[index % POLL_BAR_COLORS.length];
          if (showQuizResults) {
            if (isCorrectAnswer) barColor = '#4fae4e'; // Green
            else if (isWrongChoice) barColor = '#e6604c'; // Red
          }

          const voterNamesTooltip = !poll.anonymous && count > 0 ? resolveVoterNames(voters) : undefined;

          return (
            <div key={option.id} className="relative group/opt">
              <button
                type="button"
                onClick={() => handleOptionClick(option.id)}
                disabled={poll.closed || (isQuiz && hasVoted)}
                title={voterNamesTooltip ? `Проголосовали: ${voterNamesTooltip}` : undefined}
                className={`relative w-full text-left rounded-xl overflow-hidden transition-all active:scale-[0.985] ${
                  poll.closed || (isQuiz && hasVoted) ? 'cursor-default' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                } ${
                  showQuizResults && isCorrectAnswer
                    ? 'ring-1.5 ring-emerald-500/70'
                    : showQuizResults && isWrongChoice
                    ? 'ring-1.5 ring-rose-500/70'
                    : ''
                }`}
              >
                {/* Background Fill Bar */}
                {(totalVotesCast > 0 || showQuizResults) && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: barColor,
                      opacity: isMyChoice || (showQuizResults && isCorrectAnswer) ? 0.35 : 0.16
                    }}
                  />
                )}

                <div className="relative flex items-center gap-2.5 px-3 py-2">
                  {/* Indicator Checkbox / Radio / Quiz Icon */}
                  <span
                    className={`w-[19px] h-[19px] shrink-0 flex items-center justify-center border-2 transition-all ${
                      poll.multiple && !isQuiz ? 'rounded-[5px]' : 'rounded-full'
                    } ${
                      showQuizResults && isCorrectAnswer
                        ? 'bg-[#4fae4e] border-transparent text-white'
                        : showQuizResults && isWrongChoice
                        ? 'bg-[#e6604c] border-transparent text-white'
                        : isMyChoice
                        ? 'border-transparent text-white'
                        : 'border-current opacity-45'
                    }`}
                    style={
                      isMyChoice && !showQuizResults
                        ? { backgroundColor: barColor }
                        : undefined
                    }
                  >
                    {showQuizResults ? (
                      isCorrectAnswer ? (
                        <IconCheck size={13} stroke={3} />
                      ) : isWrongChoice ? (
                        <IconX size={13} stroke={3} />
                      ) : null
                    ) : (
                      isMyChoice && <IconCheck size={13} stroke={3} />
                    )}
                  </span>

                  {/* Option Text */}
                  <span className="flex-1 text-[14px] leading-tight break-words font-medium">
                    {option.text}
                  </span>

                  {/* Percentage */}
                  {(totalVotesCast > 0 || showQuizResults) && (
                    <span className="text-[12px] font-bold tabular-nums opacity-85 shrink-0 ml-1">
                      {percent}%
                    </span>
                  )}
                </div>
              </button>

              {/* Public Poll Non-Anonymous Voter Hover Tooltip */}
              {voterNamesTooltip && (
                <div className="absolute right-2 -bottom-1 translate-y-full opacity-0 pointer-events-none group-hover/opt:opacity-100 group-hover/opt:pointer-events-auto transition-opacity z-20 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-md shadow-lg max-w-[220px] truncate backdrop-blur-xs">
                  {voterNamesTooltip}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quiz Explanation Card */}
      {isQuiz && poll.explanation && (showExplanation || poll.closed) && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[12px] leading-relaxed text-amber-900 dark:text-amber-200 animate-fade-in flex items-start gap-2">
          <IconBulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold block mb-0.5">Объяснение:</span>
            <p className="break-words">{poll.explanation}</p>
          </div>
        </div>
      )}

      {/* Footer Info: Total Voters, Actions & Timestamp */}
      <div className="mt-2.5 pt-1 flex items-center justify-between gap-2 border-t border-black/5 dark:border-white/5">
        {/* Left: Voter Count & Actions */}
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[11px] font-medium opacity-80">
          <div className="flex items-center gap-1">
            <IconUsers size={12} />
            <span>
              {poll.multiple
                ? `${totalVotesCast} ${pluralVotes(totalVotesCast)} · ${uniqueVoters} чел.`
                : `${uniqueVoters} ${pluralVotes(uniqueVoters)}`}
            </span>
          </div>

          {/* Retract vote */}
          {!poll.closed && !isQuiz && hasVoted && (
            <button
              type="button"
              onClick={handleRetractVote}
              className="text-[#3390ec] dark:text-[#70b1ff] hover:underline cursor-pointer font-semibold"
            >
              Отменить голос
            </button>
          )}

          {/* Close Poll (Author Only) */}
          {isOwnPoll && !poll.closed && onClose && (
            <button
              type="button"
              onClick={() => onClose(messageId)}
              className="text-rose-500 hover:underline cursor-pointer font-semibold"
            >
              Завершить
            </button>
          )}
        </div>

        {/* Right: Telegram Timestamp & Delivery Status */}
        {timestamp && (
          <div className={`flex items-center gap-0.5 text-[10.5px] select-none shrink-0 ${
            isOwnPoll
              ? 'text-[#4fae4e] dark:text-[#82b1ff]'
              : 'text-[#8b9ba8] dark:text-[#708499]'
          }`}>
            <span className="font-sans tabular-nums">{formatTime(timestamp)}</span>
            {isOwnPoll && !isPending && (
              <span className="ml-0.5 inline-flex items-center">
                {deliveryStatus === 'read' ? (
                  <IconChecks size={13} stroke={2} />
                ) : (
                  <IconCheck size={13} stroke={2} />
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollCard;
