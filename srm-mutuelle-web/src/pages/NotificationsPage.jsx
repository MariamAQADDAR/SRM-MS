import React, { useEffect, useState } from 'react';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';

function formatTs(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

export default function NotificationsPage({ setPageTitle, addToast, onUnreadChanged }) {
  setPageTitle('Notifications', 'Boîte de réception');
  const [rows, setRows] = useState([]);
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

  const markRead = async (id) => {
    try {
      await parseJsonOrThrow(await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }));
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>
          <FaIcon name="bell" className="fa-inline-icon" /> Messages
        </h3>
        <button type="button" className="btn btn-outline btn-sm" onClick={reload}>
          Actualiser
        </button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Date</th>
                <th>Lu</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td>
                    <span className="badge badge-info">{n.notifType || 'INFO'}</span>
                  </td>
                  <td style={{ maxWidth: '420px', whiteSpace: 'pre-wrap' }}>{n.body}</td>
                  <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{formatTs(n.createdAt)}</td>
                  <td>{n.read ? <span className="badge badge-success">Oui</span> : <span className="badge badge-warning">Non</span>}</td>
                  <td className="actions-cell">
                    {!n.read && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => markRead(n.id)}>
                        Marquer lu
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p style={{ padding: '16px', color: 'var(--gray-500)' }}>Aucune notification.</p>}
      </div>
    </div>
  );
}
