import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { canAdminDelete, isAdherentRole, isStaffWriterRole } from '../authUtils';
import WorkflowSteps from '../components/WorkflowSteps';
import { PEC_WORKFLOW_STEPS, resolvePecWorkflow } from '../utils/workflowSteps';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import SearchableSelect from '../components/SearchableSelect';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import { apiFetch, apiFetchBlob, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'numero', label: 'N°' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomPrenomAgent', label: 'Agent' },
  { key: 'typePrestation', label: 'Type' },
  { key: 'beneficiaire', label: 'Bénéficiaire' },
  { key: 'etablissement', label: 'Établissement' },
  { key: 'dateDebut', label: 'Début' },
  { key: 'dateFin', label: 'Fin' },
  { key: 'statut', label: 'Statut' },
  { key: 'montantDemande', label: 'Montant demandé' },
  { key: 'montantPec', label: 'Montant PEC' },
];

function statusBadge(statut) {
  const map = {
    Approuvé: 'badge-success',
    'En cours': 'badge-primary',
    'En attente': 'badge-warning',
    Clôturé: 'badge-info',
    Rejeté: 'badge-danger',
  };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function DetailSection({ title, icon, children }) {
  return (
    <section className="pec-detail-section">
      <div className="pec-detail-section-title">
        <FaIcon name={icon} className="fa-inline-icon" />
        {title}
      </div>
      <div className="detail-grid detail-grid--modal">{children}</div>
    </section>
  );
}

function mapRow(r, agentById) {
  const agent = agentById[r.agentId];
  return {
    ...r,
    matricule: agent?.matricule || '—',
    nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : r.beneficiaire,
    montantPec: r.montantPrisEnCharge,
    tauxDisplay: r.taux != null ? `${r.taux} %` : '—',
    dateDepot: r.depositDate || r.dateDebut,
    dateEnvoi: r.sentDate || null,
    dateReponse: r.responseDate || null,
    observation: r.observation || '—',
  };
}

function WizardSteps({ step }) {
  const labels = ['1. Informations', '2. Montant & justificatif', '3. Confirmation'];
  return (
    <div className="reimb-wizard-steps">
      {labels.map((label, i) => {
        const n = i + 1;
        let cls = 'reimb-wizard-step';
        if (n === step) cls += ' reimb-wizard-step--active';
        else if (n < step) cls += ' reimb-wizard-step--done';
        return (
          <div key={label} className={cls}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function PrisesEnChargePage({ setPageTitle, addToast, user, personalMode = false }) {
  const isRealAdherent = isAdherentRole(user);
  const effectiveAdherent = personalMode || isRealAdherent;
  setPageTitle(
    personalMode ? 'Mes prises en charge' : 'Prises en charge',
    personalMode ? 'Mon espace — PEC' : 'Demandes de prise en charge',
  );
  const canMutate = isStaffWriterRole(user);
  const canDelete = canAdminDelete(user);
  const isAdherent = effectiveAdherent;
  const canCreate = isAdherent || canMutate;
  const careTypes = getTypeOptions('careTypes');

  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDraft, setWizardDraft] = useState({
    agentId: '',
    beneficiaire: '',
    typePrestation: '',
    etablissement: '',
    montantDemande: '',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    observation: '',
  });
  const [reviewMontant, setReviewMontant] = useState('');
  const [reviewObs, setReviewObs] = useState('');

  const effectiveAgentId = user?.agentId || null;
  const myAgent = effectiveAgentId ? Number(effectiveAgentId) : null;

  const reload = async () => {
    setLoading(true);
    try {
      const reqs = [apiFetch('/api/care-episodes'), apiFetch('/api/agents'), apiFetch('/api/medical-facilities')];
      if (myAgent) reqs.push(apiFetch(`/api/beneficiaries?agentId=${myAgent}`));
      const out = await Promise.all(reqs.map((p) => p.then((r) => parseJsonOrThrow(r))));
      setRows(out[0]);
      setAgents(out[1]);
      setFacilities(out[2]);
      if (myAgent && out[3]) {
        setBeneficiaries(out[3]);
      } else {
        setBeneficiaries([]);
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [myAgent]);

  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));
  const rowsView = rows.map((r) => mapRow(r, agentById));

  // In personal / adherent mode: restrict to the user's own records
  const visibleRows = isAdherent
    ? (effectiveAgentId != null ? rowsView.filter((r) => String(r.agentId) === String(effectiveAgentId)) : [])
    : rowsView;

  const [wizardBeneficiaries, setWizardBeneficiaries] = useState([]);

  useEffect(() => {
    const aid = isAdherent ? myAgent : wizardDraft.agentId;
    if (!aid) {
      setWizardBeneficiaries([]);
      return;
    }
    let active = true;
    apiFetch(`/api/beneficiaries?agentId=${aid}`)
      .then(parseJsonOrThrow)
      .then((data) => {
        if (active) setWizardBeneficiaries(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setWizardBeneficiaries([]);
      });
    return () => {
      active = false;
    };
  }, [wizardDraft.agentId, myAgent, isAdherent]);

  const selectedWizardAgent = useMemo(() => {
    const aid = isAdherent ? myAgent : wizardDraft.agentId;
    return agents.find((a) => String(a.id) === String(aid));
  }, [agents, wizardDraft.agentId, myAgent, isAdherent]);

  const beneficiaryOptions = useMemo(() => {
    const opts = [];
    if (selectedWizardAgent) {
      opts.push({
        value: `${selectedWizardAgent.prenom} ${selectedWizardAgent.nom}`,
        label: `${selectedWizardAgent.prenom} ${selectedWizardAgent.nom} (Titulaire)`,
      });
    }
    wizardBeneficiaries.forEach((b) => {
      opts.push({
        value: `${b.prenom} ${b.nom}`,
        label: `${b.prenom} ${b.nom} (${b.linkType || b.type})`,
      });
    });
    return opts;
  }, [selectedWizardAgent, wizardBeneficiaries]);

  const data = useMemo(() => {
    let list = [...visibleRows];
    if (searchQuery.trim()) {
      list = list.filter((r) =>
        matchesSearch(
          searchQuery,
          r.numero,
          r.matricule,
          r.nomPrenomAgent,
          r.typePrestation,
          r.beneficiaire,
          r.etablissement,
          r.statut,
          r.tauxDisplay,
          r.montantDemande,
          r.montantPec,
          r.observation,
        ),
      );
    }
    return list;
  }, [rowsView, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(data, searchQuery);

  const resetWizard = () => {
    setWizardStep(1);
    setPdfFile(null);
    setWizardDraft({
      agentId: agents[0] ? String(agents[0].id) : '',
      beneficiaire: beneficiaryOptions[0]?.value || '',
      typePrestation: careTypes[0] || '',
      etablissement: facilities[0]?.nom || '',
      montantDemande: '',
      dateDebut: new Date().toISOString().split('T')[0],
      dateFin: '',
      observation: '',
    });
  };

  const closeModal = () => {
    setModal(null);
    resetWizard();
  };

  const wizardGoNext = () => {
    if (wizardStep === 1) {
      if (!wizardDraft.beneficiaire) {
        addToast('error', 'Choisissez un bénéficiaire');
        return;
      }
      if (!wizardDraft.typePrestation) {
        addToast('error', 'Choisissez un type de prestation');
        return;
      }
      if (!wizardDraft.etablissement) {
        addToast('error', 'Choisissez un établissement');
        return;
      }
    }
    if (wizardStep === 2) {
      if (!wizardDraft.montantDemande || Number(wizardDraft.montantDemande) <= 0) {
        addToast('error', 'Indiquez un montant valide');
        return;
      }
      if (!pdfFile) {
        addToast('error', 'Le justificatif PDF est obligatoire');
        return;
      }
    }
    setWizardStep((s) => s + 1);
  };

  const openPdf = async (id) => {
    try {
      const blob = await apiFetchBlob(`/api/care-episodes/${id}/document`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'PDF introuvable');
    }
  };

  const downloadCareTemplate = async () => {
    try {
      const blob = await apiFetchBlob('/api/document-templates/care-episode-request');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modele-prise-en-charge.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      addToast('error', e.message || 'Modèle prise en charge indisponible');
    }
  };

  const handlePrintPec = (p) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('error', 'Le bloqueur de fenêtres a empêché l\'ouverture de la page d\'impression.');
      return;
    }

    const agent = agents.find((a) => String(a.id) === String(p.agentId));
    const agentNom = (agent?.nom || '').toUpperCase();
    const agentPrenom = agent?.prenom || '';

    // Split beneficiary name
    const bParts = (p.beneficiaire || '').trim().split(' ');
    let bNom = '';
    let bPrenom = '';
    if (bParts.length > 1) {
      bNom = bParts[bParts.length - 1].toUpperCase();
      bPrenom = bParts.slice(0, bParts.length - 1).join(' ');
    } else {
      bNom = (p.beneficiaire || '').toUpperCase();
    }

    // Check if beneficiary is the agent themselves
    const isAgentPatient = agent && (
      `${agent.prenom} ${agent.nom}`.toLowerCase().trim() === (p.beneficiaire || '').toLowerCase().trim() ||
      `${agent.nom} ${agent.prenom}`.toLowerCase().trim() === (p.beneficiaire || '').toLowerCase().trim()
    );

    const patientNom = isAgentPatient ? '' : bNom;
    const patientPrenom = isAgentPatient ? '' : bPrenom;

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return String(dateStr).split('-').reverse().join('/');
    };

    const datePrint = formatDate(p.dateDebut) || new Date().toLocaleDateString('fr-FR');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Prise en Charge - ${p.numero}</title>
        <style>
          @media print {
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            color: #000;
            line-height: 1.4;
            padding: 20px;
            box-sizing: border-box;
          }

          .pec-container {
            border: 2px solid #000;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            box-sizing: border-box;
          }

          .pec-table {
            width: 100%;
            border-collapse: collapse;
          }

          .pec-table td {
            border: 1px solid #000;
            padding: 10px;
            vertical-align: middle;
          }

          .header-row td {
            height: 80px;
          }

          .center-text {
            text-align: center;
          }

          .bold-text {
            font-weight: bold;
          }

          .banner-text {
            border-bottom: 2px solid #000;
            padding: 12px;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            line-height: 1.5;
          }

          .section-title {
            background-color: #f2f2f2;
            border-bottom: 2px solid #000;
            padding: 8px 10px;
            font-weight: bold;
            text-align: center;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .field-box {
            display: flex;
            margin-bottom: 6px;
            font-size: 13px;
          }

          .field-label {
            font-weight: bold;
            white-space: nowrap;
          }

          .field-value {
            border-bottom: 1px dotted #000;
            width: 100%;
            padding-left: 8px;
            min-height: 18px;
            font-weight: bold;
          }

          .footer-section {
            border-top: 2px solid #000;
          }

          .dotted-line {
            border-bottom: 1px dotted #000;
            height: 20px;
            margin-bottom: 5px;
          }

          .signature-area {
            min-height: 100px;
          }
        </style>
      </head>
      <body>
        <div class="pec-container">
          <!-- Table En-tête -->
          <table class="pec-table" style="border-bottom: 2px solid #000;">
            <tr class="header-row">
              <td style="width: 30%; border-right: 2px solid #000; text-align: center;">
                <div class="bold-text" style="font-size: 14px;">SECURITE SOCIALE</div>
                <br>
                <div style="font-size: 13px;">Réf : <span class="bold-text">${p.numero}</span></div>
              </td>
              <td style="width: 40%; border-right: 2px solid #000; text-align: center;">
                <div class="bold-text" style="font-size: 15px;">PRISE EN CHARGE</div>
                <br>
                <div class="bold-text" style="font-size: 13px;">FRAIS POUR SOIN DE SANTE</div>
              </td>
              <td style="width: 30%; padding-left: 15px;">
                <div class="bold-text" style="font-size: 14px;">Clinique :</div>
                <br>
                <div class="bold-text" style="font-size: 14px; text-transform: uppercase;">${p.etablissement}</div>
              </td>
            </tr>
          </table>

          <!-- Bannière d'avertissement -->
          <div class="banner-text">
            CETTE PRISE EN CHARGE COUVRE LES ACTES MEDICAUX, D'ANALYSES, DE RADIOLOGIES, DE PRODUITS<br>
            PHARMACEUTIQUES, EXECUTES ET ORDONNES PAR LES RESPONSABLES MEDICAUX DE<br>
            <span style="text-transform: uppercase; text-decoration: underline;">${p.etablissement}</span><br>
            PENDANT ET APRES L'HOSPITALISATION DU MALADE
          </div>

          <!-- Section 11 -->
          <table class="pec-table" style="border-bottom: 2px solid #000;">
            <tr>
              <td style="width: 35%; border-right: 2px solid #000;" class="bold-text">
                11/ NOM OU RAISON SOCIALE
              </td>
              <td class="bold-text" style="font-size: 14px; padding-left: 15px;">
                SRM-MS
              </td>
            </tr>
          </table>

          <!-- Titre Section 12 -->
          <div class="section-title">
            12/ RENSEIGNEMENT CONCERNANT LE SALARIE ,LE CONJOINT OU UN ENFANT A CHARGE DU SALARIE
          </div>

          <!-- Section 12 Infos -->
          <table class="pec-table" style="border-bottom: 2px solid #000;">
            <tr>
              <!-- 121 / SOIN DE -->
              <td rowspan="3" style="width: 35%; border-right: 2px solid #000; vertical-align: top;">
                <div class="bold-text">121/ SOIN DE</div>
                <br><br>
                <div class="bold-text" style="font-size: 14px; text-transform: uppercase; text-align: center; border: 1.5px solid #000; padding: 6px; background-color: #f9f9f9; border-radius: 4px;">
                  ${p.typePrestation}
                </div>
              </td>
              <!-- Nom -->
              <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;">
                <div class="field-box">
                  <span class="field-label">Nom :</span>
                  <span class="field-value" style="text-transform: uppercase;">${agentNom}</span>
                </div>
              </td>
              <!-- Seances -->
              <td style="width: 25%; border-bottom: 1px solid #000; text-align: center;">
                <div class="bold-text">SEANCES &nbsp;&nbsp;&nbsp; 0</div>
              </td>
            </tr>
            <tr>
              <!-- Prenom -->
              <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;">
                <div class="field-box">
                  <span class="field-label">Prénom :</span>
                  <span class="field-value">${agentPrenom}</span>
                </div>
              </td>
              <!-- Matricule -->
              <td style="border-bottom: 1px solid #000; padding-left: 12px;">
                <div style="font-size: 13px;">Matricule : <span class="bold-text">${p.matricule}</span></div>
              </td>
            </tr>
            <tr>
              <!-- Empty spacer -->
              <td style="border-right: 1px solid #000;">
                &nbsp;
              </td>
              <!-- Regie -->
              <td style="padding-left: 12px;">
                <div style="font-size: 13px;">Régie : <span class="bold-text">SRM-MS</span></div>
              </td>
            </tr>
          </table>

          <!-- Section 125 Recevoir les soins -->
          <table class="pec-table" style="border-bottom: 2px solid #000;">
            <tr>
              <td style="width: 35%; border-right: 2px solid #000; vertical-align: top;">
                <div class="bold-text">125/ RECEVOIR LES SOINS</div>
                <br>
                <div style="font-size: 12px; color: #555; text-align: center;">Conjoint/enfant</div>
              </td>
              <td style="padding: 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="border-bottom: 1px solid #000; padding: 10px;">
                      <div class="field-box" style="margin: 0;">
                        <span class="field-label">Nom :</span>
                        <span class="field-value" style="text-transform: uppercase;">${patientNom}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px;">
                      <div class="field-box" style="margin: 0;">
                        <span class="field-label">Prénom :</span>
                        <span class="field-value">${patientPrenom}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Section 13 Malade autre que le salarie / Engagement -->
          <table class="pec-table">
            <tr>
              <!-- Gauche -->
              <td style="width: 50%; border-right: 2px solid #000; vertical-align: top; font-size: 11px; line-height: 1.5; padding: 12px;">
                <div class="bold-text" style="font-size: 12px; margin-bottom: 8px;">NOM ET PRENOM DU MALADE AUTRE QUE LE SALARIE</div>
                13/ Les dossiers de demande de remboursement des frais de soins de santé auprès des organismes assurant une protection sanitaire seront joints à la facture établie par l'établissement et adressés ou remis à :
                <br><br>
                <div class="dotted-line"></div>
                <div class="dotted-line"></div>
                et adressés ou remis à : <span class="bold-text">SRM-MS</span>
              </td>
              <!-- Droite -->
              <td style="width: 50%; vertical-align: top; font-size: 11px; line-height: 1.5; padding: 12px;">
                Par cette prise en charge, le soussigné s'engage à régler le montant de la facture qui lui sera présentée
                <br>
                Par <strong>${p.etablissement}</strong>
                <br>
                dans les <strong>HUITS JOURS</strong> qui suivent sa réception.
                <br><br>
                <strong>FAIT à MARRAKECH :</strong> le ${datePrint}
                <br><br>
                <strong>Etablie par :</strong> <span class="bold-text">${agentPrenom} ${agentNom}</span>
              </td>
            </tr>
          </table>

          <!-- Section Procuration et Signature -->
          <table class="pec-table" style="border-top: 2px solid #000;">
            <tr>
              <td style="width: 50%; border-right: 2px solid #000; vertical-align: top; font-size: 11px; line-height: 1.5; padding: 12px;">
                Je soussigné : <span class="bold-text">${agentPrenom} ${agentNom}</span>
                <br>
                donne procuration à : <span style="border-bottom: 1px dotted #000; display: inline-block; width: 180px; height: 15px;"></span>
                <br>
                Pour présenter et encaisser en mon nom les sommes qui doivent m'être remboursées
                <br>
                Par <span class="bold-text">SRM-MS</span>
                <br>
                au titre des frais qui ont été engagés par : <span class="bold-text">${p.beneficiaire}</span>
                <br>
                dans le cadre de cette prise en charge.
              </td>
              <td style="width: 50%; vertical-align: top; padding: 12px; text-align: center;">
                <div style="font-size: 12px;"><strong>LE :</strong> ${datePrint}</div>
                <br><br>
                <div class="bold-text" style="font-size: 12px;">SIGNATURE DU SALARIE</div>
                <div class="signature-area"></div>
              </td>
            </tr>
          </table>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const doAction = async (path, label, body) => {
    try {
      await parseJsonOrThrow(await apiFetch(path, { method: 'POST', body: body || undefined }));
      addToast('success', label);
      closeModal();
      reload();
    } catch (e) {
      addToast('error', e.message || 'Erreur');
    }
  };

  const buildWizardForm = () => {
    const patchDraft = (key, value) => setWizardDraft((d) => ({ ...d, [key]: value }));

    const submitWizard = async (e) => {
      e.preventDefault();
      if (!pdfFile) {
        addToast('error', 'Le justificatif PDF est obligatoire');
        return;
      }
      if (!wizardDraft.montantDemande || Number(wizardDraft.montantDemande) <= 0) {
        addToast('error', 'Indiquez un montant valide');
        return;
      }
      const body = new FormData();
      body.append('file', pdfFile);
      body.append('beneficiaire', wizardDraft.beneficiaire);
      body.append('typePrestation', wizardDraft.typePrestation);
      body.append('etablissement', wizardDraft.etablissement);
      body.append('montantDemande', wizardDraft.montantDemande);
      body.append('taux', '70');
      if (wizardDraft.dateDebut) body.append('dateDebut', wizardDraft.dateDebut);
      if (wizardDraft.dateFin) body.append('dateFin', wizardDraft.dateFin);
      if (wizardDraft.observation) body.append('observation', wizardDraft.observation);
      if (!isAdherent && wizardDraft.agentId) {
        body.append('agentId', wizardDraft.agentId);
      } else if (isAdherent && effectiveAgentId != null) {
        body.append('agentId', String(effectiveAgentId));
      }

      try {
        await parseJsonOrThrow(await apiFetch('/api/care-episodes/request', { method: 'POST', body }));
        addToast('success', 'Demande PEC enregistrée — envoyez-la à la mutuelle (étape 2)');
        closeModal();
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submitWizard}>
        <WizardSteps step={wizardStep} />
        <WorkflowSteps steps={PEC_WORKFLOW_STEPS} activeStep={1} terminal={false} />

        {wizardStep === 1 && (
          <div className="form-grid">
            {!isAdherent ? (
              <>
                <SearchableSelect
                  label="Porteur (Agent)"
                  placeholder="Choisir un agent…"
                  value={wizardDraft.agentId}
                  onChange={(val) => {
                    patchDraft('agentId', val);
                    patchDraft('beneficiaire', '');
                  }}
                  required
                  options={agents.map((a) => ({
                    value: String(a.id),
                    label: `${a.matricule} — ${a.prenom} ${a.nom}`,
                  }))}
                />
                <SearchableSelect
                  label="Bénéficiaire"
                  placeholder="Choisir un bénéficiaire…"
                  value={wizardDraft.beneficiaire}
                  onChange={(val) => patchDraft('beneficiaire', val)}
                  required
                  options={beneficiaryOptions}
                  disabled={!wizardDraft.agentId}
                />
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Porteur (Agent)</label>
                  <input
                    className="form-control"
                    readOnly
                    value={selectedWizardAgent ? `${selectedWizardAgent.prenom} ${selectedWizardAgent.nom}` : ''}
                  />
                </div>
                <SearchableSelect
                  label="Bénéficiaire"
                  placeholder="Choisir un bénéficiaire…"
                  value={wizardDraft.beneficiaire}
                  onChange={(val) => patchDraft('beneficiaire', val)}
                  required
                  options={beneficiaryOptions}
                />
              </>
            )}
            <div className="form-group">
              <label>Type de prestation</label>
              <input
                list="care-types-list"
                className="form-control"
                required
                placeholder="Rechercher ou saisir un type..."
                value={wizardDraft.typePrestation}
                onChange={(e) => patchDraft('typePrestation', e.target.value)}
              />
              <datalist id="care-types-list">
                {careTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Établissement / corps médical</label>
              <input
                list="facilities-list"
                className="form-control"
                required
                placeholder="Rechercher ou saisir un établissement..."
                value={wizardDraft.etablissement}
                onChange={(e) => patchDraft('etablissement', e.target.value)}
              />
              <datalist id="facilities-list">
                {facilities.map((f) => (
                  <option key={f.id} value={f.nom} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Date début soins</label>
              <input
                type="date"
                className="form-control"
                value={wizardDraft.dateDebut}
                onChange={(e) => patchDraft('dateDebut', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Date fin (optionnel)</label>
              <input
                type="date"
                className="form-control"
                value={wizardDraft.dateFin}
                onChange={(e) => patchDraft('dateFin', e.target.value)}
              />
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Montant demandé (DH)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                required
                value={wizardDraft.montantDemande}
                onChange={(e) => patchDraft('montantDemande', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Justificatif PDF (devis, accord préalable…)</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="form-control"
                onChange={(ev) => setPdfFile(ev.target.files?.[0] || null)}
                required
              />
              {pdfFile && <p className="pdf-upload-hint">{pdfFile.name}</p>}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Observation</label>
              <textarea
                className="form-control"
                rows={2}
                value={wizardDraft.observation}
                onChange={(e) => patchDraft('observation', e.target.value)}
              />
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-700)', marginBottom: 12 }}>
              Après enregistrement, utilisez <strong>Envoyer à la mutuelle</strong> pour lancer l&apos;instruction.
            </p>
            <DetailItem label="Bénéficiaire">{wizardDraft.beneficiaire}</DetailItem>
            <DetailItem label="Type">{wizardDraft.typePrestation}</DetailItem>
            <DetailItem label="Établissement">{wizardDraft.etablissement}</DetailItem>
            <DetailItem label="Montant">{Number(wizardDraft.montantDemande || 0).toLocaleString('fr-FR')} DH</DetailItem>
            <DetailItem label="PDF">{pdfFile?.name || '—'}</DetailItem>
          </div>
        )}

        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          {wizardStep > 1 && (
            <button type="button" className="btn btn-outline" onClick={() => setWizardStep((s) => s - 1)}>
              Précédent
            </button>
          )}
          {wizardStep < 3 ? (
            <button type="button" className="btn btn-primary" onClick={wizardGoNext}>
              Suivant
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer la demande
            </button>
          )}
        </div>
      </form>
    );
  };

  const staffReviewPanel = (p) => {
    const canValidate = p.statut !== 'Clôturé' && p.statut !== 'En attente';
    if (!canValidate) return null;
    return (
      <div className="staff-review-panel">
        <h4 className="staff-review-title">Validation prise en charge</h4>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Montant PEC (DH)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={reviewMontant}
              onChange={(e) => setReviewMontant(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Observation</label>
            <textarea className="form-control" rows={2} value={reviewObs} onChange={(e) => setReviewObs(e.target.value)} />
          </div>
        </div>
        <div className="workflow-actions-bar">
          {canValidate && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  doAction(`/api/care-episodes/${p.id}/validate`, 'PEC approuvée', {
                    montantPrisEnCharge: Number(reviewMontant),
                    observation: reviewObs || null,
                  })
                }
              >
                <FaIcon name="check" className="fa-inline-icon" /> Approuver (étape 3)
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() =>
                  doAction(`/api/care-episodes/${p.id}/reject`, 'PEC refusée', { observation: reviewObs || null })
                }
              >
                <FaIcon name="xmark" className="fa-inline-icon" /> Refuser
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDetailContent = (p) => {
    const wf = resolvePecWorkflow(p.statut);
    return (
      <>
        <WorkflowSteps {...wf} />
        <div className="workflow-actions-bar" style={{ marginBottom: 12, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {p.hasPdf && (
            <button type="button" className="btn btn-outline" onClick={() => openPdf(p.id)}>
              <FaIcon name="file-pdf" className="fa-inline-icon" /> Voir le justificatif PDF
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => handlePrintPec(p)}>
            <FaIcon name="print" className="fa-inline-icon" /> Imprimer la fiche PEC (PDF)
          </button>
        </div>
        <div className="pec-detail-layout">
          <DetailSection title="Informations" icon="circle-info">
            <DetailItem label="N° demande">{p.numero}</DetailItem>
            <DetailItem label="Bénéficiaire">{p.beneficiaire}</DetailItem>
            <DetailItem label="Agent">{p.nomPrenomAgent}</DetailItem>
            <DetailItem label="Matricule">{p.matricule}</DetailItem>
            <DetailItem label="Date demande">{formatDate(p.dateDepot)}</DetailItem>
            <DetailItem label="Statut">{statusBadge(p.statut)}</DetailItem>
          </DetailSection>

          <DetailSection title="Détails financiers" icon="coins">
            <DetailItem label="Montant estimé">
              {p.montantDemande != null ? `${Number(p.montantDemande).toLocaleString('fr-FR')} DH` : '—'}
            </DetailItem>
            <DetailItem label="Montant accordé">
              {p.montantPec != null && Number(p.montantPec) > 0
                ? `${Number(p.montantPec).toLocaleString('fr-FR')} DH`
                : '—'}
            </DetailItem>
            <DetailItem label="Date réponse">{formatDate(p.dateReponse)}</DetailItem>
          </DetailSection>

          <DetailSection title="Document &amp; observation" icon="file-medical">
            <DetailItem label="Type de soin">
              <span className="badge badge-primary">{p.typePrestation}</span>
            </DetailItem>
            <DetailItem label="Établissement">{p.etablissement}</DetailItem>
            <DetailItem label="Date début">{formatDate(p.dateDebut)}</DetailItem>
            <DetailItem label="Date fin">{formatDate(p.dateFin)}</DetailItem>
            <DetailItem label="Date envoi">{formatDate(p.dateEnvoi)}</DetailItem>
            <DetailItem label="Justificatif">{p.hasPdf ? 'Disponible' : '—'}</DetailItem>
            <DetailItem label="Observation" fullWidth>
              {p.observation}
            </DetailItem>
          </DetailSection>
        </div>
        {canMutate && !personalMode && staffReviewPanel(p)}
        {isAdherent && p.statut === 'En attente' && (
          <div className="workflow-actions-bar">
            <p className="workflow-actions-hint">Étape 1/3 — Envoyez votre dossier pour lancer l&apos;instruction.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!p.hasPdf}
              onClick={() => doAction(`/api/care-episodes/${p.id}/submit`, 'Demande transmise à la mutuelle')}
            >
              <FaIcon name="paper-plane" className="fa-inline-icon" /> Envoyer à la mutuelle
            </button>
          </div>
        )}
      </>
    );
  };

  const viewRecord = (p) => {
    const defaultMontant =
      p.montantPec != null && Number(p.montantPec) > 0 ? p.montantPec : p.montantDemande;
    setReviewMontant(String(defaultMontant ?? ''));
    setReviewObs(p.observation !== '—' ? p.observation : '');
    setModal({
      title: `PEC ${p.numero}`,
      variant: 'detail',
      selectedRecord: p,
    });
  };

  const workflowSummary = (p) => {
    const wf = resolvePecWorkflow(p.statut);
    if (wf.terminal) {
      const extra =
        p.statut === 'Approuvé' && p.montantPec != null && Number(p.montantPec) > 0
          ? ` — ${Number(p.montantPec).toLocaleString('fr-FR')} DH`
          : '';
      return `${wf.terminalLabel}${extra}`;
    }
    return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement…</div>
      </div>
    );
  }

  const myAgentObj = isAdherent && effectiveAgentId != null ? agents.find((a) => a.id === Number(effectiveAgentId)) : null;
  const showWarning = isAdherent && !myAgentObj;

  if (showWarning) {
    return (
      <>
        <div className="card" style={{ marginTop: '0' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', color: 'var(--warning-500)', marginBottom: '16px' }}>
              <FaIcon name="triangle-exclamation" />
            </div>
            <h4>Compte non associé à un porteur</h4>
            <p style={{ color: 'var(--gray-500)', maxWidth: '480px', margin: '8px auto 0' }}>
              Votre compte utilisateur n'est pas associé à une fiche agent (porteur). 
              Veuillez contacter un administrateur pour lier votre compte dans la gestion des utilisateurs.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal} variant={modal.variant}>
          {modal.mode === 'wizard' ? buildWizardForm() : (modal.selectedRecord ? renderDetailContent(modal.selectedRecord) : modal.content)}
        </Modal>
      )}
      {!isAdherent && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h4>En attente</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'En attente').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>En cours</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'En cours').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Approuvées</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Approuvé').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Refusées</h4>
              <div className="stat-value">{rows.filter((r) => r.statut === 'Rejeté').length}</div>
            </div>
          </div>
        </div>
      )}
      <TablePageShell
        title={isAdherent ? 'Mes demandes de prise en charge' : 'Liste des prises en charge'}
        icon="hospital"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (n°, type, bénéficiaire, établissement, statut…)"
            exportColumns={EXPORT_COLS}
            exportRows={data.map((r) => ({
              ...r,
              dateDebut: formatDate(r.dateDebut),
              dateFin: formatDate(r.dateFin),
            }))}
            exportFilename="prises-en-charge"
            showNew={canCreate}
            newLabel={isAdherent ? 'Nouvelle demande PEC (3 étapes)' : 'Nouvelle demande PEC'}
            onNew={() => {
              resetWizard();
              setModal({ title: 'Demande de prise en charge — 3 étapes', mode: 'wizard' });
            }}
          />
        }
      >
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                {!isAdherent && <th>Mat.</th>}
                <th>Type</th>
                <th>Bénéficiaire</th>
                <th>Établissement</th>
                <th>Début</th>
                <th>Montant demandé</th>
                <th>Montant PEC</th>
                <th>Statut</th>
                {isAdherent ? <th>Suivi</th> : null}
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={isAdherent ? 11 : 11} style={{ textAlign: 'center', padding: 24 }}>
                    {isAdherent
                      ? 'Aucune demande. Créez une demande PEC en 3 étapes avec justificatif PDF.'
                      : 'Aucune prise en charge.'}
                  </td>
                </tr>
              )}
              {pageData.map((p) => (
                <tr key={p.id}>
                  <td>{p.numero}</td>
                  {!isAdherent && <td>{p.matricule}</td>}
                  <td>
                    <span className="badge badge-primary">{p.typePrestation}</span>
                  </td>
                  <td>{p.beneficiaire}</td>
                  <td>{p.etablissement}</td>
                  <td>{formatDate(p.dateDebut)}</td>
                  <td>
                    {p.montantDemande != null ? `${Number(p.montantDemande).toLocaleString('fr-FR')} DH` : '—'}
                  </td>
                  <td>
                    {p.montantPec != null && Number(p.montantPec) > 0
                      ? `${Number(p.montantPec).toLocaleString('fr-FR')} DH`
                      : '—'}
                  </td>
                  <td>{statusBadge(p.statut)}</td>
                  {isAdherent ? (
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{workflowSummary(p)}</td>
                  ) : null}
                  <td>
                    {p.hasPdf ? (
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openPdf(p.id)}>
                        PDF
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-icon btn-view" type="button" title="Détail" onClick={() => viewRecord(p)}>
                      <FaIcon name="eye" />
                    </button>
                    <button
                      className="btn btn-icon btn-print"
                      type="button"
                      title="Imprimer la PEC (PDF)"
                      onClick={() => handlePrintPec(p)}
                    >
                      <FaIcon name="print" />
                    </button>
                    {p.statut === 'En attente' && (isAdherent || canMutate) && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Envoyer"
                        disabled={!p.hasPdf}
                        onClick={() => doAction(`/api/care-episodes/${p.id}/submit`, 'Demande envoyée')}
                      >
                        <FaIcon name="paper-plane" />
                      </button>
                    )}
                    {canDelete && (
                      <AdminDeleteButton
                        onClick={() =>
                          adminDeleteRecord({
                            url: `/api/care-episodes/${p.id}`,
                            label: p.numero,
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
