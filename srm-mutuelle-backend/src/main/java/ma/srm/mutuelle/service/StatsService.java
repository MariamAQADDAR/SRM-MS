package ma.srm.mutuelle.service;

import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.OrdonnanceRepository;
import ma.srm.mutuelle.domain.repo.QuoteRepository;
import ma.srm.mutuelle.domain.repo.ReimbursementRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsService {

	private final AgentRepository agentRepository;
	private final OrdonnanceRepository ordonnanceRepository;
	private final ReimbursementRepository reimbursementRepository;
	private final QuoteRepository quoteRepository;

	public StatsSummary getSummary() {
		long agents = agentRepository.count();
		long ordonnances = ordonnanceRepository.countByDeletedFalse();
		long rembEnAttente = reimbursementRepository.countByStatusAndDeletedFalse("En attente");
		long devisEnAttente = quoteRepository.countByEtatAndDeletedFalse("En attente");
		BigDecimal totalValide = reimbursementRepository.sumMontantValideTraites();
		return new StatsSummary(agents, ordonnances, rembEnAttente, devisEnAttente, totalValide);
	}

	public record StatsSummary(
			long agentsCount,
			long ordonnancesCount,
			long remboursementsEnAttente,
			long devisEnAttente,
			BigDecimal totalRemboursementsValides) {}
}
