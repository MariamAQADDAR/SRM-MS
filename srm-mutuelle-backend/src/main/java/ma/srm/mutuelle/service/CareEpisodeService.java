package ma.srm.mutuelle.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeWriteRequest;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.RejectCareEpisodeRequest;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.ValidateCareEpisodeRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.CareEpisode;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.CareEpisodeRepository;
import ma.srm.mutuelle.service.CareEpisodePdfStorageService.StoredPdf;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CareEpisodeService {

	private final CareEpisodeRepository careEpisodeRepository;
	private final AgentRepository agentRepository;
	private final AdherentNotifierService adherentNotifierService;
	private final CareEpisodePdfStorageService careEpisodePdfStorageService;

	public List<CareEpisodeResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return careEpisodeRepository.findByAgent_IdOrderByDateDebutDesc(aid).stream().map(this::toDto).toList();
		}
		return careEpisodeRepository.findAll().stream().map(this::toDto).toList();
	}

	public CareEpisodeResponse get(Long id, AppUser user) {
		CareEpisode e = load(id);
		AccessRules.assertAgentScope(user, e.getAgent().getId());
		return toDto(e);
	}

	public byte[] readDocument(Long id, AppUser user) {
		CareEpisode e = load(id);
		AccessRules.assertAgentScope(user, e.getAgent().getId());
		return careEpisodePdfStorageService.readBytes(e.getPdfStorageKey());
	}

	@Transactional
	public CareEpisodeResponse create(CareEpisodeWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		CareEpisode e = new CareEpisode();
		e.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : nextNumero());
		e.setTypePrestation(req.typePrestation());
		e.setDateDebut(req.dateDebut());
		e.setDateFin(req.dateFin());
		e.setAgent(agent);
		e.setBeneficiaire(req.beneficiaire());
		e.setEstablishmentName(req.etablissement());
		e.setStatus(req.statut());
		e.setMontantDemande(BigDecimal.ZERO);
		e.setMontantPrisEnCharge(BigDecimal.ZERO);
		e.setDepositDate(req.dateDebut());
		return toDto(careEpisodeRepository.save(e));
	}

	@Transactional
	public CareEpisodeResponse createRequest(
			Long agentId,
			String beneficiaire,
			String typePrestation,
			String etablissement,
			LocalDate dateDebut,
			LocalDate dateFin,
			BigDecimal montantDemande,
			int taux,
			String observation,
			MultipartFile pdf,
			AppUser user)
			throws IOException {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long own = user.getAgentIdOrNull();
			if (own == null) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte adhérent sans porteur associé");
			}
			agentId = own;
		} else {
			AccessRules.assertStaffWrite(user);
		}
		AccessRules.assertAgentScope(user, agentId);
		Agent agent = agentRepository.findById(agentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Porteur introuvable"));
		LocalDate debut = dateDebut != null ? dateDebut : LocalDate.now();
		CareEpisode e = new CareEpisode();
		e.setNumero(nextNumero());
		e.setTypePrestation(typePrestation);
		e.setDateDebut(debut);
		e.setDateFin(dateFin);
		e.setAgent(agent);
		e.setBeneficiaire(beneficiaire != null && !beneficiaire.isBlank() ? beneficiaire : agent.getPrenom() + " " + agent.getNom());
		e.setEstablishmentName(etablissement);
		e.setStatus("En attente");
		e.setMontantDemande(montantDemande);
		e.setMontantPrisEnCharge(BigDecimal.ZERO);
		e.setTaux(taux > 0 ? taux : defaultTauxForType(typePrestation));
		e.setDepositDate(debut);
		e.setObservation(observation);
		e = careEpisodeRepository.save(e);
		attachPdf(e, pdf);
		e = careEpisodeRepository.save(e);
		notify(e, "Étape 1/3 — Dépôt : votre demande de prise en charge n° " + e.getNumero() + " est enregistrée. Envoyez-la à la mutuelle.");
		return toDto(e);
	}

	@Transactional
	public CareEpisodeResponse submit(Long id, AppUser user) {
		CareEpisode e = loadScoped(id, user);
		if (!"En attente".equals(e.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Seules les demandes en attente peuvent être envoyées");
		}
		assertHasPdf(e);
		e.setStatus("En cours");
		e.setSentDate(LocalDate.now());
		e = careEpisodeRepository.save(e);
		notify(e, "Étape 2/3 — Instruction : votre demande n° " + e.getNumero() + " est transmise à la mutuelle.");
		return toDto(e);
	}

	@Transactional
	public CareEpisodeResponse update(Long id, CareEpisodeWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		CareEpisode e = load(id);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		if (req.numero() != null) {
			e.setNumero(req.numero());
		}
		e.setTypePrestation(req.typePrestation());
		e.setDateDebut(req.dateDebut());
		e.setDateFin(req.dateFin());
		e.setAgent(agent);
		e.setBeneficiaire(req.beneficiaire());
		e.setEstablishmentName(req.etablissement());
		e.setStatus(req.statut());
		return toDto(careEpisodeRepository.save(e));
	}

	@Transactional
	public CareEpisodeResponse validate(Long id, ValidateCareEpisodeRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		CareEpisode e = load(id);
		if (!"En cours".equals(e.getStatus()) && !"En attente".equals(e.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande déjà traitée");
		}
		e.setMontantPrisEnCharge(req.montantPrisEnCharge());
		if (req.taux() != null) {
			e.setTaux(req.taux());
		} else if (e.getTaux() == null && e.getMontantDemande() != null && e.getMontantDemande().signum() > 0) {
			e.setTaux(req.montantPrisEnCharge()
					.multiply(BigDecimal.valueOf(100))
					.divide(e.getMontantDemande(), 0, RoundingMode.HALF_UP)
					.intValue());
		}
		if (req.observation() != null) {
			e.setObservation(req.observation());
		}
		if (req.dateFin() != null) {
			e.setDateFin(req.dateFin());
		}
		e.setStatus("Approuvé");
		e.setResponseDate(LocalDate.now());
		e = careEpisodeRepository.save(e);
		String tauxTxt = e.getTaux() != null ? e.getTaux() + " %" : "—";
		notify(
				e,
				"Étape 3/3 — Approuvé : prise en charge n° "
						+ e.getNumero()
						+ ". Montant PEC : "
						+ e.getMontantPrisEnCharge().toPlainString()
						+ " DH (taux "
						+ tauxTxt
						+ ").");
		return toDto(e);
	}

	@Transactional
	public CareEpisodeResponse reject(Long id, RejectCareEpisodeRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		CareEpisode e = load(id);
		if ("Approuvé".equals(e.getStatus()) || "Clôturé".equals(e.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande déjà finalisée");
		}
		if (req != null && req.observation() != null) {
			e.setObservation(req.observation());
		}
		e.setStatus("Rejeté");
		e.setResponseDate(LocalDate.now());
		e = careEpisodeRepository.save(e);
		notify(e, "Étape 3/3 — Refusé : votre demande de prise en charge n° " + e.getNumero() + " n'a pas été acceptée.");
		return toDto(e);
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		careEpisodeRepository.deleteById(id);
	}

	private CareEpisode load(Long id) {
		return careEpisodeRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PEC introuvable"));
	}

	private CareEpisode loadScoped(Long id, AppUser user) {
		CareEpisode e = load(id);
		AccessRules.assertAgentScope(user, e.getAgent().getId());
		return e;
	}

	private void attachPdf(CareEpisode e, MultipartFile pdf) throws IOException {
		StoredPdf stored = careEpisodePdfStorageService.store(e.getId(), pdf);
		e.setPdfStorageKey(stored.storageKey());
		e.setPdfOriginalName(stored.originalFileName());
	}

	private void assertHasPdf(CareEpisode e) {
		if (e.getPdfStorageKey() == null || e.getPdfStorageKey().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Joignez le justificatif PDF avant de continuer");
		}
	}

	private void notify(CareEpisode e, String message) {
		adherentNotifierService.notifyAdherentsOfAgent(e.getAgent().getId(), "PEC", message);
	}

	private String nextNumero() {
		return "PEC-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
	}

	private int defaultTauxForType(String type) {
		if (type == null) {
			return 70;
		}
		String t = type.toLowerCase(Locale.ROOT);
		if (t.contains("hospital")) {
			return 80;
		}
		if (t.contains("matern")) {
			return 100;
		}
		if (t.contains("chirurg")) {
			return 75;
		}
		return 70;
	}

	private CareEpisodeResponse toDto(CareEpisode e) {
		boolean hasPdf = e.getPdfStorageKey() != null && !e.getPdfStorageKey().isBlank();
		return new CareEpisodeResponse(
				e.getId(),
				e.getNumero(),
				e.getTypePrestation(),
				e.getDateDebut(),
				e.getDateFin(),
				e.getAgent().getId(),
				e.getBeneficiaire(),
				e.getEstablishmentName(),
				e.getStatus(),
				e.getMontantDemande(),
				e.getMontantPrisEnCharge(),
				e.getTaux(),
				hasPdf,
				e.getPdfOriginalName(),
				e.getDepositDate(),
				e.getSentDate(),
				e.getResponseDate(),
				e.getObservation());
	}
}
