package ma.srm.mutuelle.domain.repo;

import java.util.List;
import java.util.Optional;
import ma.srm.mutuelle.domain.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

	List<Beneficiary> findByAgent_IdOrderById(Long agentId);

	Optional<Beneficiary> findByIdAndAgent_Id(Long id, Long agentId);
}
