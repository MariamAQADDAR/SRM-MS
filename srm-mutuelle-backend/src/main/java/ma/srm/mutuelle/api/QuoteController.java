package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteResponse;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteReviewRequest;
import ma.srm.mutuelle.api.dto.QuoteDtos.QuoteWriteRequest;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.QuoteService;
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
@RequestMapping("/api/quotes")
@RequiredArgsConstructor
public class QuoteController {

	private final QuoteService quoteService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<QuoteResponse> list(Authentication authentication) {
		return quoteService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public QuoteResponse get(@PathVariable Long id, Authentication authentication) {
		return quoteService.get(id, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/{id}/document")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id, Authentication authentication) {
		byte[] bytes = quoteService.readDocument(id, AuthPrincipal.requireUser(authentication));
		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_PDF)
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"devis-" + id + ".pdf\"")
				.body(bytes);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse create(@Valid @RequestBody QuoteWriteRequest body, Authentication authentication) {
		return quoteService.create(body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping(
			value = "/with-document",
			consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse createWithDocument(
			@RequestParam(required = false) Long agentId,
			@RequestParam(required = false) String beneficiaire,
			@RequestParam(required = false, defaultValue = "Dentaire") String quoteType,
			@RequestParam(required = false) String providerName,
			@RequestParam(required = false) String dateDevis,
			@RequestParam(required = false) String dateDepot,
			@RequestParam(required = false) BigDecimal montant,
			@RequestParam(defaultValue = "60") int taux,
			@RequestParam(required = false) String observation,
			@RequestParam("file") MultipartFile file,
			Authentication authentication)
			throws Exception {
		if (montant == null) {
			throw new org.springframework.web.server.ResponseStatusException(
					org.springframework.http.HttpStatus.BAD_REQUEST, "Montant du devis obligatoire");
		}
		LocalDate devis = dateDevis != null && !dateDevis.isBlank() ? LocalDate.parse(dateDevis) : null;
		LocalDate depot = dateDepot != null && !dateDepot.isBlank() ? LocalDate.parse(dateDepot) : null;
		return quoteService.createWithDocument(
				agentId,
				beneficiaire,
				quoteType,
				providerName,
				devis,
				depot,
				montant,
				taux,
				observation,
				file,
				AuthPrincipal.requireUser(authentication));
	}

	@PostMapping(value = "/dental", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse createDental(
			@RequestParam(required = false) Long agentId,
			@RequestParam(required = false) String beneficiaire,
			@RequestParam(required = false) String dentistName,
			@RequestParam(required = false) String dateDevis,
			@RequestParam(required = false) String dateDepot,
			@RequestParam BigDecimal montant,
			@RequestParam(defaultValue = "60") int taux,
			@RequestParam(required = false) String observation,
			@RequestParam("file") MultipartFile file,
			Authentication authentication)
			throws Exception {
		LocalDate devis = dateDevis != null && !dateDevis.isBlank() ? LocalDate.parse(dateDevis) : null;
		LocalDate depot = dateDepot != null && !dateDepot.isBlank() ? LocalDate.parse(dateDepot) : null;
		return quoteService.createDental(
				agentId,
				beneficiaire,
				dentistName,
				devis,
				depot,
				montant,
				taux,
				observation,
				file,
				AuthPrincipal.requireUser(authentication));
	}

	@PostMapping(value = "/{id}/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse uploadDocument(
			@PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication)
			throws Exception {
		return quoteService.uploadDocument(id, file, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/submit")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public QuoteResponse submit(@PathVariable Long id, Authentication authentication) {
		return quoteService.submit(id, AuthPrincipal.requireUser(authentication));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse update(
			@PathVariable Long id, @Valid @RequestBody QuoteWriteRequest body, Authentication authentication) {
		return quoteService.update(id, body, AuthPrincipal.requireUser(authentication));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMINISTRATEUR')")
	public void delete(@PathVariable Long id, Authentication authentication) {
		quoteService.delete(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/scan")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse scan(@PathVariable Long id, Authentication authentication) {
		return quoteService.scan(id, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/approve")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse approve(
			@PathVariable Long id,
			@RequestBody(required = false) QuoteReviewRequest body,
			Authentication authentication) {
		return quoteService.approve(id, body, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping("/{id}/reject")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR')")
	public QuoteResponse reject(
			@PathVariable Long id,
			@RequestBody(required = false) QuoteReviewRequest body,
			Authentication authentication) {
		return quoteService.reject(id, body, AuthPrincipal.requireUser(authentication));
	}
}
