package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.Ordonnance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrdonnanceRepository extends JpaRepository<Ordonnance, Long> {

	List<Ordonnance> findByAgent_IdAndDeletedFalseOrderByOrdDateDesc(Long agentId);

	List<Ordonnance> findByDeletedFalseOrderByOrdDateDesc();

	List<Ordonnance> findByDeletedTrueOrderByOrdDateDesc();

	java.util.Optional<Ordonnance> findByIdAndDeletedFalse(Long id);

	long countByDeletedFalse();
}
