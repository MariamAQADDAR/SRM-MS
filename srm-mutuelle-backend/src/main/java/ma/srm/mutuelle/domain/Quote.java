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
@Table(name = "quotes")
@Getter
@Setter
@NoArgsConstructor
public class Quote {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String numero;

	@Column(name = "quote_type", nullable = false, length = 64)
	private String quoteType;

	@Column(name = "quote_date", nullable = false)
	private LocalDate quoteDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false)
	private String beneficiaire;

	@Column(nullable = false, precision = 14, scale = 2)
	private BigDecimal montant;

	@Column(nullable = false)
	private int taux;

	@Column(nullable = false, length = 32)
	private String etat;

	@Column(nullable = false)
	private boolean scanned = false;

	@Column(name = "pdf_storage_key", length = 512)
	private String pdfStorageKey;

	@Column(name = "pdf_original_name", length = 255)
	private String pdfOriginalName;

	@Column(name = "dentist_name", length = 255)
	private String dentistName;

	@Column(name = "deposit_date")
	private LocalDate depositDate;

	@Column(name = "sent_date")
	private LocalDate sentDate;

	@Column(name = "response_date")
	private LocalDate responseDate;

	@Column(name = "montant_pris_en_charge", precision = 14, scale = 2)
	private BigDecimal montantPrisEnCharge;

	@Column(columnDefinition = "TEXT")
	private String observation;
}
