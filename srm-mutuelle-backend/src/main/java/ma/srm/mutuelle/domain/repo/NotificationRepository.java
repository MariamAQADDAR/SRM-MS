package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	List<Notification> findByAppUserOrderByCreatedAtDesc(AppUser appUser);

	long countByAppUserAndReadFlagIsFalse(AppUser appUser);
}
