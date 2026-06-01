package ma.srm.mutuelle.auth;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.auth.dto.ChangePasswordRequest;
import ma.srm.mutuelle.auth.dto.LoginRequest;
import ma.srm.mutuelle.auth.dto.LoginResponse;
import ma.srm.mutuelle.auth.dto.UserProfileDto;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import ma.srm.mutuelle.security.AppUserDetailsService;
import ma.srm.mutuelle.security.JwtService;
import ma.srm.mutuelle.service.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final AppUserDetailsService userDetailsService;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final AppUserRepository appUserRepository;
	private final EmailService emailService;

	@Transactional
	public LoginResponse login(LoginRequest request) {
		AppUser user;
		try {
			user = (AppUser) userDetailsService.loadUserByUsername(request.email().trim());
		} catch (UsernameNotFoundException e) {
			throw new BadCredentialsException("Identifiants invalides");
		}
		if (!user.isEnabled()) {
			throw new DisabledException("Compte désactivé");
		}
		if (!passwordEncoder.matches(request.password(), user.getPassword())) {
			throw new BadCredentialsException("Identifiants invalides");
		}
		user.setLastLoginAt(Instant.now());
		appUserRepository.save(user);
		String token = jwtService.generateToken(user);
		return new LoginResponse(token, UserProfileDto.fromEntity(user), user.isForcePasswordChange());
	}

	@Transactional
	public void changePassword(AppUser user, ChangePasswordRequest request) {
		if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe actuel incorrect");
		}
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		user.setForcePasswordChange(false);
		appUserRepository.save(user);
	}

	@Transactional
	public void forgotPassword(String email) {
		String normalized = email == null ? "" : email.trim();
		if (normalized.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adresse e-mail requise");
		}
		var userOpt = appUserRepository.findByEmailIgnoreCaseAndDeletedFalse(normalized);
		if (userOpt.isEmpty()) {
			// Ne pas révéler si l'e-mail existe (sécurité)
			return;
		}
		AppUser user = userOpt.get();
		String token = UUID.randomUUID().toString();
		user.setResetToken(token);
		user.setResetTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
		appUserRepository.save(user);

		try {
			emailService.sendPasswordResetEmail(user.getEmail(), token);
		} catch (IllegalStateException e) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
		}
	}

	@Transactional
	public void resetPassword(String token, String newPassword) {
		AppUser user = appUserRepository.findByResetToken(token)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Jeton de réinitialisation invalide"));
		
		if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le jeton de réinitialisation a expiré");
		}

		user.setPasswordHash(passwordEncoder.encode(newPassword));
		user.setForcePasswordChange(false);
		user.setResetToken(null);
		user.setResetTokenExpiry(null);
		appUserRepository.save(user);
	}
}
