package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicalFacilityResponse;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicalFacilityWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.MedicalFacilityService;
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
@RequestMapping("/api/medical-facilities")
@RequiredArgsConstructor
public class MedicalFacilityController {

	private final MedicalFacilityService medicalFacilityService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<MedicalFacilityResponse> list(Authentication authentication) {
		return medicalFacilityService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public MedicalFacilityResponse get(@PathVariable Long id, Authentication authentication) {
		return medicalFacilityService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public MedicalFacilityResponse create(@Valid @RequestBody MedicalFacilityWriteRequest body, Authentication authentication) {
		return medicalFacilityService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public MedicalFacilityResponse update(
			@PathVariable Long id, @Valid @RequestBody MedicalFacilityWriteRequest body, Authentication authentication) {
		return medicalFacilityService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		medicalFacilityService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/archived")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<MedicalFacilityResponse> listArchived(Authentication authentication) {
		return medicalFacilityService.listArchived(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/restore")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void restore(@PathVariable Long id, Authentication authentication) {
		medicalFacilityService.restore(id, AuthPrincipal.requireUser(authentication));
	}
}
