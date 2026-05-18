package ma.srm.mutuelle.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReimbursementPdfStorageService {

	private static final Set<String> ALLOWED = Set.of("application/pdf", "application/x-pdf");

	@Value("${app.reimbursements.storage-dir:./data/reimbursement-documents}")
	private String storageDir;

	public StoredPdf store(Long reimbursementId, MultipartFile file) throws IOException {
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Justificatif PDF obligatoire");
		}
		String contentType = file.getContentType();
		String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
		boolean pdf = name.endsWith(".pdf") || (contentType != null && ALLOWED.contains(contentType.toLowerCase()));
		if (!pdf) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seuls les fichiers PDF sont acceptés");
		}
		if (file.getSize() > 15 * 1024 * 1024) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF trop volumineux (max 15 Mo)");
		}
		Path base = Paths.get(storageDir).toAbsolutePath().normalize();
		Files.createDirectories(base);
		String storageKey = "rmb-" + reimbursementId + "-" + UUID.randomUUID() + ".pdf";
		Path target = base.resolve(storageKey).normalize();
		if (!target.startsWith(base)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chemin de stockage invalide");
		}
		Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
		String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "justificatif.pdf";
		return new StoredPdf(storageKey, original);
	}

	public byte[] readBytes(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun justificatif PDF");
		}
		Path base = Paths.get(storageDir).toAbsolutePath().normalize();
		Path file = base.resolve(storageKey).normalize();
		if (!file.startsWith(base) || !Files.isRegularFile(file)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable");
		}
		try {
			return Files.readAllBytes(file);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lecture PDF impossible");
		}
	}

	public record StoredPdf(String storageKey, String originalFileName) {}
}
