'use server';

import { db } from '@/lib/db';
import { deployStates, type NewDeployState, type DeployState } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Save or update a deploy state
 * This is used to persist signed/cancelled transaction states across page refreshes
 */
export async function saveDeployState(params: {
  conversationId: string;
  deployKey: string;
  status: 'signed' | 'cancelled';
  deployHash?: string;
  network: 'testnet' | 'mainnet';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { conversationId, deployKey, status, deployHash, network } = params;

    // Check if deploy state already exists
    const existing = await db
      .select()
      .from(deployStates)
      .where(
        and(
          eq(deployStates.conversationId, conversationId),
          eq(deployStates.deployKey, deployKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing state
      await db
        .update(deployStates)
        .set({
          status,
          deployHash,
          network,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(deployStates.conversationId, conversationId),
            eq(deployStates.deployKey, deployKey)
          )
        );
    } else {
      // Insert new state
      const newState: NewDeployState = {
        conversationId,
        deployKey,
        status,
        deployHash,
        network,
      };

      await db.insert(deployStates).values(newState);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save deploy state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save deploy state',
    };
  }
}

/**
 * Get all deploy states for a conversation
 * Used when loading a conversation to restore transaction states
 */
export async function getDeployStates(
  conversationId: string
): Promise<{ success: boolean; deployStates?: DeployState[]; error?: string }> {
  try {
    const states = await db
      .select()
      .from(deployStates)
      .where(eq(deployStates.conversationId, conversationId));

    return { success: true, deployStates: states };
  } catch (error) {
    console.error('Failed to get deploy states:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deploy states',
    };
  }
}

/**
 * Delete a specific deploy state
 * Useful for cleaning up or cancelling transactions
 */
export async function deleteDeployState(
  conversationId: string,
  deployKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(deployStates)
      .where(
        and(
          eq(deployStates.conversationId, conversationId),
          eq(deployStates.deployKey, deployKey)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Failed to delete deploy state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete deploy state',
    };
  }
}
