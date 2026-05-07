package ma.srm.mutuelle.domain.repo;

import java.util.Optional;
import ma.srm.mutuelle.domain.MutualCard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MutualCardRepository extends JpaRepository<MutualCard, Long> {

	Optional<MutualCard> findByAgent_Id(Long agentId);
}
