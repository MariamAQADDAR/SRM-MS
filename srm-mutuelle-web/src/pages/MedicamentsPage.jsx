import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import DetailView from '../components/DetailView';
import DetailItem from '../components/DetailItem';
import DetailModalFooter from '../components/DetailModalFooter';
import AdminDeleteButton from '../components/AdminDeleteButton';
import { canAdminDelete, canStaffMutate } from '../authUtils';
import { matchesSearch } from '../utils/filterSearch';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { adminDeleteRecord } from '../utils/adminDelete';

// Colonnes de la table USER_COS.MEDICAMENT :
// ID | CODEEAN13 | NOTE | CLASSE_THERAPEUTIQUE | FORME | NOMDELASPECIALITE | OBSERVATION | PRESENTATION | PRINCEPS_OU_GENERIQUE | REMBOURSABLE

const EXPORT_COLS = [
  { key: 'ean13',             label: 'Code EAN13' },
  { key: 'name',              label: 'Nom de la spécialité' },
  { key: 'therapeuticClass',  label: 'Classe thérapeutique' },
  { key: 'form',              label: 'Forme' },
  { key: 'presentation',      label: 'Présentation' },
  { key: 'type',              label: 'Princeps ou Générique' },
  { key: 'reimbursedLabel',   label: 'Remboursable' },
  { key: 'note',              label: 'Note' },
  { key: 'observation',       label: 'Observation' },
];

function reimbursedBadge(value) {
  return <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>{value ? 'Oui' : 'Non'}</span>;
}

function typeBadge(type) {
  if (!type) return '—';
  const cls = type.toLowerCase().includes('generic') || type.toLowerCase().includes('énérique')
    ? 'badge-info'
    : 'badge-primary';
  return <span className={`badge ${cls}`}>{type}</span>;
}

