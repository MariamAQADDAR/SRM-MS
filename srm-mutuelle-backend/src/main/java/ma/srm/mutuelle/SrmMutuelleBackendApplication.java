package ma.srm.mutuelle;

import ma.srm.mutuelle.config.CorsProperties;
import ma.srm.mutuelle.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, CorsProperties.class})
public class SrmMutuelleBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SrmMutuelleBackendApplication.class, args);
	}

}
