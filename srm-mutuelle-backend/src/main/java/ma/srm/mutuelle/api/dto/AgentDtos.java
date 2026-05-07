package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class AgentDtos {

	public record AgentResponse(
			Long id,
			String matricule,
			String nom,
			String prenom,
			String cin,
			LocalDate dateNaissance,
			String situation,
			String entite,
			String telephone,
			String email) {}

	public record AgentWriteRequest(
			@NotBlank String matricule,
			@NotBlank String nom,
			@NotBlank String prenom,
			String cin,
			LocalDate dateNaissance,
			String situation,
			@NotBlank String entite,
			String telephone,
			String email) {}
}
