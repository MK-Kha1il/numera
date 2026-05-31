// Elite Tutoring & Dynamic Explanation Engine
const { concepts } = require('./knowledgeGraph');

/**
 * Constructs a personalized tutoring explanation.
 * Dynamically injects strategic tips or pitfall alerts if high hesitation/errors are detected in telemetry.
 */
function constructPersonalizedExplanation(conceptId, baseExplanation, userAnalytics = {}) {
  let personalizedText = baseExplanation;

  // Retrieve concept node
  const concept = concepts[conceptId];
  if (!concept) return personalizedText;

  const hesitation = userAnalytics.hesitation_index || 0;
  const successRate = userAnalytics.success_rate !== undefined ? userAnalytics.success_rate : 1.0;

  // 1. High Hesitation: Inject Intuitive Tutoring Strategy
  if (hesitation > 1.5 || successRate < 0.7) {
    let strategicTip = "";
    if (conceptId === "pythagorean") {
      strategicTip = "\n\n💡 **Tutor Insight (Tactical Speed)**: If side lengths are scaled values of primitive triples (like $3,4,5$ or $5,12,13$), multiply the scale factor directly instead of squaring large integers!";
    } else if (conceptId === "linear_two_step") {
      strategicTip = "\n\n💡 **Tutor Insight (Algebraic Order)**: Work backwards by undoing addition or subtraction first, then isolate $x$ by dividing the coefficient. Avoid premature fraction division!";
    } else if (conceptId === "modular_arithmetic") {
      strategicTip = "\n\n💡 **Tutor Insight (Modulo Shortcut)**: Reduce the base modulo $m$ before applying powers to keep numbers small and avoid heavy division arithmetic!";
    } else {
      strategicTip = `\n\n💡 **Tutor Insight (Concept: ${concept.name})**: Recall that applying the inverse operation is the fastest route to isolate variables or solve.`;
    }
    personalizedText = strategicTip + personalizedText;
  }

  // 2. High Error Rate: Inject Common Pitfall Warning
  if (successRate < 0.6 && concept.misconceptions && concept.misconceptions.length > 0) {
    const primaryMisconception = concept.misconceptions[0];
    const pitfallWarning = `\n\n⚠️ **Common Pitfall Alert**: Watch out for the **${primaryMisconception.label}**! Always double-check your signs and operation steps.`;
    personalizedText += pitfallWarning;
  }

  return personalizedText;
}

module.exports = {
  constructPersonalizedExplanation
};
