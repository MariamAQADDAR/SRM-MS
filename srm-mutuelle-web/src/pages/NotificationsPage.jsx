import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { isAdherentRole } from '../authUtils';

function formatTs(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

export default function NotificationsPage({ setPageTitle, addToast, onUnreadChanged, onNavigate, user }) {
  setPageTitle('Notifications', 'Boîte de réception');
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/notifications');
      setRows(await parseJsonOrThrow(res));
      const cRes = await apiFetch('/api/notifications/unread-count');
      const c = await parseJsonOrThrow(cRes);
      if (onUnreadChanged) onUnreadChanged(Number(c.count) || 0);
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((n) => matchesSearch(searchQuery, n.notifType, n.body));
  }, [rows, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRows);

  const markRead = async (id) => {
    try {
      await parseJsonOrThrow(await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }));
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  const handleRowClick = async (n) => {
    const type = (n.notifType || '').toUpperCase();
    const isAdh = isAdherentRole(user);
    let target = 'notifications';
    if (type.includes('DEVIS')) {
      target = isAdh ? 'mes-devis' : 'devis';
    } else if (type.includes('REMBOURSEMENT')) {
      target = isAdh ? 'mes-remboursements' : 'remboursements';
    } else if (type.includes('PEC')) {
      target = isAdh ? 'mes-prises-en-charge' : 'prises-en-charge';
    }

    if (!n.read) {
      await markRead(n.id);
    }
    if (onNavigate) {
      onNavigate(target);
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <TablePageShell
      title="Notifications"
      icon="bell"
      toolbar={
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          searchPlaceholder="Rechercher (type, contenu…)"
          exportColumns={[
            { key: 'notifType', label: 'Type' },
            { key: 'body', label: 'Contenu' },
            { key: 'createdAt', label: 'Date', value: (n) => formatTs(n.createdAt) },
            { key: 'read', label: 'Lu', value: (n) => (n.read ? 'Oui' : 'Non') },
          ]}
          exportRows={filteredRows}
          exportFilename="notifications"
          trailing={
            <button type="button" className="btn btn-outline" onClick={reload}>
              <FaIcon name="rotate-right" className="fa-inline-icon" /> Actualiser
            </button>
          }
        />
      }
    >
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Contenu</th>
              <th>Date</th>
              <th>Lu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageData.map((n) => (
              <tr key={n.id} onClick={() => handleRowClick(n)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className="badge badge-info">{n.notifType || 'INFO'}</span>
                </td>
                <td style={{ maxWidth: '420px', whiteSpace: 'pre-wrap' }}>{n.body}</td>
                <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{formatTs(n.createdAt)}</td>
                <td>{n.read ? <span className="badge badge-success">Oui</span> : <span className="badge badge-warning">Non</span>}</td>
                <td className="actions-cell">
                  {!n.read && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                    >
                      Marquer lu
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={{ padding: '16px 20px', color: 'var(--gray-500)' }}>Aucune notification.</p>}
      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </TablePageShell>
  );
}
