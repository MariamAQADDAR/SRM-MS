import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { isAdminRole } from '../authUtils';
import { confirmDelete } from '../utils/swal';

const ROLE_LABEL = {
  ADMINISTRATEUR: 'Administrateur',
  OPERATEUR: 'Opérateur',
  CONSULTATEUR: 'Consultateur',
  ADHERENT: 'Adhérent',
};

function formatAgentOption(a) {
  const m = a.matricule || '—';
  const n = `${a.prenom || ''} ${a.nom || ''}`.trim();
  return n ? `${m} — ${n}` : m;
}

/** Formulaire création : porteur en liste déroulante si rôle = Adhérent (plus de saisie « Agent ID »). */
function UserCreateForm({ agents, onClose, reload, addToast, allowAdminRole }) {
  const [role, setRole] = useState('OPERATEUR');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const roleVal = fd.get('role');
    const agentRaw = fd.get('agentId');
    const agentId = agentRaw && String(agentRaw).trim() !== '' ? Number(agentRaw) : null;
    if (roleVal === 'ADHERENT' && (agentId == null || Number.isNaN(agentId))) {
      addToast('warning', 'Pour un compte adhérent, choisissez le porteur mutuelle dans la liste.');
      return;
    }
    const body = {
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
      role: roleVal,
      agentId: roleVal === 'ADHERENT' ? agentId : null,
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/admin/users', { method: 'POST', body }));
      onClose();
      addToast('success', 'Utilisateur créé !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            Nom complet <span className="required">*</span>
          </label>
          <input name="fullName" className="form-control" required autoComplete="name" />
        </div>
        <div className="form-group">
          <label>
            Email <span className="required">*</span>
          </label>
          <input name="email" type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" required autoComplete="email" />
        </div>
        <div className="form-group">
          <label>
            Mot de passe <span className="required">*</span>
          </label>
          <input name="password" type="password" className="form-control" required autoComplete="new-password" />
        </div>
        <div className="form-group">
          <label>
            Rôle <span className="required">*</span>
          </label>
          <select name="role" className="form-control" required value={role} onChange={(e) => setRole(e.target.value)}>
            {allowAdminRole ? <option value="ADMINISTRATEUR">Administrateur</option> : null}
            <option value="OPERATEUR">Opérateur</option>
            <option value="CONSULTATEUR">Consultateur</option>
            <option value="ADHERENT">Adhérent</option>
          </select>
        </div>
        {role === 'ADHERENT' && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>
              Porteur mutuelle <span className="required">*</span>
            </label>
            <select name="agentId" className="form-control" required defaultValue="">
              <option value="" disabled>
                — Choisir dans la liste —
              </option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {formatAgentOption(a)}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 8, marginBottom: 0, lineHeight: 1.45 }}>
              Ce compte sera rattaché au dossier de ce porteur (carte mutuelle, remboursements, devis côté adhérent).
            </p>
            {agents.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--danger-600)', marginTop: 8, marginBottom: 0 }}>
                Aucun porteur enregistré. Créez d’abord un agent dans le menu Agents.
              </p>
            ) : null}
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={role === 'ADHERENT' && agents.length === 0}>
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );
}

