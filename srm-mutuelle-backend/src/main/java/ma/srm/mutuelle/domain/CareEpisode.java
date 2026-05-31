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
@Table(name = "care_episodes")
@Getter
@Setter
@NoArgsConstructor
public class CareEpisode {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String numero;

	@Column(name = "type_prestation", nullable = false, length = 128)
	private String typePrestation;

	@Column(name = "date_debut", nullable = false)
	private LocalDate dateDebut;

	@Column(name = "date_fin")
	private LocalDate dateFin;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@Column(nullable = false)
	private String beneficiaire;

	@Column(name = "establishment_name", nullable = false)
	private String establishmentName;

	@Column(nullable = false, length = 32)
	private String status;

	@Column(name = "montant_demande", precision = 14, scale = 2)
	private BigDecimal montantDemande;

	@Column(name = "montant_pris_en_charge", precision = 14, scale = 2)
	private BigDecimal montantPrisEnCharge;

	@Column
	private Integer taux;

	@Column(name = "pdf_storage_key", length = 512)
	private String pdfStorageKey;

	@Column(name = "pdf_original_name", length = 255)
	private String pdfOriginalName;

	@Column(name = "deposit_date")
	private LocalDate depositDate;

	@Column(name = "sent_date")
	private LocalDate sentDate;

	@Column(name = "response_date")
	private LocalDate responseDate;

	@Column(columnDefinition = "TEXT")
	private String observation;

	@Column(nullable = false)
	private boolean deleted = false;
}
