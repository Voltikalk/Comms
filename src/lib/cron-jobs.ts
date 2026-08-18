import { runArchiveJob, type ArchiveJobReport } from '../jobs/archive-messages.job';

export interface ScheduledTask {
  name: string;
  schedule: string;
  lastRun?: string;
  lastReport?: ArchiveJobReport;
  isRunning: boolean;
}

class CronScheduler {
  private intervals: Map<string, any> = new Map();
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor() {
    this.tasks.set('weekly-archive', {
      name: 'Еженедельная архивация сообщений',
      schedule: 'Every Sunday at 03:00 AM',
      isRunning: false,
    });
  }

  /**
   * Start weekly automated archiving
   */
  startScheduler(intervalMs = 7 * 24 * 60 * 60 * 1000): void {
    if (this.intervals.has('weekly-archive')) return;

    console.log('[CronScheduler] Initializing automated background schedulers...');

    const timer = setInterval(async () => {
      await this.runTask('weekly-archive');
    }, intervalMs);

    this.intervals.set('weekly-archive', timer);
  }

  /**
   * Run a specific task on-demand
   */
  async runTask(taskName: string): Promise<ArchiveJobReport | null> {
    const task = this.tasks.get(taskName);
    if (!task || task.isRunning) return null;

    task.isRunning = true;
    try {
      if (taskName === 'weekly-archive') {
        const report = await runArchiveJob();
        task.lastRun = report.timestamp;
        task.lastReport = report;
        return report;
      }
      return null;
    } finally {
      task.isRunning = false;
    }
  }

  /**
   * Stop all scheduled timers
   */
  stopScheduler(): void {
    this.intervals.forEach((timer) => clearInterval(timer));
    this.intervals.clear();
    console.log('[CronScheduler] Schedulers stopped.');
  }

  /**
   * Get current tasks status
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }
}

export const cronScheduler = new CronScheduler();
export default cronScheduler;
