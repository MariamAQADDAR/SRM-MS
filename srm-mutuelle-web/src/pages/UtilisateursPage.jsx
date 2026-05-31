import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
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
  const n = agentFullName(a);
  return n ? `${m} — ${n}` : m;
}

function agentFullName(agent) {
  if (!agent) return '';
  return `${agent.prenom || ''} ${agent.nom || ''}`.trim();
}

function findAgentById(agents, agentId) {
  if (agentId == null || agentId === '') return null;
  const id = Number(agentId);
  return agents.find((a) => a.id === id) ?? null;
}

function PasswordField({ name = 'password', required = false, label, hint, autoComplete = 'new-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label>
        {label}
        {required ? <span className="required"> *</span> : null}
      </label>
      <div className="password-field-wrap">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          className="form-control password-field-input"
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-field-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <FaIcon name={show ? 'eye-slash' : 'eye'} />
        </button>
      </div>
      {hint ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 8, marginBottom: 0, lineHeight: 1.45 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Formulaire création.
 * Quand rôle = Adhérent : "Nom complet" devient un <select> des agents libres.
 * Quand rôle = Administrateur : un select optionnel permet de lier un agent.
 * Sélectionner un agent remplit fullName et agentId automatiquement.
 */
function UserCreateForm({ agents, agentAdherentByAgentId, onClose, reload, addToast, allowAdminRole }) {
  const [role, setRole] = useState('OPERATEUR');
  const [fullName, setFullName] = useState('');
  const [agentId, setAgentId] = useState('');

  // Seuls les agents sans compte adhérent sont proposés pour Adhérent
  const freeAgents = agents.filter((a) => !agentAdherentByAgentId?.has(a.id));
  const hasFreeAgentForAdherent = freeAgents.length > 0;

  // Les rôles qui peuvent être liés à un agent
  const needsAgentLink = role === 'ADHERENT' || role === 'ADMINISTRATEUR';

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setAgentId('');
    setFullName('');
  };

  const handleAgentChange = (nextAgentId) => {
    setAgentId(nextAgentId);
    const name = agentFullName(findAgentById(agents, nextAgentId));
    if (name) setFullName(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const roleVal = fd.get('role');
    const agentRaw = fd.get('agentId');
    const resolvedAgentId = agentRaw && String(agentRaw).trim() !== '' ? Number(agentRaw) : null;
    const resolvedFullName = (roleVal === 'ADHERENT' || roleVal === 'ADMINISTRATEUR') && fullName
      ? fullName
      : String(fd.get('fullName') || '').trim();

    if (roleVal === 'ADHERENT' && (resolvedAgentId == null || Number.isNaN(resolvedAgentId))) {
      addToast('warning', 'Pour un compte adhérent, choisissez le porteur mutuelle dans la liste.');
      return;
    }
    if (roleVal === 'ADHERENT' && agentAdherentByAgentId?.has(resolvedAgentId)) {
      addToast(
        'warning',
        `Ce porteur a déjà un compte adhérent (${agentAdherentByAgentId.get(resolvedAgentId)}). Choisissez un autre porteur.`,
      );
      return;
    }
    const body = {
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: resolvedFullName,
      role: roleVal,
      agentId: needsAgentLink && resolvedAgentId ? resolvedAgentId : null,
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
        {/* Nom complet : dropdown agents si Adhérent, sinon saisie libre */}
        <div className="form-group">
          <label>
            Nom complet <span className="required">*</span>
          </label>
          {role === 'ADHERENT' ? (
            <>
              <select
                name="agentId"
                className="form-control"
                required
                value={agentId}
                onChange={(e) => handleAgentChange(e.target.value)}
              >
                <option value="" disabled>— Sélectionner un porteur —</option>
                {freeAgents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {formatAgentOption(a)}
                  </option>
                ))}
              </select>
              {agents.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--danger-600)', marginTop: 6, marginBottom: 0 }}>
                  Aucun porteur enregistré. Créez d'abord un agent dans le menu Agents.
                </p>
              ) : freeAgents.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--danger-600)', marginTop: 6, marginBottom: 0 }}>
                  Tous les porteurs ont déjà un compte adhérent. Ajoutez d'abord un nouvel agent.
                </p>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 6, marginBottom: 0 }}>
                  Le nom sera rempli automatiquement depuis le porteur sélectionné.
                </p>
              )}
            </>
          ) : (
            <input
              name="fullName"
              className="form-control"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label>
            Email <span className="required">*</span>
          </label>
          <input name="email" type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" required autoComplete="email" />
        </div>

        <PasswordField label="Mot de passe" required />

        <div className="form-group">
          <label>
            Rôle <span className="required">*</span>
          </label>
          <select name="role" className="form-control" required value={role} onChange={(e) => handleRoleChange(e.target.value)}>
            {allowAdminRole ? <option value="ADMINISTRATEUR">Administrateur</option> : null}
            <option value="OPERATEUR">Opérateur</option>
            <option value="CONSULTATEUR">Consultateur</option>
            <option value="ADHERENT">Adhérent</option>
          </select>
        </div>

        {/* Porteur pour l'Admin (optionnel) */}
        {role === 'ADMINISTRATEUR' && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Porteur mutuelle lié <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>(optionnel)</span></label>
            <select
              name="agentId"
              className="form-control"
              value={agentId}
              onChange={(e) => handleAgentChange(e.target.value)}
            >
              <option value="">— Aucun porteur —</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {formatAgentOption(a)}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 6, marginBottom: 0 }}>
              L'administrateur peut être lié à une fiche agent pour accéder à son espace personnel.
            </p>
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Annuler
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={role === 'ADHERENT' && (agents.length === 0 || !hasFreeAgentForAdherent)}
        >
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );
}

