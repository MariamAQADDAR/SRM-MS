package ma.srm.mutuelle.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteResponse;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteReviewRequest;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Quote;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.QuoteRepository;
import ma.srm.mutuelle.service.QuotePdfStorageService.StoredPdf;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class QuoteService {

	private final QuoteRepository quoteRepository;
	private final AgentRepository agentRepository;
	private final AdherentNotifierService adherentNotifierService;
	private final StaffNotifierService staffNotifierService;
	private final QuotePdfStorageService quotePdfStorageService;

	public List<QuoteResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return quoteRepository.findByAgent_IdOrderByQuoteDateDesc(aid).stream().map(this::toDto).toList();
		}
		return quoteRepository.findAll().stream().map(this::toDto).toList();
	}

	public QuoteResponse get(Long id, AppUser user) {
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		AccessRules.assertAgentScope(user, q.getAgent().getId());
		return toDto(q);
	}

	public byte[] readDocument(Long id, AppUser user) {
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		AccessRules.assertAgentScope(user, q.getAgent().getId());
		return quotePdfStorageService.readBytes(q.getPdfStorageKey());
	}

	@Transactional
	public QuoteResponse create(QuoteWriteRequest req, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, req.agentId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Quote q = newQuote(agent, req.beneficiaire(), req.type(), req.date(), req.montant(), req.taux(), req.etat());
		q.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : nextNumero());
		q = quoteRepository.save(q);
		notifyDepotIfAdherent(user, agent.getId(), q.getNumero());
		return toDto(q);
	}

	@Transactional
	public QuoteResponse createDental(
			Long agentId,
			String beneficiaire,
			String dentistName,
			LocalDate dateDevis,
			LocalDate dateDepot,
			BigDecimal montant,
			int taux,
			String observation,
			MultipartFile pdf,
			AppUser user)
			throws IOException {
		return createWithDocument(
				agentId,
				beneficiaire,
				"Dentaire",
				dentistName,
				dateDevis,
				dateDepot,
				montant,
				taux,
				observation,
				pdf,
				user);
	}

	@Transactional
	public QuoteResponse createWithDocument(
			Long agentId,
			String beneficiaire,
			String quoteType,
			String providerName,
			LocalDate dateDevis,
			LocalDate dateDepot,
			BigDecimal montant,
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
		if (agentId == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Porteur obligatoire");
		}
		String type = quoteType != null && !quoteType.isBlank() ? quoteType.trim() : "Autre";
		AccessRules.assertAgentScope(user, agentId);
		Agent agent = agentRepository.findById(agentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		String label = beneficiaire != null && !beneficiaire.isBlank()
				? beneficiaire
				: agent.getPrenom() + " " + agent.getNom();
		LocalDate devisDate = dateDevis != null ? dateDevis : LocalDate.now();
		int effectiveTaux = taux > 0 ? taux : defaultTauxForQuoteType(type);
		Quote q = newQuote(agent, label, type, devisDate, montant, effectiveTaux, "En attente");
		q.setNumero(nextNumero());
		q.setDentistName(providerName);
		q.setDepositDate(dateDepot != null ? dateDepot : LocalDate.now());
		q.setObservation(observation);
		q = quoteRepository.save(q);
		attachPdf(q, pdf);
		q = quoteRepository.save(q);
		notifyDepotIfAdherent(user, agent.getId(), q.getNumero());
		return toDto(q);
	}

	private int defaultTauxForQuoteType(String type) {
		if (type == null) {
			return 60;
		}
		String t = type.toLowerCase();
		if (t.contains("dent")) {
			return 60;
		}
		if (t.contains("optique")) {
			return 70;
		}
		if (t.contains("auditif")) {
			return 65;
		}
		if (t.contains("hospital")) {
			return 80;
		}
		return 60;
	}

	@Transactional
	public QuoteResponse uploadDocument(Long id, MultipartFile pdf, AppUser user) throws IOException {
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, q.getAgent().getId());
			String etat = q.getEtat();
			if (!"En attente".equals(etat) && !"Brouillon".equals(etat)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Le PDF ne peut plus être modifié pour ce devis");
			}
		} else {
			AccessRules.assertStaffWrite(user);
		}
		attachPdf(q, pdf);
		return toDto(quoteRepository.save(q));
	}

	@Transactional
	public QuoteResponse submit(Long id, AppUser user) {
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, q.getAgent().getId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		String etat = q.getEtat();
		if (!"En attente".equals(etat) && !"Brouillon".equals(etat)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "État incompatible avec l'envoi du devis");
		}
		assertHasPdf(q);
		q.setEtat("Soumis");
		q.setSentDate(LocalDate.now());
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Étape 2/3 — Transmission : votre devis n° " + q.getNumero() + " a été envoyé à la mutuelle.");
		notifyStaffQuoteToProcess(q);
		return toDto(q);
	}

	@Transactional
	public QuoteResponse update(Long id, QuoteWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		if (req.numero() != null) {
			q.setNumero(req.numero());
		}
		q.setQuoteType(req.type());
		q.setQuoteDate(req.date());
		q.setAgent(agent);
		q.setBeneficiaire(req.beneficiaire());
		q.setMontant(req.montant());
		q.setTaux(req.taux());
		if (req.etat() != null) {
			q.setEtat(req.etat());
		}
		return toDto(quoteRepository.save(q));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		quoteRepository.deleteById(id);
	}

	@Transactional
	public QuoteResponse scan(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		if (!"Soumis".equals(q.getEtat()) && !q.isScanned()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Le devis doit être soumis avant instruction");
		}
		assertHasPdf(q);
		q.setScanned(true);
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Étape 3/3 — Instruction : votre devis n° " + q.getNumero() + " est en cours de traitement par la mutuelle.");
		return toDto(q);
	}

	@Transactional
	public QuoteResponse approve(Long id, QuoteReviewRequest review, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		if (!q.isScanned()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Marquez le devis comme instructé (scan) avant approbation");
		}
		applyReview(q, review);
		q.setEtat("Approuvé");
		q.setResponseDate(review != null && review.responseDate() != null ? review.responseDate() : LocalDate.now());
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Décision — Approuvé : votre devis n° " + q.getNumero() + " a été accepté par la mutuelle.");
		return toDto(q);
	}

	@Transactional
	public QuoteResponse reject(Long id, QuoteReviewRequest review, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		applyReview(q, review);
		q.setEtat("Rejeté");
		q.setResponseDate(review != null && review.responseDate() != null ? review.responseDate() : LocalDate.now());
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Décision — Refusé : votre devis n° " + q.getNumero() + " n'a pas été accepté. Contactez la mutuelle.");
		return toDto(q);
	}

	private void attachPdf(Quote q, MultipartFile pdf) throws IOException {
		StoredPdf stored = quotePdfStorageService.store(q.getId(), pdf);
		q.setPdfStorageKey(stored.storageKey());
		q.setPdfOriginalName(stored.originalFileName());
	}

	private void assertHasPdf(Quote q) {
		if (q.getPdfStorageKey() == null || q.getPdfStorageKey().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Joignez le PDF du devis avant de continuer");
		}
	}

	private void applyReview(Quote q, QuoteReviewRequest review) {
		if (review == null) {
			return;
		}
		if (review.montantPrisEnCharge() != null) {
			q.setMontantPrisEnCharge(review.montantPrisEnCharge());
		} else if (q.getMontantPrisEnCharge() == null) {
			BigDecimal pec = q.getMontant().multiply(BigDecimal.valueOf(q.getTaux())).divide(BigDecimal.valueOf(100));
			q.setMontantPrisEnCharge(pec);
		}
		if (review.observation() != null) {
			q.setObservation(review.observation());
		}
	}

	private Quote newQuote(Agent agent, String beneficiaire, String type, LocalDate date, BigDecimal montant, int taux, String etat) {
		Quote q = new Quote();
		q.setAgent(agent);
		q.setBeneficiaire(beneficiaire);
		q.setQuoteType(type);
		q.setQuoteDate(date);
		q.setMontant(montant);
		q.setTaux(taux);
		q.setEtat(etat != null && !etat.isBlank() ? etat : "En attente");
		q.setScanned(false);
		return q;
	}

	private String nextNumero() {
		return "DEV-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
	}

	private void notifyDepotIfAdherent(AppUser user, Long agentId, String numero) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			adherentNotifierService.notifyAdherentsOfAgent(
					agentId,
					"DEVIS",
					"Étape 1/3 — Dépôt : votre devis n° " + numero + " est enregistré avec PDF. Envoyez-le à la mutuelle quand il est prêt.");
		}
	}

	private void notifyStaffQuoteToProcess(Quote q) {
		String typeLabel = q.getQuoteType() != null ? q.getQuoteType() : "Devis";
		String agentLabel = q.getAgent() != null && q.getAgent().getNom() != null
				? q.getAgent().getNom()
				: "adhérent";
		staffNotifierService.notifyStaffWriters(
				"DEVIS_A_TRAITER",
				"Devis à traiter — n° " + q.getNumero() + " (" + typeLabel + ", " + agentLabel + ").");
	}

	private QuoteResponse toDto(Quote q) {
		boolean hasPdf = q.getPdfStorageKey() != null && !q.getPdfStorageKey().isBlank();
		return new QuoteResponse(
				q.getId(),
				q.getNumero(),
				q.getQuoteType(),
				q.getQuoteDate(),
				q.getAgent().getId(),
				q.getBeneficiaire(),
				q.getMontant(),
				q.getTaux(),
				q.getEtat(),
				q.isScanned(),
				hasPdf,
				q.getPdfOriginalName(),
				q.getDentistName(),
				q.getDepositDate(),
				q.getSentDate(),
				q.getResponseDate(),
				q.getMontantPrisEnCharge(),
				q.getObservation());
	}
}
