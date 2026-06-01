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
@Table(name = "mutual_card_requests")
@Getter
@Setter
@NoArgsConstructor
public class MutualCardRequest {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agent_id")
	private Agent agent;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "beneficiary_id")
	private Beneficiary beneficiary;

	@Column(name = "beneficiary_name", nullable = false)
	private String beneficiaryName;

	@Column(name = "request_type", nullable = false, length = 64)
	private String requestType;

	@Column(name = "request_date", nullable = false)
	private LocalDate requestDate = LocalDate.now();

	@Column(nullable = false, length = 32)
	private String status = "En attente";

	@Column(columnDefinition = "TEXT")
	private String reason;

	@Column(nullable = false)
	private boolean deleted = false;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();
}
