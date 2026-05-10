package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.SpecialDiseaseResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.SpecialDiseaseWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.SpecialDiseaseService;
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
@RequestMapping("/api/special-diseases")
@RequiredArgsConstructor
public class SpecialDiseaseController {

	private final SpecialDiseaseService specialDiseaseService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<SpecialDiseaseResponse> list(Authentication authentication) {
		return specialDiseaseService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public SpecialDiseaseResponse get(@PathVariable Long id, Authentication authentication) {
		return specialDiseaseService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public SpecialDiseaseResponse create(@Valid @RequestBody SpecialDiseaseWriteRequest body, Authentication authentication) {
		return specialDiseaseService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public SpecialDiseaseResponse update(
			@PathVariable Long id, @Valid @RequestBody SpecialDiseaseWriteRequest body, Authentication authentication) {
		return specialDiseaseService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		specialDiseaseService.delete(id, AuthPrincipal.requireUser(authentication));
	}
}
