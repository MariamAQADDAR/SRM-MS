package ma.srm.mutuelle.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MedicalDtos.ContractedDoctorResponse;
import ma.srm.mutuelle.api.dto.MedicalDtos.ContractedDoctorWriteRequest;
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
public class ContractedDoctorService {

	private final ContractedDoctorRepository contractedDoctorRepository;
	private final MedicalFacilityRepository medicalFacilityRepository;

	public List<ContractedDoctorResponse> list(Long facilityId) {
		if (facilityId != null) {
			return contractedDoctorRepository.findByMedicalFacility_IdOrderById(facilityId).stream()
					.map(this::toDto)
					.toList();
		}
		return contractedDoctorRepository.findAll().stream().map(this::toDto).toList();
	}

	public ContractedDoctorResponse get(Long id, AppUser user) {
		return toDto(contractedDoctorRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médecin introuvable")));
	}

	@Transactional
	public ContractedDoctorResponse create(ContractedDoctorWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		MedicalFacility f = medicalFacilityRepository
				.findById(req.medicalFacilityId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Établissement introuvable"));
		ContractedDoctor d = new ContractedDoctor();
		d.setMedicalFacility(f);
		d.setFullName(req.fullName());
		return toDto(contractedDoctorRepository.save(d));
	}

	@Transactional
	public ContractedDoctorResponse update(Long id, ContractedDoctorWriteRequest req, AppUser user) {
		AccessRules.assertStaffWrite(user);
		ContractedDoctor d = contractedDoctorRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médecin introuvable"));
		MedicalFacility f = medicalFacilityRepository
				.findById(req.medicalFacilityId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Établissement introuvable"));
		d.setMedicalFacility(f);
		d.setFullName(req.fullName());
		return toDto(contractedDoctorRepository.save(d));
	}

	@Transactional
	public void delete(Long id, AppUser user) {
		AccessRules.assertStaffWrite(user);
		contractedDoctorRepository.deleteById(id);
	}

	private ContractedDoctorResponse toDto(ContractedDoctor d) {
		return new ContractedDoctorResponse(d.getId(), d.getMedicalFacility().getId(), d.getFullName());
	}
}
