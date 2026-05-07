package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.CareEpisodeService;
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
@RequestMapping("/api/care-episodes")
@RequiredArgsConstructor
public class CareEpisodeController {

	private final CareEpisodeService careEpisodeService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<CareEpisodeResponse> list(Authentication authentication) {
		return careEpisodeService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public CareEpisodeResponse get(@PathVariable Long id, Authentication authentication) {
		return careEpisodeService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse create(@Valid @RequestBody CareEpisodeWriteRequest body, Authentication authentication) {
		return careEpisodeService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse update(
			@PathVariable Long id, @Valid @RequestBody CareEpisodeWriteRequest body, Authentication authentication) {
		return careEpisodeService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		careEpisodeService.delete(id, AuthPrincipal.requireUser(authentication));
	}
}
