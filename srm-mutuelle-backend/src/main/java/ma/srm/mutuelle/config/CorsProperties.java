package ma.srm.mutuelle.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(String allowedOrigins) {

	public List<String> originList() {
		if (allowedOrigins == null || allowedOrigins.isBlank()) {
			return List.of("http://localhost:5173");
		}
		return Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toList();
	}
}
