package ma.srm.mutuelle.service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementResponse;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementWriteRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ValidateReimbursementRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Reimbursement;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.ReimbursementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReimbursementService {

	private final ReimbursementRepository reimbursementRepository;
	private final AgentRepository agentRepository;

	public List<ReimbursementResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return reimbursementRepository.findByAgent_IdOrderByReimbursementDateDesc(aid).stream()
					.map(this::toDto)
					.toList();
		}
		return reimbursementRepository.findAll().stream().map(this::toDto).toList();
	}

	public ReimbursementResponse get(Long id, AppUser user) {
		Reimbursement r = reimbursementRepository
				.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		AccessRules.assertAgentScope(user, r.getAgent().getId());
		return toDto(r);
	}

	@Transactional
	public ReimbursementResponse create(ReimbursementWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Reimbursement r = new Reimbursement();
		r.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : "RMB-AUTO-" + UUID.randomUUID().toString().substring(0, 8));
		r.setReimbursementDate(req.date());
		r.setAgent(agent);
		r.setBeneficiaire(req.beneficiaire());
		r.setMontantDemande(req.montantDemande());
		r.setMontantValide(req.montantValide());
		r.setStatus(req.statut());
		return toDto(reimbursementRepository.save(r));
	}

	@Transactional
	public ReimbursementResponse update(Long id, ReimbursementWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findById(id)
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
		AccessRules.assertStaffWrite(user);
		reimbursementRepository.deleteById(id);
	}

	@Transactional
	public ReimbursementResponse validate(Long id, ValidateReimbursementRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		r.setMontantValide(req.montantValide());
		if ("En attente".equals(r.getStatus()) || "En cours".equals(r.getStatus())) {
			r.setStatus("Traité");
		}
		return toDto(reimbursementRepository.save(r));
	}

	@Transactional
	public ReimbursementResponse close(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Reimbursement r = reimbursementRepository
				.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remboursement introuvable"));
		r.setStatus("Clôturé");
		return toDto(reimbursementRepository.save(r));
	}

	private ReimbursementResponse toDto(Reimbursement r) {
		return new ReimbursementResponse(
				r.getId(),
				r.getNumero(),
				r.getReimbursementDate(),
				r.getAgent().getId(),
				r.getBeneficiaire(),
				r.getMontantDemande(),
				r.getMontantValide(),
				r.getStatus());
	}
}
