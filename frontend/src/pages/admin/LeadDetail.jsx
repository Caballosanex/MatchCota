import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminLeadById } from '../../api/leads';
import { useApi } from '../../hooks/useApi';
import { formatQuestionnaireEntries } from '../../utils/questionnaireLabels';

function getScoreColor(score) {
  if (score >= 80) {
    return 'text-green-700 bg-green-100 border-green-200';
  }

  if (score >= 60) {
    return 'text-amber-700 bg-amber-100 border-amber-200';
  }

  return 'text-orange-700 bg-orange-100 border-orange-200';
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'No proporcionat';
  }

  return value;
}

export default function LeadDetail() {
  const { leadId } = useParams();
  const api = useApi();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function fetchLead() {
      if (!leadId) {
        setError('No hem pogut carregar aquest lead perquè falta l’identificador.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getAdminLeadById(api, leadId);
        if (isCurrent) {
          setLead(data);
        }
      } catch {
        if (isCurrent) {
          setLead(null);
          setError('No hem pogut carregar aquest lead. Torna-ho a provar.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchLead();

    return () => {
      isCurrent = false;
    };
  }, [api, leadId]);

  const questionnaireGroups = useMemo(
    () => formatQuestionnaireEntries(lead?.questionnaire_responses),
    [lead?.questionnaire_responses],
  );

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Carregant lead...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">{error}</div>;
  }

  const matches = Array.isArray(lead?.top_matches) ? lead.top_matches : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-2">
        <Link to="/admin/leads" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tornar als leads
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Detall del lead</h1>
      </header>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</dt>
            <dd className="mt-1 text-sm text-slate-900">{renderValue(lead?.name)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-sm text-slate-900">{renderValue(lead?.email)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telèfon</dt>
            <dd className="mt-1 text-sm text-slate-900">{renderValue(lead?.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comentari</dt>
            <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{renderValue(lead?.message)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500">No matches capturats</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <article key={match.animal_id || `${match.name}-${match.score}`} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{match.name || 'No proporcionat'}</h3>
                    <p className="text-sm text-slate-500">{match.breed || match.species || 'No proporcionat'}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getScoreColor(match.score ?? 0)}`}>
                    {Math.round(match.score ?? 0)}%
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Questionnaire</h2>
        {questionnaireGroups.length === 0 ? (
          <p className="text-sm text-slate-500">Sense respostes registrades</p>
        ) : (
          <div className="space-y-6">
            {questionnaireGroups.map((group) => (
              <div key={group.groupKey} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group.groupLabel}</h3>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {group.items.map((item) => (
                    <div key={item.key} className="grid gap-2 px-4 py-3 sm:grid-cols-2 sm:items-center">
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-sm text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
