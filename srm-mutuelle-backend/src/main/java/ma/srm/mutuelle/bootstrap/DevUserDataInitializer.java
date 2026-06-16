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

		Agent adminAgent = agentRepository.findByMatricule("AGT-ADMIN").orElseGet(() -> {
			Agent a = new Agent();
			a.setMatricule("AGT-ADMIN");
			a.setNom("AQADDAR");
			a.setPrenom("Marieme");
			a.setCin("BK000001");
			a.setSituation("Mariée");
			a.setEntiteName("Direction SI & Transformation Digitale");
			a.setEmail("admin@srm-ms.ma");
			return agentRepository.save(a);
		});

		Agent operAgent = agentRepository.findByMatricule("AGT-OPER").orElseGet(() -> {
			Agent a = new Agent();
			a.setMatricule("AGT-OPER");
			a.setNom("Benali");
			a.setPrenom("Youssef");
			a.setCin("BK000002");
			a.setSituation("Célibataire");
			a.setEntiteName("Direction SI & Transformation Digitale");
			a.setEmail("operateur@srm-ms.ma");
			return agentRepository.save(a);
		});

		Agent consAgent = agentRepository.findByMatricule("AGT-CONS").orElseGet(() -> {
			Agent a = new Agent();
			a.setMatricule("AGT-CONS");
			a.setNom("Zahrae");
			a.setPrenom("Fatima");
			a.setCin("BK000003");
			a.setSituation("Célibataire");
			a.setEntiteName("Direction SI & Transformation Digitale");
			a.setEmail("consult@srm-ms.ma");
			return agentRepository.save(a);
		});

		appUserRepository.save(staff(
				"admin@srm-ms.ma",
				passwordEncoder.encode("admin123"),
				"AQADDAR Marieme",
				AppUserRole.ADMINISTRATEUR,
				adminAgent));
		appUserRepository.save(staff(
				"operateur@srm-ms.ma",
				passwordEncoder.encode("oper123"),
				"Youssef Benali",
				AppUserRole.OPERATEUR,
				operAgent));
		appUserRepository.save(staff(
				"consult@srm-ms.ma",
				passwordEncoder.encode("cons123"),
				"Fatima Zahrae",
				AppUserRole.CONSULTATEUR,
				consAgent));
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
		adherent.setForcePasswordChange(false);
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
		u.setForcePasswordChange(false);
		return u;
	}
}
