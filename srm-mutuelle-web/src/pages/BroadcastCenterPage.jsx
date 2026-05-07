import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { confirmAction } from '../utils/swal';

function formatTs(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

export default function BroadcastCenterPage({ setPageTitle, addToast }) {
  setPageTitle('Centre de publication', 'Notifications');
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [dRes, allRes] = await Promise.all([apiFetch('/api/notification-broadcasts/drafts'), apiFetch('/api/notification-broadcasts')]);
      const all = await parseJsonOrThrow(allRes);
      setDrafts(await parseJsonOrThrow(dRes));
      setPublished(all.filter((b) => b.status === 'PUBLISHED'));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      body: fd.get('body') || '',
      audience: fd.get('audience'),
    };
    try {
      if (id) {
        await parseJsonOrThrow(await apiFetch(`/api/notification-broadcasts/${id}`, { method: 'PUT', body }));
      } else {
        await parseJsonOrThrow(await apiFetch('/api/notification-broadcasts', { method: 'POST', body }));
      }
      setModal(null);
      addToast('success', 'Brouillon enregistré');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const editor = (b) => (
    <form onSubmit={(e) => submit(e, b?.id || null)}>
      <div className="form-group">
        <label>Titre</label>
        <input name="title" className="form-control" defaultValue={b?.title || ''} required />
      </div>
      <div className="form-group">
        <label>Corps</label>
        <textarea name="body" className="form-control" rows={5} defaultValue={b?.body || ''} />
      </div>
      <div className="form-group">
        <label>Audience</label>
        <select name="audience" className="form-control" defaultValue={b?.audience || 'ALL_ADHERENTS'} required>
          <option value="ALL_ADHERENTS">Tous les adhérents</option>
          <option value="ALL_USERS">Tous les utilisateurs</option>
        </select>
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer brouillon
        </button>
      </div>
    </form>
  );

  const publish = async (id) => {
    const confirmed = await confirmAction({
      title: 'Publier annonce',
      text: 'Publier cette annonce ? Les destinataires recevront une notification.',
      confirmButtonText: 'Oui, publier',
    });
    if (!confirmed) return;
    try {
      await parseJsonOrThrow(await apiFetch(`/api/notification-broadcasts/${id}/publish`, { method: 'POST' }));
      addToast('success', 'Publié');
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.content}
        </Modal>
      )}
      <div className="toolbar">
        <div className="toolbar-right" style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setModal({ title: 'Nouveau brouillon', content: editor(null) })}>
            <FaIcon name="plus" className="fa-inline-icon" /> Nouveau brouillon
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h3>Brouillons</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Audience</th>
                  <th>Créé</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: '600' }}>{b.title}</td>
                    <td>
                      <span className="badge badge-info">{b.audience}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{formatTs(b.createdAt)}</td>
                    <td className="actions-cell">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ title: 'Modifier brouillon', content: editor(b) })}>
                        Modifier
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => publish(b.id)}>
                        Publier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {drafts.length === 0 && <p style={{ padding: '16px', color: 'var(--gray-500)' }}>Aucun brouillon.</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Historique (publiés)</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Audience</th>
                  <th>Publié le</th>
                </tr>
              </thead>
              <tbody>
                {published.map((b) => (
                  <tr key={b.id}>
                    <td>{b.title}</td>
                    <td>
                      <span className="badge badge-success">{b.audience}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{formatTs(b.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {published.length === 0 && <p style={{ padding: '16px', color: 'var(--gray-500)' }}>Aucune publication.</p>}
        </div>
      </div>
    </>
  );
}
