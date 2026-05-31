package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.OrganizationalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationalEntityRepository extends JpaRepository<OrganizationalEntity, Long> {
	java.util.List<OrganizationalEntity> findByDeletedFalseOrderByName();

	java.util.List<OrganizationalEntity> findByDeletedTrueOrderByName();

	java.util.Optional<OrganizationalEntity> findByIdAndDeletedFalse(Long id);
}
