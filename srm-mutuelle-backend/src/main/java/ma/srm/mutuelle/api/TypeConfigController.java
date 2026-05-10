package ma.srm.mutuelle.api;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.TypeConfigDtos.TypeConfigUpdateRequest;
import ma.srm.mutuelle.service.TypeConfigService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/type-config")
@RequiredArgsConstructor
public class TypeConfigController {

	private final TypeConfigService typeConfigService;

	/** Lecture : tout utilisateur authentifié ; écriture : ADMINISTRATEUR / OPERATEUR (SecurityConfig). */
	@GetMapping
	public Map<String, List<String>> getAll() {
		return typeConfigService.getAll();
	}

	@PutMapping("/{key}")
	public Map<String, List<String>> updateKey(
			@PathVariable String key, @RequestBody(required = false) TypeConfigUpdateRequest body) {
		return typeConfigService.updateKey(key, body != null ? body.values() : null);
	}
}
