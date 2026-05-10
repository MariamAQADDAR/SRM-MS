package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentResponse;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AgentService {

	private final AgentRepository agentRepository;

	public List<AgentResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return agentRepository.findById(aid).map(a -> List.of(toDto(a))).orElse(List.of());
		}
		return agentRepository.findAll().stream().map(this::toDto).toList();
	}

	public AgentResponse get(Long id, AppUser user) {
		AccessRules.assertAgentScope(user, id);
		return toDto(agentRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable")));
	}

	@Transactional
	public AgentResponse create(AgentWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent a = new Agent();
		copy(req, a);
		return toDto(agentRepository.save(a));
	}

	@Transactional
	public AgentResponse update(Long id, AgentWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent a = agentRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable"));
		copy(req, a);
		return toDto(agentRepository.save(a));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		if (!agentRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable");
		}
		try {
			agentRepository.deleteById(id);
		} catch (Exception ex) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de supprimer (données liées)");
		}
	}

	private void copy(AgentWriteRequest req, Agent a) {
		a.setMatricule(req.matricule());
		a.setNom(req.nom());
		a.setPrenom(req.prenom());
		a.setCin(req.cin());
		a.setDateNaissance(req.dateNaissance());
		a.setSituation(req.situation());
		a.setEntiteName(req.entite());
		a.setTelephone(req.telephone());
		a.setEmail(req.email());
	}

	private AgentResponse toDto(Agent a) {
		return new AgentResponse(
				a.getId(),
				a.getMatricule(),
				a.getNom(),
				a.getPrenom(),
				a.getCin(),
				a.getDateNaissance(),
				a.getSituation(),
				a.getEntiteName(),
				a.getTelephone(),
				a.getEmail());
	}
}
