package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CareMaladieDtos {

	public record CareEpisodeResponse(
			Long id,
			String numero,
			String typePrestation,
			LocalDate dateDebut,
			LocalDate dateFin,
			Long agentId,
			String beneficiaire,
			String etablissement,
			String statut,
			BigDecimal montantDemande,
			BigDecimal montantPrisEnCharge,
			Integer taux,
			boolean hasPdf,
			String pdfOriginalName,
			LocalDate depositDate,
			LocalDate sentDate,
			LocalDate responseDate,
			String observation) {}

	public record ValidateCareEpisodeRequest(
			@NotNull BigDecimal montantPrisEnCharge, Integer taux, String observation, LocalDate dateFin) {}

	public record RejectCareEpisodeRequest(String observation) {}

	public record CareEpisodeWriteRequest(
			String numero,
			@NotBlank String typePrestation,
			@NotNull LocalDate dateDebut,
			LocalDate dateFin,
			@NotNull Long agentId,
			@NotBlank String beneficiaire,
			@NotBlank String etablissement,
			@NotBlank String statut) {}

	public record SpecialDiseaseResponse(
			Long id,
			String numero,
			String typeMaladie,
			LocalDate dateDeclaration,
			Long agentId,
			String beneficiaire,
			String statut) {}

	public record SpecialDiseaseWriteRequest(
			String numero,
			@NotBlank String typeMaladie,
			@NotNull LocalDate dateDeclaration,
			@NotNull Long agentId,
			@NotBlank String beneficiaire,
			@NotBlank String statut) {}
}
