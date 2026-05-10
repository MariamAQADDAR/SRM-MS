package ma.srm.mutuelle.service;

import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.MutualCard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MutualCardPdfService {

	@Value("${app.mutual-cards.storage-dir:./data/mutual-cards}")
	private String storageDir;

	public String generateAndStore(MutualCard card, Agent agent) throws IOException {
		Path base = Paths.get(storageDir).toAbsolutePath().normalize();
		Files.createDirectories(base);
		String filename = "mutuelle-agent-" + agent.getId() + "-" + card.getId() + ".pdf";
		Path target = base.resolve(filename).normalize();
		if (!target.startsWith(base)) {
			throw new IOException("Chemin PDF invalide");
		}
		try (OutputStream os = Files.newOutputStream(target)) {
			Document document = new Document();
			PdfWriter.getInstance(document, os);
			document.open();
			document.add(new Paragraph("SRM-MS — Carte mutuelle", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
			document.add(new Paragraph(" "));
			document.add(new Paragraph("Matricule : " + agent.getMatricule(), FontFactory.getFont(FontFactory.HELVETICA, 12)));
			document.add(new Paragraph("Titulaire : " + agent.getPrenom() + " " + agent.getNom()));
			document.add(new Paragraph("Entité : " + agent.getEntiteName()));
			String issued = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
					.withZone(ZoneId.systemDefault())
					.format(card.getIssuedAt() != null ? card.getIssuedAt() : Instant.now());
			document.add(new Paragraph("Émission : " + issued));
			document.add(new Paragraph(" "));
			document.add(new Paragraph(
					"Document généré automatiquement. Conservez ce PDF comme justificatif d'affiliation.",
					FontFactory.getFont(FontFactory.HELVETICA, 10)));
			document.close();
		}
		return filename;
	}

	public byte[] readPdfBytes(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "PDF non disponible");
		}
		Path base = Paths.get(storageDir).toAbsolutePath().normalize();
		Path file = base.resolve(storageKey).normalize();
		if (!file.startsWith(base)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clé de stockage invalide");
		}
		try {
			if (!Files.isRegularFile(file)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier PDF introuvable");
			}
			return Files.readAllBytes(file);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lecture PDF impossible");
		}
	}
}
