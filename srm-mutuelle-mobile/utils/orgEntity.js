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

export function serviceEntityOptions(entities) {
  if (!entities?.length) return [];
  return entities
    .filter((e) => e.type === 'Service')
    .map((e) => ({
      id: e.id,
      value: String(e.id),
      label: orgEntityPath(entities, e.id),
      nom: e.nom,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export function defaultServiceEntityId(entities, agent) {
  if (agent?.entiteId) return String(agent.entiteId);
  const services = serviceEntityOptions(entities);
  if (!services.length) return '';
  if (agent?.entite) {
    const match = services.find((s) => s.nom === agent.entite);
    if (match) return match.value;
  }
  return services[0].value;
}
