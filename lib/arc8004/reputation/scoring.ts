/**
 * ARC-8004 Trust Scoring
 * Algorithms for calculating agent trust levels
 */

import { TrustLevel } from '../types';

/**
 * Weights for trust level calculation
 */
export const TRUST_WEIGHTS = {
  averageScore: 0.35,      // 35% weight on average rating
  feedbackVolume: 0.20,    // 20% weight on number of feedbacks
  successRate: 0.30,       // 30% weight on transaction success rate
  reliability: 0.05,       // 5% weight on reliability score
  speed: 0.05,             // 5% weight on speed score
  accuracy: 0.05,          // 5% weight on accuracy score
};

/**
 * Thresholds for feedback volume normalization
 */
export const FEEDBACK_VOLUME_THRESHOLDS = {
  min: 5,      // Minimum feedbacks for meaningful score
  optimal: 50, // Optimal number of feedbacks
  max: 200,    // Maximum for normalization
};

/**
 * Calculate trust level (0-100) from reputation data
 */
export function calculateTrustLevel(params: {
  averageScore: number;      // 1-5 scale
  feedbackCount: number;
  successRate: number;       // 0-1 scale
  reliabilityScore?: number; // 1-5 scale
  speedScore?: number;       // 1-5 scale
  accuracyScore?: number;    // 1-5 scale
}): number {
  const {
    averageScore,
    feedbackCount,
    successRate,
    reliabilityScore = 0,
    speedScore = 0,
    accuracyScore = 0,
  } = params;

  // Normalize average score (1-5 to 0-100)
  const normalizedScore = ((averageScore - 1) / 4) * 100;

  // Normalize feedback volume with diminishing returns
  let normalizedVolume = 0;
  if (feedbackCount >= FEEDBACK_VOLUME_THRESHOLDS.min) {
    normalizedVolume = Math.min(
      feedbackCount / FEEDBACK_VOLUME_THRESHOLDS.optimal,
      1
    ) * 100;
  }

  // Normalize success rate (0-1 to 0-100)
  const normalizedSuccess = successRate * 100;

  // Normalize category scores (1-5 to 0-100)
  const normalizedReliability = reliabilityScore > 0 
    ? ((reliabilityScore - 1) / 4) * 100 
    : normalizedScore; // Default to average score

  const normalizedSpeed = speedScore > 0 
    ? ((speedScore - 1) / 4) * 100 
    : normalizedScore;

  const normalizedAccuracy = accuracyScore > 0 
    ? ((accuracyScore - 1) / 4) * 100 
    : normalizedScore;

  // Calculate weighted trust level
  const trustLevel = Math.round(
    normalizedScore * TRUST_WEIGHTS.averageScore +
    normalizedVolume * TRUST_WEIGHTS.feedbackVolume +
    normalizedSuccess * TRUST_WEIGHTS.successRate +
    normalizedReliability * TRUST_WEIGHTS.reliability +
    normalizedSpeed * TRUST_WEIGHTS.speed +
    normalizedAccuracy * TRUST_WEIGHTS.accuracy
  );

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, trustLevel));
}

/**
 * Get trust level label from numeric value
 */
export function getTrustLevelLabel(trustLevel: number): string {
  if (trustLevel >= TrustLevel.EXCELLENT) return 'Excellent';
  if (trustLevel >= TrustLevel.HIGH) return 'High';
  if (trustLevel >= TrustLevel.GOOD) return 'Good';
  if (trustLevel >= TrustLevel.MODERATE) return 'Moderate';
  if (trustLevel >= TrustLevel.LOW) return 'Low';
  return 'Unknown';
}

/**
 * Get trust level enum from numeric value
 */
export function getTrustLevelEnum(trustLevel: number): TrustLevel {
  if (trustLevel >= TrustLevel.EXCELLENT) return TrustLevel.EXCELLENT;
  if (trustLevel >= TrustLevel.HIGH) return TrustLevel.HIGH;
  if (trustLevel >= TrustLevel.GOOD) return TrustLevel.GOOD;
  if (trustLevel >= TrustLevel.MODERATE) return TrustLevel.MODERATE;
  if (trustLevel >= TrustLevel.LOW) return TrustLevel.LOW;
  return TrustLevel.UNKNOWN;
}

/**
 * Calculate success rate from transaction counts
 */
export function calculateSuccessRate(
  totalTransactions: number,
  successfulTransactions: number
): number {
  if (totalTransactions === 0) return 0;
  return successfulTransactions / totalTransactions;
}

/**
 * Calculate average from array of scores
 */
export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Determine if agent meets minimum trust requirements
 */
export function meetsMinimumTrust(
  trustLevel: number,
  minimumRequired: TrustLevel = TrustLevel.LOW
): boolean {
  return trustLevel >= minimumRequired;
}

/**
 * Get trust level color for UI display
 */
export function getTrustLevelColor(trustLevel: number): string {
  if (trustLevel >= TrustLevel.EXCELLENT) return '#22c55e'; // green
  if (trustLevel >= TrustLevel.HIGH) return '#84cc16'; // lime
  if (trustLevel >= TrustLevel.GOOD) return '#eab308'; // yellow
  if (trustLevel >= TrustLevel.MODERATE) return '#f97316'; // orange
  if (trustLevel >= TrustLevel.LOW) return '#ef4444'; // red
  return '#6b7280'; // gray
}








