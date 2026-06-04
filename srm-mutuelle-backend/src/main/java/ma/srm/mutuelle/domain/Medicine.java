package ma.srm.mutuelle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "medicines")
@Getter
@Setter
@NoArgsConstructor
public class Medicine {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column(name = "ean13", length = 32)
	private String ean13;

	@Column(name = "therapeutic_class", length = 120)
	private String therapeuticClass;

	@Column(length = 80)
	private String form;

	@Column(length = 160)
	private String presentation;

	@Column(name = "medicine_type", length = 40)
	private String type;

	@Column(nullable = false)
	private boolean reimbursed = true;

	@Column(length = 500)
	private String note;

	@Column(length = 1000)
	private String observation;

	@Column(nullable = false)
	private boolean deleted = false;
}