export default function MedicamentsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Médicaments', 'Référentiel médicaments — USER_COS.MEDICAMENT');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/medicines');
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

  const data = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((m) =>
      matchesSearch(
        searchQuery,
        m.ean13,
        m.name,
        m.therapeuticClass,
        m.form,
        m.presentation,
        m.type,
        m.reimbursed ? 'oui remboursable' : 'non non-remboursable',
        m.note,
        m.observation,
      ),
    );
  }, [rows, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(data, searchQuery);
  const closeModal = () => setModal(null);

  const buildForm = (medicine = null) => {
    const isEdit = !!medicine;
    const submit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        // NOMDELASPECIALITE
        name: fd.get('name'),
        // CODEEAN13
        ean13: fd.get('ean13') || '',
        // CLASSE_THERAPEUTIQUE
        therapeuticClass: fd.get('therapeuticClass') || '',
        // FORME
        form: fd.get('form') || '',
        // PRESENTATION
        presentation: fd.get('presentation') || '',
        // PRINCEPS_OU_GENERIQUE
        type: fd.get('type') || 'Princeps',
        // REMBOURSABLE
        reimbursed: fd.get('reimbursed') === 'true',
        // NOTE
        note: fd.get('note') || '',
        // OBSERVATION
        observation: fd.get('observation') || '',
      };
      try {
        const url = isEdit ? `/api/medicines/${medicine.id}` : '/api/medicines';
        const method = isEdit ? 'PUT' : 'POST';
        await parseJsonOrThrow(await apiFetch(url, { method, body }));
        addToast('success', isEdit ? 'Médicament mis à jour' : 'Médicament ajouté');
        closeModal();
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          {/* NOMDELASPECIALITE */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>
              Nom de la spécialité <span className="required">*</span>
            </label>
            <input name="name" className="form-control" defaultValue={medicine?.name ?? ''} required />
          </div>

          {/* CODEEAN13 */}
          <div className="form-group">
            <label>Code EAN13</label>
            <input
              name="ean13"
              className="form-control"
              defaultValue={medicine?.ean13 ?? ''}
              placeholder="6118XXXXXXXXX"
            />
          </div>

          {/* PRINCEPS_OU_GENERIQUE */}
          <div className="form-group">
            <label>Princeps ou Générique</label>
            <input
              list="med-type-list"
              name="type"
              className="form-control"
              defaultValue={medicine?.type ?? 'Princeps'}
              placeholder="Princeps, Générique..."
            />
            <datalist id="med-type-list">
              <option value="Princeps" />
              <option value="Générique" />
            </datalist>
          </div>

          {/* CLASSE_THERAPEUTIQUE */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Classe thérapeutique</label>
            <input
              name="therapeuticClass"
              className="form-control"
              defaultValue={medicine?.therapeuticClass ?? ''}
              placeholder="Ex : ANTIHYPERTENSEUR, GLYCOPEPTIDE..."
            />
          </div>

          {/* FORME */}
          <div className="form-group">
            <label>Forme</label>
            <input
              name="form"
              className="form-control"
              defaultValue={medicine?.form ?? ''}
              placeholder="Ex : COMPRIMÉ PELLICULÉ, SIROP..."
            />
          </div>

          {/* PRESENTATION */}
          <div className="form-group">
            <label>Présentation</label>
            <input
              name="presentation"
              className="form-control"
              defaultValue={medicine?.presentation ?? ''}
              placeholder="Ex : 1 BOITE 28 COMPRIMÉS..."
            />
          </div>

          {/* REMBOURSABLE */}
          <div className="form-group">
            <label>Remboursable</label>
            <select name="reimbursed" className="form-control" defaultValue={String(medicine?.reimbursed ?? true)}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>

          {/* NOTE */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Note</label>
            <textarea name="note" className="form-control" rows={2} defaultValue={medicine?.note ?? ''} />
          </div>

          {/* OBSERVATION */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Observation</label>
            <textarea
              name="observation"
              className="form-control"
              rows={2}
              defaultValue={medicine?.observation ?? ''}
            />
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

  const viewMedicine = (m) => {
    setModal({
      title: m.name,
      variant: 'detail',
      content: (
        <DetailView
          footer={
            <DetailModalFooter
              onClose={closeModal}
              canEdit={canMutate}
              onEdit={() => setModal({ title: `Modifier — ${m.name}`, content: buildForm(m) })}
            />
          }
        >
          {/* CODEEAN13 */}
          <DetailItem label="Code EAN13">
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.ean13 || '—'}</span>
          </DetailItem>
          {/* CLASSE_THERAPEUTIQUE */}
          <DetailItem label="Classe thérapeutique">{m.therapeuticClass || '—'}</DetailItem>
          {/* FORME */}
          <DetailItem label="Forme">{m.form || '—'}</DetailItem>
          {/* PRESENTATION */}
          <DetailItem label="Présentation">{m.presentation || '—'}</DetailItem>
          {/* PRINCEPS_OU_GENERIQUE */}
          <DetailItem label="Princeps ou Générique">{typeBadge(m.type)}</DetailItem>
          {/* REMBOURSABLE */}
          <DetailItem label="Remboursable">{reimbursedBadge(m.reimbursed)}</DetailItem>
          {/* NOTE */}
          <DetailItem label="Note" fullWidth>{m.note || '—'}</DetailItem>
          {/* OBSERVATION */}
          <DetailItem label="Observation" fullWidth>{m.observation || '—'}</DetailItem>
        </DetailView>
      ),
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal} variant={modal.variant}>
          {modal.content}
        </Modal>
      )}
      <TablePageShell
        title="Référentiel des médicaments"
        icon="pills"
        className="medicines-page"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Filtrer par EAN13, nom, classe, forme, type, remboursement..."
            exportColumns={EXPORT_COLS}
            exportRows={data.map((m) => ({ ...m, reimbursedLabel: m.reimbursed ? 'Oui' : 'Non' }))}
            exportFilename="medicaments"
            showNew={canMutate}
            newLabel="Nouveau médicament"
            onNew={() => setModal({ title: 'Nouveau médicament', content: buildForm() })}
          />
        }
      >
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code EAN13</th>
                <th>Nom de la spécialité</th>
                <th>Classe thérapeutique</th>
                <th>Forme</th>
                <th>Présentation</th>
                <th>Princeps / Gén.</th>
                <th>Remboursable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                    Aucun médicament trouvé.
                  </td>
                </tr>
              )}
              {pageData.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{m.ean13 || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-600)' }}>{m.therapeuticClass || '—'}</td>
                  <td>{m.form || '—'}</td>
                  <td style={{ fontSize: 12 }}>{m.presentation || '—'}</td>
                  <td>{typeBadge(m.type)}</td>
                  <td>{reimbursedBadge(m.reimbursed)}</td>
                  <td className="actions-cell">
                    <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewMedicine(m)}>
                      <FaIcon name="eye" />
                    </button>
                    {canMutate && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Modifier"
                        onClick={() => setModal({ title: `Modifier — ${m.name}`, content: buildForm(m) })}
                      >
                        <FaIcon name="pen-to-square" />
                      </button>
                    )}
                    {canDelete && (
                      <AdminDeleteButton
                        onClick={() =>
                          adminDeleteRecord({
                            url: `/api/medicines/${m.id}`,
                            label: m.name,
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
      </TablePageShell>
    </>
  );
}
