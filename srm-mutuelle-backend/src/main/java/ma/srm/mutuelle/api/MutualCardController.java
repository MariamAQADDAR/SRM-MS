package ma.srm.mutuelle.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardCreateRequest;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardFamilyMember;
import ma.srm.mutuelle.api.dto.MutualCardDtos.MutualCardResponse;
import ma.srm.mutuelle.api.support.AuthPrincipal;
import ma.srm.mutuelle.service.MutualCardService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mutual-cards")
@RequiredArgsConstructor
public class MutualCardController {

	private final MutualCardService mutualCardService;

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<MutualCardResponse> list(Authentication authentication) {
		return mutualCardService.list(AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/family/{agentId}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public List<MutualCardFamilyMember> family(@PathVariable Long agentId, Authentication authentication) {
		return mutualCardService.familyOverview(agentId, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping("/by-agent/{agentId}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public MutualCardResponse byAgent(@PathVariable Long agentId, Authentication authentication) {
		return mutualCardService.getForAgent(agentId, AuthPrincipal.requireUser(authentication));
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','ADHERENT')")
	public MutualCardResponse create(@Valid @RequestBody MutualCardCreateRequest body, Authentication authentication) {
		return mutualCardService.createOrEnsure(body, AuthPrincipal.requireUser(authentication));
	}

	@GetMapping(value = "/{cardId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<Resource> downloadByCard(@PathVariable Long cardId, Authentication authentication) {
		byte[] bytes = mutualCardService.readPdfBytes(cardId, AuthPrincipal.requireUser(authentication));
		return pdfResponse(bytes, "carte-mutuelle-srm-ms.pdf");
	}

	@GetMapping(value = "/by-agent/{agentId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<Resource> downloadTitulaire(@PathVariable Long agentId, Authentication authentication) {
		byte[] bytes = mutualCardService.readPdfBytesForAgent(agentId, AuthPrincipal.requireUser(authentication));
		return pdfResponse(bytes, "carte-mutuelle-titulaire.pdf");
	}

	private ResponseEntity<Resource> pdfResponse(byte[] bytes, String filename) {
		ByteArrayResource resource = new ByteArrayResource(bytes);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
				.contentType(MediaType.APPLICATION_PDF)
				.contentLength(bytes.length)
				.body(resource);
	}
}
