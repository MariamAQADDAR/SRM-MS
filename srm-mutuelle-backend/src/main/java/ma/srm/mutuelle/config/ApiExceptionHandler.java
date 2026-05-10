package ma.srm.mutuelle.config;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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
