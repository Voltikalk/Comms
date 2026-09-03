import {
  applyFilters,
  validateFilters,
  getCommonFilters,
  buildFilterQuery,
} from '../src/lib/filter-utils';

console.log('--- Testing filter-utils ---');

// Mock messages
const mockMessages = [
  {
    id: 'm1',
    roomId: 'room1',
    sender: 'vlad',
    text: 'Привет, как дела?',
    timestamp: new Date('2026-08-17T10:00:00Z').getTime(),
    reactions: { '❤️': ['anya'], '👍': ['mom', 'dad'] },
    isEdited: true,
    edited_at: '2026-08-17T10:05:00Z',
  },
  {
    id: 'm2',
    roomId: 'room1',
    sender: 'anya',
    text: 'Все супер! Смотри фото из парка',
    timestamp: new Date('2026-08-17T11:00:00Z').getTime(),
    file: {
      name: 'park.jpg',
      type: 'image',
      data: 'https://example.com/park.jpg',
      size: 1024,
    },
    reactions: { '❤️': ['vlad'] },
  },
  {
    id: 'm3',
    roomId: 'room2',
    sender: 'mom',
    text: 'Вот важный отчет в PDF',
    timestamp: new Date('2026-08-10T12:00:00Z').getTime(),
    file: {
      name: 'report.pdf',
      type: 'file',
      data: 'https://example.com/report.pdf',
      size: 4096,
    },
  },
  {
    id: 'm4',
    roomId: 'room1',
    sender: 'vlad',
    text: 'Записал голосовое сообщение',
    timestamp: new Date('2026-08-16T14:00:00Z').getTime(),
    file: {
      name: 'voice.ogg',
      type: 'audio',
      data: 'https://example.com/voice.ogg',
      size: 2048,
    },
    reactions: { '🔥': ['sister', 'anya', 'mom', 'dad'] },
  },
];

// Test 1: Validate filters
const v1 = validateFilters({
  dateRange: { startDate: '2026-08-10', endDate: '2026-08-17' },
  senders: ['vlad', 'anya'],
});
console.log('Validation 1 (Valid):', v1.isValid, v1.errors);

const v2 = validateFilters({
  dateRange: { startDate: '2026-08-20', endDate: '2026-08-10' },
});
console.log('Validation 2 (Invalid):', v2.isValid === false, v2.errors);

// Test 2: Filter by sender
const resVlad = applyFilters(mockMessages, { senders: ['vlad'] });
console.log('Filter by sender vlad count:', resVlad.length === 2);

// Test 3: Filter by attachment type
const resImages = applyFilters(mockMessages, { attachmentTypes: ['image'] });
console.log('Filter by image count:', resImages.length === 1, resImages[0]?.id === 'm2');

const resAudio = applyFilters(mockMessages, { attachmentTypes: ['audio'] });
console.log('Filter by audio count:', resAudio.length === 1, resAudio[0]?.id === 'm4');

const resDocs = applyFilters(mockMessages, { attachmentTypes: ['document'] });
console.log('Filter by docs count:', resDocs.length === 1, resDocs[0]?.id === 'm3');

// Test 4: Filter by hasReactions & reactions sort
const resReactions = applyFilters(mockMessages, { hasReactions: true }, 'reactions_desc');
console.log('Filter with reactions count:', resReactions.length === 3);
console.log('Most reacted first:', resReactions[0]?.id === 'm4'); // 4 reactions

// Test 5: Filter by isEdited
const resEdited = applyFilters(mockMessages, { isEdited: true });
console.log('Filter edited count:', resEdited.length === 1, resEdited[0]?.id === 'm1');

// Test 6: Common filters presets
const presets = getCommonFilters();
console.log('Common presets count:', presets.length >= 8);

// Test 7: SQL Query Builder
const queryRes = buildFilterQuery({
  dateRange: { startDate: '2026-08-01', endDate: '2026-08-17' },
  senders: ['vlad', 'anya'],
  isEdited: true,
});
console.log('SQL clauses:', queryRes.clauses);

console.log('--- All tests completed successfully! ---');
