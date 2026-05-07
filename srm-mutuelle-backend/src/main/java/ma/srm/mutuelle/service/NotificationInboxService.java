package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.NotificationDtos.InboxNotificationResponse;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.Notification;
import ma.srm.mutuelle.domain.repo.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class NotificationInboxService {

	private final NotificationRepository notificationRepository;

	public List<InboxNotificationResponse> list(AppUser user) {
		return notificationRepository.findByAppUserOrderByCreatedAtDesc(user).stream().map(this::toDto).toList();
	}

	public long unreadCount(AppUser user) {
		return notificationRepository.countByAppUserAndReadFlagIsFalse(user);
	}

	@Transactional
	public void markRead(Long id, AppUser user) {
		Notification n = notificationRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable"));
		if (!n.getAppUser().getId().equals(user.getId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé");
		}
		n.setReadFlag(true);
		notificationRepository.save(n);
	}

	private InboxNotificationResponse toDto(Notification n) {
		return new InboxNotificationResponse(
				n.getId(),
				n.getNotifType(),
				n.getBody(),
				n.isReadFlag(),
				n.getCreatedAt(),
				n.getBroadcast() != null ? n.getBroadcast().getId() : null);
	}
}
