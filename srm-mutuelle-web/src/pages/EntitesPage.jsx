import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { canAdminDelete, canStaffMutate } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'code', label: 'Code' },
  { key: 'nom', label: 'Nom' },
  { key: 'type', label: 'Type' },
  { key: 'parentLabel', label: 'Entité parente' },
];

const TYPE_COLORS = {
  'Direction générale': 'badge-primary',
  Direction: 'badge-primary',
  Département: 'badge-info',
  Division: 'badge-warning',
  Service: 'badge-success',
};

const TYPE_ORDER = ['Direction générale', 'Direction', 'Département', 'Division', 'Service'];

const PARENT_TYPE_FOR = {
  'Direction générale': null,
  Direction: 'Direction générale',
  Département: 'Direction',
  Division: 'Département',
  Service: 'Division',
};

function buildTree(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  rows.forEach((r) => {
    const node = byId[r.id];
    if (r.parentId != null && byId[r.parentId]) {
      byId[r.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortNodes = (list) => {
    list.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    list.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function TreeNode({ node, depth, onView, expanded, onToggle }) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  return (
    <li className="org-tree-item">
      <div className="org-tree-row" style={{ paddingLeft: `${8 + depth * 4}px` }} onClick={() => onView(node)}>
        <button
          type="button"
          className={`org-tree-toggle${hasChildren ? '' : ' placeholder'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          aria-label={isOpen ? 'Replier' : 'Déplier'}
        >
          {hasChildren ? <FaIcon name={isOpen ? 'chevron-down' : 'chevron-right'} /> : null}
        </button>
        <span className="org-tree-code">{node.code}</span>
        <span className="org-tree-name">{node.nom}</span>
        <span className={`badge ${TYPE_COLORS[node.type] || 'badge-info'}`}>{node.type}</span>
      </div>
      {hasChildren && isOpen ? (
        <ul className="org-tree-node org-tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onView={onView} expanded={expanded} onToggle={onToggle} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function EntitesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Entités organisationnelles', 'Organigramme SRM Marrakech-Safi');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('tree');
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const entityTypes = getTypeOptions('entityTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/organizational-entities');
      const data = await parseJsonOrThrow(res);
      setRows(data);
      const dg = data.find((x) => x.type === 'Direction générale');
      setExpanded(new Set(dg ? [dg.id] : data.filter((x) => !x.parentId).map((x) => x.id)));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const parentName = (parentId) => {
    if (parentId == null) return '—';
    const p = rows.find((x) => x.id === parentId);
    return p ? p.nom : '—';
  };

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter) list = list.filter((e) => e.type === typeFilter);
    if (searchQuery.trim()) {
      list = list.filter((e) => matchesSearch(searchQuery, e.code, e.nom, e.type, parentName(e.parentId)));
    }
    return list;
  }, [rows, searchQuery, typeFilter]);

  const typeStats = useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return TYPE_ORDER.filter((t) => counts[t]).map((t) => ({ type: t, count: counts[t] }));
  }, [rows]);

  const treeRoots = useMemo(() => buildTree(filteredRows), [filteredRows]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRows, searchQuery);

  const closeModal = () => setModal(null);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(filteredRows.map((r) => r.id)));
  const collapseAll = () => {
    const dg = filteredRows.find((x) => x.type === 'Direction générale');
    setExpanded(new Set(dg ? [dg.id] : []));
  };

  const buildForm = (entity = null) => {
    const isEdit = !!entity;
    const selectedType = entity?.type ?? entityTypes[0];
    const requiredParentType = PARENT_TYPE_FOR[selectedType];
    const parentOptions = rows.filter((ent) => {
      if (entity && ent.id === entity.id) return false;
      if (!requiredParentType) return false;
      return ent.type === requiredParentType;
    });

    const submit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const parentRaw = fd.get('parentId');
      const parentId = parentRaw && String(parentRaw).trim() !== '' ? Number(parentRaw) : null;
      const body = {
        code: fd.get('code'),
        nom: fd.get('nom'),
        type: fd.get('type'),
        parentId,
      };
      try {
        const url = isEdit ? `/api/organizational-entities/${entity.id}` : '/api/organizational-entities';
        const method = isEdit ? 'PUT' : 'POST';
        await parseJsonOrThrow(await apiFetch(url, { method, body }));
        closeModal();
        addToast('success', isEdit ? 'Entité mise à jour' : 'Entité enregistrée');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submit}>
        <p className="form-hint" style={{ marginBottom: 12, color: 'var(--gray-600)', fontSize: 13 }}>
          Hiérarchie : Direction générale → Direction → Département → Division → Service
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>
              Code entité <span className="required">*</span>
            </label>
            <input name="code" className="form-control" placeholder="DIR-XXX" defaultValue={entity?.code ?? ''} required />
          </div>
          <div className="form-group">
            <label>
              Nom entité <span className="required">*</span>
            </label>
            <input name="nom" className="form-control" defaultValue={entity?.nom ?? ''} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" defaultValue={entity?.type ?? entityTypes[0]} required>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Entité parente {requiredParentType ? `(${requiredParentType})` : ''}</label>
            <select
              name="parentId"
              className="form-control"
              defaultValue={entity?.parentId != null ? String(entity.parentId) : ''}
              disabled={!requiredParentType}
            >
              <option value="">{requiredParentType ? '— Choisir —' : '— Racine (DG) —'}</option>
              {parentOptions.map((ent) => (
                <option key={ent.id} value={String(ent.id)}>
                  {ent.code} — {ent.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </form>
    );
  };

  const viewEntity = (entity) => {
    setModal({
      title: entity.nom,
      content: (
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">Code</div>
            <div className="detail-value" style={{ fontFamily: 'monospace' }}>
              {entity.code}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Type</div>
            <div className="detail-value">
              <span className={`badge ${TYPE_COLORS[entity.type] || 'badge-info'}`}>{entity.type}</span>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Entité parente</div>
            <div className="detail-value">{parentName(entity.parentId)}</div>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0', gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Fermer
            </button>
            {canMutate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ title: `Modifier — ${entity.nom}`, content: buildForm(entity) })}
              >
                <FaIcon name="pen-to-square" className="fa-inline-icon" /> Modifier
              </button>
            )}
          </div>
        </div>
      ),
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement de l&apos;organigramme SRM-MS…</div>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal}>
          {modal.content}
        </Modal>
      )}

      <div className="org-stats-row">
        {typeStats.map(({ type, count }) => (
          <span key={type} className="org-stat-chip">
            <span className={`badge ${TYPE_COLORS[type] || 'badge-info'}`}>{type}</span>
            <strong>{count}</strong>
          </span>
        ))}
        <span className="org-stat-chip">
          Total <strong>{rows.length}</strong>
        </span>
      </div>

      <TablePageShell
        title="Organigramme SRM Marrakech-Safi"
        icon="landmark"
        toolbar={
          <div className="table-page-toolbar-row" style={{ flexWrap: 'wrap', gap: 10, width: '100%' }}>
            <div className="org-view-toggle">
              <button type="button" className={viewMode === 'tree' ? 'active' : ''} onClick={() => setViewMode('tree')}>
                <FaIcon name="sitemap" className="fa-inline-icon" /> Arborescence
              </button>
              <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                <FaIcon name="table" className="fa-inline-icon" /> Tableau
              </button>
            </div>
            {viewMode === 'tree' ? (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={expandAll}>
                  Tout déplier
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={collapseAll}>
                  Replier
                </button>
              </>
            ) : null}
            <select className="form-control org-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tous les niveaux</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ListPageToolbar
              searchValue={searchQuery}
              onSearchChange={(e) => setSearchQuery(e.target.value)}
              searchPlaceholder="Rechercher (code, nom, type…)"
              exportColumns={EXPORT_COLS}
              exportRows={filteredRows.map((e) => ({ ...e, parentLabel: parentName(e.parentId) }))}
              exportFilename="organigramme-srm-ms"
              showNew={canMutate}
              newLabel="Nouvelle entité"
              onNew={() => setModal({ title: 'Nouvelle entité', content: buildForm() })}
            />
          </div>
        }
      >
        {viewMode === 'tree' ? (
          <div className="org-tree-panel">
            {treeRoots.length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)' }}>Aucune entité trouvée.</p>
            ) : (
              <ul className="org-tree-node">
                {treeRoots.map((node) => (
                  <TreeNode key={node.id} node={node} depth={0} onView={viewEntity} expanded={expanded} onToggle={toggleExpanded} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Entité parente</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary-600)', fontSize: '13px' }}>
                          {e.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{e.nom}</td>
                      <td>
                        <span className={`badge ${TYPE_COLORS[e.type] || 'badge-info'}`}>{e.type}</span>
                      </td>
                      <td style={{ color: 'var(--gray-500)' }}>{parentName(e.parentId)}</td>
                      <td className="actions-cell">
                        <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewEntity(e)}>
                          <FaIcon name="eye" />
                        </button>
                        {canMutate && (
                          <button
                            className="btn btn-icon btn-edit"
                            type="button"
                            title="Modifier"
                            onClick={() => setModal({ title: `Modifier — ${e.nom}`, content: buildForm(e) })}
                          >
                            <FaIcon name="pen-to-square" />
                          </button>
                        )}
                        {canDelete && (
                          <AdminDeleteButton
                            onClick={() =>
                              adminDeleteRecord({
                                url: `/api/organizational-entities/${e.id}`,
                                label: e.nom,
                                addToast,
                                onSuccess: reload,
                              })
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </TablePageShell>
    </>
  );
}
