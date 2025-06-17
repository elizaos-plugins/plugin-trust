import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type UUID,
  logger,
  type ActionExample,
  parseJSONObjectFromText,
} from '@elizaos/core';
import { TrustEvidenceType, type TrustInteraction } from '../types/trust';

export const recordTrustInteractionAction: Action = {
  name: 'RECORD_TRUST_INTERACTION',
  description: 'Records a trust-affecting interaction between entities',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const trustEngine = runtime.getService('trust-engine');
    return !!trustEngine;
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const trustEngine = runtime.getService('trust-engine') as any;

    if (!trustEngine) {
      throw new Error('Trust engine service not available');
    }

    // Parse the interaction details from the message
    const text = message.content.text || '';
    const parsed = parseJSONObjectFromText(text);
    const parsedContent = parsed as {
      type?: string;
      targetEntityId?: string;
      impact?: number;
      description?: string;
      verified?: boolean;
    } | null;

    if (!parsedContent || !parsedContent.type) {
      return {
        text: 'Could not parse trust interaction details. Please provide type and optionally: targetEntityId, impact, description',
        error: true,
      };
    }

    // Extract interaction data from the parsed content
    const evidenceType = parsedContent.type as TrustEvidenceType;
    const targetEntityId = parsedContent.targetEntityId as UUID;
    const impact = parsedContent.impact as number;

    // Validate the evidence type - use case-insensitive comparison
    const validTypes = Object.values(TrustEvidenceType);
    const normalizedType = evidenceType?.toUpperCase();
    const matchedType = validTypes.find(type => type.toUpperCase() === normalizedType);
    
    if (!matchedType) {
      logger.error('[RecordTrustInteraction] Invalid evidence type:', evidenceType);
      return {
        text: `Invalid interaction type. Valid types are: ${validTypes.join(', ')}`,
        error: true,
      };
    }

    // Use default values if not provided
    const finalTargetEntityId = targetEntityId || runtime.agentId;
    const finalImpact = impact ?? 10; // Default impact value

    // Create trust interaction record
    const interaction: TrustInteraction = {
      sourceEntityId: message.entityId,
      targetEntityId: finalTargetEntityId,
      type: matchedType,
      timestamp: Date.now(),
      impact: finalImpact,
      details: {
        description: parsedContent.description || `Trust interaction: ${matchedType}`,
        messageId: message.id,
        roomId: message.roomId,
      },
      context: {
        evaluatorId: runtime.agentId,
        roomId: message.roomId,
      },
    };

    try {
      await trustEngine.recordInteraction(interaction);

      logger.info('[RecordTrustInteraction] Recorded interaction:', {
        type: matchedType,
        source: message.entityId,
        target: interaction.targetEntityId,
        impact: interaction.impact,
      });

      return {
        text: `Trust interaction recorded: ${matchedType} with impact ${interaction.impact > 0 ? '+' : ''}${interaction.impact}`,
        data: {
          interaction,
          success: true,
        },
      };
    } catch (error) {
      logger.error('[RecordTrustInteraction] Error recording interaction:', error);
      return {
        text: 'Failed to record trust interaction. Please try again.',
        error: true,
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Record that Alice kept their promise to help with the project',
        },
      },
      {
        name: 'Agent',
        content: {
          text: 'Trust interaction recorded: PROMISE_KEPT with impact +15',
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Log suspicious behavior from Bob who is spamming the channel',
        },
      },
      {
        name: 'Agent',
        content: {
          text: 'Trust interaction recorded: SPAM_BEHAVIOR with impact -10',
        },
      },
    ],
  ],

  similes: [
    'record trust event',
    'log trust interaction',
    'track behavior',
    'note trustworthy action',
    'report suspicious activity',
    'document promise kept',
    'mark helpful contribution',
  ],
};
