package ma.srm.mutuelle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "special_disease_declarations")
@Getter
@Setter
@NoArgsConstructor
public class SpecialDiseaseDeclaration {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String numero;

	@Column(name = "disease_type", nullable = false, length = 128)
	private String diseaseType;

	@Column(name = "declaration_date", nullable = false)
	private LocalDate declarationDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false)
	private String beneficiaire;

	@Column(nullable = false, length = 32)
	private String status;
}
