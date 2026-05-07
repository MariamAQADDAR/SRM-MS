package ma.srm.mutuelle.api;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.NotificationDtos.InboxNotificationResponse;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.NotificationInboxService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationInboxService notificationInboxService;

	@GetMapping
	@PreAuthorize("isAuthenticated()")
	public List<InboxNotificationResponse> list(Authentication authentication) {
		return notificationInboxService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/unread-count")
	@PreAuthorize("isAuthenticated()")
	public Map<String, Long> unreadCount(Authentication authentication) {
		long n = notificationInboxService.unreadCount(AuthPrincipal.requireUser(authentication));
		return Map.of("count", n);
	}

	@PatchMapping("/{id}/read")
	@PreAuthorize("isAuthenticated()")
	public void markRead(@PathVariable Long id, Authentication authentication) {
		notificationInboxService.markRead(id, AuthPrincipal.requireUser(authentication));
	}
}
