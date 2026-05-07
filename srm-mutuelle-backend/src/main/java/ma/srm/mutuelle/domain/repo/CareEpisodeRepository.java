package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.CareEpisode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareEpisodeRepository extends JpaRepository<CareEpisode, Long> {

	List<CareEpisode> findByAgent_IdOrderByDateDebutDesc(Long agentId);
}
