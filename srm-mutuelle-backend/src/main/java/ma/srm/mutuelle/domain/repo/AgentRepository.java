package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgentRepository extends JpaRepository<Agent, Long> {
	List<Agent> findByDeletedFalse();
	List<Agent> findByDeletedTrue();
	java.util.Optional<Agent> findByMatricule(String matricule);
}
