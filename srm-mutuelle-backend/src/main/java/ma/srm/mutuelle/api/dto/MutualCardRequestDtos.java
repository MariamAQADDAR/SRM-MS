package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class MutualCardRequestDtos {

	public record MutualCardRequestResponse(
			Long id,
			Long agentId,
			String matricule,
			Long beneficiaryId,
			String beneficiaire,
			String typeDemande,
			LocalDate dateDemande,
			String statut,
			String raison) {}

	public record MutualCardRequestWriteRequest(
			@NotNull Long agentId,
			Long beneficiaryId,
			@NotBlank String beneficiaire,
			@NotBlank String typeDemande,
			LocalDate dateDemande,
			String statut,
			String raison) {}
}
