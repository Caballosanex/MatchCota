export const QUESTIONNAIRE_GROUPS = {
  housing: { label: 'Habitatge' },
  time: { label: 'Temps i dedicació' },
  family: { label: 'Composició familiar' },
  experience: { label: 'Experiència' },
  preferences: { label: 'Preferències' },
  other: { label: 'Altres respostes' },
};

const QUESTION_KEY_TO_GROUP = {
  housing_type: 'housing',
  outdoor_access: 'housing',
  hours_alone: 'time',
  exercise_time: 'time',
  children: 'family',
  other_pets: 'family',
  experience_level: 'experience',
  energy_preference: 'preferences',
  sociability_preference: 'preferences',
  maintenance_capacity: 'preferences',
};

const QUESTION_LABELS = {
  housing_type: "Tipus d'habitatge",
  outdoor_access: 'Accés a espais exteriors',
  hours_alone: 'Hores sol al dia',
  exercise_time: "Temps diari d'activitat",
  children: 'Nens a casa',
  other_pets: 'Altres animals a casa',
  experience_level: 'Experiència amb animals',
  energy_preference: "Preferència d'energia",
  sociability_preference: 'Preferència de sociabilitat',
  maintenance_capacity: 'Capacitat de manteniment',
};

const GROUP_ORDER = ['housing', 'time', 'family', 'experience', 'preferences', 'other'];

function normalizeQuestionValue(value) {
  if (value === null || value === undefined) {
    return 'No especificat';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'No especificat';
    }
    return value.join(', ');
  }

  if (typeof value === 'string' && value.trim() === '') {
    return 'No especificat';
  }

  return value;
}

export function formatUnknownQuestionLabel(key) {
  return `Pregunta desconeguda (${key})`;
}

export function formatQuestionnaireEntries(rawResponses) {
  if (!rawResponses || typeof rawResponses !== 'object') {
    return [];
  }

  const groupedEntries = new Map();

  Object.entries(rawResponses).forEach(([key, value]) => {
    const groupKey = QUESTION_KEY_TO_GROUP[key] || 'other';
    const label = QUESTION_LABELS[key] || formatUnknownQuestionLabel(key);
    const normalizedValue = normalizeQuestionValue(value);
    const groupLabel = QUESTIONNAIRE_GROUPS[groupKey]?.label || QUESTIONNAIRE_GROUPS.other.label;

    if (!groupedEntries.has(groupKey)) {
      groupedEntries.set(groupKey, {
        groupKey,
        groupLabel,
        items: [],
      });
    }

    groupedEntries.get(groupKey).items.push({
      key,
      label,
      value: normalizedValue,
    });
  });

  return GROUP_ORDER.filter((groupKey) => groupedEntries.has(groupKey)).map((groupKey) => groupedEntries.get(groupKey));
}
