package ma.srm.mutuelle.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class MedicalDtos {

	public record MedicalFacilityResponse(
			Long id, String nom, String type, String adresse, String telephone, List<String> medecins) {}

	public record MedicalFacilityWriteRequest(
			@NotBlank String nom, @NotBlank String type, String adresse, String telephone) {}

	public record ContractedDoctorResponse(Long id, Long medicalFacilityId, String fullName) {}

	public record ContractedDoctorWriteRequest(Long medicalFacilityId, @NotBlank String fullName) {}

	public record MedicineResponse(Long id, String name, boolean reimbursed) {}

	public record MedicineWriteRequest(@NotBlank String name, boolean reimbursed) {}
}
