package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementResponse;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ReimbursementWriteRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.RejectReimbursementRequest;
import ma.srm.mutuelle.api.dto.ReimbursementDtos.ValidateReimbursementRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.ReimbursementService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/reimbursements")
@RequiredArgsConstructor
public class ReimbursementController {

	private final ReimbursementService reimbursementService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<ReimbursementResponse> list(Authentication authentication) {
		return reimbursementService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ReimbursementResponse get(@PathVariable Long id, Authentication authentication) {
		return reimbursementService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping(value = "/{id}/document", produces = MediaType.APPLICATION_PDF_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<Resource> downloadDocument(@PathVariable Long id, Authentication authentication) {
		byte[] bytes = reimbursementService.readDocument(id, AuthPrincipal.requireUser(authentication));
		ByteArrayResource resource = new ByteArrayResource(bytes);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"justificatif-remboursement.pdf\"")
				.contentType(MediaType.APPLICATION_PDF)
				.contentLength(bytes.length)
				.body(resource);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse create(@Valid @RequestBody ReimbursementWriteRequest body, Authentication authentication) {
		return reimbursementService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping(value = "/request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public ReimbursementResponse createRequest(
			@RequestParam(required = false) Long agentId,
			@RequestParam String beneficiaire,
			@RequestParam(required = false) String establishmentName,
			@RequestParam(required = false) String careType,
			@RequestParam(required = false) String medicineName,
			@RequestParam(required = false) String depositDate,
			@RequestParam BigDecimal montantDemande,
			@RequestParam(required = false) String observation,
			@RequestParam("file") MultipartFile file,
			Authentication authentication)
			throws Exception {
		LocalDate depot = depositDate != null && !depositDate.isBlank() ? LocalDate.parse(depositDate) : null;
		return reimbursementService.createRequest(
				agentId,
				beneficiaire,
				establishmentName,
				careType,
				medicineName,
				depot,
				montantDemande,
				observation,
				file,
				AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/submit")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public ReimbursementResponse submit(@PathVariable Long id, Authentication authentication) {
		return reimbursementService.submit(id, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse update(
			@PathVariable Long id, @Valid @RequestBody ReimbursementWriteRequest body, Authentication authentication) {
		return reimbursementService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		reimbursementService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/validate")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse validate(
			@PathVariable Long id,
			@Valid @RequestBody ValidateReimbursementRequest body,
			Authentication authentication) {
		return reimbursementService.validate(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/reject")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse reject(
			@PathVariable Long id,
			@RequestBody(required = false) RejectReimbursementRequest body,
			Authentication authentication) {
		return reimbursementService.reject(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/close")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public ReimbursementResponse close(@PathVariable Long id, Authentication authentication) {
		return reimbursementService.close(id, AuthPrincipal.requireUser(authentication));
	}
}
