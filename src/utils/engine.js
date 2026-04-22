/**
 * Content-Based Filtering Engine
 * ================================
 * Algorithm:
 *  1. Min-Max Normalize all features across the known dataset range
 *  2. Build normalized vectors for both user preferences and each phone
 *  3. Compute weighted Euclidean distance between user vector and each phone vector
 *  4. Apply a "Dealbreaker" weight multiplier to one chosen feature
 *  5. Convert distance to a match percentage (closer = higher %)
 *  6. Sort ascending by distance and return top N results
 */

import { FEATURE_CONFIG, ALL_FEATURES } from '../api/mobileData.js';

// ─── Step 1: Min-Max Normalization ────────────────────────────────────────────
function normalize(feature, value) {
  const { min, max } = FEATURE_CONFIG[feature];
  if (max === min) return 0;
  // Clamp value to range to handle data outside config bounds
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

// ─── Step 2: Build Normalized Vectors ─────────────────────────────────────────
function buildVector(obj) {
  return ALL_FEATURES.map(feature => normalize(feature, obj[feature] || 0));
}

// ─── Step 3 & 4: Weighted Euclidean Distance ──────────────────────────────────
function weightedEuclidean(vecA, vecB, dealbreaker = null) {
  const DEALBREAKER_WEIGHT = 5.0;
  const DEFAULT_WEIGHT = 1.0;

  const sumOfSquares = ALL_FEATURES.reduce((sum, feature, i) => {
    const weight = feature === dealbreaker ? DEALBREAKER_WEIGHT : DEFAULT_WEIGHT;
    const diff = vecA[i] - vecB[i];
    return sum + weight * diff * diff;
  }, 0);

  return Math.sqrt(sumOfSquares);
}

// ─── Step 5: Distance → Match Percentage ──────────────────────────────────────
function distanceToPercent(distance, maxDistance) {
  if (maxDistance === 0) return 100;
  const pct = Math.round((1 - distance / maxDistance) * 100);
  return Math.max(0, pct);
}

// ─── Main Recommendation Function ─────────────────────────────────────────────
/**
 * Runs the full content-based filtering pipeline.
 * 
 * @param {Object[]} phoneList - The dataset to search against
 * @param {Object} userPrefs - User preference object
 * @param {string|null} dealbreaker - Priority feature
 */
export function getRecommendations(phoneList, userPrefs, dealbreaker = null) {
  if (!phoneList || phoneList.length === 0) return [];
  
  const userVector = buildVector(userPrefs);

  const scored = phoneList.map(phone => {
    const phoneVector = buildVector(phone);
    const distance = weightedEuclidean(userVector, phoneVector, dealbreaker);
    return { phone, distance };
  });

  // Sort ascending by distance (closest = best match)
  scored.sort((a, b) => a.distance - b.distance);

  // Compute match percentages relative to the worst match in the list
  const maxDistance = scored[scored.length - 1].distance;

  const results = scored.map(item => ({
    ...item,
    matchPercent: distanceToPercent(item.distance, maxDistance),
  }));

  return results;
}

/**
 * Selects the 3 UI "slots" from the sorted recommendations:
 */
export function selectTop3(recommendations) {
  if (!recommendations || recommendations.length === 0) return null;
  
  const perfect = recommendations[0];
  const perfectPrice = perfect.phone.price;

  const budgetCandidates  = recommendations.slice(1).filter(r => r.phone.price < perfectPrice);
  const premiumCandidates = recommendations.slice(1).filter(r => r.phone.price > perfectPrice);

  const budget  = budgetCandidates.length  > 0 ? budgetCandidates[0]  : (recommendations[1] || perfect);
  const premium = premiumCandidates.length > 0 ? premiumCandidates[0] : (recommendations[2] || recommendations[1] || perfect);

  return { perfect, budget, premium };
}
