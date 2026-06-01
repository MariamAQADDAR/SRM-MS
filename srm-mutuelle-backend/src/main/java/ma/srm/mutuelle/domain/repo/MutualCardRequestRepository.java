package ma.srm.mutuelle.domain.repo;

import java.util.List;
import java.util.Optional;
import ma.srm.mutuelle.domain.MutualCardRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MutualCardRequestRepository extends JpaRepository<MutualCardRequest, Long> {

	List<MutualCardRequest> findByDeletedFalseOrderByRequestDateDescIdDesc();

	List<MutualCardRequest> findByAgent_IdAndDeletedFalseOrderByRequestDateDescIdDesc(Long agentId);

	List<MutualCardRequest> findByDeletedTrueOrderByRequestDateDescIdDesc();

	Optional<MutualCardRequest> findByIdAndDeletedFalse(Long id);
}
