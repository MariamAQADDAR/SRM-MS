package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class MutualCardDtos {

	public record MutualCardResponse(
			Long id,
			Long agentId,
			Long beneficiaryId,
			String cardLabel,
			String holderFullName,
			String holderCin,
			LocalDate holderDateNaissance,
			String issuedAt,
			boolean hasPdf) {}

	public record MutualCardCreateRequest(@NotNull Long agentId, Long beneficiaryId) {}

	public record MutualCardFamilyMember(
			Long beneficiaryId,
			String cardLabel,
			String fullName,
			String cin,
			LocalDate dateNaissance,
			String ville,
			Long cardId,
			boolean hasPdf,
			String issuedAt) {}
}
