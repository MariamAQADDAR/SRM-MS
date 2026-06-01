/** Chemin hiérarchique d'une entité (DG › Direction › … › Service). */
export function orgEntityPath(entities, entityId) {
  if (entityId == null || !entities?.length) return '—';
  const byId = Object.fromEntries(entities.map((e) => [e.id, e]));
  const parts = [];
  let cur = byId[entityId];
  while (cur) {
    parts.unshift(cur.nom);
    cur = cur.parentId ? byId[cur.parentId] : null;
  }
  return parts.join(' › ');
}

/** Options pour rattacher un agent : uniquement les entités de type Service. */
export function serviceEntityOptions(entities) {
  if (!entities?.length) return [];
  return entities
    .filter((e) => e.type === 'Service')
    .map((e) => ({
      id: e.id,
      nom: e.nom,
      label: orgEntityPath(entities, e.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export function defaultServiceEntityId(entities, agent) {
  if (agent?.entiteId) return agent.entiteId;
  const services = serviceEntityOptions(entities);
  if (services.length === 0) return '';
  if (agent?.entite) {
    const match = services.find((s) => s.nom === agent.entite);
    if (match) return match.id;
  }
  return services[0].id;
}
