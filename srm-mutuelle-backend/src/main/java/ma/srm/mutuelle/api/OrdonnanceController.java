package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.OrdonnanceDtos.OrdonnanceResponse;
import ma.srm.mutuelle.api.dto.OrdonnanceDtos.OrdonnanceWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.OrdonnanceService;
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
@RequestMapping("/api/ordonnances")
@RequiredArgsConstructor
public class OrdonnanceController {

	private final OrdonnanceService ordonnanceService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<OrdonnanceResponse> list(Authentication authentication) {
		return ordonnanceService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public OrdonnanceResponse get(@PathVariable Long id, Authentication authentication) {
		return ordonnanceService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public OrdonnanceResponse create(@Valid @RequestBody OrdonnanceWriteRequest body, Authentication authentication) {
		return ordonnanceService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public OrdonnanceResponse update(
			@PathVariable Long id, @Valid @RequestBody OrdonnanceWriteRequest body, Authentication authentication) {
		return ordonnanceService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		ordonnanceService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/archived")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<OrdonnanceResponse> listArchived(Authentication authentication) {
		return ordonnanceService.listArchived(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/restore")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void restore(@PathVariable Long id, Authentication authentication) {
		ordonnanceService.restore(id, AuthPrincipal.requireUser(authentication));
	}
}
