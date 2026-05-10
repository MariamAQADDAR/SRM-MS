package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementResponse;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementWriteRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ValidateReimbursementRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.ReimbursementService;
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
@RequestMapping("/api/reimbursements")
@RequiredArgsConstructor
public class ReimbursementController {

	private final ReimbursementService reimbursementService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<ReimbursementResponse> list(Authentication authentication) {
		return reimbursementService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ReimbursementResponse get(@PathVariable Long id, Authentication authentication) {
		return reimbursementService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse create(@Valid @RequestBody ReimbursementWriteRequest body, Authentication authentication) {
		return reimbursementService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse update(
			@PathVariable Long id, @Valid @RequestBody ReimbursementWriteRequest body, Authentication authentication) {
		return reimbursementService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		reimbursementService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/validate")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse validate(
			@PathVariable Long id, @Valid @RequestBody ValidateReimbursementRequest body, Authentication authentication) {
		return reimbursementService.validate(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/close")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse close(@PathVariable Long id, Authentication authentication) {
		return reimbursementService.close(id, AuthPrincipal.requireUser(authentication));
	}
}
