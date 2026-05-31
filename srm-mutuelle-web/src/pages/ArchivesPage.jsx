import { useState, useEffect, useMemo } from 'react';
import FaIcon from '../components/FaIcon';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';

export default function ArchivesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Archives', 'Administration');

  const [archives, setArchives] = useState({
    agents: [],
    proches: [],
    users: [],
    quotes: [],
    reimbursements: [],
    ordonnances: [],
    careEpisodes: [],
    medicines: [],
    medicalFacilities: [],
    contractedDoctors: [],
    orgEntities: [],
    specialDiseases: []
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('agents');

  const loadArchives = async () => {
    setLoading(true);
    try {
      const endpoints = {
        agents: '/api/agents/archived',
        proches: '/api/beneficiaries/archived',
        users: '/api/admin/users/archived',
        quotes: '/api/quotes/archived',
        reimbursements: '/api/reimbursements/archived',
        ordonnances: '/api/ordonnances/archived',
        careEpisodes: '/api/care-episodes/archived',
        medicines: '/api/medicines/archived',
        medicalFacilities: '/api/medical-facilities/archived',
        contractedDoctors: '/api/contracted-doctors/archived',
        orgEntities: '/api/organizational-entities/archived',
        specialDiseases: '/api/special-diseases/archived'
      };

      const keys = Object.keys(endpoints);
      const responses = await Promise.all(
        keys.map(k => apiFetch(endpoints[k]).catch(e => []))
      );
      
      const newArchives = {};
      for (let i = 0; i < keys.length; i++) {
        const res = responses[i];
        if (res && res.ok) {
           newArchives[keys[i]] = await parseJsonOrThrow(res);
        } else if (Array.isArray(res)) {
           newArchives[keys[i]] = res;
        } else {
           newArchives[keys[i]] = [];
        }
      }
      
      setArchives(newArchives);
    } catch (err) {
      addToast('error', 'Impossible de charger les archives : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async (id, type) => {
    if (!window.confirm('Voulez-vous vraiment restaurer cet élément ?')) return;
    try {
      let endpoint = '';
      switch (type) {
        case 'agents': endpoint = `/api/agents/${id}/restore`; break;
        case 'proches': endpoint = `/api/beneficiaries/${id}/restore`; break;
        case 'users': endpoint = `/api/admin/users/${id}/restore`; break;
        case 'quotes': endpoint = `/api/quotes/${id}/restore`; break;
        case 'reimbursements': endpoint = `/api/reimbursements/${id}/restore`; break;
        case 'ordonnances': endpoint = `/api/ordonnances/${id}/restore`; break;
        case 'careEpisodes': endpoint = `/api/care-episodes/${id}/restore`; break;
        case 'medicines': endpoint = `/api/medicines/${id}/restore`; break;
        case 'medicalFacilities': endpoint = `/api/medical-facilities/${id}/restore`; break;
        case 'contractedDoctors': endpoint = `/api/contracted-doctors/${id}/restore`; break;
        case 'orgEntities': endpoint = `/api/organizational-entities/${id}/restore`; break;
        case 'specialDiseases': endpoint = `/api/special-diseases/${id}/restore`; break;
      }
      await apiFetch(endpoint, { method: 'POST' });
      addToast('success', 'Élément restauré avec succès');
      loadArchives();
    } catch (err) {
      addToast('error', 'Erreur lors de la restauration : ' + err.message);
    }
  };

  const filteredData = useMemo(() => {
    const list = archives[activeTab] || [];
    if (!searchQuery.trim()) return list;
    
    return list.filter((item) => {
      return matchesSearch(searchQuery, item.nom, item.prenom, item.matricule, item.cin, item.email, item.numero, item.name, item.fullName, item.code);
    });
  }, [archives, searchQuery, activeTab]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredData, `archives-${activeTab}`);

  const TABS = [
    { id: 'agents', label: 'Agents', icon: 'user-tie', badge: archives.agents.length },
    { id: 'proches', label: 'Bénéficiaires', icon: 'users', badge: archives.proches.length },
    { id: 'users', label: 'Utilisateurs', icon: 'user-shield', badge: archives.users.length },
    { id: 'quotes', label: 'Devis', icon: 'file-invoice', badge: archives.quotes.length },
    { id: 'reimbursements', label: 'Remboursements', icon: 'hand-holding-dollar', badge: archives.reimbursements.length },
    { id: 'ordonnances', label: 'Ordonnances', icon: 'prescription', badge: archives.ordonnances.length },
    { id: 'careEpisodes', label: 'PEC', icon: 'hospital-user', badge: archives.careEpisodes.length },
    { id: 'medicines', label: 'Médicaments', icon: 'pills', badge: archives.medicines.length },
    { id: 'medicalFacilities', label: 'Établissements', icon: 'hospital', badge: archives.medicalFacilities.length },
    { id: 'contractedDoctors', label: 'Médecins', icon: 'user-doctor', badge: archives.contractedDoctors.length },
    { id: 'orgEntities', label: 'Entités', icon: 'sitemap', badge: archives.orgEntities.length },
    { id: 'specialDiseases', label: 'ALD', icon: 'heart-pulse', badge: archives.specialDiseases.length }
  ];

  const renderTableHeader = () => {
    switch (activeTab) {
      case 'agents':
        return <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>CIN</th><th>Situation</th><th>Entité</th><th>Statut</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'proches':
        return <thead><tr><th>Nom</th><th>Prénom</th><th>Type</th><th>CIN</th><th>Date naiss.</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'users':
        return <thead><tr><th>Nom complet</th><th>Email</th><th>Rôle</th><th>Agent rattaché</th><th>Statut</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'quotes':
        return <thead><tr><th>Numéro</th><th>Type</th><th>Montant</th><th>État</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'reimbursements':
        return <thead><tr><th>Numéro</th><th>Montant</th><th>État</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'ordonnances':
        return <thead><tr><th>Numéro</th><th>Date prescription</th><th>Bénéficiaire</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'careEpisodes':
        return <thead><tr><th>Numéro</th><th>Type</th><th>État</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'medicines':
        return <thead><tr><th>Code</th><th>Nom</th><th>Prix réf.</th><th>Remboursement</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'medicalFacilities':
        return <thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'contractedDoctors':
        return <thead><tr><th>Nom</th><th>Prénom</th><th>Spécialité</th><th>Ville</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'orgEntities':
        return <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th className="actions-cell">Actions</th></tr></thead>;
      case 'specialDiseases':
        return <thead><tr><th>Bénéficiaire</th><th>Code Maladie</th><th>Date déclaration</th><th>Statut</th><th className="actions-cell">Actions</th></tr></thead>;
      default:
        return <thead><tr><th>Identifiant / Nom</th><th>Détails</th><th className="actions-cell">Actions</th></tr></thead>;
    }
  };

  const renderRestoreBtn = (id) => (
    <button className="btn btn-primary btn-sm" onClick={() => handleRestore(id, activeTab)} title="Restaurer">
      <FaIcon name="rotate-left" className="fa-inline-icon" /> Restaurer
    </button>
  );

  const renderTableRow = (item) => {
    switch (activeTab) {
      case 'agents':
        return (
          <tr key={item.id}>
            <td><strong>{item.matricule}</strong></td>
            <td>{item.nom}</td>
            <td>{item.prenom}</td>
            <td>{item.cin}</td>
            <td><span className="badge badge-info">{item.situation}</span></td>
            <td>{item.entite}</td>
            <td><span className="badge badge-warning">Supprimé</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'proches':
        return (
          <tr key={item.id}>
            <td><strong>{item.nom}</strong></td>
            <td>{item.prenom}</td>
            <td><span className="badge badge-info">{item.type}</span></td>
            <td>{item.cin || '—'}</td>
            <td>{item.dateNaissance || '—'}</td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'users':
        return (
          <tr key={item.id}>
            <td><strong>{item.fullName}</strong></td>
            <td>{item.email}</td>
            <td><span className="badge badge-primary">{item.role}</span></td>
            <td>{item.agentId || '—'}</td>
            <td><span className="badge badge-warning">Désactivé</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'quotes':
        return (
          <tr key={item.id}>
            <td><strong>{item.numero}</strong></td>
            <td>{item.type}</td>
            <td>{item.montant} DH</td>
            <td><span className="badge badge-info">{item.etat}</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'reimbursements':
        return (
          <tr key={item.id}>
            <td><strong>{item.numero}</strong></td>
            <td>{item.montant} DH</td>
            <td><span className="badge badge-info">{item.etat}</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'ordonnances':
        return (
          <tr key={item.id}>
            <td><strong>{item.numero}</strong></td>
            <td>{item.datePrescription}</td>
            <td>{item.beneficiaryId || '—'}</td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'careEpisodes':
        return (
          <tr key={item.id}>
            <td><strong>{item.numero}</strong></td>
            <td>{item.type}</td>
            <td><span className="badge badge-info">{item.etat}</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'medicines':
        return (
          <tr key={item.id}>
            <td><strong>{item.code}</strong></td>
            <td>{item.nom}</td>
            <td>{item.prixReference} DH</td>
            <td>{item.tauxRemboursement}%</td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'medicalFacilities':
        return (
          <tr key={item.id}>
            <td><strong>{item.nom}</strong></td>
            <td>{item.type}</td>
            <td>{item.ville}</td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'contractedDoctors':
        return (
          <tr key={item.id}>
            <td><strong>{item.nom}</strong></td>
            <td>{item.prenom}</td>
            <td>{item.specialite}</td>
            <td>{item.ville}</td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'orgEntities':
        return (
          <tr key={item.id}>
            <td><strong>{item.code}</strong></td>
            <td>{item.nom}</td>
            <td><span className="badge badge-info">{item.type}</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      case 'specialDiseases':
        return (
          <tr key={item.id}>
            <td><strong>{item.beneficiaryId || '—'}</strong></td>
            <td>{item.diseaseCode}</td>
            <td>{item.declarationDate}</td>
            <td><span className="badge badge-info">{item.status}</span></td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
      default:
        return (
          <tr key={item.id}>
            <td>
              <strong>
                {item.numero || item.matricule || item.name || item.fullName || item.code || `${item.prenom || ''} ${item.nom || ''}`.trim() || item.email}
              </strong>
            </td>
            <td>
              {item.cin && <span className="badge badge-outline" style={{marginRight: '0.5rem'}}>{item.cin}</span>}
              {item.role && <span className="badge badge-info" style={{marginRight: '0.5rem'}}>{item.role}</span>}
              {item.type && <span className="badge badge-outline" style={{marginRight: '0.5rem'}}>{item.type}</span>}
              {item.etat && <span className="badge badge-info" style={{marginRight: '0.5rem'}}>{item.etat}</span>}
              {item.status && <span className="badge badge-info" style={{marginRight: '0.5rem'}}>{item.status}</span>}
              {item.entite && <span>{item.entite}</span>}
              {item.montant != null && <span>Montant: {item.montant}</span>}
            </td>
            <td className="actions-cell">{renderRestoreBtn(item.id)}</td>
          </tr>
        );
    }
  };

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Archives';

  return (
    <>
      <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
          >
            <FaIcon name={tab.icon} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                {tab.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <TablePageShell
        title={`Archives — ${activeTabLabel}`}
        icon="box-archive"
        loading={loading}
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher..."
          />
        }
      >

      <div className="data-table-wrapper">
        <table className="data-table">
          {renderTableHeader()}
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state" style={{ padding: '2rem 0' }}>
                    <div className="empty-icon">
                      <FaIcon name="box-archive" />
                    </div>
                    <h4>Aucune archive</h4>
                    <p>La corbeille est vide ou aucun résultat ne correspond à votre recherche.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((item) => renderTableRow(item))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filteredData.length}
      />
    </TablePageShell>
    </>
  );
}
