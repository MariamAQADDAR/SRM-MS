import { apiFetch, parseJsonOrThrow } from './client';

export async function createAgent(agent) {
  // Découpage nom/prénom bénéficiaires
  const beneficiaries = (agent.beneficiaires || []).map((b) => {
    let nom = '';
    let prenom = '';
    if (b.nomPrenom) {
      const parts = b.nomPrenom.trim().split(' ');
      nom = parts[0] || '';
      prenom = parts.slice(1).join(' ') || '';
    }
    return {
      nom,
      prenom,
      type: b.type,
      dateNaissance: b.dateNaissance || null,
      cin: b.cin || '',
    };
  });
  const body = {
    matricule: agent.matricule,
    nom: agent.nom,
    prenom: agent.prenom,
    dateNaissance: agent.dateNaissance || null,
    telephone: agent.telephone,
    dateRecrutement: agent.dateRecrutement || null,
    statut: agent.statut,
    email: agent.email,
    situation: agent.situationFamiliale,
    entite: agent.entite || 'SRM-MS',
    cin: agent.cin || '',
    beneficiaries,
  };
  const res = await apiFetch('/api/agents', {
    method: 'POST',
    body,
  });
  return parseJsonOrThrow(res);
}
