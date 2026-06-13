import { supabase } from './supabase';

/**
 * Awards points to a user using an atomic database function.
 * Also manages study streaks and automatically grants badges.
 * 
 * @param userId - The ID of the user to award points to.
 * @param action - The action performed (e.g., 'upload_material', 'complete_quiz', 'join_group').
 */
let cachedAllBadges: any[] | null = null;
let lastBadgeFetch = 0;

export async function awardPoints(userId: string, action: string) {
  try {
    // console.log(`[Gamification] Awarding points for action: ${action} to user: ${userId}`);

    // 1. Fetch points configuration from system settings
    const { data: configData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'points_config')
      .maybeSingle();
    
    const config = configData?.value as Record<string, number> || {};
    const pointsToAdd = config[action] || 10;

    // 2. Call the atomic RPC function to increment points and manage streak
    const { data: updatedRecord, error: rpcError } = await supabase.rpc('increment_user_points', {
      u_id: userId,
      points_to_add: pointsToAdd
    });

    if (rpcError) {
      console.error('[Gamification] RPC Error:', rpcError);
      throw rpcError;
    }
    
    const finalRecord = updatedRecord as any;
    if (!finalRecord) {
      console.error('[Gamification] No record returned from increment_user_points');
      return null;
    }

    // 3. Level Up Notification logic (Non-blocking)
    const oldLevel = Math.floor((finalRecord.total_points - pointsToAdd) / 1000) + 1;
    if (finalRecord.level > oldLevel && oldLevel > 0) {
      // Fire and forget
      (async () => {
        try {
          await supabase.from('user_notifications').insert({
            user_id: userId,
            title: 'Level Up! 🚀',
            content: `You've mastered the archives and reached Level ${finalRecord.level}!`,
            type: 'level_up',
            action_data: { level: finalRecord.level }
          });
        } catch (err) {
          console.error('[Gamification] Error inserting level notification:', err);
        }
      })();
    }

    // 4. Automatic Badge Awarding logic
    const now = Date.now();
    if (!cachedAllBadges || (now - lastBadgeFetch > 300000)) { // 5-minute cache
      const { data: fetchedBadges } = await supabase.from('badges').select('*');
      if (fetchedBadges) {
        cachedAllBadges = fetchedBadges;
        lastBadgeFetch = now;
      }
    }

    const { data: userBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId);
    
    const allBadges = cachedAllBadges;
    
    const earnedBadgeIds = new Set((userBadges || []).map(ub => ub.badge_id));
    const newBadges = [];

    if (allBadges) {
      const badgePromises = [];

      for (const badge of allBadges) {
        if (!earnedBadgeIds.has(badge.id)) {
          let awarded = false;
          
          if (badge.name === 'First Steps') {
            awarded = true;
          } else if (badge.name === 'Scholar' && finalRecord.total_points >= 50) {
            awarded = true;
          } else if (badge.name === 'Elite Member' && finalRecord.total_points >= 1000) {
            awarded = true;
          } else if (badge.points_required > 0 && finalRecord.total_points >= badge.points_required) {
            awarded = true;
          }

          if (awarded) {
            newBadges.push({ user_id: userId, badge_id: badge.id });
            // Queue notification for each new badge
            badgePromises.push(
              supabase.from('user_notifications').insert({
                user_id: userId,
                title: 'New Badge Earned! 🏆',
                content: `You've unlocked the "${badge.name}" badge!`,
                type: 'badge_awarded',
                action_data: { badge_id: badge.id, badge_name: badge.name }
              })
            );
          }
        }
      }

      if (newBadges.length > 0) {
        badgePromises.push(supabase.from('user_badges').insert(newBadges));
      }

      // Execute all badge operations in parallel (Non-blocking)
      if (badgePromises.length > 0) {
        Promise.all(badgePromises).catch(err => {
          console.error('[Gamification] Error awarding badges:', err);
        });
      }
    }

    return { 
      success: true,
      pointsAdded: pointsToAdd, 
      finalPoints: finalRecord.total_points,
      newLevel: finalRecord.level,
      newStreak: finalRecord.streak_days,
      badgesEarned: newBadges.length
    };
  } catch (err) {
    console.error('[Gamification] Fatal error in awardPoints:', err);
    return { success: false, error: err };
  }
}
