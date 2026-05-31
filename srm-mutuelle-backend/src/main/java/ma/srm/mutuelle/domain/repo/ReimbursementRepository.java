package ma.srm.mutuelle.domain.repo;

import java.math.BigDecimal;
import java.util.List;
import ma.srm.mutuelle.domain.Reimbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReimbursementRepository extends JpaRepository<Reimbursement, Long> {

	List<Reimbursement> findByAgent_IdAndDeletedFalseOrderByReimbursementDateDesc(Long agentId);

	long countByStatusAndDeletedFalse(String status);

	@Query("select coalesce(sum(r.montantValide), 0) from Reimbursement r where r.status in ('Traité','Clôturé') and r.deleted = false")
	BigDecimal sumMontantValideTraites();

	List<Reimbursement> findByDeletedFalseOrderByReimbursementDateDesc();

	List<Reimbursement> findByDeletedTrueOrderByReimbursementDateDesc();

	java.util.Optional<Reimbursement> findByIdAndDeletedFalse(Long id);
}
