package ma.srm.mutuelle.service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.SpecialDiseaseResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.SpecialDiseaseWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.SpecialDiseaseDeclaration;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.SpecialDiseaseDeclarationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SpecialDiseaseService {

	private final SpecialDiseaseDeclarationRepository repository;
	private final AgentRepository agentRepository;

	public List<SpecialDiseaseResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return repository.findByAgent_IdAndDeletedFalseOrderByDeclarationDateDesc(aid).stream().map(this::toDto).toList();
		}
		return repository.findByDeletedFalseOrderByDeclarationDateDesc().stream().map(this::toDto).toList();
	}

	public SpecialDiseaseResponse get(Long id, AppUser user) {
		SpecialDiseaseDeclaration d = repository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
		AccessRules.assertAgentScope(user, d.getAgent().getId());
		return toDto(d);
	}

	@Transactional
	public SpecialDiseaseResponse create(SpecialDiseaseWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		SpecialDiseaseDeclaration d = new SpecialDiseaseDeclaration();
		d.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : "MLD-AUTO-" + UUID.randomUUID().toString().substring(0, 8));
		d.setDiseaseType(req.typeMaladie());
		d.setDeclarationDate(req.dateDeclaration());
		d.setAgent(agent);
		d.setBeneficiaire(req.beneficiaire());
		d.setStatus(req.statut());
		return toDto(repository.save(d));
	}

	@Transactional
	public SpecialDiseaseResponse update(Long id, SpecialDiseaseWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		SpecialDiseaseDeclaration d = repository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		if (req.numero() != null) {
			d.setNumero(req.numero());
		}
		d.setDiseaseType(req.typeMaladie());
		d.setDeclarationDate(req.dateDeclaration());
		d.setAgent(agent);
		d.setBeneficiaire(req.beneficiaire());
		d.setStatus(req.statut());
		return toDto(repository.save(d));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		SpecialDiseaseDeclaration d = repository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
		d.setDeleted(true);
		repository.save(d);
	}

	public List<SpecialDiseaseResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return repository.findByDeletedTrueOrderByDeclarationDateDesc().stream().map(this::toDto).toList();
	}

	@Transactional
	public void restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		SpecialDiseaseDeclaration d = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
		d.setDeleted(false);
		repository.save(d);
	}

	private SpecialDiseaseResponse toDto(SpecialDiseaseDeclaration d) {
		return new SpecialDiseaseResponse(
				d.getId(),
				d.getNumero(),
				d.getDiseaseType(),
				d.getDeclarationDate(),
				d.getAgent().getId(),
				d.getBeneficiaire(),
				d.getStatus());
	}
}
