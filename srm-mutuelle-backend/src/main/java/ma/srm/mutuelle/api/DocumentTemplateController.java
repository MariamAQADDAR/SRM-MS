package ma.srm.mutuelle.api;

import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/document-templates")
@RequiredArgsConstructor
public class DocumentTemplateController {

	private static final MediaType DOCX_MEDIA_TYPE = MediaType.parseMediaType(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document");

	@GetMapping("/{templateKey}")
	@PreAuthorize("hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR','ADHERENT')")
	public ResponseEntity<byte[]> download(@PathVariable String templateKey) throws IOException {
		Template template = resolve(templateKey);
		ClassPathResource resource = new ClassPathResource("document-templates/" + template.resourceName());
		if (!resource.exists()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Modèle introuvable");
		}
		return ResponseEntity.ok()
				.contentType(DOCX_MEDIA_TYPE)
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + template.downloadName() + "\"")
				.body(resource.getInputStream().readAllBytes());
	}

	private Template resolve(String key) {
		return switch (key) {
			case "mutual-card-membership" -> new Template(
					"bulletin-adhesion-carte-mutuelle.docx",
					"bulletin-adhesion-carte-mutuelle.docx");
			case "care-episode-request" -> new Template(
					"modele-prise-en-charge.docx",
					"modele-prise-en-charge.docx");
			default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Modèle introuvable");
		};
	}

	private record Template(String resourceName, String downloadName) {}
}
