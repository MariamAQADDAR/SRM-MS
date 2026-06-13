package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.BeneficiaryDtos.BeneficiaryResponse;
import ma.srm.mutuelle.api.dto.BeneficiaryDtos.BeneficiaryWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.service.BeneficiaryService;
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
@RequestMapping("/api/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {

	private final BeneficiaryService beneficiaryService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<BeneficiaryResponse> list(
			@RequestParam(required = false) Long agentId, Authentication authentication) {
		return beneficiaryService.list(agentId, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public BeneficiaryResponse get(@PathVariable Long id, Authentication authentication) {
		return beneficiaryService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public BeneficiaryResponse create(@Valid @RequestBody BeneficiaryWriteRequest body, Authentication authentication) {
		return beneficiaryService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public BeneficiaryResponse update(
			@PathVariable Long id, @Valid @RequestBody BeneficiaryWriteRequest body, Authentication authentication) {
		return beneficiaryService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		beneficiaryService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/archived")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<BeneficiaryResponse> listArchived(Authentication authentication) {
		return beneficiaryService.listArchived(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/restore")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void restore(@PathVariable Long id, Authentication authentication) {
		beneficiaryService.restore(id, AuthPrincipal.requireUser(authentication));
	}
}
