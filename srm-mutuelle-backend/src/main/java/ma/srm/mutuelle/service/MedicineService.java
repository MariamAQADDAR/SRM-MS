package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicineResponse;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicineWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.Medicine;
import ma.srm.mutuelle.domain.repo.MedicineRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MedicineService {

	private final MedicineRepository medicineRepository;

	public List<MedicineResponse> list(AppUser user) {
		return medicineRepository.findAll().stream().map(this::toDto).toList();
	}

	public MedicineResponse get(Long id, AppUser user) {
		return toDto(medicineRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médicament introuvable")));
	}

	@Transactional
	public MedicineResponse create(MedicineWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Medicine m = new Medicine();
		m.setName(req.name());
		m.setReimbursed(req.reimbursed());
		return toDto(medicineRepository.save(m));
	}

	@Transactional
	public MedicineResponse update(Long id, MedicineWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		Medicine m = medicineRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médicament introuvable"));
		m.setName(req.name());
		m.setReimbursed(req.reimbursed());
		return toDto(medicineRepository.save(m));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		medicineRepository.deleteById(id);
	}

	private MedicineResponse toDto(Medicine m) {
		return new MedicineResponse(m.getId(), m.getName(), m.isReimbursed());
	}
}
