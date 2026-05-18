package ma.srm.mutuelle.service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ChatbotDtos.ChatMessageResponse;
import ma.srm.mutuelle.api.dto.ChatbotDtos.ChatbotBootstrap;
import ma.srm.mutuelle.api.dto.ChatbotDtos.QuickPrompt;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.Beneficiary;
import ma.srm.mutuelle.domain.MutualCard;
import ma.srm.mutuelle.domain.Notification;
import ma.srm.mutuelle.domain.Ordonnance;
import ma.srm.mutuelle.domain.Quote;
import ma.srm.mutuelle.domain.Reimbursement;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.BeneficiaryRepository;
import ma.srm.mutuelle.domain.repo.MutualCardRepository;
import ma.srm.mutuelle.domain.repo.NotificationRepository;
import ma.srm.mutuelle.domain.repo.OrdonnanceRepository;
import ma.srm.mutuelle.domain.repo.QuoteRepository;
import ma.srm.mutuelle.domain.repo.ReimbursementRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatbotService {

	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
	private static final Pattern QUOTE_NUM = Pattern.compile("DEV-[A-Z0-9\\-]+", Pattern.CASE_INSENSITIVE);
	private static final Pattern REMB_NUM = Pattern.compile("RMB-[A-Z0-9\\-]+", Pattern.CASE_INSENSITIVE);

	private final QuoteRepository quoteRepository;
	private final ReimbursementRepository reimbursementRepository;
	private final OrdonnanceRepository ordonnanceRepository;
	private final BeneficiaryRepository beneficiaryRepository;
	private final MutualCardRepository mutualCardRepository;
	private final NotificationRepository notificationRepository;
	private final AgentRepository agentRepository;
	private final StatsService statsService;

	public ChatbotBootstrap bootstrap(AppUser user) {
		UserSnapshot snap = loadSnapshot(user);
		String welcome = buildWelcome(user, snap);
		return new ChatbotBootstrap(welcome, "Connecté à vos données SRM-MS", quickPrompts(user, snap), true);
	}

	public ChatMessageResponse reply(String message, AppUser user) {
		UserSnapshot snap = loadSnapshot(user);
		String normalized = message == null ? "" : message.trim().toLowerCase(Locale.ROOT);
		if (normalized.isEmpty()) {
			return new ChatMessageResponse(
					"Posez une question sur vos **devis**, **remboursements**, **cartes mutuelles** ou demandez un **résumé** de votre situation.",
					quickPrompts(user, snap));
		}

		Optional<String> byNumero = answerByReference(message, snap);
		if (byNumero.isPresent()) {
			return new ChatMessageResponse(byNumero.get(), quickPrompts(user, snap));
		}

		String answer = routeIntent(normalized, user, snap);
		return new ChatMessageResponse(answer, quickPrompts(user, snap));
	}

	private String routeIntent(String t, AppUser user, UserSnapshot snap) {
		if (matches(t, "bonjour", "salut", "hello", "bonsoir")) {
			return buildWelcome(user, snap);
		}
		if (matches(t, "aide", "help", "que peux", "que pouvez", "comment utiliser")) {
			return helpMessage(user, snap);
		}
		if (matches(t, "résumé", "resume", "situation", "mon compte", "synthèse", "synthese", "bilan")) {
			return summaryMessage(snap, user);
		}
		if (matches(t, "notification", "alerte", "message", "non lu", "non lus")) {
			return notificationsMessage(snap);
		}
		if (matches(t, "carte", "cartes", "affiliation", "pdf carte")) {
			return mutualCardsMessage(snap);
		}
		if (matches(t, "bénéficiaire", "beneficiaire", "conjoint", "enfant", "proche", "famille", "ayant")) {
			return beneficiariesMessage(snap);
		}
		if (matches(t, "devis", "dentaire", "optique", "dev-")) {
			return quotesMessage(snap, t);
		}
		if (matches(t, "remboursement", "rembourser", "rmb-", "frais")) {
			return reimbursementsMessage(snap, t);
		}
		if (matches(t, "ordonnance", "médicament", "medicament")) {
			return ordonnancesMessage(snap);
		}
		if (matches(t, "procédure", "procedure", "comment faire", "comment déposer", "comment deposer", "étapes", "etapes")) {
			return procedureMessage(t, user);
		}
		if (user.getRole() != AppUserRole.ADHERENT && matches(t, "statistique", "stats", "tableau", "activité", "activite", "global")) {
			return staffStatsMessage();
		}
		if (matches(t, "en attente", "pending", "à traiter", "a traiter")) {
			return pendingMessage(snap, user);
		}
		return fallbackMessage(user, snap);
	}

	private String summaryMessage(UserSnapshot snap, AppUser user) {
		StringBuilder sb = new StringBuilder();
		sb.append("**Résumé personnalisé");
		if (snap.agentName != null) {
			sb.append(" — ").append(snap.agentName);
		}
		sb.append("**\n\n");

		if (user.getRole() == AppUserRole.ADHERENT && snap.agentId == null) {
			return "Votre compte adhérent n’est pas rattaché à un **porteur**. Contactez la mutuelle pour activer l’accès à vos dossiers.";
		}

		if (snap.agentMatricule != null) {
			sb.append("• Matricule : **").append(snap.agentMatricule).append("**\n");
		}
		sb.append("• Devis : **").append(snap.quotes.size()).append("** (")
				.append(snap.quotesPending)
				.append(" en cours)\n");
		sb.append("• Remboursements : **").append(snap.reimbursements.size()).append("** (")
				.append(snap.rembPending)
				.append(" en attente / en cours)\n");
		sb.append("• Ayants droit : **").append(snap.beneficiaries.size()).append("**\n");
		sb.append("• Cartes mutuelles émises : **").append(snap.cardsIssued).append("/")
				.append(snap.cardsTotal)
				.append("**\n");
		sb.append("• Notifications non lues : **").append(snap.unreadNotifications).append("**\n");

		if (!snap.quotes.isEmpty()) {
			Quote last = snap.quotes.get(0);
			sb.append("\nDernier devis : **")
					.append(last.getNumero())
					.append("** — ")
					.append(last.getEtat())
					.append(" (")
					.append(last.getQuoteType())
					.append(")");
		}
		if (!snap.reimbursements.isEmpty()) {
			Reimbursement last = snap.reimbursements.get(0);
			sb.append("\nDernier remboursement : **")
					.append(last.getNumero())
					.append("** — ")
					.append(last.getStatus());
		}
		return sb.toString();
	}

	private String quotesMessage(UserSnapshot snap, String t) {
		if (snap.quotes.isEmpty()) {
			return "Vous n’avez **aucun devis** enregistré. Déposez un devis dentaire avec PDF dans le menu **Devis** → « Déposer un devis ».";
		}
		if (t.contains("en attente") || t.contains("soumis") || t.contains("cours")) {
			long n = snap.quotes.stream()
					.filter(q -> List.of("En attente", "Brouillon", "Soumis").contains(q.getEtat()) || q.isScanned())
					.count();
			if (n == 0) {
				return "Aucun devis **en cours** actuellement. Tous vos dossiers sont traités ou clos.";
			}
			StringBuilder sb = new StringBuilder("**Devis en cours** (").append(n).append(") :\n");
			snap.quotes.stream()
					.filter(q -> List.of("En attente", "Brouillon", "Soumis").contains(q.getEtat()) || (q.isScanned() && !List.of("Approuvé", "Rejeté").contains(q.getEtat())))
					.limit(5)
					.forEach(q -> sb.append("• **")
							.append(q.getNumero())
							.append("** — ")
							.append(q.getEtat())
							.append(q.isScanned() ? " (instruction)" : "")
							.append(" — ")
							.append(formatMoney(q.getMontant()))
							.append(" DH\n"));
			return sb.toString();
		}
		StringBuilder sb = new StringBuilder("**Vos devis** (").append(snap.quotes.size()).append(") :\n");
		snap.quotes.stream().limit(6).forEach(q -> {
			sb.append("• **").append(q.getNumero()).append("** — ").append(q.getQuoteType()).append(" — ").append(q.getEtat());
			if (q.getQuoteDate() != null) {
				sb.append(" — ").append(DATE_FMT.format(q.getQuoteDate()));
			}
			sb.append("\n");
		});
		sb.append("\nPour le détail : menu **Devis**. Citez un numéro (ex. DEV-2026-…) pour une fiche précise.");
		return sb.toString();
	}

	private String reimbursementsMessage(UserSnapshot snap, String t) {
		if (snap.reimbursements.isEmpty()) {
			return "Aucun **remboursement** enregistré pour votre foyer. Créez une demande dans **Remboursements**.";
		}
		if (t.contains("attente") || t.contains("cours")) {
			List<Reimbursement> open = snap.reimbursements.stream()
					.filter(r -> "En attente".equals(r.getStatus()) || "En cours".equals(r.getStatus()))
					.toList();
			if (open.isEmpty()) {
				return "Aucun remboursement **en attente** ou **en cours**.";
			}
			StringBuilder sb = new StringBuilder("**Remboursements à suivre** :\n");
			open.forEach(r -> sb.append("• **")
					.append(r.getNumero())
					.append("** — ")
					.append(r.getStatus())
					.append(" — demandé ")
					.append(formatMoney(r.getMontantDemande()))
					.append(" DH\n"));
			return sb.toString();
		}
		StringBuilder sb = new StringBuilder("**Vos remboursements** :\n");
		snap.reimbursements.stream().limit(6).forEach(r -> {
			String taux = r.getTaux() != null ? " — taux " + r.getTaux() + "%" : "";
			sb.append("• **")
					.append(r.getNumero())
					.append("** — ")
					.append(r.getBeneficiaire())
					.append(" — ")
					.append(r.getStatus())
					.append(" — ")
					.append(formatMoney(r.getMontantDemande()))
					.append(" DH");
			if (r.getMontantValide() != null && r.getMontantValide().signum() > 0) {
				sb.append(" → remboursé ").append(formatMoney(r.getMontantValide())).append(" DH");
			}
			sb.append(taux).append("\n");
		});
		return sb.toString();
	}

	private String mutualCardsMessage(UserSnapshot snap) {
		if (snap.agentId == null) {
			return "Compte non rattaché à un porteur : impossible de gérer les cartes.";
		}
		StringBuilder sb = new StringBuilder("**Cartes mutuelles du foyer** :\n");
		sb.append("• Titulaire : ").append(snap.titulaireCardIssued ? "carte **émise**" : "**à générer**").append("\n");
		for (Beneficiary b : snap.beneficiaries) {
			boolean issued = snap.issuedBeneficiaryIds.contains(b.getId());
			sb.append("• ")
					.append(b.getLinkType())
					.append(" **")
					.append(b.getPrenom())
					.append(" ")
					.append(b.getNom())
					.append("** : ")
					.append(issued ? "carte émise" : "non générée")
					.append("\n");
		}
		sb.append("\nGénérez ou téléchargez les PDF dans **Cartes mutuelles** (logo SRM-MS inclus).");
		return sb.toString();
	}

	private String beneficiariesMessage(UserSnapshot snap) {
		if (snap.beneficiaries.isEmpty()) {
			return "Aucun **ayant droit** (conjoint / enfant) enregistré. La mutuelle peut les ajouter dans **Bénéficiaires**.";
		}
		StringBuilder sb = new StringBuilder("**Ayants droit déclarés** :\n");
		snap.beneficiaries.forEach(b -> sb.append("• **")
				.append(b.getLinkType())
				.append("** — ")
				.append(b.getPrenom())
				.append(" ")
				.append(b.getNom())
				.append(b.getDateNaissance() != null ? " (né(e) " + DATE_FMT.format(b.getDateNaissance()) + ")" : "")
				.append("\n"));
		return sb.toString();
	}

	private String ordonnancesMessage(UserSnapshot snap) {
		if (snap.ordonnances.isEmpty()) {
			return "Aucune **ordonnance** sur votre dossier. Les ordonnances sont gérées par la mutuelle.";
		}
		StringBuilder sb = new StringBuilder("**Dernières ordonnances** :\n");
		snap.ordonnances.stream().limit(5).forEach(o -> sb.append("• **")
				.append(o.getNumero())
				.append("** — ")
				.append(o.getBeneficiaire())
				.append(" — ")
				.append(o.getStatus())
				.append("\n"));
		return sb.toString();
	}

	private String notificationsMessage(UserSnapshot snap) {
		if (snap.unreadNotifications == 0) {
			return "Vous n’avez **aucune notification non lue**. Consultez l’icône cloche en haut à droite pour l’historique.";
		}
		StringBuilder sb = new StringBuilder("**")
				.append(snap.unreadNotifications)
				.append(" notification(s) non lue(s)** :\n");
		snap.recentNotifications.forEach(n -> sb.append("• ")
				.append(n.getNotifType())
				.append(" — ")
				.append(truncate(n.getBody(), 120))
				.append("\n"));
		sb.append("\nOuvrez **Notifications** pour tout marquer comme lu.");
		return sb.toString();
	}

	private String pendingMessage(UserSnapshot snap, AppUser user) {
		if (user.getRole() != AppUserRole.ADHERENT) {
			var stats = statsService.getSummary();
			return "**Dossiers à traiter (mutuelle)** :\n• Devis en attente : **" + stats.devisEnAttente()
					+ "**\n• Remboursements en attente : **" + stats.remboursementsEnAttente() + "**";
		}
		return "**Vos dossiers en cours** :\n• Devis : **" + snap.quotesPending + "**\n• Remboursements : **" + snap.rembPending + "**";
	}

	private String staffStatsMessage() {
		var s = statsService.getSummary();
		return "**Activité mutuelle (global)** :\n• Porteurs : **" + s.agentsCount() + "**\n• Ordonnances : **" + s.ordonnancesCount()
				+ "**\n• Devis en attente : **" + s.devisEnAttente() + "**\n• Remboursements en attente : **" + s.remboursementsEnAttente()
				+ "**\n• Total remboursé (traités) : **" + formatMoney(s.totalRemboursementsValides()) + " DH**";
	}

	private String procedureMessage(String t, AppUser user) {
		if (t.contains("devis") || t.contains("dentaire")) {
			return "**Devis dentaire** :\n1. Menu **Devis** → Déposer un devis\n2. Joindre le **PDF** + renseigner dentiste et montant\n3. **Envoyer à la mutuelle**\n4. Suivre les étapes : instruction puis décision (approuvé / refusé)\n\nJe peux détailler l’un de vos devis si vous citez son numéro.";
		}
		if (t.contains("remboursement")) {
			return "**Remboursement** :\n1. Menu **Remboursements** → nouvelle demande\n2. Joindre les justificatifs\n3. Suivre le statut (En attente → En cours → Traité)\n\nDemandez « mes remboursements en attente » pour votre liste.";
		}
		if (t.contains("carte")) {
			return "**Carte mutuelle** :\n1. Menu **Cartes mutuelles**\n2. Générer une carte pour le titulaire, le conjoint ou chaque enfant déclaré\n3. Télécharger le PDF officiel\n\nDemandez « mes cartes » pour l’état de votre foyer.";
		}
		if (user.getRole() == AppUserRole.ADHERENT) {
			return "Je peux vous guider sur : **devis** (PDF), **remboursements**, **cartes mutuelles**, **notifications**. Demandez un **résumé** pour voir votre situation.";
		}
		return "Procédures : validation des **devis**, traitement des **remboursements**, édition des **cartes**, gestion des **bénéficiaires**. Demandez les **statistiques** pour la vue globale.";
	}

	private String helpMessage(AppUser user, UserSnapshot snap) {
		String role = user.getRole() == AppUserRole.ADHERENT ? "adhérent" : "personnel mutuelle";
		return "Vous êtes connecté en **" + role + "**. Exemples :\n• « **résumé** » — votre situation\n• « **mes devis** » / « **remboursements en attente** »\n• « **cartes mutuelles** »\n• « **notifications** »\n• Citer un numéro **DEV-…** ou **RMB-…**\n\nDonnées issues de **votre session** (" + snap.quotes.size() + " devis, " + snap.reimbursements.size() + " remboursements chargés).";
	}

	private String fallbackMessage(AppUser user, UserSnapshot snap) {
		return "Je n’ai pas identifié une intention précise. Essayez :\n• **résumé** — vue d’ensemble\n• **mes devis** / **mes remboursements**\n• **cartes mutuelles** / **notifications**\n\nOu reformulez (ex. « où en est mon devis DEV-2026-… »). " + (user.getRole() == AppUserRole.ADHERENT ? "Espace **adhérent**." : "Espace **mutuelle**.");
	}

	private Optional<String> answerByReference(String message, UserSnapshot snap) {
		Matcher qm = QUOTE_NUM.matcher(message.toUpperCase(Locale.ROOT));
		if (qm.find()) {
			String num = qm.group();
			return snap.quotes.stream()
					.filter(q -> q.getNumero().equalsIgnoreCase(num))
					.findFirst()
					.map(q -> "**Devis " + q.getNumero() + "**\n• Type : " + q.getQuoteType() + "\n• État : **" + q.getEtat() + "**"
							+ (q.isScanned() ? " (instructé)" : "") + "\n• Montant : " + formatMoney(q.getMontant()) + " DH\n• Bénéficiaire : "
							+ q.getBeneficiaire() + (q.getQuoteDate() != null ? "\n• Date : " + DATE_FMT.format(q.getQuoteDate()) : "")
							+ (q.getPdfStorageKey() != null && !q.getPdfStorageKey().isBlank() ? "\n• PDF : joint" : "\n• PDF : manquant"));
		}
		Matcher rm = REMB_NUM.matcher(message.toUpperCase(Locale.ROOT));
		if (rm.find()) {
			String num = rm.group();
			return snap.reimbursements.stream()
					.filter(r -> r.getNumero().equalsIgnoreCase(num))
					.findFirst()
					.map(r -> {
						String taux = r.getTaux() != null ? r.getTaux() + " %" : "—";
						return "**Remboursement " + r.getNumero() + "**\n• Statut : **" + r.getStatus() + "**\n• Bénéficiaire : "
								+ r.getBeneficiaire() + "\n• Demandé : " + formatMoney(r.getMontantDemande()) + " DH\n• Remboursé : "
								+ formatMoney(r.getMontantValide()) + " DH\n• Taux : **" + taux + "**";
					});
		}
		return Optional.empty();
	}

	private String buildWelcome(AppUser user, UserSnapshot snap) {
		String name = user.getFullName() != null ? user.getFullName() : "utilisateur";
		StringBuilder sb = new StringBuilder("Bonjour **").append(name).append("**.");
		if (snap.agentName != null) {
			sb.append(" Dossier **").append(snap.agentName).append("**");
			if (snap.agentMatricule != null) {
				sb.append(" (").append(snap.agentMatricule).append(")");
			}
			sb.append(".");
		}
		sb.append("\n\nJe consulte **vos données réelles** : ");
		sb.append(snap.quotes.size()).append(" devis, ");
		sb.append(snap.reimbursements.size()).append(" remboursements");
		if (snap.unreadNotifications > 0) {
			sb.append(", **").append(snap.unreadNotifications).append("** notification(s) non lue(s)");
		}
		sb.append(".\n\nQue souhaitez-vous savoir ? (résumé, devis, remboursements, cartes…)");
		return sb.toString();
	}

	private List<QuickPrompt> quickPrompts(AppUser user, UserSnapshot snap) {
		List<QuickPrompt> list = new ArrayList<>();
		list.add(new QuickPrompt("resume", "Mon résumé", "Donne-moi un résumé de ma situation"));
		list.add(new QuickPrompt("devis", "Mes devis", "Où en sont mes devis ?"));
		list.add(new QuickPrompt("remb", "Remboursements", "Mes remboursements en attente"));
		list.add(new QuickPrompt("carte", "Cartes mutuelles", "État de mes cartes mutuelles"));
		if (snap.unreadNotifications > 0) {
			list.add(new QuickPrompt("notif", "Notifications", "Mes notifications non lues"));
		}
		if (user.getRole() != AppUserRole.ADHERENT) {
			list.add(new QuickPrompt("stats", "Statistiques", "Statistiques globales de la mutuelle"));
		}
		return list;
	}

	private UserSnapshot loadSnapshot(AppUser user) {
		UserSnapshot s = new UserSnapshot();
		if (user.getRole() == AppUserRole.ADHERENT) {
			s.agentId = user.getAgentIdOrNull();
		}
		if (s.agentId != null) {
			agentRepository.findById(s.agentId).ifPresent(a -> {
				s.agentName = a.getPrenom() + " " + a.getNom();
				s.agentMatricule = a.getMatricule();
			});
			s.quotes = quoteRepository.findByAgent_IdOrderByQuoteDateDesc(s.agentId);
			s.reimbursements = reimbursementRepository.findByAgent_IdOrderByReimbursementDateDesc(s.agentId);
			s.ordonnances = ordonnanceRepository.findByAgent_IdOrderByOrdDateDesc(s.agentId);
			s.beneficiaries = beneficiaryRepository.findByAgent_IdOrderById(s.agentId);
			List<MutualCard> cards = mutualCardRepository.findByAgent_IdOrderByCardLabelAscIdAsc(s.agentId);
			s.cardsTotal = 1 + s.beneficiaries.size();
			s.titulaireCardIssued = cards.stream().anyMatch(c -> c.getBeneficiary() == null && hasPdf(c));
			for (MutualCard c : cards) {
				if (c.getBeneficiary() != null && hasPdf(c)) {
					s.issuedBeneficiaryIds.add(c.getBeneficiary().getId());
				}
				if (hasPdf(c)) {
					s.cardsIssued++;
				}
			}
		} else if (user.getRole() != AppUserRole.ADHERENT) {
			s.quotes = quoteRepository.findAll();
			s.reimbursements = reimbursementRepository.findAll();
		}
		s.quotesPending = s.quotes.stream()
				.filter(q -> List.of("En attente", "Brouillon", "Soumis").contains(q.getEtat())
						|| (q.isScanned() && !List.of("Approuvé", "Rejeté").contains(q.getEtat())))
				.count();
		s.rembPending = s.reimbursements.stream()
				.filter(r -> "En attente".equals(r.getStatus()) || "En cours".equals(r.getStatus()))
				.count();
		s.unreadNotifications = notificationRepository.countByAppUserAndReadFlagIsFalse(user);
		s.recentNotifications = notificationRepository.findByAppUserOrderByCreatedAtDesc(user).stream()
				.filter(n -> !n.isReadFlag())
				.limit(5)
				.toList();
		return s;
	}

	private static boolean hasPdf(MutualCard c) {
		return c.getPdfStorageKey() != null && !c.getPdfStorageKey().isBlank();
	}

	private static boolean matches(String t, String... keywords) {
		for (String k : keywords) {
			if (t.contains(k)) {
				return true;
			}
		}
		return false;
	}

	private static String formatMoney(BigDecimal v) {
		if (v == null) {
			return "0";
		}
		return v.stripTrailingZeros().toPlainString();
	}

	private static String truncate(String s, int max) {
		if (s == null) {
			return "";
		}
		return s.length() <= max ? s : s.substring(0, max - 1) + "…";
	}

	private static final class UserSnapshot {
		Long agentId;
		String agentName;
		String agentMatricule;
		List<Quote> quotes = List.of();
		List<Reimbursement> reimbursements = List.of();
		List<Ordonnance> ordonnances = List.of();
		List<Beneficiary> beneficiaries = List.of();
		List<Notification> recentNotifications = List.of();
		List<Long> issuedBeneficiaryIds = new ArrayList<>();
		long quotesPending;
		long rembPending;
		long unreadNotifications;
		int cardsIssued;
		int cardsTotal;
		boolean titulaireCardIssued;
	}
}
