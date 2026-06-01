package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public class AgentDtos {

	public record AgentBeneficiaryRequest(
			Long id,
			@NotBlank String nom,
			@NotBlank String prenom,
			@NotBlank String type,
			String cin,
			LocalDate dateNaissance) {}

	public record AgentResponse(
			Long id,
			String matricule,
			String nom,
			String prenom,
			String cin,
			LocalDate dateNaissance,
			String situation,
			String entite,
			Long entiteId,
			String telephone,
			String email,
			LocalDate dateRecrutement,
			String statut) {}

	public record AgentWriteRequest(
			@NotBlank String matricule,
			@NotBlank String nom,
			@NotBlank String prenom,
			String cin,
			LocalDate dateNaissance,
			String situation,
			Long entiteId,
			String telephone,
			String email,
			LocalDate dateRecrutement,
			String statut,
			List<AgentBeneficiaryRequest> beneficiaries) {}
}
