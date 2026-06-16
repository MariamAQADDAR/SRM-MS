package ma.srm.mutuelle;

import ma.srm.mutuelle.domain.repo.AppUserRepository;
import ma.srm.mutuelle.domain.repo.AgentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
class SrmMutuelleBackendApplicationTests {

	@Autowired
	private AppUserRepository appUserRepository;

	@Autowired
	private AgentRepository agentRepository;

	@Test
	@Transactional
	void dumpUsersAndAgents() {
		System.out.println("=== DUMPING APP USERS ===");
		appUserRepository.findAll().forEach(user -> {
			System.out.printf("USER: email=%s, fullName=%s, role=%s, agentId=%s, deleted=%b, active=%b%n",
					user.getEmail(), user.getFullName(), user.getRole(),
					user.getAgent() != null ? user.getAgent().getId() : "null",
					user.isDeleted(), user.isEnabled());
		});
		System.out.println("=== END DUMPING APP USERS ===");

		System.out.println("=== DUMPING AGENTS ===");
		agentRepository.findAll().forEach(agent -> {
			System.out.printf("AGENT: id=%d, matricule=%s, nom=%s, prenom=%s, deleted=%b%n",
					agent.getId(), agent.getMatricule(), agent.getNom(), agent.getPrenom(), agent.isDeleted());
		});
		System.out.println("=== END DUMPING AGENTS ===");
	}

	@Test
	void disableForcePasswordChangeForAll() {
		System.out.println("=== DISABLING FORCE PASSWORD CHANGE FOR ALL USERS ===");
		appUserRepository.findAll().forEach(user -> {
			user.setForcePasswordChange(false);
			appUserRepository.save(user);
			System.out.printf("Updated user %s: forcePasswordChange = false%n", user.getEmail());
		});
		System.out.println("=== FINISHED DISABLING FORCE PASSWORD CHANGE ===");
	}

}
