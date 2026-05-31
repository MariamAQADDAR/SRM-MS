package ma.srm.mutuelle.service;

import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Notification;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import ma.srm.mutuelle.domain.repo.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Notifications boîte administrateur / opérateur (devis à traiter, etc.). */
@Service
@RequiredArgsConstructor
public class StaffNotifierService {

	private static final List<AppUserRole> STAFF_ROLES = List.of(AppUserRole.ADMINISTRATEUR, AppUserRole.OPERATEUR);

	private final AppUserRepository appUserRepository;
	private final NotificationRepository notificationRepository;

	@Transactional
	public void notifyStaffWriters(String notifType, String body) {
		if (body == null || body.isBlank()) {
			return;
		}
		for (AppUserRole role : STAFF_ROLES) {
			for (AppUser u : appUserRepository.findByRoleAndActiveTrueAndDeletedFalse(role)) {
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
}