/** Formulaire modification : même logique porteur / adhérent. */
function UserEditForm({ urow, agents, onClose, reload, addToast, allowAdminRole }) {
  const [role, setRole] = useState(urow.role || 'OPERATEUR');

  if (!allowAdminRole && urow.role === 'ADMINISTRATEUR') {
    return (
      <div>
        <p style={{ marginBottom: 16, lineHeight: 1.5 }}>
          Ce compte est un <strong>administrateur</strong>. Seul un administrateur peut le modifier ou changer son statut.
        </p>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const roleVal = fd.get('role');
    const agentRaw = fd.get('agentId');
    const agentId = agentRaw && String(agentRaw).trim() !== '' ? Number(agentRaw) : null;
    if (roleVal === 'ADHERENT' && (agentId == null || Number.isNaN(agentId))) {
      addToast('warning', 'Pour un compte adhérent, choisissez le porteur mutuelle dans la liste.');
      return;
    }
    const body = {
      fullName: String(fd.get('fullName') || '').trim(),
      role: roleVal,
      agentId: roleVal === 'ADHERENT' ? agentId : null,
    };
    try {
      await parseJsonOrThrow(await apiFetch(`/api/admin/users/${urow.id}`, { method: 'PUT', body }));
      onClose();
      addToast('success', 'Utilisateur mis à jour');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  return (
    <form key={`edit-${urow.id}`} onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            Nom complet <span className="required">*</span>
          </label>
          <input name="fullName" className="form-control" required defaultValue={urow.fullName || ''} autoComplete="name" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-control" value={urow.email || ''} readOnly style={{ opacity: 0.85, background: 'var(--gray-50)' }} />
        </div>
        <div className="form-group">
          <label>
            Rôle <span className="required">*</span>
          </label>
          <select name="role" className="form-control" required value={role} onChange={(e) => setRole(e.target.value)}>
            {allowAdminRole ? <option value="ADMINISTRATEUR">Administrateur</option> : null}
            <option value="OPERATEUR">Opérateur</option>
            <option value="CONSULTATEUR">Consultateur</option>
            <option value="ADHERENT">Adhérent</option>
          </select>
        </div>
        {role === 'ADHERENT' && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>
              Porteur mutuelle <span className="required">*</span>
            </label>
            <select
              name="agentId"
              className="form-control"
              required
              key={`agent-sel-${urow.id}-${role}`}
              defaultValue={urow.agentId != null ? String(urow.agentId) : ''}
            >
              <option value="">— Choisir dans la liste —</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {formatAgentOption(a)}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 8, marginBottom: 0, lineHeight: 1.45 }}>
              L’adhérent ne voit dans l’application que les données de ce porteur.
            </p>
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={role === 'ADHERENT' && agents.length === 0}>
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );
}

export default function UtilisateursPage({ setPageTitle, addToast, user }) {
  setPageTitle('Utilisateurs', 'Administration');
  const allowAdminRole = isAdminRole(user);
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const reload = async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
    try {
      const [resUsers, resAgents] = await Promise.all([apiFetch('/api/admin/users'), apiFetch('/api/agents')]);
      setRows(await parseJsonOrThrow(resUsers));
      setAgents(await parseJsonOrThrow(resAgents));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const roleColors = {
    ADMINISTRATEUR: 'badge-danger',
    OPERATEUR: 'badge-primary',
    CONSULTATEUR: 'badge-info',
    ADHERENT: 'badge-warning',
  };

  const handleActiveChange = async (urow, nextActive) => {
    if (user?.id === urow.id && !nextActive) {
      addToast('warning', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    setTogglingId(urow.id);
    try {
      await parseJsonOrThrow(
        await apiFetch(`/api/admin/users/${urow.id}/active`, {
          method: 'PATCH',
          body: { active: nextActive },
        })
      );
      addToast('success', nextActive ? 'Utilisateur activé' : 'Utilisateur désactivé');
      await reload({ silent: true });
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (urow) => {
    const ok = await confirmDelete({
      itemLabel: urow.email,
      text: `L'utilisateur « ${urow.fullName || urow.email} » sera définitivement supprimé.`,
    });
    if (!ok) return;
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

  const filteredRows = useMemo(() => {
    let r = rows;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (u) =>
          String(u.fullName || '')
            .toLowerCase()
            .includes(q) || String(u.email || '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (roleFilter) r = r.filter((u) => u.role === roleFilter);
    return r;
  }, [rows, searchQuery, roleFilter]);

  const closeModal = () => setModal(null);

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal}>
          {modal.content}
        </Modal>
      )}
      <TablePageShell
        title="Liste des utilisateurs"
        icon="user-shield"
        toolbar={
          <div className="table-page-toolbar-row">
            <div className="table-search-wrap">
              <span className="table-search-icon-btn" aria-hidden>
                <FaIcon name="magnifying-glass" />
              </span>
              <input
                type="search"
                className="form-control table-search-input"
                placeholder="Rechercher par nom ou e-mail…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <select
              className="form-control table-toolbar-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filtrer par rôle"
            >
              <option value="">Tous les rôles</option>
              {Object.keys(ROLE_LABEL).map((key) => (
                <option key={key} value={key}>
                  {ROLE_LABEL[key]}
                </option>
              ))}
            </select>
            <span className="toolbar-spacer" />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setModal({
                  title: 'Nouvel utilisateur',
                  content: (
                    <UserCreateForm
                      agents={agents}
                      onClose={closeModal}
                      reload={reload}
                      addToast={addToast}
                      allowAdminRole={allowAdminRole}
                    />
                  ),
                })
              }
            >
              <FaIcon name="plus" className="fa-inline-icon" /> Nouvel utilisateur
            </button>
          </div>
        }
      >
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
              {filteredRows.map((u) => {
                const isSelf = user?.id === u.id || user?.email === u.email;
                const isTargetAdmin = u.role === 'ADMINISTRATEUR';
                const operatorCannotToggleAdmin = !allowAdminRole && isTargetAdmin;
                const toggleDisabled =
                  togglingId === u.id || (isSelf && u.active) || operatorCannotToggleAdmin;
                return (
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
                      <div className="user-active-toggle-wrap" title={u.active ? 'Compte actif' : 'Compte inactif'}>
                        <label className="user-active-toggle" htmlFor={`user-active-${u.id}`}>
                          <span className="sr-only">{u.active ? 'Désactiver le compte' : 'Activer le compte'}</span>
                          <input
                            id={`user-active-${u.id}`}
                            type="checkbox"
                            role="switch"
                            aria-checked={u.active}
                            checked={!!u.active}
                            disabled={toggleDisabled}
                            onChange={(e) => handleActiveChange(u, e.target.checked)}
                          />
                          <span className="user-active-toggle-slider" aria-hidden />
                        </label>
                      </div>
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Modifier"
                        disabled={!allowAdminRole && isTargetAdmin}
                        onClick={() =>
                          setModal({
                            title: `Modifier — ${u.fullName || u.email}`,
                            content: (
                              <UserEditForm
                                urow={u}
                                agents={agents}
                                onClose={closeModal}
                                reload={reload}
                                addToast={addToast}
                                allowAdminRole={allowAdminRole}
                              />
                            ),
                          })
                        }
                      >
                        <FaIcon name="pen-to-square" />
                      </button>
                      {allowAdminRole ? (
                        <button
                          className="btn btn-icon btn-delete"
                          type="button"
                          title="Supprimer"
                          disabled={isSelf}
                          onClick={() => remove(u)}
                        >
                          <FaIcon name="trash" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TablePageShell>
    </>
  );
}
