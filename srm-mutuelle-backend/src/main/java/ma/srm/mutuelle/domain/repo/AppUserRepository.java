package ma.srm.mutuelle.domain.repo;

import java.util.List;
import java.util.Optional;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

	Optional<AppUser> findByEmailIgnoreCaseAndDeletedFalse(String email);

	boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);

	List<AppUser> findByRoleAndDeletedFalse(AppUserRole role);

	List<AppUser> findByAgent_IdAndDeletedFalse(Long agentId);

	List<AppUser> findByRoleAndActiveTrueAndDeletedFalse(AppUserRole role);

	List<AppUser> findByDeletedFalseOrderById();

	List<AppUser> findByDeletedTrueOrderById();

	Optional<AppUser> findByIdAndDeletedFalse(Long id);

	Optional<AppUser> findByResetToken(String resetToken);
}
