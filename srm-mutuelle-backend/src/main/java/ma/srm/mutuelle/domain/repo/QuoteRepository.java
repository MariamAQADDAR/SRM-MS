package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.Quote;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

	List<Quote> findByAgent_IdOrderByQuoteDateDesc(Long agentId);

	long countByEtat(String etat);
}
