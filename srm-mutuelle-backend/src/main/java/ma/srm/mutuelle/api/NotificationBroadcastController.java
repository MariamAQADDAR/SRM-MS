package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.NotificationDtos.BroadcastResponse;
import ma.srm.mutuelle.api.dto.NotificationDtos.BroadcastWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.NotificationBroadcastService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notification-broadcasts")
@RequiredArgsConstructor
public class NotificationBroadcastController {

	private final NotificationBroadcastService notificationBroadcastService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public List<BroadcastResponse> listAll(Authentication authentication) {
		return notificationBroadcastService.listAll(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/drafts")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public List<BroadcastResponse> drafts(Authentication authentication) {
		return notificationBroadcastService.listDrafts(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public BroadcastResponse get(@PathVariable Long id, Authentication authentication) {
		return notificationBroadcastService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public BroadcastResponse create(@Valid @RequestBody BroadcastWriteRequest body, Authentication authentication) {
		return notificationBroadcastService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public BroadcastResponse update(
			@PathVariable Long id, @Valid @RequestBody BroadcastWriteRequest body, Authentication authentication) {
		return notificationBroadcastService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/publish")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public BroadcastResponse publish(@PathVariable Long id, Authentication authentication) {
		return notificationBroadcastService.publish(id, AuthPrincipal.requireUser(authentication));
	}
}
