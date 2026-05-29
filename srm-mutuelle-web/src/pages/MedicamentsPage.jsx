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

const EXPORT_COLS = [
  { key: 'ean13', label: 'Code EAN13' },
  { key: 'name', label: 'Spécialité' },
  { key: 'therapeuticClass', label: 'Classe thérapeutique' },
  { key: 'form', label: 'Forme' },
  { key: 'presentation', label: 'Présentation' },
  { key: 'type', label: 'Type' },
  { key: 'reimbursedLabel', label: 'Remboursable' },
  { key: 'note', label: 'Note' },
];

function reimbursedBadge(value) {
  return <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>{value ? 'Oui' : 'Non'}</span>;
}

export default function MedicamentsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Médicaments', 'Référentiel médicaments');
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
        name: fd.get('name'),
        ean13: fd.get('ean13') || '',
        therapeuticClass: fd.get('therapeuticClass') || '',
        form: fd.get('form') || '',
        presentation: fd.get('presentation') || '',
        type: fd.get('type') || 'Princeps',
        reimbursed: fd.get('reimbursed') === 'true',
        note: fd.get('note') || '',
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
          <div className="form-group">
            <label>
              Nom de la spécialité <span className="required">*</span>
            </label>
            <input name="name" className="form-control" defaultValue={medicine?.name ?? ''} required />
          </div>
          <div className="form-group">
            <label>Code EAN13</label>
            <input name="ean13" className="form-control" defaultValue={medicine?.ean13 ?? ''} placeholder="611XXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>Classe thérapeutique</label>
            <input name="therapeuticClass" className="form-control" defaultValue={medicine?.therapeuticClass ?? ''} />
          </div>
          <div className="form-group">
            <label>Forme</label>
            <input name="form" className="form-control" defaultValue={medicine?.form ?? ''} placeholder="Comprimé, sirop..." />
          </div>
          <div className="form-group">
            <label>Présentation</label>
            <input name="presentation" className="form-control" defaultValue={medicine?.presentation ?? ''} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" defaultValue={medicine?.type ?? 'Princeps'}>
              <option>Princeps</option>
              <option>Générique</option>
            </select>
          </div>
          <div className="form-group">
            <label>Remboursable</label>
            <select name="reimbursed" className="form-control" defaultValue={String(medicine?.reimbursed ?? true)}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Note / observation</label>
            <textarea name="note" className="form-control" rows={3} defaultValue={medicine?.note ?? ''} />
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
          <DetailItem label="Code EAN13">{m.ean13 || '—'}</DetailItem>
          <DetailItem label="Classe thérapeutique">{m.therapeuticClass || '—'}</DetailItem>
          <DetailItem label="Forme">{m.form || '—'}</DetailItem>
          <DetailItem label="Présentation">{m.presentation || '—'}</DetailItem>
          <DetailItem label="Type">{m.type || '—'}</DetailItem>
          <DetailItem label="Remboursable">{reimbursedBadge(m.reimbursed)}</DetailItem>
          <DetailItem label="Note" fullWidth>
            {m.note || '—'}
          </DetailItem>
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
            searchPlaceholder="Filtrer par code, nom, classe, forme, type, remboursement..."
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
                <th>Spécialité</th>
                <th>Classe</th>
                <th>Forme</th>
                <th>Type</th>
                <th>Remboursable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>
                    Aucun médicament trouvé.
                  </td>
                </tr>
              )}
              {pageData.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.ean13 || '—'}</td>
                  <td>{m.name}</td>
                  <td>{m.therapeuticClass || '—'}</td>
                  <td>{m.form || '—'}</td>
                  <td>{m.type || '—'}</td>
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
