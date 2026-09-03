import { describe, it, expect } from 'vitest';
import type { Poll, Message } from '../types';
import { applyFilters } from './filter-utils';

describe('Polls & Quizzes System', () => {
  const samplePoll: Poll = {
    question: 'Какой ваш любимый стек?',
    options: [
      { id: 'opt-1', text: 'React + Vite' },
      { id: 'opt-2', text: 'Vue + Nuxt' },
      { id: 'opt-3', text: 'Svelte + SvelteKit' },
    ],
    votes: {
      'opt-1': ['vlad', 'anya'],
      'opt-2': ['mom'],
    },
    multiple: false,
    anonymous: false,
    closed: false,
  };

  const sampleQuiz: Poll = {
    question: 'Столица Франции?',
    options: [
      { id: 'q-1', text: 'Лондон' },
      { id: 'q-2', text: 'Париж' },
      { id: 'q-3', text: 'Берлин' },
    ],
    votes: {
      'q-2': ['vlad'],
    },
    multiple: false,
    anonymous: false,
    closed: false,
    quiz: true,
    correctOptionId: 'q-2',
    explanation: 'Париж является столицей Франции с 508 года.',
  };

  describe('Single-choice voting logic', () => {
    it('selects option for new voter', () => {
      const selectedOptionId = 'opt-3';
      const myVotes = new Set<string>();

      const next = myVotes.has(selectedOptionId) ? [] : [selectedOptionId];
      expect(next).toEqual(['opt-3']);
    });

    it('retracts vote when clicking already selected option', () => {
      const selectedOptionId = 'opt-1';
      const myVotes = new Set(['opt-1']);

      const next = myVotes.has(selectedOptionId) ? [] : [selectedOptionId];
      expect(next).toEqual([]);
    });

    it('switches vote when clicking different option', () => {
      const selectedOptionId = 'opt-2';
      const myVotes = new Set(['opt-1']);

      const next = myVotes.has(selectedOptionId) ? [] : [selectedOptionId];
      expect(next).toEqual(['opt-2']);
    });
  });

  describe('Multiple-choice voting toggle logic', () => {
    it('adds option when not yet selected', () => {
      const myVotes = new Set(['opt-1']);
      const optionId = 'opt-2';

      const next = myVotes.has(optionId)
        ? [...myVotes].filter((id) => id !== optionId)
        : [...myVotes, optionId];

      expect(next).toEqual(['opt-1', 'opt-2']);
    });

    it('removes option when already selected (uncheck)', () => {
      const myVotes = new Set(['opt-1', 'opt-2']);
      const optionId = 'opt-1';

      const next = myVotes.has(optionId)
        ? [...myVotes].filter((id) => id !== optionId)
        : [...myVotes, optionId];

      expect(next).toEqual(['opt-2']);
    });

    it('unchecks all options back to empty array', () => {
      const myVotes = new Set(['opt-2']);
      const optionId = 'opt-2';

      const next = myVotes.has(optionId)
        ? [...myVotes].filter((id) => id !== optionId)
        : [...myVotes, optionId];

      expect(next).toEqual([]);
    });
  });

  describe('Quiz mode validation and scoring', () => {
    it('identifies correct answer', () => {
      expect(sampleQuiz.correctOptionId).toBe('q-2');
      const voterChoice = 'q-2';
      const isCorrect = voterChoice === sampleQuiz.correctOptionId;
      expect(isCorrect).toBe(true);
    });

    it('identifies wrong answer', () => {
      const voterChoice = 'q-1';
      const isCorrect = voterChoice === sampleQuiz.correctOptionId;
      expect(isCorrect).toBe(false);
    });

    it('ensures quiz has single answer requirement and explanation', () => {
      expect(sampleQuiz.quiz).toBe(true);
      expect(sampleQuiz.multiple).toBe(false);
      expect(sampleQuiz.explanation).toBeDefined();
    });
  });

  describe('Percentage calculations', () => {
    it('calculates single-choice percentages based on total votes', () => {
      const totalVotes = Object.values(samplePoll.votes).flat().length; // 3
      expect(totalVotes).toBe(3);

      const opt1Count = samplePoll.votes['opt-1'].length; // 2
      const opt2Count = samplePoll.votes['opt-2'].length; // 1
      const opt3Count = (samplePoll.votes['opt-3'] || []).length; // 0

      expect(Math.round((opt1Count / totalVotes) * 100)).toBe(67);
      expect(Math.round((opt2Count / totalVotes) * 100)).toBe(33);
      expect(Math.round((opt3Count / totalVotes) * 100)).toBe(0);
    });

    it('calculates multiple-choice percentages based on unique voters', () => {
      const multiPoll: Poll = {
        question: 'Что вы любите?',
        options: [
          { id: 'm-1', text: 'Чай' },
          { id: 'm-2', text: 'Кофе' },
        ],
        votes: {
          'm-1': ['vlad', 'anya'], // 2
          'm-2': ['vlad'],        // 1
        },
        multiple: true,
      };

      const uniqueVoters = new Set(Object.values(multiPoll.votes).flat()).size; // 2 (vlad, anya)
      expect(uniqueVoters).toBe(2);

      const m1Pct = Math.round((multiPoll.votes['m-1'].length / uniqueVoters) * 100);
      const m2Pct = Math.round((multiPoll.votes['m-2'].length / uniqueVoters) * 100);

      expect(m1Pct).toBe(100);
      expect(m2Pct).toBe(50);
    });
  });

  describe('Search & Filtering integration with Polls', () => {
    const messages: Message[] = [
      {
        id: 'msg-poll-1',
        roomId: 'general',
        sender: 'vlad',
        text: '',
        timestamp: 1700000000000,
        poll: samplePoll,
      },
      {
        id: 'msg-quiz-1',
        roomId: 'general',
        sender: 'anya',
        text: '',
        timestamp: 1700001000000,
        poll: sampleQuiz,
      },
      {
        id: 'msg-text-1',
        roomId: 'general',
        sender: 'mom',
        text: 'Привет всем!',
        timestamp: 1700002000000,
      },
    ];

    it('matches poll by question keyword', () => {
      const results = applyFilters(messages, { searchQuery: 'любимый стек' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('msg-poll-1');
    });

    it('matches poll by option text keyword', () => {
      const results = applyFilters(messages, { searchQuery: 'SvelteKit' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('msg-poll-1');
    });

    it('matches quiz by question or option', () => {
      const results = applyFilters(messages, { searchQuery: 'Франции' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('msg-quiz-1');
    });

    it('forwards poll with clean fresh votes map', () => {
      const original = messages[0];
      const forwarded: Message = {
        id: 'msg-fwd-1',
        roomId: 'family',
        sender: 'anya',
        text: '',
        timestamp: Date.now(),
        poll: original.poll ? { ...original.poll, votes: {} } : undefined,
      };

      expect(forwarded.poll).toBeDefined();
      expect(forwarded.poll?.question).toBe(original.poll?.question);
      expect(forwarded.poll?.votes).toEqual({});
    });
  });
});
