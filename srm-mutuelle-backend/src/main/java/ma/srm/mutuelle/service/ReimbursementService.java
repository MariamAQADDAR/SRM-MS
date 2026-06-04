package ma.srm.mutuelle.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementResponse;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementWriteRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.RejectReimbursementRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ValidateReimbursementRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Reimbursement;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.ReimbursementRepository;
import ma.srm.mutuelle.service.ReimbursementPdfStorageService.StoredPdf;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReimbursementService {

	private final ReimbursementRepository reimbursementRepository;
	private final AgentRepository agentRepository;
	private final AdherentNotifierService adherentNotifierService;
	private final ReimbursementPdfStorageService reimbursementPdfStorageService;
	private final StaffNotifierService staffNotifierService;

	public List<ReimbursementResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return reimbursementRepository.findByAgent_IdAndDeletedFalseOrderByReimbursementDateDesc(aid).stream()
					.map(this::toDto)
					.toList();
		}
		return reimbursementRepository.findByDeletedFalseOrderByReimbursementDateDesc().stream().map(this::toDto).toList();
	}

	public ReimbursementResponse get(Long id, AppUser user) {
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		AccessRules.assertAgentScope(user, r.getAgent().getId());
		return toDto(r);
	}

	public byte[] readDocument(Long id, AppUser user) {
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		AccessRules.assertAgentScope(user, r.getAgent().getId());
		return reimbursementPdfStorageService.readBytes(r.getPdfStorageKey());
	}

	@Transactional
	public ReimbursementResponse create(ReimbursementWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Reimbursement r = new Reimbursement();
		r.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : nextNumero());
		r.setReimbursementDate(req.date());
		r.setAgent(agent);
		r.setBeneficiaire(req.beneficiaire());
		r.setMontantDemande(req.montantDemande());
		r.setMontantValide(req.montantValide());
		r.setStatus(req.statut());
		r.setDepositDate(req.date());
		r = reimbursementRepository.save(r);
		notify(r, "Étape 1/3 — Dépôt : demande n° " + r.getNumero() + " enregistrée.");
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse createRequest(
			Long agentId,
			String beneficiaire,
			String establishmentName,
			String careType,
			String medicineName,
			LocalDate depositDate,
			BigDecimal montantDemande,
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
		Reimbursement r = new Reimbursement();
		r.setNumero(nextNumero());
		r.setReimbursementDate(depositDate != null ? depositDate : LocalDate.now());
		r.setAgent(agent);
		r.setBeneficiaire(beneficiaire != null && !beneficiaire.isBlank() ? beneficiaire : agent.getPrenom() + " " + agent.getNom());
		r.setMontantDemande(montantDemande);
		r.setMontantValide(BigDecimal.ZERO);
		r.setStatus("En attente");
		r.setEstablishmentName(establishmentName);
		r.setCareType(careType);
		r.setMedicineName(medicineName);
		r.setDepositDate(depositDate != null ? depositDate : LocalDate.now());
		r.setObservation(observation);
		r.setTaux(null);
		r = reimbursementRepository.save(r);
		attachPdf(r, pdf);
		r = reimbursementRepository.save(r);
		notify(r, "Étape 1/3 — Dépôt : votre demande n° " + r.getNumero() + " est enregistrée avec justificatif. Envoyez-la à la mutuelle.");
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse submit(Long id, AppUser user) {
		Reimbursement r = loadScoped(id, user);
		if (!"En attente".equals(r.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Seules les demandes en attente peuvent être envoyées");
		}
		assertHasPdf(r);
		r.setStatus("En cours");
		r.setSentDate(LocalDate.now());
		r = reimbursementRepository.save(r);
		notify(r, "Étape 2/3 — Instruction : votre demande n° " + r.getNumero() + " est transmise à la mutuelle pour analyse.");
		staffNotifierService.notifyStaffWritersWithEmail(
				"REIMBURSEMENT_A_TRAITER",
				"Remboursement à traiter — n° " + r.getNumero() + " (" + r.getBeneficiaire() + ").",
				"remboursement",
				r.getNumero(),
				r.getBeneficiaire());
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse scan(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		if (!"En cours".equals(r.getStatus()) && !r.isScanned()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "La demande doit être transmise (En cours) avant instruction");
		}
		assertHasPdf(r);
		r.setScanned(true);
		r = reimbursementRepository.save(r);
		notify(r, "Étape 3/3 — Instruction : votre remboursement n° " + r.getNumero() + " est en cours de traitement par la mutuelle.");
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse update(Long id, ReimbursementWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		if (req.numero() != null) {
			r.setNumero(req.numero());
		}
		r.setReimbursementDate(req.date());
		r.setAgent(agent);
		r.setBeneficiaire(req.beneficiaire());
		r.setMontantDemande(req.montantDemande());
		r.setMontantValide(req.montantValide());
		r.setStatus(req.statut());
		return toDto(reimbursementRepository.save(r));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Reimbursement r = reimbursementRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		r.setDeleted(true);
		reimbursementRepository.save(r);
	}

	public List<ReimbursementResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return reimbursementRepository.findByDeletedTrueOrderByReimbursementDateDesc().stream().map(this::toDto).toList();
	}

	@Transactional
	public void restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Reimbursement r = reimbursementRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		r.setDeleted(false);
		reimbursementRepository.save(r);
	}

	@Transactional
	public ReimbursementResponse validate(Long id, ValidateReimbursementRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		if ("Clôturé".equals(r.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande clôturée, modification impossible");
		}
		if (!r.isScanned()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Marquez la demande comme instructée (scan) avant validation");
		}
		r.setMontantValide(req.montantValide());
		r.setTaux(null);
		if (req.observation() != null) {
			r.setObservation(req.observation());
		}
		r.setStatus("Traité");
		r.setResponseDate(LocalDate.now());
		r = reimbursementRepository.save(r);
		notify(
				r,
				"Étape 3/3 — Validé : remboursement n° "
						+ r.getNumero()
						+ ". Montant remboursé : "
						+ r.getMontantValide().toPlainString()
						+ " DH.");
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse reject(Long id, RejectReimbursementRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		if ("Clôturé".equals(r.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande clôturée, modification impossible");
		}
		if (req != null && req.observation() != null) {
			r.setObservation(req.observation());
		}
		r.setStatus("Rejeté");
		r.setResponseDate(LocalDate.now());
		r = reimbursementRepository.save(r);
		notify(r, "Étape 3/3 — Refusé : votre demande n° " + r.getNumero() + " n'a pas été acceptée. Contactez la mutuelle.");
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse close(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		r.setStatus("Clôturé");
		r.setResponseDate(LocalDate.now());
		r = reimbursementRepository.save(r);
		notify(r, "Demande n° " + r.getNumero() + " clôturée.");
		return toDto(r);
	}

	private Reimbursement loadScoped(Long id, AppUser user) {
		Reimbursement r = reimbursementRepository
				.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, r.getAgent().getId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		return r;
	}

	private void attachPdf(Reimbursement r, MultipartFile pdf) throws IOException {
		StoredPdf stored = reimbursementPdfStorageService.store(r.getId(), pdf);
		r.setPdfStorageKey(stored.storageKey());
		r.setPdfOriginalName(stored.originalFileName());
	}

	private void assertHasPdf(Reimbursement r) {
		if (r.getPdfStorageKey() == null || r.getPdfStorageKey().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Joignez le justificatif PDF avant envoi");
		}
	}

	private void notify(Reimbursement r, String body) {
		adherentNotifierService.notifyAdherentsOfAgent(r.getAgent().getId(), "REMBOURSEMENT", body);
	}

	private int defaultTauxForCareType(String careType) {
		if (careType == null) {
			return 80;
		}
		String t = careType.toLowerCase();
		if (t.contains("médicament") || t.contains("medicament")) {
			return 80;
		}
		if (t.contains("analyse") || t.contains("laboratoire")) {
			return 80;
		}
		if (t.contains("radio") || t.contains("imagerie")) {
			return 70;
		}
		if (t.contains("dentaire")) {
			return 50;
		}
		if (t.contains("optique")) {
			return 60;
		}
		return 80;
	}

	private String nextNumero() {
		return "RMB-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
	}

	private ReimbursementResponse toDto(Reimbursement r) {
		boolean hasPdf = r.getPdfStorageKey() != null && !r.getPdfStorageKey().isBlank();
		return new ReimbursementResponse(
				r.getId(),
				r.getNumero(),
				r.getReimbursementDate(),
				r.getAgent().getId(),
				r.getBeneficiaire(),
				r.getMontantDemande(),
				r.getMontantValide(),
				r.getStatus(),
				r.getTaux(),
				hasPdf,
				r.isScanned(),
				r.getPdfOriginalName(),
				r.getEstablishmentName(),
				r.getCareType(),
				r.getMedicineName(),
				r.getDepositDate(),
				r.getSentDate(),
				r.getResponseDate(),
				r.getObservation());
	}
}
