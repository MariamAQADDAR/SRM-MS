package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotNull;

public class MutualCardDtos {

	public record MutualCardResponse(Long id, Long agentId, String issuedAt, String pdfStorageKey) {}

	public record MutualCardCreateRequest(@NotNull Long agentId) {}
}
