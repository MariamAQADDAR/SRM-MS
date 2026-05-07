package ma.srm.mutuelle.security;

import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

	private final AppUserRepository appUserRepository;

	@Override
	public UserDetails loadUserByUsername(String username) {
		return appUserRepository
				.findByEmailIgnoreCase(username)
				.orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));
	}
}
