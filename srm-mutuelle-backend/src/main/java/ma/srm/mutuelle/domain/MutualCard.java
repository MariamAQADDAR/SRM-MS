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
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "mutual_cards")
@Getter
@Setter
@NoArgsConstructor
public class MutualCard {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	/** Null = carte du porteur (titulaire). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "beneficiary_id")
	private Beneficiary beneficiary;

	@Column(name = "card_label", nullable = false, length = 32)
	private String cardLabel = "Titulaire";

	@Column(name = "holder_nom", length = 120)
	private String holderNom;

	@Column(name = "holder_prenom", length = 120)
	private String holderPrenom;

	@Column(name = "holder_cin", length = 32)
	private String holderCin;

	@Column(name = "holder_date_naissance")
	private LocalDate holderDateNaissance;

	@Column(name = "issued_at", nullable = false)
	private Instant issuedAt = Instant.now();

	@Column(name = "pdf_storage_key", length = 512)
	private String pdfStorageKey;
}
