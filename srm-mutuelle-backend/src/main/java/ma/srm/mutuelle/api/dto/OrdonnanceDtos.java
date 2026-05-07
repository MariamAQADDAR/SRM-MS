package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class OrdonnanceDtos {

	public record OrdonnanceResponse(
			Long id,
			String numero,
			LocalDate date,
			Long agentId,
			String beneficiaire,
			String typePrestation,
			BigDecimal montant,
			BigDecimal montantRemboursable,
			int taux,
			String statut) {}

	public record OrdonnanceWriteRequest(
			String numero,
			@NotNull LocalDate date,
			@NotNull Long agentId,
			@NotBlank String beneficiaire,
			@NotBlank String typePrestation,
			@NotNull BigDecimal montant,
			@NotNull BigDecimal montantRemboursable,
			int taux,
			@NotBlank String statut) {}
}
