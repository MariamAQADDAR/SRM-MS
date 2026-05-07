package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {
}
