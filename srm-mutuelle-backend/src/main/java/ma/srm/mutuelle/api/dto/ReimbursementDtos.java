package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class ReimbursementDtos {

	public record ReimbursementResponse(
			Long id,
			String numero,
			LocalDate date,
			Long agentId,
			String beneficiaire,
			BigDecimal montantDemande,
			BigDecimal montantValide,
			String statut,
			Integer taux,
			boolean hasPdf,
			boolean scanned,
			String pdfOriginalName,
			String establishmentName,
			String careType,
			String medicineName,
			LocalDate depositDate,
			LocalDate sentDate,
			LocalDate responseDate,
			String observation) {}

	public record ReimbursementWriteRequest(
			String numero,
			@NotNull LocalDate date,
			@NotNull Long agentId,
			@NotBlank String beneficiaire,
			@NotNull BigDecimal montantDemande,
			@NotNull BigDecimal montantValide,
			@NotBlank String statut) {}

	public record ValidateReimbursementRequest(
			@NotNull BigDecimal montantValide, Integer taux, String observation) {}

	public record RejectReimbursementRequest(String observation) {}
}
