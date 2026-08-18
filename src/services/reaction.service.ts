import { supabase } from '../lib/supabase/client';
import type { MessageReaction } from '../lib/supabase/types';

export const ReactionService = {
  /**
   * 1. Toggle emoji reaction on a message (Add if not present, remove if present)
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reaction?: MessageReaction }> {
    try {
      // Check existing reaction
      const { data: existing, error: findErr } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (findErr) {
        console.error('[ReactionService.toggleReaction] Find error:', findErr);
      }

      if (existing) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
        return { added: false };
      } else {
        // Add reaction
        const { data: inserted, error: insertErr } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: userId,
            emoji,
          })
          .select()
          .single();

        if (insertErr || !inserted) {
          throw insertErr;
        }

        return { added: true, reaction: inserted };
      }
    } catch (err: any) {
      console.error('[ReactionService.toggleReaction] Failed:', err);
      throw err;
    }
  },

  /**
   * 2. Get all reactions for a specific message
   */
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ReactionService.getReactions] Error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  },

  /**
   * 3. Remove reaction by its ID
   */
  async removeReaction(reactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', reactionId);

      return !error;
    } catch (err) {
      return false;
    }
  },
};

export default ReactionService;
