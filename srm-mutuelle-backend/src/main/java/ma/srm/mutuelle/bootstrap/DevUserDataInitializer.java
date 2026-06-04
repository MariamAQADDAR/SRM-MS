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

		Agent adminAgent = new Agent();
		adminAgent.setMatricule("AGT-ADMIN");
		adminAgent.setNom("AQADDAR");
		adminAgent.setPrenom("Marieme");
		adminAgent.setCin("BK000001");
		adminAgent.setSituation("Mariée");
		adminAgent.setEntiteName("Direction SI & Transformation Digitale");
		adminAgent.setEmail("admin@srm-ms.ma");
		adminAgent = agentRepository.save(adminAgent);

		Agent operAgent = new Agent();
		operAgent.setMatricule("AGT-OPER");
		operAgent.setNom("Benali");
		operAgent.setPrenom("Youssef");
		operAgent.setCin("BK000002");
		operAgent.setSituation("Célibataire");
		operAgent.setEntiteName("Direction SI & Transformation Digitale");
		operAgent.setEmail("operateur@srm-ms.ma");
		operAgent = agentRepository.save(operAgent);

		Agent consAgent = new Agent();
		consAgent.setMatricule("AGT-CONS");
		consAgent.setNom("Zahrae");
		consAgent.setPrenom("Fatima");
		consAgent.setCin("BK000003");
		consAgent.setSituation("Célibataire");
		consAgent.setEntiteName("Direction SI & Transformation Digitale");
		consAgent.setEmail("consult@srm-ms.ma");
		consAgent = agentRepository.save(consAgent);

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
