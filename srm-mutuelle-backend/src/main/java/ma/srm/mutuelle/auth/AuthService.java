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
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final AppUserDetailsService userDetailsService;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final AppUserRepository appUserRepository;

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
		return new LoginResponse(token, UserProfileDto.fromEntity(user));
	}

	@Transactional
	public void changePassword(AppUser user, ChangePasswordRequest request) {
		if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe actuel incorrect");
		}
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		appUserRepository.save(user);
	}
}
