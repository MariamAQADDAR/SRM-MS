package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.Quote;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

	List<Quote> findByAgent_IdAndDeletedFalseOrderByQuoteDateDesc(Long agentId);

	long countByEtatAndDeletedFalse(String etat);

	List<Quote> findByDeletedFalseOrderByQuoteDateDesc();

	List<Quote> findByDeletedTrueOrderByQuoteDateDesc();

	java.util.Optional<Quote> findByIdAndDeletedFalse(Long id);
}
