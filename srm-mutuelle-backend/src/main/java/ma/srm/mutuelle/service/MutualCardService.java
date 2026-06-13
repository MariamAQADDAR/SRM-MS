package ma.srm.mutuelle.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardCreateRequest;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardFamilyMember;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardResponse;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Beneficiary;
import ma.srm.mutuelle.domain.MutualCard;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.BeneficiaryRepository;
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
	private final BeneficiaryRepository beneficiaryRepository;
	private final MutualCardPdfService mutualCardPdfService;

	public List<MutualCardResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return mutualCardRepository.findByAgent_IdOrderByCardLabelAscIdAsc(aid).stream().map(this::toDto).toList();
		}
		return mutualCardRepository.findAll().stream().map(this::toDto).toList();
	}

	public List<MutualCardFamilyMember> familyOverview(Long agentId, AppUser user) {
		AccessRules.assertAgentScope(user, agentId);
		Agent agent = agentRepository.findById(agentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Porteur introuvable"));
		List<MutualCard> cards = mutualCardRepository.findByAgent_IdOrderByCardLabelAscIdAsc(agentId);
		List<MutualCardFamilyMember> out = new ArrayList<>();

		MutualCard titulaireCard = cards.stream().filter(c -> c.getBeneficiary() == null).findFirst().orElse(null);
		out.add(familyRow(
				null,
				"Titulaire",
				agent.getPrenom() + " " + agent.getNom(),
				agent.getCin(),
				agent.getDateNaissance(),
				agent.getVille(),
				titulaireCard));

		for (Beneficiary b : beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(agentId)) {
			out.add(familyRow(
					b.getId(),
					b.getLinkType(),
					b.getPrenom() + " " + b.getNom(),
					b.getCin(),
					b.getDateNaissance(),
					b.getVille(),
					titulaireCard));
		}
		return out;
	}

	public MutualCardResponse getForAgent(Long agentId, AppUser user) {
		AccessRules.assertAgentScope(user, agentId);
		MutualCard c = mutualCardRepository
				.findByAgent_IdAndBeneficiaryIsNull(agentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte titulaire introuvable"));
		return toDto(c);
	}

	@Transactional
	public MutualCardResponse createOrEnsure(MutualCardCreateRequest req, AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			AccessRules.assertAgentScope(user, req.agentId());
		} else {
			AccessRules.assertStaffWrite(user);
		}
		Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Porteur introuvable"));

		// Force single card for the agent (titulaire)
		MutualCard card = mutualCardRepository.findByAgent_IdAndBeneficiaryIsNull(req.agentId()).orElseGet(MutualCard::new);
		card.setBeneficiary(null);
		card.setCardLabel("Titulaire");
		card.setHolderPrenom(agent.getPrenom());
		card.setHolderNom(agent.getNom());
		card.setHolderCin(agent.getCin());
		card.setHolderDateNaissance(agent.getDateNaissance());

		card.setAgent(agent);
		card.setIssuedAt(java.time.Instant.now());
		MutualCard saved = mutualCardRepository.save(card);
		try {
			List<Beneficiary> beneficiaries = beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(agent.getId());
			String key = mutualCardPdfService.generateAndStore(saved, agent, beneficiaries);
			saved.setPdfStorageKey(key);
			saved = mutualCardRepository.save(saved);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Génération PDF carte : " + e.getMessage());
		}
		return toDto(saved);
	}

	public byte[] readPdfBytes(Long cardId, AppUser user) {
		MutualCard c = mutualCardRepository.findById(cardId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte introuvable"));
		AccessRules.assertAgentScope(user, c.getAgent().getId());
		return ensurePdf(c);
	}

	public byte[] readPdfBytesForAgent(Long agentId, AppUser user) {
		MutualCard c = mutualCardRepository
				.findByAgent_IdAndBeneficiaryIsNull(agentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Carte titulaire introuvable"));
		AccessRules.assertAgentScope(user, agentId);
		return ensurePdf(c);
	}

	private byte[] ensurePdf(MutualCard c) {
		String key = c.getPdfStorageKey();
		if (key == null || key.isBlank()) {
			try {
				Agent agent = c.getAgent();
				List<Beneficiary> beneficiaries = beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(agent.getId());
				key = mutualCardPdfService.generateAndStore(c, agent, beneficiaries);
				c.setPdfStorageKey(key);
				mutualCardRepository.save(c);
			} catch (IOException e) {
				throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Génération PDF : " + e.getMessage());
			}
		}
		return mutualCardPdfService.readPdfBytes(key);
	}

	private MutualCardFamilyMember familyRow(
			Long beneficiaryId,
			String label,
			String fullName,
			String cin,
			java.time.LocalDate birth,
			String ville,
			MutualCard card) {
		return new MutualCardFamilyMember(
				beneficiaryId,
				label,
				fullName,
				cin,
				birth,
				ville,
				card != null ? card.getId() : null,
				card != null && card.getPdfStorageKey() != null && !card.getPdfStorageKey().isBlank(),
				card != null && card.getIssuedAt() != null ? card.getIssuedAt().toString() : null);
	}

	private MutualCardResponse toDto(MutualCard c) {
		String full = (c.getHolderPrenom() != null ? c.getHolderPrenom() : "")
				+ " "
				+ (c.getHolderNom() != null ? c.getHolderNom() : "");
		return new MutualCardResponse(
				c.getId(),
				c.getAgent().getId(),
				c.getBeneficiary() != null ? c.getBeneficiary().getId() : null,
				c.getCardLabel(),
				full.trim(),
				c.getHolderCin(),
				c.getHolderDateNaissance(),
				c.getIssuedAt().toString(),
				c.getPdfStorageKey() != null && !c.getPdfStorageKey().isBlank());
	}
}
