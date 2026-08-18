import { MessageArchiveService } from '../services/message-archive.service';
import { supabase } from '../lib/supabase/client';

export interface ArchiveJobReport {
  timestamp: string;
  groupMessagesArchived: number;
  dmMessagesArchived: number;
  attachmentsCleaned: number;
  durationMs: number;
}

/**
 * Executes scheduled automated archiving job
 */
export async function runArchiveJob(): Promise<ArchiveJobReport> {
  const startTime = Date.now();
  console.log(`[ArchiveJob] Starting automated message archiving job at ${new Date().toISOString()}...`);

  let groupArchived = 0;
  let dmArchived = 0;
  let attachmentsCleaned = 0;

  try {
    // 1. Fetch room types
    const { data: rooms } = await supabase.from('rooms').select('id, type');

    const groupRoomIds = rooms?.filter((r) => r.type === 'group').map((r) => r.id) || [];
    const dmRoomIds = rooms?.filter((r) => r.type === 'direct').map((r) => r.id) || [];

    // 2. Archive groups (> 365 days)
    for (const rId of groupRoomIds) {
      const res = await MessageArchiveService.archiveOldMessages(365, rId);
      groupArchived += res.archivedCount;
    }

    // 3. Archive DMs (> 30 days)
    for (const rId of dmRoomIds) {
      const res = await MessageArchiveService.archiveOldMessages(30, rId);
      dmArchived += res.archivedCount;
    }

    // 4. Cleanup old attachments (> 730 days / 2 years)
    attachmentsCleaned = await MessageArchiveService.deleteOldAttachments(730);

    const durationMs = Date.now() - startTime;
    console.log(`[ArchiveJob] Completed in ${durationMs}ms: Groups (${groupArchived}), DMs (${dmArchived}), Attachments (${attachmentsCleaned})`);

    return {
      timestamp: new Date().toISOString(),
      groupMessagesArchived: groupArchived,
      dmMessagesArchived: dmArchived,
      attachmentsCleaned,
      durationMs,
    };
  } catch (err) {
    console.error('[ArchiveJob] Job failed with error:', err);
    return {
      timestamp: new Date().toISOString(),
      groupMessagesArchived: groupArchived,
      dmMessagesArchived: dmArchived,
      attachmentsCleaned,
      durationMs: Date.now() - startTime,
    };
  }
}
