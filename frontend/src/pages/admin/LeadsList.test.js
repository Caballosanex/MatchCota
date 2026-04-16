import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LEADS_LIST_PATH = path.resolve(process.cwd(), 'src/pages/admin/LeadsList.jsx');

function getLeadsListSource() {
  if (!existsSync(LEADS_LIST_PATH)) {
    throw new Error('LeadsList.jsx does not exist yet');
  }

  return readFileSync(LEADS_LIST_PATH, 'utf8');
}

describe('LeadsList page contract', () => {
  it('renders required status chips', () => {
    const source = getLeadsListSource();

    expect(source).toContain('All');
    expect(source).toContain('New');
    expect(source).toContain('Contacted');
    expect(source).toContain('Adopted');
    expect(source).toContain('Rejected');
  });

  it('navigates to lead detail route when row is clicked', () => {
    const source = getLeadsListSource();

    expect(source).toContain('navigate(`/admin/leads/${lead.id}`)');
  });

  it('prioritizes email over phone for primary contact display', () => {
    const source = getLeadsListSource();

    expect(source).toContain('lead.email');
    expect(source).toContain('lead.phone');
    expect(source).toContain('No disponible');
  });

  it('contains loading, empty, and error UI copy from spec', () => {
    const source = getLeadsListSource();

    expect(source).toContain('Carregant leads...');
    expect(source).toContain('Encara no hi ha leads');
    expect(source).toContain('No hem pogut carregar els leads. Torna-ho a provar; si persisteix, tanca sessió i torna a entrar.');
  });
});
