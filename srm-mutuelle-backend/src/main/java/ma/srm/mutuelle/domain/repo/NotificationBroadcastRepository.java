package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.BroadcastStatus;
import ma.srm.mutuelle.domain.NotificationBroadcast;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationBroadcastRepository extends JpaRepository<NotificationBroadcast, Long> {

	List<NotificationBroadcast> findByStatusOrderByCreatedAtDesc(BroadcastStatus status);
}
