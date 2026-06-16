package ma.srm.mutuelle.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.Reimbursement;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.CareEpisodeRepository;
import ma.srm.mutuelle.domain.repo.ContractedDoctorRepository;
import ma.srm.mutuelle.domain.repo.MedicalFacilityRepository;
import ma.srm.mutuelle.domain.repo.MedicineRepository;
import ma.srm.mutuelle.domain.repo.MutualCardRequestRepository;
import ma.srm.mutuelle.domain.repo.OrdonnanceRepository;
import ma.srm.mutuelle.domain.repo.OrganizationalEntityRepository;
import ma.srm.mutuelle.domain.repo.QuoteRepository;
import ma.srm.mutuelle.domain.repo.ReimbursementRepository;
import ma.srm.mutuelle.domain.repo.SpecialDiseaseDeclarationRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsService {

	private final AgentRepository agentRepository;
	private final OrdonnanceRepository ordonnanceRepository;
	private final ReimbursementRepository reimbursementRepository;
	private final QuoteRepository quoteRepository;
	private final CareEpisodeRepository careEpisodeRepository;
	private final MutualCardRequestRepository mutualCardRequestRepository;
	
	private final MedicineRepository medicineRepository;
	private final MedicalFacilityRepository medicalFacilityRepository;
	private final OrganizationalEntityRepository organizationalEntityRepository;
	private final SpecialDiseaseDeclarationRepository specialDiseaseDeclarationRepository;
	private final ContractedDoctorRepository contractedDoctorRepository;

	public StatsSummary getSummary() {
		long agents = agentRepository.count();
		long ordonnances = ordonnanceRepository.countByDeletedFalse();
		long rembEnAttente = reimbursementRepository.countByStatusAndDeletedFalse("En attente");
		long devisEnAttente = quoteRepository.countByEtatAndDeletedFalse("En attente");
		BigDecimal totalValide = reimbursementRepository.sumMontantValideTraites();

		// New KPIs
		List<Reimbursement> allReimbs = reimbursementRepository.findByDeletedFalseOrderByReimbursementDateDesc();
		long totalReimbursementsCount = allReimbs.size();
		long totalQuotesCount = quoteRepository.findByDeletedFalseOrderByQuoteDateDesc().size();
		long totalCareEpisodesCount = careEpisodeRepository.findByDeletedFalseOrderByDateDebutDesc().size();
		long pendingCareEpisodesCount = careEpisodeRepository.countByStatusAndDeletedFalse("En attente");
		long pendingMutualCardRequestsCount = mutualCardRequestRepository.countByStatusAndDeletedFalse("En attente");

		// Referentials Counts
		long medicinesCount = medicineRepository.countByDeletedFalse();
		long facilitiesCount = medicalFacilityRepository.countByDeletedFalse();
		long entitiesCount = organizationalEntityRepository.countByDeletedFalse();
		long diseasesCount = specialDiseaseDeclarationRepository.countByDeletedFalse();
		long doctorsCount = contractedDoctorRepository.countByDeletedFalse();

		// Average Processing Time
		double avgDays = allReimbs.stream()
				.filter(r -> ("Traité".equals(r.getStatus()) || "Clôturé".equals(r.getStatus()) || "Rejeté".equals(r.getStatus()))
						&& r.getResponseDate() != null)
				.mapToLong(r -> {
					java.time.LocalDate start = r.getDepositDate() != null ? r.getDepositDate() : r.getReimbursementDate();
					return java.time.temporal.ChronoUnit.DAYS.between(start, r.getResponseDate());
				})
				.filter(days -> days >= 0)
				.average()
				.orElse(0.0);

		// Status breakdown
		Map<String, Long> statusStats = allReimbs.stream()
				.collect(Collectors.groupingBy(Reimbursement::getStatus, Collectors.counting()));

		// Care type breakdown
		Map<String, Long> careTypeStats = allReimbs.stream()
				.filter(r -> r.getCareType() != null && !r.getCareType().isBlank())
				.collect(Collectors.groupingBy(Reimbursement::getCareType, Collectors.counting()));

		// Monthly stats for last 6 months
		List<MonthlyStat> monthlyStats = new ArrayList<>();
		java.time.LocalDate now = java.time.LocalDate.now();
		for (int i = 5; i >= 0; i--) {
			java.time.LocalDate targetMonth = now.minusMonths(i);
			String label = getFrenchMonthLabel(targetMonth.getMonthValue());
			
			BigDecimal requested = BigDecimal.ZERO;
			BigDecimal validated = BigDecimal.ZERO;
			
			for (Reimbursement r : allReimbs) {
				java.time.LocalDate date = r.getDepositDate() != null ? r.getDepositDate() : r.getReimbursementDate();
				if (date != null && date.getYear() == targetMonth.getYear() && date.getMonthValue() == targetMonth.getMonthValue()) {
					requested = requested.add(r.getMontantDemande() != null ? r.getMontantDemande() : BigDecimal.ZERO);
					validated = validated.add(r.getMontantValide() != null ? r.getMontantValide() : BigDecimal.ZERO);
				}
			}
			monthlyStats.add(new MonthlyStat(label, requested, validated));
		}

		// Combined Recent Activities
		List<RecentActivityDto> activities = new ArrayList<>();
		
		allReimbs.stream().limit(10).forEach(r -> {
			String details = (r.getCareType() != null ? r.getCareType() : "Soin") + " - " + r.getMontantDemande() + " DH";
			java.time.LocalDate date = r.getDepositDate() != null ? r.getDepositDate() : r.getReimbursementDate();
			activities.add(new RecentActivityDto(
					"Remboursement",
					r.getNumero(),
					r.getBeneficiaire(),
					details,
					r.getStatus(),
					date != null ? date.toString() : ""
			));
		});

		quoteRepository.findByDeletedFalseOrderByQuoteDateDesc().stream().limit(10).forEach(q -> {
			String details = q.getQuoteType() + " - " + q.getMontant() + " DH";
			activities.add(new RecentActivityDto(
					"Devis",
					q.getNumero(),
					q.getBeneficiaire(),
					details,
					q.getEtat(),
					q.getQuoteDate() != null ? q.getQuoteDate().toString() : ""
			));
		});

		careEpisodeRepository.findByDeletedFalseOrderByDateDebutDesc().stream().limit(10).forEach(c -> {
			String details = c.getTypePrestation() + " à " + c.getEstablishmentName();
			activities.add(new RecentActivityDto(
					"Prise en charge",
					c.getNumero(),
					c.getBeneficiaire(),
					details,
					c.getStatus(),
					c.getDateDebut() != null ? c.getDateDebut().toString() : ""
			));
		});

		mutualCardRequestRepository.findByDeletedFalseOrderByRequestDateDescIdDesc().stream().limit(10).forEach(m -> {
			String details = "Demande de carte - " + m.getRequestType();
			activities.add(new RecentActivityDto(
					"Carte Mutuelle",
					m.getAgent() != null ? m.getAgent().getMatricule() : "N/A",
					m.getBeneficiaryName(),
					details,
					m.getStatus(),
					m.getRequestDate() != null ? m.getRequestDate().toString() : ""
			));
		});

		List<RecentActivityDto> sortedActivities = activities.stream()
				.filter(a -> a.date() != null && !a.date().isEmpty())
				.sorted((a, b) -> b.date().compareTo(a.date()))
				.limit(8)
				.toList();

		return new StatsSummary(
				agents,
				ordonnances,
				rembEnAttente,
				devisEnAttente,
				totalValide,
				totalReimbursementsCount,
				totalQuotesCount,
				totalCareEpisodesCount,
				pendingCareEpisodesCount,
				pendingMutualCardRequestsCount,
				avgDays,
				statusStats,
				careTypeStats,
				monthlyStats,
				sortedActivities,
				medicinesCount,
				facilitiesCount,
				entitiesCount,
				diseasesCount,
				doctorsCount
		);
	}

	private String getFrenchMonthLabel(int month) {
		String[] months = {"Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"};
		if (month >= 1 && month <= 12) {
			return months[month - 1];
		}
		return String.valueOf(month);
	}

	public record MonthlyStat(String month, BigDecimal montantDemande, BigDecimal montantValide) {}

	public record RecentActivityDto(String type, String numero, String beneficiaire, String details, String status, String date) {}

	public record StatsSummary(
			long agentsCount,
			long ordonnancesCount,
			long remboursementsEnAttente,
			long devisEnAttente,
			BigDecimal totalRemboursementsValides,
			long totalReimbursementsCount,
			long totalQuotesCount,
			long totalCareEpisodesCount,
			long pendingCareEpisodesCount,
			long pendingMutualCardRequestsCount,
			double averageProcessingTimeDays,
			Map<String, Long> statusStats,
			Map<String, Long> careTypeStats,
			List<MonthlyStat> monthlyStats,
			List<RecentActivityDto> recentActivities,
			long medicinesCount,
			long facilitiesCount,
			long entitiesCount,
			long diseasesCount,
			long doctorsCount
	) {}
}
