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
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ordonnances")
@Getter
@Setter
@NoArgsConstructor
public class Ordonnance {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String numero;

	@Column(name = "ord_date", nullable = false)
	private LocalDate ordDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false)
	private String beneficiaire;

	@Column(name = "type_prestation", nullable = false, length = 64)
	private String typePrestation;

	@Column(nullable = false, precision = 14, scale = 2)
	private BigDecimal montant;

	@Column(name = "montant_remboursable", nullable = false, precision = 14, scale = 2)
	private BigDecimal montantRemboursable;

	@Column(nullable = false)
	private int taux;

	@Column(nullable = false, length = 32)
	private String status;
}
