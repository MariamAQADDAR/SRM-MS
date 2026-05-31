package ma.srm.mutuelle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
public class Agent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 32)
	private String matricule;

	@Column(nullable = false, length = 120)
	private String nom;

	@Column(nullable = false, length = 120)
	private String prenom;

	@Column(length = 32)
	private String cin;

	@Column(name = "date_naissance")
	private LocalDate dateNaissance;

	@Column(length = 64)
	private String situation;

	@Column(name = "entite_name", nullable = false)
	private String entiteName;

	@Column(length = 32)
	private String telephone;

	@Column(length = 255)
	private String email;

	@Column(name = "date_recrutement")
	private LocalDate dateRecrutement;

	@Column(length = 64)
	private String statut;

	@Column(nullable = false)
	private boolean deleted = false;
}
