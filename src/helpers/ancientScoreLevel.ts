/**
 * Derive the Ancient Code Score level label from the numeric score.
 * Always computed from score so it stays consistent even when old DB
 * entries have a stale or mismatched stored label.
 */
export function ancientScoreLevel(score: number): string {
    if (score >= 90) return "🟢 Ancient Master";
    if (score >= 70) return "🟡 Skilled Human";
    if (score >= 40) return "🟠 Suspicious";
    return "🔴 Likely AI Generated";
}
