import { describe, expect, it } from 'vitest';
import {
  QUESTIONNAIRE_GROUPS,
  formatQuestionnaireEntries,
  formatUnknownQuestionLabel,
} from './questionnaireLabels';

describe('questionnaire label formatter', () => {
  it('exports configured questionnaire groups', () => {
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('housing');
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('time');
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('family');
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('experience');
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('preferences');
    expect(QUESTIONNAIRE_GROUPS).toHaveProperty('other');
  });

  it('formats unknown question keys with deterministic fallback', () => {
    expect(formatUnknownQuestionLabel('custom_unknown')).toBe('Pregunta desconeguda (custom_unknown)');
  });

  it('groups known answers by section with readable labels', () => {
    const grouped = formatQuestionnaireEntries({
      housing_type: 'apartment_large',
      children: 'young',
      maintenance_capacity: 'high',
    });

    expect(grouped).toEqual([
      {
        groupKey: 'housing',
        groupLabel: 'Habitatge',
        items: [
          { key: 'housing_type', label: "Tipus d'habitatge", value: 'apartment_large' },
        ],
      },
      {
        groupKey: 'family',
        groupLabel: 'Composició familiar',
        items: [
          { key: 'children', label: 'Nens a casa', value: 'young' },
        ],
      },
      {
        groupKey: 'preferences',
        groupLabel: 'Preferències',
        items: [
          { key: 'maintenance_capacity', label: 'Capacitat de manteniment', value: 'high' },
        ],
      },
    ]);
  });

  it('keeps unknown keys visible and uses placeholder for empty values', () => {
    const grouped = formatQuestionnaireEntries({
      custom_unknown: null,
      other_pets: [],
    });

    expect(grouped).toEqual([
      {
        groupKey: 'family',
        groupLabel: 'Composició familiar',
        items: [
          { key: 'other_pets', label: 'Altres animals a casa', value: 'No especificat' },
        ],
      },
      {
        groupKey: 'other',
        groupLabel: 'Altres respostes',
        items: [
          {
            key: 'custom_unknown',
            label: 'Pregunta desconeguda (custom_unknown)',
            value: 'No especificat',
          },
        ],
      },
    ]);
  });
});
