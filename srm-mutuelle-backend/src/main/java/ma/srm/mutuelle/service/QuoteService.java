package ma.srm.mutuelle.service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteResponse;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Quote;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.QuoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class QuoteService {

	private final QuoteRepository quoteRepository;
	private final AgentRepository agentRepository;
	private final AdherentNotifierService adherentNotifierService;

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

	@Transactional
	public QuoteResponse create(QuoteWriteRequest req, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, req.agentId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Quote q = new Quote();
		q.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : "DEV-AUTO-" + UUID.randomUUID().toString().substring(0, 8));
		q.setQuoteType(req.type());
		q.setQuoteDate(req.date());
		q.setAgent(agent);
		q.setBeneficiaire(req.beneficiaire());
		q.setMontant(req.montant());
		q.setTaux(req.taux());
		q.setEtat(req.etat() != null && !req.etat().isBlank() ? req.etat() : "En attente");
		q.setScanned(false);
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
		q.setEtat("Soumis");
		return toDto(quoteRepository.save(q));
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
		q.setScanned(true);
		return toDto(quoteRepository.save(q));
	}

	@Transactional
	public QuoteResponse approve(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		q.setEtat("Approuvé");
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Votre devis n° " + q.getNumero() + " a été approuvé.");
		return toDto(q);
	}

	@Transactional
	public QuoteResponse reject(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Quote q = quoteRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable"));
		q.setEtat("Rejeté");
		q = quoteRepository.save(q);
		adherentNotifierService.notifyAdherentsOfAgent(
				q.getAgent().getId(),
				"DEVIS",
				"Votre devis n° " + q.getNumero() + " a été refusé. Contactez la mutuelle pour plus d'informations.");
		return toDto(q);
	}

	private QuoteResponse toDto(Quote q) {
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
				q.isScanned());
	}
}
