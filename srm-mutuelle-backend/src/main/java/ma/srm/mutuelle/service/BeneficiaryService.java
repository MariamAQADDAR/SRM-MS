package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.BeneficiaryDtos.BeneficiaryResponse;
import ma.srm.mutuelle.api.dto.BeneficiaryDtos.BeneficiaryWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Beneficiary;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.BeneficiaryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BeneficiaryService {

	private final BeneficiaryRepository beneficiaryRepository;
	private final AgentRepository agentRepository;

	public List<BeneficiaryResponse> list(Long agentIdFilter, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long mine = user.getAgentIdOrNull();
			if (mine == null) {
				return List.of();
			}
			return beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(mine).stream().map(this::toDto).toList();
		}
		if (agentIdFilter != null) {
			return beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(agentIdFilter).stream().map(this::toDto).toList();
		}
		return beneficiaryRepository.findByDeletedFalseOrderById().stream().map(this::toDto).toList();
	}

	public BeneficiaryResponse get(Long id, AppUser user) {
		Beneficiary b = beneficiaryRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bénéficiaire introuvable"));
		AccessRules.assertAgentScope(user, b.getAgent().getId());
		return toDto(b);
	}

	@Transactional
	public BeneficiaryResponse create(BeneficiaryWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		Beneficiary b = new Beneficiary();
		b.setAgent(agent);
		b.setNom(req.nom());
		b.setPrenom(req.prenom());
		b.setLinkType(req.type());
		b.setCin(req.cin());
		b.setDateNaissance(req.dateNaissance());
		return toDto(beneficiaryRepository.save(b));
	}

	@Transactional
	public BeneficiaryResponse update(Long id, BeneficiaryWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Beneficiary b = beneficiaryRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bénéficiaire introuvable"));
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		b.setAgent(agent);
		b.setNom(req.nom());
		b.setPrenom(req.prenom());
		b.setLinkType(req.type());
		b.setCin(req.cin());
		b.setDateNaissance(req.dateNaissance());
		return toDto(beneficiaryRepository.save(b));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Beneficiary b = beneficiaryRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bénéficiaire introuvable"));
		b.setDeleted(true);
		beneficiaryRepository.save(b);
	}

	public List<BeneficiaryResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return beneficiaryRepository.findByDeletedTrueOrderById().stream().map(this::toDto).toList();
	}

	@Transactional
	public void restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Beneficiary b = beneficiaryRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bénéficiaire introuvable"));
		b.setDeleted(false);
		beneficiaryRepository.save(b);
	}

	private BeneficiaryResponse toDto(Beneficiary b) {
		return new BeneficiaryResponse(
				b.getId(),
				b.getAgent().getId(),
				b.getNom(),
				b.getPrenom(),
				b.getLinkType(),
				b.getCin(),
				b.getDateNaissance());
	}
}
