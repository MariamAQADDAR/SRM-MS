package ma.srm.mutuelle.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

	private final JavaMailSender mailSender;

	@Value("${spring.mail.username:noreply@srm-ms.ma}")
	private String fromEmail;

	@Value("${app.frontend.base-url:http://localhost:5173}")
	private String frontendBaseUrl;

	public void sendWelcomeEmail(String toEmail, String password) {
		try {
			SimpleMailMessage message = new SimpleMailMessage();
			message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Bienvenue sur SRM Mutuelle - Vos identifiants");
			String loginUrl = frontendBaseUrl.replaceAll("/$", "");
			message.setText(
					"Bonjour,\n\n"
							+ "Votre compte a été créé avec succès sur SRM Mutuelle.\n"
							+ "Voici votre mot de passe temporaire : "
							+ password
							+ "\n\n"
							+ "Connectez-vous ici : "
							+ loginUrl
							+ "\n\n"
							+ "Lors de votre première connexion, vous serez invité à changer ce mot de passe.\n\n"
							+ "Cordialement,\n"
							+ "L'équipe SRM Mutuelle");

			mailSender.send(message);
			log.info("Email de bienvenue envoyé à {}", toEmail);
		} catch (Exception e) {
			log.error("Erreur lors de l'envoi de l'email de bienvenue à {}", toEmail, e);
			throw new IllegalStateException("Impossible d'envoyer l'e-mail de bienvenue. Vérifiez la configuration SMTP.", e);
		}
	}

	/**
	 * Envoie le lien de réinitialisation. Lève une exception si l'envoi SMTP échoue.
	 */
	public void sendPasswordResetEmail(String toEmail, String token) {
		String resetLink = frontendBaseUrl.replaceAll("/$", "") + "/reset-password?token=" + token;
		try {
			SimpleMailMessage message = new SimpleMailMessage();
			message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Réinitialisation de votre mot de passe - SRM Mutuelle");
			message.setText(
					"Bonjour,\n\n"
							+ "Vous avez demandé la réinitialisation de votre mot de passe SRM-MS Mutuelle.\n"
							+ "Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valide 1 heure) :\n\n"
							+ resetLink
							+ "\n\n"
							+ "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n\n"
							+ "Cordialement,\n"
							+ "L'équipe SRM Mutuelle");

			mailSender.send(message);
			log.info("Email de réinitialisation envoyé à {}", toEmail);
		} catch (Exception e) {
			log.error("Erreur SMTP réinitialisation pour {} — lien (dev) : {}", toEmail, resetLink, e);
			throw new IllegalStateException(
					"Impossible d'envoyer l'e-mail de réinitialisation. Vérifiez l'adresse et la configuration mail du serveur.",
					e);
		}
	}
}
