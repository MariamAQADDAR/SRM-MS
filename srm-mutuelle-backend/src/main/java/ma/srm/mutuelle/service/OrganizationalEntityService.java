package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.OrgEntityDtos.OrgEntityResponse;
import ma.srm.mutuelle.api.dto.OrgEntityDtos.OrgEntityWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.OrganizationalEntity;
import ma.srm.mutuelle.domain.repo.OrganizationalEntityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrganizationalEntityService {

	private final OrganizationalEntityRepository repository;

	public List<OrgEntityResponse> list(AppUser user) {
		return repository.findAll().stream().map(this::toDto).toList();
	}

	public OrgEntityResponse get(Long id, AppUser user) {
		return toDto(repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entité introuvable")));
	}

	@Transactional
	public OrgEntityResponse create(OrgEntityWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		OrganizationalEntity e = new OrganizationalEntity();
		e.setCode(req.code());
		e.setName(req.nom());
		e.setEntityType(req.type());
		if (req.parentId() != null) {
			e.setParent(repository.findById(req.parentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent introuvable")));
		}
		return toDto(repository.save(e));
	}

	@Transactional
	public OrgEntityResponse update(Long id, OrgEntityWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		OrganizationalEntity e = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entité introuvable"));
		e.setCode(req.code());
		e.setName(req.nom());
		e.setEntityType(req.type());
		if (req.parentId() != null) {
			e.setParent(repository.findById(req.parentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent introuvable")));
		} else {
			e.setParent(null);
		}
		return toDto(repository.save(e));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		repository.deleteById(id);
	}

	private OrgEntityResponse toDto(OrganizationalEntity e) {
		return new OrgEntityResponse(
				e.getId(),
				e.getCode(),
				e.getName(),
				e.getEntityType(),
				e.getParent() != null ? e.getParent().getId() : null);
	}
}
