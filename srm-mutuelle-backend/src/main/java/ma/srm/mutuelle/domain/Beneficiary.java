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
@Table(name = "beneficiaries")
@Getter
@Setter
@NoArgsConstructor
public class Beneficiary {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false, length = 120)
	private String nom;

	@Column(nullable = false, length = 120)
	private String prenom;

	@Column(name = "link_type", nullable = false, length = 32)
	private String linkType;

	@Column(length = 32)
	private String cin;

	@Column(name = "date_naissance")
	private LocalDate dateNaissance;

	@Column(length = 120)
	private String ville;

	@Column(nullable = false)
	private boolean deleted = false;
}
