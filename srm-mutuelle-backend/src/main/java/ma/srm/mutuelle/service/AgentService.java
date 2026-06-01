package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentBeneficiaryRequest;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentResponse;
import ma.srm.mutuelle.api.dto.AgentDtos.AgentWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Beneficiary;
import ma.srm.mutuelle.domain.OrganizationalEntity;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.BeneficiaryRepository;
import ma.srm.mutuelle.domain.repo.OrganizationalEntityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AgentService {

	private final AgentRepository agentRepository;
	private final BeneficiaryRepository beneficiaryRepository;
	private final OrganizationalEntityRepository organizationalEntityRepository;

	public List<AgentResponse> list(AppUser user) {
		if (user.getRole() == AppUserRole.ADHERENT) {
			Long aid = user.getAgentIdOrNull();
			if (aid == null) {
				return List.of();
			}
			return agentRepository.findById(aid)
					.filter(a -> !a.isDeleted())
					.map(a -> List.of(toDto(a))).orElse(List.of());
		}
		return agentRepository.findByDeletedFalse().stream().map(this::toDto).toList();
	}

	public List<AgentResponse> listArchived(AppUser user) {
		AccessRules.assertAdmin(user);
		return agentRepository.findByDeletedTrue().stream().map(this::toDto).toList();
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
		Agent saved = agentRepository.save(a);

		if (req.beneficiaries() != null) {
			for (AgentBeneficiaryRequest br : req.beneficiaries()) {
				Beneficiary b = new Beneficiary();
				b.setAgent(saved);
				b.setNom(br.nom());
				b.setPrenom(br.prenom());
				b.setLinkType(br.type());
				b.setCin(br.cin());
				b.setDateNaissance(br.dateNaissance());
				beneficiaryRepository.save(b);
			}
		}

		return toDto(saved);
	}

	@Transactional
	public AgentResponse update(Long id, AgentWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Agent a = agentRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable"));
		copy(req, a);
		Agent saved = agentRepository.save(a);

		if (req.beneficiaries() != null) {
			List<Beneficiary> existing = beneficiaryRepository.findByAgent_IdAndDeletedFalseOrderById(id);
			java.util.Set<Long> incomingIds = req.beneficiaries().stream()
					.map(AgentBeneficiaryRequest::id)
					.filter(java.util.Objects::nonNull)
					.collect(java.util.stream.Collectors.toSet());

			for (Beneficiary eb : existing) {
				if (!incomingIds.contains(eb.getId())) {
					beneficiaryRepository.delete(eb);
				}
			}

			for (AgentBeneficiaryRequest br : req.beneficiaries()) {
				if (br.id() == null) {
					Beneficiary b = new Beneficiary();
					b.setAgent(saved);
					b.setNom(br.nom());
					b.setPrenom(br.prenom());
					b.setLinkType(br.type());
					b.setCin(br.cin());
					b.setDateNaissance(br.dateNaissance());
					beneficiaryRepository.save(b);
				} else {
					Beneficiary b = beneficiaryRepository.findById(br.id())
							.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bénéficiaire introuvable: " + br.id()));
					b.setNom(br.nom());
					b.setPrenom(br.prenom());
					b.setLinkType(br.type());
					b.setCin(br.cin());
					b.setDateNaissance(br.dateNaissance());
					beneficiaryRepository.save(b);
				}
			}
		}

		return toDto(saved);
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Agent a = agentRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable"));
		a.setDeleted(true);
		agentRepository.save(a);
	}

	@Transactional
	public AgentResponse restore(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		Agent a = agentRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent introuvable"));
		a.setDeleted(false);
		agentRepository.save(a);
		return toDto(a);
	}

	private void copy(AgentWriteRequest req, Agent a) {
		a.setMatricule(req.matricule());
		a.setNom(req.nom());
		a.setPrenom(req.prenom());
		a.setCin(req.cin());
		a.setDateNaissance(req.dateNaissance());
		a.setSituation(req.situation());
		OrganizationalEntity service = resolveServiceEntity(req.entiteId());
		a.setOrganizationalEntity(service);
		a.setEntiteName(service.getName());
		a.setTelephone(req.telephone());
		a.setEmail(req.email());
		a.setDateRecrutement(req.dateRecrutement());
		a.setStatut(req.statut() != null ? req.statut() : "Actif");
	}

	private OrganizationalEntity resolveServiceEntity(Long entiteId) {
		if (entiteId == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service de rattachement est obligatoire");
		}
		OrganizationalEntity oe = organizationalEntityRepository.findByIdAndDeletedFalse(entiteId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Service introuvable"));
		if (!"Service".equals(oe.getEntityType())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'agent doit être rattaché à un Service (niveau 5)");
		}
		return oe;
	}

	private AgentResponse toDto(Agent a) {
		OrganizationalEntity oe = a.getOrganizationalEntity();
		return new AgentResponse(
				a.getId(),
				a.getMatricule(),
				a.getNom(),
				a.getPrenom(),
				a.getCin(),
				a.getDateNaissance(),
				a.getSituation(),
				a.getEntiteName(),
				oe != null ? oe.getId() : null,
				a.getTelephone(),
				a.getEmail(),
				a.getDateRecrutement(),
				a.getStatut());
	}
}
