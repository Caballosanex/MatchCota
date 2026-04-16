function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundToOneDecimal(value) {
  return Number(value.toFixed(1));
}

export function buildTopMatches(matches = []) {
  return matches.slice(0, 5).map((match) => ({
    animal_id: match.id,
    animal_name: match.name,
    score: toNumber(match.score),
    explanations: Array.isArray(match.explanations) ? match.explanations : [],
  }));
}

export function buildScoreSummary(matches = [], totalAnimals = 0) {
  const topMatches = buildTopMatches(matches);
  const scores = topMatches.map((match) => toNumber(match.score));
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const averageTopFive = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

  return {
    total_animals_evaluated: toNumber(totalAnimals),
    best_score: roundToOneDecimal(bestScore),
    average_top5_score: roundToOneDecimal(averageTopFive),
  };
}

export function buildLeadPayload({ name, email, phone, responses, matches, totalAnimals }) {
  return {
    name,
    email,
    phone,
    questionnaire_responses: responses,
    top_matches: buildTopMatches(matches),
    scores: buildScoreSummary(matches, totalAnimals),
  };
}
