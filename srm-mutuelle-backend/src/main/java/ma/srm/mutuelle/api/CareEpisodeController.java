package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeResponse;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.CareEpisodeWriteRequest;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.RejectCareEpisodeRequest;
import ma.srm.mutuelle.api.dto.CareMaladieDtos.ValidateCareEpisodeRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.CareEpisodeService;
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
@RequestMapping("/api/care-episodes")
@RequiredArgsConstructor
public class CareEpisodeController {

	private final CareEpisodeService careEpisodeService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<CareEpisodeResponse> list(Authentication authentication) {
		return careEpisodeService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public CareEpisodeResponse get(@PathVariable Long id, Authentication authentication) {
		return careEpisodeService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}/document")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id, Authentication authentication) {
		byte[] bytes = careEpisodeService.readDocument(id, AuthPrincipal.requireUser(authentication));
		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_PDF)
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"pec-" + id + ".pdf\"")
				.body(bytes);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse create(@Valid @RequestBody CareEpisodeWriteRequest body, Authentication authentication) {
		return careEpisodeService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping(value = "/request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public CareEpisodeResponse createRequest(
			@RequestParam(required = false) Long agentId,
			@RequestParam String beneficiaire,
			@RequestParam String typePrestation,
			@RequestParam String etablissement,
			@RequestParam(required = false) String dateDebut,
			@RequestParam(required = false) String dateFin,
			@RequestParam BigDecimal montantDemande,
			@RequestParam(defaultValue = "0") int taux,
			@RequestParam(required = false) String observation,
			@RequestParam("file") MultipartFile file,
			Authentication authentication)
			throws Exception {
		LocalDate debut = dateDebut != null && !dateDebut.isBlank() ? LocalDate.parse(dateDebut) : null;
		LocalDate fin = dateFin != null && !dateFin.isBlank() ? LocalDate.parse(dateFin) : null;
		return careEpisodeService.createRequest(
				agentId,
				beneficiaire,
				typePrestation,
				etablissement,
				debut,
				fin,
				montantDemande,
				taux,
				observation,
				file,
				AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/submit")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public CareEpisodeResponse submit(@PathVariable Long id, Authentication authentication) {
		return careEpisodeService.submit(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/validate")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse validate(
			@PathVariable Long id,
			@Valid @RequestBody ValidateCareEpisodeRequest body,
			Authentication authentication) {
		return careEpisodeService.validate(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/reject")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse reject(
			@PathVariable Long id,
			@RequestBody(required = false) RejectCareEpisodeRequest body,
			Authentication authentication) {
		return careEpisodeService.reject(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public CareEpisodeResponse update(
			@PathVariable Long id, @Valid @RequestBody CareEpisodeWriteRequest body, Authentication authentication) {
		return careEpisodeService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		careEpisodeService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/archived")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public List<CareEpisodeResponse> listArchived(Authentication authentication) {
		return careEpisodeService.listArchived(AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/restore")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void restore(@PathVariable Long id, Authentication authentication) {
		careEpisodeService.restore(id, AuthPrincipal.requireUser(authentication));
	}
}
