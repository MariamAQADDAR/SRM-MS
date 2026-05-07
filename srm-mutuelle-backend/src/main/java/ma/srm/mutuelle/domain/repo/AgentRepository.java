package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRepository extends JpaRepository<Agent, Long> {
}
