package ma.srm.mutuelle.bootstrap;

import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.AppUserRole;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import ma.srm.mutuelle.domain.repo.AppUserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class DevUserDataInitializer implements ApplicationRunner {

	private final AppUserRepository appUserRepository;
	private final AgentRepository agentRepository;
	private final PasswordEncoder passwordEncoder;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (appUserRepository.count() > 0) {
			return;
		}
		Agent agent1 = agentRepository
				.findById(1L)
				.orElseThrow(() -> new IllegalStateException("Seed agent id=1 introuvable (Flyway V2 exécuté ?)"));

		appUserRepository.save(staff(
				"admin@srm-ms.ma",
				passwordEncoder.encode("admin123"),
				"AQADDAR Marieme",
				AppUserRole.ADMINISTRATEUR,
				null));
		appUserRepository.save(staff(
				"operateur@srm-ms.ma",
				passwordEncoder.encode("oper123"),
				"Youssef Benali",
				AppUserRole.OPERATEUR,
				null));
		appUserRepository.save(staff(
				"consult@srm-ms.ma",
				passwordEncoder.encode("cons123"),
				"Fatima Zahrae",
				AppUserRole.CONSULTATEUR,
				null));
		AppUser inactive = staff(
				"h.moussaoui@srm-ms.ma",
				passwordEncoder.encode("oper123"),
				"Hassan Moussaoui",
				AppUserRole.OPERATEUR,
				null);
		inactive.setActive(false);
		appUserRepository.save(inactive);

		AppUser adherent = new AppUser();
		adherent.setEmail("adherent@srm-ms.ma");
		adherent.setPasswordHash(passwordEncoder.encode("11111111"));
		adherent.setFullName("Youssef Benali");
		adherent.setRole(AppUserRole.ADHERENT);
		adherent.setActive(true);
		adherent.setAgent(agent1);
		appUserRepository.save(adherent);
	}

	private AppUser staff(String email, String hash, String fullName, AppUserRole role, Agent agent) {
		AppUser u = new AppUser();
		u.setEmail(email);
		u.setPasswordHash(hash);
		u.setFullName(fullName);
		u.setRole(role);
		u.setActive(true);
		u.setAgent(agent);
		return u;
	}
}
