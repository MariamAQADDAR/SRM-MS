package ma.srm.mutuelle.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.auth.dto.ChangePasswordRequest;
import ma.srm.mutuelle.auth.dto.LoginRequest;
import ma.srm.mutuelle.auth.dto.LoginResponse;
import ma.srm.mutuelle.auth.dto.UserProfileDto;
import ma.srm.mutuelle.domain.AppUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
		return UserProfileDto.fromEntity(user);
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
}
