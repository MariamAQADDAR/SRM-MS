package ma.srm.mutuelle.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardCreateRequest;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardResponse;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.MutualCard;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.MutualCardRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MutualCardService {

	private final MutualCardRepository mutualCardRepository;
	private final AgentRepository agentRepository;

	public List<MutualCardResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return mutualCardRepository.findByAgent_Id(aid).map(c -> List.of(toDto(c))).orElseGet(List::of);
		}
		return mutualCardRepository.findAll().stream().map(this::toDto).toList();
	}

	public MutualCardResponse getForAgent(Long agentId, AppUser user) {
		AccessRules.assertAgentScope(user, agentId);
		MutualCard c = mutualCardRepository
				.findByAgent_Id(agentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte introuvable"));
		return toDto(c);
	}

	@Transactional
	public MutualCardResponse createOrEnsure(MutualCardCreateRequest req, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, req.agentId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
		MutualCard card = mutualCardRepository.findByAgent_Id(req.agentId()).orElseGet(MutualCard::new);
		card.setAgent(agent);
		card.setIssuedAt(Instant.now());
		card.setPdfStorageKey(null);
		return toDto(mutualCardRepository.save(card));
	}

	public Map<String, String> downloadPlaceholder(Long agentId, AppUser user) {
		AccessRules.assertAgentScope(user, agentId);
		if (!mutualCardRepository.findByAgent_Id(agentId).isPresent()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte introuvable");
		}
		return Map.of(
				"message", "PDF généré côté serveur à brancher (OpenPDF / stockage fichier)",
				"downloadUrl",
				"/api/mutual-cards/by-agent/" + agentId + "/download");
	}

	private MutualCardResponse toDto(MutualCard c) {
		return new MutualCardResponse(
				c.getId(), c.getAgent().getId(), c.getIssuedAt().toString(), c.getPdfStorageKey());
	}
}
