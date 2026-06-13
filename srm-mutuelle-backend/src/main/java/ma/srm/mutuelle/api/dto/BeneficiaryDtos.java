package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class BeneficiaryDtos {

	public record BeneficiaryResponse(
			Long id,
			Long agentId,
			String nom,
			String prenom,
			String type,
			String cin,
			LocalDate dateNaissance,
			String ville) {}

	public record BeneficiaryWriteRequest(
			@NotNull Long agentId,
			@NotBlank String nom,
			@NotBlank String prenom,
			@NotBlank String type,
			String cin,
			LocalDate dateNaissance,
			String ville) {}
}
