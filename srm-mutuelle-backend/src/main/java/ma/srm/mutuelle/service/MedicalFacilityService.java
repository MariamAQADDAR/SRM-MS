package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicalFacilityResponse;
import ma.srm.mutuelle.api.dto.MedicalDtos.MedicalFacilityWriteRequest;
import ma.srm.mutuelle.api.support.AccessRules;
import ma.srm.mutuelle.domain.AppUser;
import ma.srm.mutuelle.domain.ContractedDoctor;
import ma.srm.mutuelle.domain.MedicalFacility;
import ma.srm.mutuelle.domain.repo.ContractedDoctorRepository;
import ma.srm.mutuelle.domain.repo.MedicalFacilityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MedicalFacilityService {

	private final MedicalFacilityRepository medicalFacilityRepository;
	private final ContractedDoctorRepository contractedDoctorRepository;

	public List<MedicalFacilityResponse> list(AppUser user) {
		return medicalFacilityRepository.findAll().stream().map(this::toDto).toList();
	}

	public MedicalFacilityResponse get(Long id, AppUser user) {
		return toDto(medicalFacilityRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Établissement introuvable")));
	}

	@Transactional
	public MedicalFacilityResponse create(MedicalFacilityWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		MedicalFacility f = new MedicalFacility();
		f.setName(req.nom());
		f.setFacilityType(req.type());
		f.setAddress(req.adresse());
		f.setPhone(req.telephone());
		return toDto(medicalFacilityRepository.save(f));
	}

	@Transactional
	public MedicalFacilityResponse update(Long id, MedicalFacilityWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		MedicalFacility f = medicalFacilityRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Établissement introuvable"));
		f.setName(req.nom());
		f.setFacilityType(req.type());
		f.setAddress(req.adresse());
		f.setPhone(req.telephone());
		return toDto(medicalFacilityRepository.save(f));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertAdmin(user);
		if (!medicalFacilityRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Établissement introuvable");
		}
		try {
			medicalFacilityRepository.deleteById(id);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Suppression impossible (médecins liés)");
		}
	}

	private MedicalFacilityResponse toDto(MedicalFacility f) {
		List<String> medecins = contractedDoctorRepository.findByMedicalFacility_IdOrderById(f.getId()).stream()
				.map(ContractedDoctor::getFullName)
				.toList();
		return new MedicalFacilityResponse(
				f.getId(), f.getName(), f.getFacilityType(), f.getAddress(), f.getPhone(), medecins);
	}
}