/**
 * Formulaire modification.
 * Quand rôle = Adhérent : "Nom complet" devient un <select> des agents disponibles
 * (libres + l'agent actuellement attribué à cet utilisateur).
 */
function UserEditForm({ urow, agents, agentAdherentByAgentId, onClose, reload, addToast, allowAdminRole }) {
  const [role, setRole] = useState(urow.role || 'OPERATEUR');
  const [fullName, setFullName] = useState(urow.fullName || '');
  const [agentId, setAgentId] = useState(urow.agentId != null ? String(urow.agentId) : '');

  // Agents disponibles : libres + celui actuellement attribué à cet utilisateur
  const availableAgents = agents.filter((a) => !agentAdherentByAgentId?.has(a.id) || a.id === urow.agentId);

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    if (nextRole !== 'ADHERENT') {
      setAgentId('');
    }
  };

  const handleAgentChange = (nextAgentId) => {
    setAgentId(nextAgentId);
    const name = agentFullName(findAgentById(agents, nextAgentId));
    if (name) setFullName(name);
  };

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

  const needsAgentLink = role === 'ADHERENT' || role === 'ADMINISTRATEUR';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const roleVal = fd.get('role');
    const agentRaw = fd.get('agentId');
    const resolvedAgentId = agentRaw && String(agentRaw).trim() !== '' ? Number(agentRaw) : null;
    const resolvedFullName = (roleVal === 'ADHERENT' || roleVal === 'ADMINISTRATEUR') && fullName
      ? fullName
      : String(fd.get('fullName') || '').trim();

    if (roleVal === 'ADHERENT' && (resolvedAgentId == null || Number.isNaN(resolvedAgentId))) {
      addToast('warning', 'Pour un compte adhérent, choisissez le porteur mutuelle dans la liste.');
      return;
    }
    const takenEmail = roleVal === 'ADHERENT' ? agentAdherentByAgentId?.get(resolvedAgentId) : null;
    if (takenEmail && urow.agentId !== resolvedAgentId) {
      addToast('warning', `Ce porteur a déjà un compte adhérent (${takenEmail}). Choisissez un autre porteur.`);
      return;
    }
    const pwdRaw = String(fd.get('password') || '').trim();
    const body = {
      fullName: resolvedFullName,
      role: roleVal,
      agentId: needsAgentLink && resolvedAgentId ? resolvedAgentId : null,
    };
    if (pwdRaw) body.password = pwdRaw;
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
        {/* Nom complet : dropdown agents si Adhérent, sinon saisie libre */}
        <div className="form-group">
          <label>
            Nom complet <span className="required">*</span>
          </label>
          {role === 'ADHERENT' ? (
            <>
              <select
                name="agentId"
                className="form-control"
                required
                value={agentId}
                onChange={(e) => handleAgentChange(e.target.value)}
              >
                <option value="">— Choisir dans la liste —</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {formatAgentOption(a)}
                    {a.id === urow.agentId ? ' — (porteur actuel)' : ''}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 6, marginBottom: 0 }}>
                Le nom est rempli depuis le porteur sélectionné. Un seul compte adhérent par porteur.
              </p>
            </>
          ) : (
            <input
              name="fullName"
              className="form-control"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label>Email</label>
          <input className="form-control" value={urow.email || ''} readOnly style={{ opacity: 0.85, background: 'var(--gray-50)' }} />
        </div>

        <PasswordField
          label="Nouveau mot de passe"
          hint="L'ancien mot de passe ne peut pas être affiché (stockage sécurisé). Saisissez un nouveau mot de passe pour le communiquer à l'utilisateur, ou laissez vide pour ne pas le modifier."
          autoComplete="new-password"
        />

        <div className="form-group">
          <label>
            Rôle <span className="required">*</span>
          </label>
          <select name="role" className="form-control" required value={role} onChange={(e) => handleRoleChange(e.target.value)}>
            {allowAdminRole ? <option value="ADMINISTRATEUR">Administrateur</option> : null}
            <option value="OPERATEUR">Opérateur</option>
            <option value="CONSULTATEUR">Consultateur</option>
            <option value="ADHERENT">Adhérent</option>
          </select>
        </div>

        {/* Porteur pour l'Admin (optionnel) */}
        {role === 'ADMINISTRATEUR' && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Porteur mutuelle lié <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>(optionnel)</span></label>
            <select
              name="agentId"
              className="form-control"
              value={agentId}
              onChange={(e) => handleAgentChange(e.target.value)}
            >
              <option value="">— Aucun porteur —</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {formatAgentOption(a)}
                  {a.id === urow.agentId ? ' — (actuel)' : ''}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 6, marginBottom: 0 }}>
              L'administrateur peut être lié à une fiche agent pour accéder à son espace personnel.
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

  const agentAdherentByAgentId = useMemo(() => {
    const map = new Map();
    for (const u of rows) {
      if (u.role === 'ADHERENT' && u.agentId != null) {
        map.set(u.agentId, u.email);
      }
    }
    return map;
  }, [rows]);

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
    if (!searchQuery.trim()) return rows;
    return rows.filter((u) =>
      matchesSearch(searchQuery, u.fullName, u.email, ROLE_LABEL[u.role] || u.role, u.active ? 'actif' : 'inactif'),
    );
  }, [rows, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRows, searchQuery);

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
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (nom, e-mail, rôle…)"
            searchAriaLabel="Rechercher un utilisateur"
            exportColumns={[
              { key: 'fullName', label: 'Nom' },
              { key: 'email', label: 'E-mail' },
              { key: 'role', label: 'Rôle', value: (u) => ROLE_LABEL[u.role] || u.role },
              { key: 'active', label: 'Actif', value: (u) => (u.active ? 'Oui' : 'Non') },
            ]}
            exportRows={filteredRows}
            exportFilename="utilisateurs"
            trailing={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setModal({
                    title: 'Nouvel utilisateur',
                    content: (
                      <UserCreateForm
                        agents={agents}
                        agentAdherentByAgentId={agentAdherentByAgentId}
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
            }
          />
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
              {pageData.map((u) => {
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
                                agentAdherentByAgentId={agentAdherentByAgentId}
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
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
