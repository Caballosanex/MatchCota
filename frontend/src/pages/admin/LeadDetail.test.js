import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LEAD_DETAIL_PATH = path.resolve(process.cwd(), 'src/pages/admin/LeadDetail.jsx');
const ADMIN_LAYOUT_PATH = path.resolve(process.cwd(), 'src/layouts/AdminLayout.jsx');
const APP_PATH = path.resolve(process.cwd(), 'src/App.jsx');

function requireFile(pathname, label) {
  if (!existsSync(pathname)) {
    throw new Error(`${label} does not exist yet`);
  }
  return readFileSync(pathname, 'utf8');
}

describe('Lead detail and admin wiring contract', () => {
  it('wires leads routes under admin shell', () => {
    const appSource = requireFile(APP_PATH, 'App.jsx');

    expect(appSource).toContain('path="leads"');
    expect(appSource).toContain('path="leads/:leadId"');
  });

  it('adds sidebar leads link with active-state matching', () => {
    const layoutSource = requireFile(ADMIN_LAYOUT_PATH, 'AdminLayout.jsx');

    expect(layoutSource).toContain('to="/admin/leads"');
    expect(layoutSource).toContain("location.pathname.includes('/admin/leads')");
  });

  it('renders Contact -> Matches -> Questionnaire sections in order', () => {
    const detailSource = requireFile(LEAD_DETAIL_PATH, 'LeadDetail.jsx');

    const contactIndex = detailSource.indexOf('Contact');
    const matchesIndex = detailSource.indexOf('Matches');
    const questionnaireIndex = detailSource.indexOf('Questionnaire');

    expect(contactIndex).toBeGreaterThanOrEqual(0);
    expect(matchesIndex).toBeGreaterThan(contactIndex);
    expect(questionnaireIndex).toBeGreaterThan(matchesIndex);
  });

  it('formats questionnaire groups and label/value rows', () => {
    const detailSource = requireFile(LEAD_DETAIL_PATH, 'LeadDetail.jsx');

    expect(detailSource).toContain('formatQuestionnaireEntries');
    expect(detailSource).toContain('group.groupLabel');
    expect(detailSource).toContain('item.label');
    expect(detailSource).toContain('item.value');
  });
});
