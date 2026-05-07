package ma.srm.mutuelle.domain.repo;

import java.util.List;
import ma.srm.mutuelle.domain.SpecialDiseaseDeclaration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpecialDiseaseDeclarationRepository extends JpaRepository<SpecialDiseaseDeclaration, Long> {

	List<SpecialDiseaseDeclaration> findByAgent_IdOrderByDeclarationDateDesc(Long agentId);
}
