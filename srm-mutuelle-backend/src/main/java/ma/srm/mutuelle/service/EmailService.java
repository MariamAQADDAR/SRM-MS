package ma.srm.mutuelle.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendWelcomeEmail(String toEmail, String password) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("mariemeaqaddar@gmail.com");
            message.setTo(toEmail);
            message.setSubject("Bienvenue sur SRM Mutuelle - Vos identifiants");
            message.setText("Bonjour,\n\n" +
                    "Votre compte a été créé avec succès sur SRM Mutuelle.\n" +
                    "Voici votre mot de passe temporaire : " + password + "\n\n" +
                    "Veuillez vous connecter sur le lien suivant : http://localhost:5173\n\n" +
                    "Lors de votre première connexion, vous serez invité à changer ce mot de passe obligatoirement.\n\n" +
                    "Cordialement,\n" +
                    "L'équipe SRM Mutuelle");
            
            mailSender.send(message);
            log.info("Email de bienvenue envoyé à {}", toEmail);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email à {}", toEmail, e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("mariemeaqaddar@gmail.com");
            message.setTo(toEmail);
            message.setSubject("Réinitialisation de votre mot de passe - SRM Mutuelle");
            
            String resetLink = "http://localhost:5173/reset-password?token=" + token;
            
            message.setText("Bonjour,\n\n" +
                    "Vous avez demandé la réinitialisation de votre mot de passe.\n" +
                    "Veuillez cliquer sur le lien suivant pour choisir un nouveau mot de passe (valide pendant 1 heure) :\n\n" +
                    resetLink + "\n\n" +
                    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n" +
                    "Cordialement,\n" +
                    "L'équipe SRM Mutuelle");
            
            mailSender.send(message);
            log.info("Email de réinitialisation envoyé à {}", toEmail);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de réinitialisation à {}", toEmail, e);
        }
    }
}
