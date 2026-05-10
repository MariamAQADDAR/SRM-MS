package ma.srm.mutuelle.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.AppTypeConfigEntry;
import ma.srm.mutuelle.domain.repo.AppTypeConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TypeConfigService {

	public static final Set<String> CONFIG_KEYS = Set.of(
			"quoteTypes",
			"ordonnanceTypes",
			"radioTypes",
			"careTypes",
			"facilityTypes",
			"entityTypes",
			"maladieTypes");

	private final AppTypeConfigRepository repository;

	@Transactional(readOnly = true)
	public Map<String, List<String>> getAll() {
		Map<String, List<String>> out = new LinkedHashMap<>();
		for (AppTypeConfigEntry e : repository.findAll()) {
			if (CONFIG_KEYS.contains(e.getConfigKey()) && e.getValues() != null) {
				out.put(e.getConfigKey(), List.copyOf(sanitize(e.getValues())));
			}
		}
		for (String k : CONFIG_KEYS) {
			out.putIfAbsent(k, List.of());
		}
		return out;
	}

	@Transactional
	public Map<String, List<String>> updateKey(String key, List<String> values) {
		if (!CONFIG_KEYS.contains(key)) {
			throw new IllegalArgumentException("Clé de configuration inconnue: " + key);
		}
		List<String> clean = sanitize(values);
		repository.save(new AppTypeConfigEntry(key, clean));
		return getAll();
	}

	private static List<String> sanitize(List<String> raw) {
		if (raw == null) {
			return List.of();
		}
		return raw.stream()
				.map(v -> v == null ? "" : v.trim())
				.filter(s -> !s.isEmpty())
				.distinct()
				.collect(Collectors.toList());
	}
}
