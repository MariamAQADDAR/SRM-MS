package ma.srm.mutuelle.domain.repo;

import ma.srm.mutuelle.domain.AppTypeConfigEntry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppTypeConfigRepository extends JpaRepository<AppTypeConfigEntry, String> {}
