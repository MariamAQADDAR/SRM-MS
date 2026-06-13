package ma.srm.mutuelle.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.auth.dto.ChangePasswordRequest;
import ma.srm.mutuelle.auth.dto.LinkAgentRequest;
import ma.srm.mutuelle.auth.dto.LoginRequest;
import ma.srm.mutuelle.auth.dto.LoginResponse;
import ma.srm.mutuelle.auth.dto.UserProfileDto;
import ma.srm.mutuelle.domain.AppUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	@GetMapping("/me")
	public UserProfileDto me(@AuthenticationPrincipal AppUser user) {
		return authService.getOrCreateLinkedProfile(user);
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout() {
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/change-password")
	public ResponseEntity<Void> changePassword(
			@Valid @RequestBody ChangePasswordRequest request, @AuthenticationPrincipal AppUser user) {
		authService.changePassword(user, request);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ma.srm.mutuelle.auth.dto.ForgotPasswordRequest request) {
		authService.forgotPassword(request.email());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/reset-password")
	public ResponseEntity<Void> resetPassword(@Valid @RequestBody ma.srm.mutuelle.auth.dto.ResetPasswordRequest request) {
		authService.resetPassword(request.token(), request.newPassword());
		return ResponseEntity.noContent().build();
	}

	/**
	 * Allows a non-adherent staff user (admin/operateur/consultateur) to link
	 * their account to an agent record so they can use "Mon Espace".
	 */
	@PatchMapping("/link-agent")
	public UserProfileDto linkAgent(
			@Valid @RequestBody LinkAgentRequest request,
			@AuthenticationPrincipal AppUser user) {
		return authService.linkAgent(user, request);
	}
}
