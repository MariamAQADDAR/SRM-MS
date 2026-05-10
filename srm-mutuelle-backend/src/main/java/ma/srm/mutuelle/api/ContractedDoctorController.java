package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MedicalDtos.ContractedDoctorResponse;
import ma.srm.mutuelle.api.dto.MedicalDtos.ContractedDoctorWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.ContractedDoctorService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contracted-doctors")
@RequiredArgsConstructor
public class ContractedDoctorController {

	private final ContractedDoctorService contractedDoctorService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<ContractedDoctorResponse> list(@RequestParam(required = false) Long facilityId) {
		return contractedDoctorService.list(facilityId);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ContractedDoctorResponse get(@PathVariable Long id, Authentication authentication) {
		return contractedDoctorService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ContractedDoctorResponse create(@Valid @RequestBody ContractedDoctorWriteRequest body, Authentication authentication) {
		return contractedDoctorService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ContractedDoctorResponse update(
			@PathVariable Long id, @Valid @RequestBody ContractedDoctorWriteRequest body, Authentication authentication) {
		return contractedDoctorService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		contractedDoctorService.delete(id, AuthPrincipal.requireUser(authentication));
	}
}
