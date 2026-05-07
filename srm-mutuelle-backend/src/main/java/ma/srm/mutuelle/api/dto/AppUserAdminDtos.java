package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class AppUserAdminDtos {

	public record AppUserResponse(
			Long id,
			String email,
			String fullName,
			String role,
			boolean active,
			Long agentId,
			Instant lastLoginAt) {}

	public record CreateAppUserRequest(
			@NotBlank @Email String email,
			@NotBlank String password,
			@NotBlank String fullName,
			@NotBlank String role,
			Long agentId) {}

	public record UpdateAppUserRequest(
			String fullName,
			String role,
			Boolean active,
			Long agentId) {}

	public record PatchActiveRequest(@NotNull Boolean active) {}
}
