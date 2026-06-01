export function roleCode(user) {
  if (!user) return '';
  return user.roleCode || '';
}

export function isAdminRole(user) {
  return (
    roleCode(user) === 'ADMINISTRATEUR' ||
    user.role === 'Administrateur' ||
    user.role === 'admin'
  );
}

export function isConsultateurRole(user) {
  return roleCode(user) === 'CONSULTATEUR' || user.role === 'Consultateur' || user.role === 'consultateur';
}

export function isAdherentRole(user) {
  return roleCode(user) === 'ADHERENT' || user.role === 'Adhérent';
}

export function isStaffWriterRole(user) {
  const c = roleCode(user);
  return c === 'ADMINISTRATEUR' || c === 'OPERATEUR';
}

export function canStaffMutate(user) {
  return !isAdherentRole(user) && !isConsultateurRole(user);
}

export function canAdminDelete(user) {
  return isAdminRole(user);
}
