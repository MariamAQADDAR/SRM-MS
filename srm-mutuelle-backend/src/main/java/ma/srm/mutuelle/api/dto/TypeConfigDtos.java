package ma.srm.mutuelle.api.dto;

import java.util.List;

public final class TypeConfigDtos {

	private TypeConfigDtos() {}

	public record TypeConfigUpdateRequest(List<String> values) {}
}
