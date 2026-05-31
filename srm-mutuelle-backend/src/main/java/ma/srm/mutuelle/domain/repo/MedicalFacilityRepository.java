package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.MedicalFacility;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicalFacilityRepository extends JpaRepository<MedicalFacility, Long> {

	java.util.List<MedicalFacility> findByDeletedFalseOrderByName();

	java.util.List<MedicalFacility> findByDeletedTrueOrderByName();

	java.util.Optional<MedicalFacility> findByIdAndDeletedFalse(Long id);
}
