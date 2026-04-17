import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateLeadForm } from './MatchResults';

const MATCH_RESULTS_PATH = path.resolve(process.cwd(), 'src/pages/public/MatchResults.jsx');

function getMatchResultsSource() {
  if (!existsSync(MATCH_RESULTS_PATH)) {
    throw new Error('MatchResults.jsx does not exist yet');
  }

  return readFileSync(MATCH_RESULTS_PATH, 'utf8');
}

describe('MatchResults lead capture contract', () => {
  it('renders no-results fallback copy when results are missing', () => {
    const source = getMatchResultsSource();

    expect(source).toContain('No hi ha resultats');
    expect(source).toContain('Fer el test');
  });

  it('keeps results section before the lead form section', () => {
    const source = getMatchResultsSource();

    const resultsHeading = source.indexOf('Els teus millors matches!');
    const formHeading = source.indexOf("T'ha agradat algun match? Deixa'ns el teu contacte");

    expect(resultsHeading).toBeGreaterThanOrEqual(0);
    expect(formHeading).toBeGreaterThan(resultsHeading);
  });

  it('renders explicit top-match hero and compact secondary grid hierarchy', () => {
    const source = getMatchResultsSource();

    expect(source).toContain('const [topMatch, ...secondaryMatches] = matches;');
    expect(source).toContain('El teu millor match');
    expect(source).toContain('grid gap-4 sm:grid-cols-2 lg:grid-cols-3');
    expect(source).toContain('secondaryMatches.map((match) =>');
  });

  it('enforces name plus one contact medium validation', () => {
    expect(validateLeadForm({ name: '', email: '', phone: '' })).toEqual({
      name: 'El nom es obligatori.',
      contact: 'Introdueix email o telefon perque et puguin contactar.',
    });

    expect(validateLeadForm({ name: 'Ada', email: 'ada@test.com', phone: '' })).toEqual({});
    expect(validateLeadForm({ name: 'Ada', email: '', phone: '600000000' })).toEqual({});
  });

  it('renders confirmation copy and CTAs behind success branch', () => {
    const source = getMatchResultsSource();

    expect(source).toContain('isSubmitted ? (');
    expect(source).toContain('Gracies! Hem rebut el teu interes');
    expect(source).toContain('Veure tots els animals');
    expect(source).toContain('Veure perfil del millor match');
  });

  it('keeps failure inline copy and does not clear typed values in catch path', () => {
    const source = getMatchResultsSource();

    expect(source).toContain('No hem pogut enviar el teu interes. Revisa les dades i torna-ho a provar.');
    expect(source).toContain("const [name, setName] = useState('');");
    expect(source).toContain("const [email, setEmail] = useState('');");
    expect(source).toContain("const [phone, setPhone] = useState('');");
    expect(source).not.toContain("setName('')");
    expect(source).not.toContain("setEmail('')");
    expect(source).not.toContain("setPhone('')");
  });
});
