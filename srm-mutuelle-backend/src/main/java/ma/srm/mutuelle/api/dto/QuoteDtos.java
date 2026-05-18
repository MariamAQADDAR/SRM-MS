package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class QuoteDtos {

	public record QuoteResponse(
			Long id,
			String numero,
			String type,
			LocalDate date,
			Long agentId,
			String beneficiaire,
			BigDecimal montant,
			int taux,
			String etat,
			boolean scanned,
			boolean hasPdf,
			String pdfOriginalName,
			String dentistName,
			LocalDate depositDate,
			LocalDate sentDate,
			LocalDate responseDate,
			BigDecimal montantPrisEnCharge,
			String observation) {}

	public record QuoteWriteRequest(
			String numero,
			@NotBlank String type,
			@NotNull LocalDate date,
			@NotNull Long agentId,
			@NotBlank String beneficiaire,
			@NotNull BigDecimal montant,
			int taux,
			String etat) {}

	public record QuoteReviewRequest(BigDecimal montantPrisEnCharge, String observation, LocalDate responseDate) {}
}
