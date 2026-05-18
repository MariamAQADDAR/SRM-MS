package ma.srm.mutuelle.config;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(BadCredentialsException.class)
	public ResponseEntity<Map<String, String>> badCredentials(BadCredentialsException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(Map.of("error", "UNAUTHORIZED", "message", ex.getMessage()));
	}

	@ExceptionHandler(DisabledException.class)
	public ResponseEntity<Map<String, String>> disabled(DisabledException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(Map.of("error", "FORBIDDEN", "message", ex.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Map<String, String>> validation(MethodArgumentNotValidException ex) {
		return ResponseEntity.badRequest()
				.body(Map.of("error", "VALIDATION", "message", "Requête invalide"));
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<Map<String, String>> missingParam(MissingServletRequestParameterException ex) {
		String msg = "Paramètre manquant : " + ex.getParameterName();
		return ResponseEntity.badRequest().body(Map.of("error", "BAD_REQUEST", "message", msg));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<Map<String, String>> typeMismatch(MethodArgumentTypeMismatchException ex) {
		String name = ex.getName() != null ? ex.getName() : "valeur";
		return ResponseEntity.badRequest()
				.body(Map.of("error", "BAD_REQUEST", "message", "Valeur invalide pour « " + name + " »"));
	}

	@ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
	public ResponseEntity<Map<String, String>> notAcceptable(HttpMediaTypeNotAcceptableException ex) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(Map.of(
						"error",
						"BAD_REQUEST",
						"message",
						"Format de requête non accepté. Utilisez un formulaire multipart avec fichier PDF."));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Map<String, String>> accessDenied(AccessDeniedException ex) {
		String msg = ex.getMessage();
		if (msg == null || msg.isBlank() || "Access Denied".equalsIgnoreCase(msg.trim())) {
			msg = "Accès refusé. Vérifiez votre rôle ou reconnectez-vous après redémarrage du serveur.";
		}
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", msg));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, String>> badArgument(IllegalArgumentException ex) {
		return ResponseEntity.badRequest()
				.body(Map.of("error", "BAD_REQUEST", "message", ex.getMessage() != null ? ex.getMessage() : "Requête invalide"));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Map<String, String>> dataIntegrity(DataIntegrityViolationException ex) {
		String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
		String msg = "Données en conflit avec une règle métier.";
		if (raw != null) {
			if (raw.contains("app_users_agent_id_key") || raw.contains("(agent_id)")) {
				msg = "Ce porteur mutuelle a déjà un compte adhérent. Choisissez un autre porteur dans la liste.";
			} else if (raw.contains("app_users_email") || raw.toLowerCase().contains("email")) {
				msg = "Email déjà utilisé";
			}
		}
		return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "CONFLICT", "message", msg));
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<Map<String, String>> status(ResponseStatusException ex) {
		HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
		if (status == null) {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
		}
		String msg = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
		return ResponseEntity.status(status).body(Map.of("error", status.name(), "message", msg));
	}
}
