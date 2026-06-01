package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MutualCardRequestDtos.MutualCardRequestResponse;
import ma.srm.mutuelle.api.dto.MutualCardRequestDtos.MutualCardRequestWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Beneficiary;
import ma.srm.mutuelle.domain.MutualCardRequest;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.BeneficiaryRepository;
import ma.srm.mutuelle.domain.repo.MutualCardRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MutualCardRequestService {

	private final MutualCardRequestRepository repository;
	private final AgentRepository agentRepository;
	private final BeneficiaryRepository beneficiaryRepository;

	public List<MutualCardRequestResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return repository.findByAgent_IdAndDeletedFalseOrderByRequestDateDescIdDesc(aid).stream()
					.map(this::toDto)
					.toList();
		}
		return repository.findByDeletedFalseOrderByRequestDateDescIdDesc().stream().map(this::toDto).toList();
	}

	public MutualCardRequestResponse get(Long id, AppUser user) {
		MutualCardRequest r = repository.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
		AccessRules.assertAgentScope(user, r.getAgent().getId());
		return toDto(r);
	}

	@Transactional
	public MutualCardRequestResponse create(MutualCardRequestWriteRequest req, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long mine = user.getAgentIdOrNull();
			if (mine == null || !mine.equals(req.agentId())) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé");
			}
		} else {
			AccessRules.assertStaffWrite(user);
		}
		MutualCardRequest r = new MutualCardRequest();
		applyWrite(req, r);
		return toDto(repository.save(r));
	}

	@Transactional
	public MutualCardRequestResponse update(Long id, MutualCardRequestWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		MutualCardRequest r = repository.findByIdAndDeletedFalse(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
		applyWrite(req, r);
		return toDto(repository.save(r));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		MutualCardRequest r = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
		r.setDeleted(true);
		repository.save(r);
	}

	public List<MutualCardRequestResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return repository.findByDeletedTrueOrderByRequestDateDescIdDesc().stream().map(this::toDto).toList();
	}

	@Transactional
	public void restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		MutualCardRequest r = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
		r.setDeleted(false);
		repository.save(r);
	}

	private void applyWrite(MutualCardRequestWriteRequest req, MutualCardRequest r) {
		Agent agent = agentRepository.findById(req.agentId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		r.setAgent(agent);
		if (req.beneficiaryId() != null) {
			Beneficiary b = beneficiaryRepository.findById(req.beneficiaryId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bénéficiaire introuvable"));
			if (!b.getAgent().getId().equals(agent.getId())) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bénéficiaire non rattaché à cet agent");
			}
			r.setBeneficiary(b);
		} else {
			r.setBeneficiary(null);
		}
		r.setBeneficiaryName(req.beneficiaire().trim());
		r.setRequestType(req.typeDemande());
		r.setRequestDate(req.dateDemande() != null ? req.dateDemande() : r.getRequestDate());
		if (req.statut() != null && !req.statut().isBlank()) {
			r.setStatus(req.statut());
		} else if (r.getStatus() == null || r.getStatus().isBlank()) {
			r.setStatus("En attente");
		}
		r.setReason(req.raison());
	}

	private MutualCardRequestResponse toDto(MutualCardRequest r) {
		Agent a = r.getAgent();
		return new MutualCardRequestResponse(
				r.getId(),
				a.getId(),
				a.getMatricule(),
				r.getBeneficiary() != null ? r.getBeneficiary().getId() : null,
				r.getBeneficiaryName(),
				r.getRequestType(),
				r.getRequestDate(),
				r.getStatus(),
				r.getReason());
	}
}
