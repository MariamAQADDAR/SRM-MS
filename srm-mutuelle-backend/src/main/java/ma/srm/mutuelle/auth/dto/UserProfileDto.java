package ma.srm.mutuelle.auth.dto;

import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;

public record UserProfileDto(
		Long id, String email, String fullName, String role, String roleLabel, Long agentId) {

	public static UserProfileDto fromEntity(AppUser user) {
		return new UserProfileDto(
				user.getId(),
				user.getEmail(),
				user.getFullName(),
				user.getRole().name(),
				toRoleLabel(user.getRole()),
				user.getAgentIdOrNull());
	}

	private static String toRoleLabel(AppUserRole role) {
		return switch (role) {
			case ADMINISTRATEUR -> "Administrateur";
			case OPERATEUR -> "Opérateur";
			case CONSULTATEUR -> "Consultateur";
			case ADHERENT -> "Adhérent";
		};
	}
}
