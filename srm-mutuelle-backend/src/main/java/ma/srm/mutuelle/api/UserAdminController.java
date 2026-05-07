package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.AppUserResponse;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.CreateAppUserRequest;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.PatchActiveRequest;
import ma.srm.mutuelle.api.dto.AppUserAdminDtos.UpdateAppUserRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.service.UserAdminService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

	private final UserAdminService userAdminService;

	@GetMapping
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<AppUserResponse> list() {
		return userAdminService.listAll();
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public AppUserResponse get(@PathVariable Long id) {
		return userAdminService.get(id);
	}

	@PostMapping
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public AppUserResponse create(@Valid @RequestBody CreateAppUserRequest body) {
		return userAdminService.create(body);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public AppUserResponse update(
			@PathVariable Long id, @RequestBody UpdateAppUserRequest body, Authentication authentication) {
		return userAdminService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PatchMapping("/{id}/active")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public AppUserResponse patchActive(
			@PathVariable Long id, @Valid @RequestBody PatchActiveRequest body, Authentication authentication) {
		return userAdminService.patchActive(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		userAdminService.delete(id, AuthPrincipal.requireUser(authentication));
	}
}
