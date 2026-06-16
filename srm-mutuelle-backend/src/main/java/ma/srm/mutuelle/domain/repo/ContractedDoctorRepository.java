package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.ContractedDoctor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractedDoctorRepository extends JpaRepository<ContractedDoctor, Long> {

	List<ContractedDoctor> findByMedicalFacility_IdAndDeletedFalseOrderById(Long facilityId);

	List<ContractedDoctor> findByDeletedFalseOrderById();

	long countByDeletedFalse();

	List<ContractedDoctor> findByDeletedTrueOrderById();

	java.util.Optional<ContractedDoctor> findByIdAndDeletedFalse(Long id);
}
