import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { confirmAction } from '../utils/swal';

const ROLE_LABEL = {
  ADMINISTRATEUR: 'Administrateur',
  OPERATEUR: 'Opérateur',
  CONSULTATEUR: 'Consultateur',
  ADHERENT: 'Adhérent',
};

export default function UtilisateursPage({ setPageTitle, addToast, user }) {
  setPageTitle('Utilisateurs', 'Administration');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/users');
      setRows(await parseJsonOrThrow(res));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const role = fd.get('role');
    const agentRaw = fd.get('agentId');
    const agentId = agentRaw && String(agentRaw).trim() !== '' ? Number(agentRaw) : null;
    const body = {
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
      role,
      agentId: role === 'ADHERENT' ? agentId : null,
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/admin/users', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'Utilisateur créé !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            Nom complet <span className="required">*</span>
          </label>
          <input name="fullName" className="form-control" required />
        </div>
        <div className="form-group">
          <label>
            Email <span className="required">*</span>
          </label>
          <input name="email" type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" required />
        </div>
        <div className="form-group">
          <label>
            Mot de passe <span className="required">*</span>
          </label>
          <input name="password" type="password" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Rôle</label>
          <select name="role" className="form-control" required>
            <option value="ADMINISTRATEUR">Administrateur</option>
            <option value="OPERATEUR">Opérateur</option>
            <option value="CONSULTATEUR">Consultateur</option>
            <option value="ADHERENT">Adhérent</option>
          </select>
        </div>
        <div className="form-group">
          <label>Agent ID (obligatoire si adhérent)</label>
          <input name="agentId" type="number" className="form-control" placeholder="ex: 1" />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );

  const roleColors = {
    ADMINISTRATEUR: 'badge-danger',
    OPERATEUR: 'badge-primary',
    CONSULTATEUR: 'badge-info',
    ADHERENT: 'badge-warning',
  };

  const toggleActive = async (urow) => {
    try {
      await parseJsonOrThrow(
        await apiFetch(`/api/admin/users/${urow.id}/active`, {
          method: 'PATCH',
          body: { active: !urow.active },
        })
      );
      addToast('success', urow.active ? 'Utilisateur désactivé' : 'Utilisateur activé');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const remove = async (urow) => {
    const confirmed = await confirmAction({
      title: 'Supprimer utilisateur',
      text: `Supprimer ${urow.email} ?`,
      confirmButtonText: 'Oui, supprimer',
    });
    if (!confirmed) return;
    try {
      await parseJsonOrThrow(await apiFetch(`/api/admin/users/${urow.id}`, { method: 'DELETE' }));
      addToast('success', 'Utilisateur supprimé');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const formatLogin = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fr-FR');
    } catch {
      return '—';
    }
  };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  const actifs = rows.filter((u) => u.active).length;

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.content}
        </Modal>
      )}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon red">
            <FaIcon name="user-shield" />
          </div>
          <div className="stat-info">
            <h4>Total utilisateurs</h4>
            <div className="stat-value">{rows.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaIcon name="circle-check" />
          </div>
          <div className="stat-info">
            <h4>Actifs</h4>
            <div className="stat-value">{actifs}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaIcon name="triangle-exclamation" />
          </div>
          <div className="stat-info">
            <h4>Inactifs</h4>
            <div className="stat-value">{rows.length - actifs}</div>
          </div>
        </div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h4 style={{ color: 'var(--gray-700)' }}>
            <FaIcon name="user-shield" className="fa-inline-icon" /> Gestion des accès utilisateurs
          </h4>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => setModal({ title: 'Nouvel utilisateur', content: form })}>
            <FaIcon name="plus" className="fa-inline-icon" /> Nouvel utilisateur
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Dernier accès</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>{u.fullName}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '13px' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${roleColors[u.role] || 'badge-info'}`}>{ROLE_LABEL[u.role] || u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-success' : 'badge-warning'}`}>{u.active ? 'Actif' : 'Inactif'}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{formatLogin(u.lastLoginAt)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button" title="Activer / désactiver" onClick={() => toggleActive(u)}>
                        <FaIcon name="power-off" />
                      </button>
                      <button
                        className="btn btn-icon btn-delete"
                        type="button"
                        title="Supprimer"
                        disabled={(user?.id && u.id === user.id) || (user?.email && u.email === user.email)}
                        onClick={() => remove(u)}
                      >
                        <FaIcon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
