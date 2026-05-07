package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;

public class OrgEntityDtos {

	public record OrgEntityResponse(Long id, String code, String nom, String type, Long parentId) {}

	public record OrgEntityWriteRequest(@NotBlank String code, @NotBlank String nom, @NotBlank String type, Long parentId) {}
}
