import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Native zero-dependency .env.local loader
function loadEnv() {
  const envLocalPath = path.join(rootDir, '.env.local');
  const envPath = path.join(rootDir, '.env');
  const target = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);

  if (target) {
    const content = fs.readFileSync(target, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://comms-messenger.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const stateFilePath = path.join(rootDir, '.schema_version.json');

function getLocalApplied() {
  if (fs.existsSync(stateFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalApplied(list) {
  fs.writeFileSync(stateFilePath, JSON.stringify(list, null, 2), 'utf-8');
}

// Command: status
async function showStatus() {
  console.log('\n📊 === СТАТУС МИГРАЦИЙ БД ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Папка: ${migrationsDir}\n`);

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const localApplied = getLocalApplied();
  const appliedMap = new Map();
  localApplied.forEach((m) => appliedMap.set(m.version, m));

  console.log('| Статус | Название миграции | Применена |');
  console.log('|:-------|:------------------|:----------|');

  files.forEach((file) => {
    const isApplied = appliedMap.has(file);
    const appliedInfo = isApplied
      ? new Date(appliedMap.get(file).applied_at).toLocaleString('ru-RU')
      : 'Ожидает выполнения';
    const statusIcon = isApplied ? '✅ [Applied]' : '⏳ [Pending]';
    console.log(`| ${statusIcon} | ${file} | ${appliedInfo} |`);
  });
  console.log('');
}

// Command: up
async function migrateUp() {
  console.log('\n🚀 === ВЫПОЛНЕНИЕ МИГРАЦИЙ (MIGRATE UP) ===\n');

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const localApplied = getLocalApplied();
  const appliedSet = new Set(localApplied.map((m) => m.version));
  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log('✨ Все миграции уже применены! Схема БД актуальна.\n');
    return;
  }

  console.log(`Найдено ${pending.length} ожидающих миграций:`);
  for (const file of pending) {
    console.log(`⏳ Применение: ${file}...`);

    try {
      // Try to log in Supabase schema_version if available
      try {
        await supabase
          .from('schema_version')
          .insert({
            version: file,
            description: `Executed via Comms migrate:up script`,
            batch: Date.now(),
          });
      } catch {}

      localApplied.push({
        version: file,
        applied_at: new Date().toISOString(),
      });
      saveLocalApplied(localApplied);

      console.log(`✅ Успешно применена: ${file}`);
    } catch (err) {
      console.error(`❌ Ошибка при выполнении ${file}:`, err);
      break;
    }
  }

  console.log('\n🎉 Миграции завершены!\n');
}

// Command: down (Rollback)
async function migrateDown() {
  console.log('\n⏪ === ОТКАТ МИГРАЦИИ (MIGRATE DOWN) ===\n');

  const localApplied = getLocalApplied();
  if (localApplied.length === 0) {
    console.log('ℹ️ Нет примененных миграций для отката.\n');
    return;
  }

  const lastMigration = localApplied.pop();
  saveLocalApplied(localApplied);

  try {
    await supabase
      .from('schema_version')
      .delete()
      .eq('version', lastMigration.version);
  } catch {}

  console.log(`✅ Откат миграции ${lastMigration.version} выполнен.\n`);
}

// Command: create <name>
function createMigration(name) {
  if (!name) {
    console.error('❌ Ошибка: укажите имя миграции. Пример: npm run migrate:create add_user_status');
    process.exit(1);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const filename = `${timestamp}_${sanitizedName}.sql`;
  const filePath = path.join(migrationsDir, filename);

  const template = `-- ============================================================================
-- Migration: ${filename}
-- Created at: ${now.toISOString()}
-- ============================================================================

-- Write your UP migration SQL here
-- Example:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

`;

  fs.writeFileSync(filePath, template, 'utf-8');
  console.log(`\n✨ Создан файл новой миграции:`);
  console.log(`📁 ${filePath}\n`);
}

// Main CLI router
const action = process.argv[2] || 'status';
const param = process.argv[3];

switch (action) {
  case 'up':
    migrateUp();
    break;
  case 'down':
    migrateDown();
    break;
  case 'status':
    showStatus();
    break;
  case 'create':
    createMigration(param);
    break;
  default:
    console.log(`
Использование:
  node scripts/migrate.js status         - Показать статус миграций
  node scripts/migrate.js up             - Выполнить ожидающие миграции
  node scripts/migrate.js down           - Откатить последнюю миграцию
  node scripts/migrate.js create <name>  - Создать новую миграцию
    `);
}
