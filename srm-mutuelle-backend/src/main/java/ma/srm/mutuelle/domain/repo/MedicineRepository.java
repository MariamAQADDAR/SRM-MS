package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

	@Query("SELECT m FROM Medicine m WHERE :q IS NULL OR :q = '' OR LOWER(m.name) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY m.name")
	List<Medicine> searchByName(@Param("q") String q);
}
