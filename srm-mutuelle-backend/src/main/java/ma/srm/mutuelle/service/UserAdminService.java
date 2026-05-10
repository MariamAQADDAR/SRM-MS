package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.AppUserResponse;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.CreateAppUserRequest;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.PatchActiveRequest;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.UpdateAppUserRequest;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserAdminService {

	private final AppUserRepository appUserRepository;
	private final AgentRepository agentRepository;
	private final PasswordEncoder passwordEncoder;

	public List<AppUserResponse> listAll() {
		return appUserRepository.findAll().stream().map(this::toDto).toList();
	}

	public AppUserResponse get(Long id) {
		return toDto(appUserRepository.findById(id).orElseThrow(() -> notFound(id)));
	}

	@Transactional
	public AppUserResponse create(CreateAppUserRequest req, AppUser actor) {
		if (appUserRepository.existsByEmailIgnoreCase(req.email())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
		}
		AppUserRole role = parseRole(req.role());
		if (actor.getRole() == AppUserRole.OPERATEUR && role == AppUserRole.ADMINISTRATEUR) {
			throw new ResponseStatusException(
					HttpStatus.FORBIDDEN, "Accès refusé : seul un administrateur peut créer un compte administrateur.");
		}
		AppUser u = new AppUser();
		u.setEmail(req.email().trim().toLowerCase());
		u.setPasswordHash(passwordEncoder.encode(req.password()));
		u.setFullName(req.fullName());
		u.setRole(role);
		u.setActive(true);
		if (role == AppUserRole.ADHERENT) {
			if (req.agentId() == null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "agentId obligatoire pour ADHERENT");
			}
			Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
			u.setAgent(agent);
		} else {
			u.setAgent(null);
		}
		return toDto(appUserRepository.save(u));
	}

	@Transactional
	public AppUserResponse update(Long id, UpdateAppUserRequest req, AppUser actor) {
		AppUser u = appUserRepository.findById(id).orElseThrow(() -> notFound(id));
		if (actor.getRole() == AppUserRole.OPERATEUR && u.getRole() == AppUserRole.ADMINISTRATEUR) {
			throw new ResponseStatusException(
					HttpStatus.FORBIDDEN, "Accès refusé : vous ne pouvez pas modifier un compte administrateur.");
		}
		if (actor.getId().equals(id) && Boolean.FALSE.equals(req.active())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de se désactiver soi-même");
		}
		if (req.fullName() != null) {
			u.setFullName(req.fullName());
		}
		if (req.role() != null) {
			AppUserRole newRole = parseRole(req.role());
			if (actor.getRole() == AppUserRole.OPERATEUR && newRole == AppUserRole.ADMINISTRATEUR) {
				throw new ResponseStatusException(
						HttpStatus.FORBIDDEN, "Accès refusé : vous ne pouvez pas attribuer le rôle administrateur.");
			}
			u.setRole(newRole);
			if (u.getRole() != AppUserRole.ADHERENT) {
				u.setAgent(null);
			}
		}
		if (req.active() != null) {
			u.setActive(req.active());
		}
		if (req.agentId() != null) {
			if (u.getRole() != AppUserRole.ADHERENT) {
				u.setAgent(null);
			} else {
				Agent agent = agentRepository.findById(req.agentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent introuvable"));
				u.setAgent(agent);
			}
		}
		return toDto(appUserRepository.save(u));
	}

	@Transactional
	public AppUserResponse patchActive(Long id, PatchActiveRequest req, AppUser actor) {
		AppUser u = appUserRepository.findById(id).orElseThrow(() -> notFound(id));
		if (actor.getRole() == AppUserRole.OPERATEUR && u.getRole() == AppUserRole.ADMINISTRATEUR) {
			throw new ResponseStatusException(
					HttpStatus.FORBIDDEN,
					"Accès refusé : seul un administrateur peut activer ou désactiver un compte administrateur.");
		}
		if (actor.getId().equals(id) && Boolean.FALSE.equals(req.active())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de se désactiver soi-même");
		}
		u.setActive(req.active());
		return toDto(appUserRepository.save(u));
	}

	@Transactional
	public void delete(Long id, AppUser actor) {
		if (actor.getRole() == AppUserRole.OPERATEUR) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé : les opérateurs ne peuvent pas supprimer un utilisateur.");
		}
		if (actor.getId().equals(id)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suppression de soi-même interdite");
		}
		if (!appUserRepository.existsById(id)) {
			throw notFound(id);
		}
		appUserRepository.deleteById(id);
	}

	private ResponseStatusException notFound(Long id) {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur " + id + " introuvable");
	}

	private AppUserRole parseRole(String r) {
		try {
			return AppUserRole.valueOf(r.trim().toUpperCase());
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle invalide");
		}
	}

	private AppUserResponse toDto(AppUser u) {
		return new AppUserResponse(
				u.getId(),
				u.getEmail(),
				u.getFullName(),
				u.getRole().name(),
				u.isActive(),
				u.getAgentIdOrNull(),
				u.getLastLoginAt());
	}
}
