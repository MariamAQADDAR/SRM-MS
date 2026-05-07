package ma.srm.mutuelle.api.support;

import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

public final class AccessRules {

	private AccessRules() {}

	public static void assertStaffWrite(AppUser user) {
		if (user.getRole() == AppUserRole.CONSULTATEUR) {
			throw new AccessDeniedException("Lecture seule pour ce rôle");
		}
	}

	public static void assertAdmin(AppUser user) {
		if (user.getRole() != AppUserRole.ADMINISTRATEUR) {
			throw new AccessDeniedException("Action réservée administrateur");
		}
	}

	public static void assertAgentScope(AppUser user, Long agentId) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long mine = user.getAgentIdOrNull();
			if (mine == null || !mine.equals(agentId)) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à ce dossier");
			}
		}
	}

	public static Long adherentAgentIdOrNull(AppUser user) {
		return user.getRole() == AppUserRole.ADHERENT ? user.getAgentIdOrNull() : null;
	}
}
