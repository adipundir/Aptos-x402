/**
 * ARC-8004 Reputation Module
 * Agent reputation management with trust scoring
 */

export { ReputationRegistry } from './registry';
export {
  calculateTrustLevel,
  getTrustLevelLabel,
  getTrustLevelEnum,
  getTrustLevelColor,
  calculateSuccessRate,
  calculateAverage,
  meetsMinimumTrust,
  TRUST_WEIGHTS,
  FEEDBACK_VOLUME_THRESHOLDS,
} from './scoring';

