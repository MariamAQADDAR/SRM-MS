package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.ContractedDoctor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractedDoctorRepository extends JpaRepository<ContractedDoctor, Long> {

	List<ContractedDoctor> findByMedicalFacility_IdOrderById(Long facilityId);
}
