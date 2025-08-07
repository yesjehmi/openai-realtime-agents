import { cardBenefitScenario } from './cardBenefits';
import { mcpIntegrationScenario } from './mcpIntegration';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  cardBenefit: cardBenefitScenario,
  mcpIntegration: mcpIntegrationScenario,
};

export const defaultAgentSetKey = 'mcpIntegration';
