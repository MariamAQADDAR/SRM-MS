package ma.srm.mutuelle.domain.repo;

import java.util.List;
import java.util.Optional;
import ma.srm.mutuelle.domain.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

	List<Beneficiary> findByDeletedFalseOrderById();
	
	List<Beneficiary> findByDeletedTrueOrderById();

	List<Beneficiary> findByAgent_IdAndDeletedFalseOrderById(Long agentId);

	Optional<Beneficiary> findByIdAndDeletedFalse(Long id);

	Optional<Beneficiary> findByIdAndAgent_IdAndDeletedFalse(Long id, Long agentId);
}
