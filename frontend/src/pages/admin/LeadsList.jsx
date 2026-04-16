import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminLeads, LEAD_STATUS_FILTERS } from '../../api/leads';
import { useApi } from '../../hooks/useApi';

const STATUS_LABELS = {
  all: 'All',
  new: 'New',
  contacted: 'Contacted',
  adopted: 'Adopted',
  rejected: 'Rejected',
};

const STATUS_BADGE_STYLES = {
  new: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  contacted: 'bg-amber-100 text-amber-700 border-amber-200',
  adopted: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return 'No disponible';
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('ca-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getPrimaryContact(lead) {
  if (lead.email) {
    return lead.email;
  }

  if (lead.phone) {
    return lead.phone;
  }

  return 'No disponible';
}

function getStatusBadgeClass(status) {
  return STATUS_BADGE_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function LeadsList() {
  const api = useApi();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function fetchLeads() {
      try {
        setLoading(true);
        setError('');
        const data = await getAdminLeads(api, { status: statusFilter });
        if (isCurrent) {
          setLeads(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isCurrent) {
          setLeads([]);
          setError('No hem pogut carregar els leads. Torna-ho a provar; si persisteix, tanca sessió i torna a entrar.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchLeads();

    return () => {
      isCurrent = false;
    };
  }, [api, statusFilter]);

  const chips = useMemo(
    () => LEAD_STATUS_FILTERS.map((status) => ({ status, label: STATUS_LABELS[status] || status })),
    [],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Leads</h1>
        <p className="text-slate-500">Revisa els adoptants interessats i accedeix al detall de cada sol·licitud.</p>
      </header>

      <section className="flex flex-wrap gap-2" aria-label="Filtre per estat">
        {chips.map(({ status, label }) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-indigo-200 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Carregant leads...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">{error}</div>
      ) : null}

      {!loading && !error && leads.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Encara no hi ha leads</h2>
          <p className="mt-2 text-slate-500">
            Quan un adoptant enviï interès després del test, el veuràs aquí. Revisa de nou en uns minuts.
          </p>
        </div>
      ) : null}

      {!loading && !error && leads.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contacte</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estat</th>
                  <th className="px-6 py-3" aria-label="Acció" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    className="group cursor-pointer hover:bg-indigo-50/40"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{lead.name || 'No disponible'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{getPrimaryContact(lead)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatCreatedAt(lead.created_at)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                          lead.status,
                        )}`}
                      >
                        {lead.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-indigo-600">
                      <span className="inline-flex items-center gap-2">
                        Veure detall del lead
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
