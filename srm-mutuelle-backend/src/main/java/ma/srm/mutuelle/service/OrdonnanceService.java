package ma.srm.mutuelle.service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.OrdonnanceDtos.OrdonnanceResponse;
import ma.srm.mutuelle.api.dto.OrdonnanceDtos.OrdonnanceWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Ordonnance;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.OrdonnanceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrdonnanceService {

	private final OrdonnanceRepository ordonnanceRepository;
	private final AgentRepository agentRepository;

	public List<OrdonnanceResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return ordonnanceRepository.findByAgent_IdAndDeletedFalseOrderByOrdDateDesc(aid).stream().map(this::toDto).toList();
		}
		return ordonnanceRepository.findByDeletedFalseOrderByOrdDateDesc().stream().map(this::toDto).toList();
	}

	public OrdonnanceResponse get(Long id, AppUser user) {
		Ordonnance o = ordonnanceRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
		AccessRules.assertAgentScope(user, o.getAgent().getId());
		return toDto(o);
	}

	@Transactional
	public OrdonnanceResponse create(OrdonnanceWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Ordonnance o = new Ordonnance();
		o.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : "ORD-AUTO-" + UUID.randomUUID().toString().substring(0, 8));
		o.setOrdDate(req.date());
		o.setAgent(agent);
		o.setBeneficiaire(req.beneficiaire());
		o.setTypePrestation(req.typePrestation());
		o.setMontant(req.montant());
		o.setMontantRemboursable(req.montantRemboursable());
		o.setTaux(req.taux());
		o.setStatus(req.statut());
		return toDto(ordonnanceRepository.save(o));
	}

	@Transactional
	public OrdonnanceResponse update(Long id, OrdonnanceWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Ordonnance o = ordonnanceRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		if (req.numero() != null) {
			o.setNumero(req.numero());
		}
		o.setOrdDate(req.date());
		o.setAgent(agent);
		o.setBeneficiaire(req.beneficiaire());
		o.setTypePrestation(req.typePrestation());
		o.setMontant(req.montant());
		o.setMontantRemboursable(req.montantRemboursable());
		o.setTaux(req.taux());
		o.setStatus(req.statut());
		return toDto(ordonnanceRepository.save(o));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Ordonnance o = ordonnanceRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
		o.setDeleted(true);
		ordonnanceRepository.save(o);
	}

	public List<OrdonnanceResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return ordonnanceRepository.findByDeletedTrueOrderByOrdDateDesc().stream().map(this::toDto).toList();
	}

	@Transactional
	public void restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Ordonnance o = ordonnanceRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
		o.setDeleted(false);
		ordonnanceRepository.save(o);
	}

	private OrdonnanceResponse toDto(Ordonnance o) {
		return new OrdonnanceResponse(
				o.getId(),
				o.getNumero(),
				o.getOrdDate(),
				o.getAgent().getId(),
				o.getBeneficiaire(),
				o.getTypePrestation(),
				o.getMontant(),
				o.getMontantRemboursable(),
				o.getTaux(),
				o.getStatus());
	}
}
