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
@Table(name = "reimbursements")
@Getter
@Setter
@NoArgsConstructor
public class Reimbursement {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String numero;

	@Column(name = "reimbursement_date", nullable = false)
	private LocalDate reimbursementDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false)
	private String beneficiaire;

	@Column(name = "montant_demande", nullable = false, precision = 14, scale = 2)
	private BigDecimal montantDemande;

	@Column(name = "montant_valide", nullable = false, precision = 14, scale = 2)
	private BigDecimal montantValide;

	@Column(nullable = false, length = 32)
	private String status;

	@Column
	private Integer taux;

	@Column(name = "pdf_storage_key", length = 512)
	private String pdfStorageKey;

	@Column(name = "pdf_original_name", length = 255)
	private String pdfOriginalName;

	@Column(name = "establishment_name", length = 255)
	private String establishmentName;

	@Column(name = "care_type", length = 64)
	private String careType;

	@Column(name = "medicine_name", length = 255)
	private String medicineName;

	@Column(name = "deposit_date")
	private LocalDate depositDate;

	@Column(name = "sent_date")
	private LocalDate sentDate;

	@Column(name = "response_date")
	private LocalDate responseDate;

	@Column(columnDefinition = "TEXT")
	private String observation;

	@Column(nullable = false)
	private boolean scanned = false;

	@Column(nullable = false)
	private boolean deleted = false;
}
