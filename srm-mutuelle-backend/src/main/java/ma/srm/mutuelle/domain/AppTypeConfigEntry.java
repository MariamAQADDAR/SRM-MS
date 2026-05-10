package ma.srm.mutuelle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "app_type_config")
@Getter
@Setter
@NoArgsConstructor
public class AppTypeConfigEntry {

	@Id
	@Column(name = "config_key", nullable = false, length = 64)
	private String configKey;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "values_json", nullable = false, columnDefinition = "jsonb")
	private List<String> values;

	public AppTypeConfigEntry(String configKey, List<String> values) {
		this.configKey = configKey;
		this.values = values;
	}
}
