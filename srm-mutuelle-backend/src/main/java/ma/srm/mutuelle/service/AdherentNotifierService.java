package ma.srm.mutuelle.service;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Notification;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import ma.srm.mutuelle.domain.repo.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Notifications boîte adhérent (persistées) — déclenchées après transitions métier (devis, remboursements).
 */
@Service
@RequiredArgsConstructor
public class AdherentNotifierService {

	private final AppUserRepository appUserRepository;
	private final NotificationRepository notificationRepository;

	@Transactional
	public void notifyAdherentsOfAgent(Long agentId, String notifType, String body) {
		if (agentId == null || body == null || body.isBlank()) {
			return;
		}
		for (AppUser u : appUserRepository.findByAgent_IdAndDeletedFalse(agentId)) {
			if (u.getRole() != AppUserRole.ADHERENT) {
				continue;
			}
			Notification n = new Notification();
			n.setAppUser(u);
			n.setNotifType(notifType);
			n.setBody(body);
			n.setReadFlag(false);
			n.setCreatedAt(Instant.now());
			notificationRepository.save(n);
		}
	}
}
