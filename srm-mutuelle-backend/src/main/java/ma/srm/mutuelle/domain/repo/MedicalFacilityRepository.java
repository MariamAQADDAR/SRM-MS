package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.MedicalFacility;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicalFacilityRepository extends JpaRepository<MedicalFacility, Long> {
}
