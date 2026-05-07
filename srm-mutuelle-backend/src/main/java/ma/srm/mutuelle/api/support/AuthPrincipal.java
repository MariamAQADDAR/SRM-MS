package ma.srm.mutuelle.api.support;

import ma.srm.mutuelle.domain.AppUser;
import org.springframework.security.core.Authentication;

public final class AuthPrincipal {

	private AuthPrincipal() {}

	public static AppUser requireUser(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof AppUser user)) {
			throw new IllegalStateException("Utilisateur non authentifié");
		}
		return user;
	}
}
