package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.OrgEntityDtos.OrgEntityResponse;
import ma.srm.mutuelle.api.dto.OrgEntityDtos.OrgEntityWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.OrganizationalEntityService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizational-entities")
@RequiredArgsConstructor
public class OrganizationalEntityController {

	private final OrganizationalEntityService organizationalEntityService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<OrgEntityResponse> list(Authentication authentication) {
		return organizationalEntityService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public OrgEntityResponse get(@PathVariable Long id, Authentication authentication) {
		return organizationalEntityService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public OrgEntityResponse create(@Valid @RequestBody OrgEntityWriteRequest body, Authentication authentication) {
		return organizationalEntityService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public OrgEntityResponse update(
			@PathVariable Long id, @Valid @RequestBody OrgEntityWriteRequest body, Authentication authentication) {
		return organizationalEntityService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		organizationalEntityService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/archived")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<OrgEntityResponse> listArchived(Authentication authentication) {
		return organizationalEntityService.listArchived(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/restore")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void restore(@PathVariable Long id, Authentication authentication) {
		organizationalEntityService.restore(id, AuthPrincipal.requireUser(authentication));
	}
}
