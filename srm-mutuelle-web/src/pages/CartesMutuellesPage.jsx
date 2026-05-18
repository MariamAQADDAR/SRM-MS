import React, { useCallback, useEffect, useState } from 'react';
import { isAdherentRole, isStaffWriterRole } from '../authUtils';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';

function linkBadge(label) {
  const map = {
    Titulaire: 'badge-primary',
    Conjoint: 'badge-info',
    Enfant: 'badge-success',
  };
  return <span className={`badge ${map[label] || 'badge-neutral'}`}>{label}</span>;
}

export default function CartesMutuellesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Cartes mutuelles', 'Affiliation famille');
  const isAdherent = isAdherentRole(user);
  const canGenerate = isAdherent || isStaffWriterRole(user);

  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const effectiveAgentId = isAdherent && user?.agentId != null ? String(user.agentId) : selectedAgentId;

  const loadAgents = useCallback(async () => {
    if (isAdherent) return;
    try {
      const list = await parseJsonOrThrow(await apiFetch('/api/agents'));
      setAgents(list);
      if (list.length && !selectedAgentId) {
        setSelectedAgentId(String(list[0].id));
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement porteurs impossible');
    }
  }, [isAdherent, selectedAgentId, addToast]);

  const loadFamily = useCallback(async () => {
    if (!effectiveAgentId) {
      setFamily([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await parseJsonOrThrow(await apiFetch(`/api/mutual-cards/family/${effectiveAgentId}`));
      setFamily(rows);
    } catch (e) {
      addToast('error', e.message || 'Chargement cartes impossible');
      setFamily([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveAgentId, addToast]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const generateCard = async (member) => {
    if (!effectiveAgentId) return;
    const key = member.beneficiaryId ?? 'titulaire';
    setBusyId(key);
    try {
      await parseJsonOrThrow(
        await apiFetch('/api/mutual-cards', {
          method: 'POST',
          body: {
            agentId: Number(effectiveAgentId),
            beneficiaryId: member.beneficiaryId,
          },
        }),
      );
      addToast('success', `Carte générée pour ${member.fullName}`);
      loadFamily();
    } catch (e) {
      addToast('error', e.message || 'Génération impossible');
    } finally {
      setBusyId(null);
    }
  };

  const downloadCard = async (member) => {
    if (!member.cardId) {
      addToast('warning', 'Générez d’abord la carte');
      return;
    }
    try {
      const blob = await apiFetchBlob(`/api/mutual-cards/${member.cardId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Téléchargement impossible');
    }
  };

  const agentLabel = () => {
    if (isAdherent) return null;
    const a = agents.find((x) => String(x.id) === String(effectiveAgentId));
    return a ? `${a.prenom} ${a.nom} (${a.matricule})` : '';
  };

  return (
    <TablePageShell
      title={isAdherent ? 'Mes cartes mutuelles' : 'Cartes mutuelles — famille'}
      icon="id-card"
      toolbar={
        !isAdherent ? (
          <div className="table-page-toolbar-row">
            <label className="form-group" style={{ margin: 0, minWidth: 280 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>Porteur</span>
              <select
                className="form-control"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.matricule} — {a.prenom} {a.nom}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null
      }
    >
      <p className="cartes-intro">
        {isAdherent
          ? 'Générez une carte PDF pour vous (titulaire), votre conjoint et chaque enfant déclaré dans vos bénéficiaires. Les cartes portent le logo officiel SRM-MS.'
          : `Cartes du foyer${agentLabel() ? ` : ${agentLabel()}` : ''}. Une carte par membre (titulaire, conjoint, enfants).`}
      </p>

      {loading ? (
        <div className="card">
          <div className="card-body">Chargement…</div>
        </div>
      ) : family.length === 0 ? (
        <div className="card">
          <div className="card-body cartes-empty">
            <FaIcon name="users" className="fa-inline-icon" />
            <p>
              {isAdherent
                ? 'Aucun bénéficiaire enregistré. Demandez à la mutuelle d’ajouter votre conjoint et vos enfants dans « Bénéficiaires ».'
                : 'Sélectionnez un porteur ou enregistrez des ayants droit.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="cartes-grid">
          {family.map((m) => {
            const busy = busyId === (m.beneficiaryId ?? 'titulaire');
            return (
              <article key={m.beneficiaryId ?? 'titulaire'} className="carte-member-card">
                <div className="carte-member-header">
                  <img src="/srm-company-logo.png" alt="SRM-MS" className="carte-member-logo" />
                  {linkBadge(m.cardLabel)}
                </div>
                <h3 className="carte-member-name">{m.fullName}</h3>
                <ul className="carte-member-meta">
                  <li>
                    <span>CIN</span> {m.cin || '—'}
                  </li>
                  <li>
                    <span>Naissance</span>{' '}
                    {m.dateNaissance ? String(m.dateNaissance).split('-').reverse().join('/') : '—'}
                  </li>
                  <li>
                    <span>Statut</span> {m.hasPdf ? 'Carte émise' : 'Non générée'}
                  </li>
                </ul>
                <div className="carte-member-actions">
                  {canGenerate && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => generateCard(m)}
                    >
                      <FaIcon name="file-pdf" className="fa-inline-icon" />
                      {m.hasPdf ? 'Régénérer' : 'Générer PDF'}
                    </button>
                  )}
                  {m.hasPdf && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadCard(m)}>
                      <FaIcon name="download" className="fa-inline-icon" /> Télécharger
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </TablePageShell>
  );
}
