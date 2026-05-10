package ma.srm.mutuelle.service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.CareEpisode;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.CareEpisodeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CareEpisodeService {

	private final CareEpisodeRepository careEpisodeRepository;
	private final AgentRepository agentRepository;

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
		CareEpisode e = careEpisodeRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PEC introuvable"));
		AccessRules.assertAgentScope(user, e.getAgent().getId());
		return toDto(e);
	}

	@Transactional
	public CareEpisodeResponse create(CareEpisodeWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		CareEpisode e = new CareEpisode();
		e.setNumero(req.numero() != null && !req.numero().isBlank() ? req.numero() : "PEC-AUTO-" + UUID.randomUUID().toString().substring(0, 8));
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
	public CareEpisodeResponse update(Long id, CareEpisodeWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		CareEpisode e = careEpisodeRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PEC introuvable"));
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
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		careEpisodeRepository.deleteById(id);
	}

	private CareEpisodeResponse toDto(CareEpisode e) {
		return new CareEpisodeResponse(
				e.getId(),
				e.getNumero(),
				e.getTypePrestation(),
				e.getDateDebut(),
				e.getDateFin(),
				e.getAgent().getId(),
				e.getBeneficiaire(),
				e.getEstablishmentName(),
				e.getStatus());
	}
}
