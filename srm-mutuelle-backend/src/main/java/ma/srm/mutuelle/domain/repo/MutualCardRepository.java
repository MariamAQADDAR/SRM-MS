package ma.srm.mutuelle.domain.repo;

import java.util.List;
import java.util.Optional;
import ma.srm.mutuelle.domain.MutualCard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MutualCardRepository extends JpaRepository<MutualCard, Long> {

	List<MutualCard> findByAgent_IdOrderByCardLabelAscIdAsc(Long agentId);

	Optional<MutualCard> findByAgent_IdAndBeneficiaryIsNull(Long agentId);

	Optional<MutualCard> findByAgent_IdAndBeneficiary_Id(Long agentId, Long beneficiaryId);
}
