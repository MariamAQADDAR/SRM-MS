package ma.srm.mutuelle.service;

import java.io.IOException;
import java.util.List;
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
	private final MutualCardPdfService mutualCardPdfService;

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
		card.setIssuedAt(java.time.Instant.now());
		MutualCard saved = mutualCardRepository.save(card);
		try {
			String key = mutualCardPdfService.generateAndStore(saved, agent);
			saved.setPdfStorageKey(key);
			saved = mutualCardRepository.save(saved);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Génération PDF carte : " + e.getMessage());
		}
		return toDto(saved);
	}

	public byte[] readPdfBytes(Long agentId, AppUser user) {
		AccessRules.assertAgentScope(user, agentId);
		MutualCard c = mutualCardRepository
				.findByAgent_Id(agentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte introuvable"));
		String key = c.getPdfStorageKey();
		if (key == null || key.isBlank()) {
			try {
				Agent agent = c.getAgent();
				key = mutualCardPdfService.generateAndStore(c, agent);
				c.setPdfStorageKey(key);
				mutualCardRepository.save(c);
			} catch (IOException e) {
				throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Génération PDF : " + e.getMessage());
			}
		}
		return mutualCardPdfService.readPdfBytes(key);
	}

	private MutualCardResponse toDto(MutualCard c) {
		return new MutualCardResponse(
				c.getId(), c.getAgent().getId(), c.getIssuedAt().toString(), c.getPdfStorageKey());
	}
}
