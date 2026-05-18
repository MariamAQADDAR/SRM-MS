package ma.srm.mutuelle.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import ma.srm.mutuelle.domain.Agent;
import ma.srm.mutuelle.domain.MutualCard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MutualCardPdfService {

	private static final Color BRAND_BLUE = new Color(0, 82, 155);
	private static final Color BRAND_LIGHT = new Color(232, 244, 252);
	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	@Value("${app.mutual-cards.storage-dir:./data/mutual-cards}")
	private String storageDir;

	@Value("${app.brand.logo-path:classpath:assets/srm-company-logo.png}")
	private Resource logoResource;

	public String generateAndStore(MutualCard card, Agent agent) throws IOException {
		Path base = Paths.get(storageDir).toAbsolutePath().normalize();
		Files.createDirectories(base);
		String suffix = card.getBeneficiary() != null ? "b" + card.getBeneficiary().getId() : "titulaire";
		String filename = "mutuelle-agent-" + agent.getId() + "-" + suffix + "-" + card.getId() + ".pdf";
		Path target = base.resolve(filename).normalize();
		if (!target.startsWith(base)) {
			throw new IOException("Chemin PDF invalide");
		}
		try (OutputStream os = Files.newOutputStream(target)) {
			Document document = new Document();
			PdfWriter.getInstance(document, os);
			document.open();
			addHeader(document);
			addCardBody(document, card, agent);
			addFooter(document);
			document.close();
		}
		return filename;
	}

	private void addHeader(Document document) throws IOException {
		PdfPTable header = new PdfPTable(2);
		header.setWidthPercentage(100);
		header.setWidths(new float[] { 1.2f, 2.8f });

		PdfPCell logoCell = new PdfPCell();
		logoCell.setBorder(PdfPCell.NO_BORDER);
		logoCell.setBackgroundColor(BRAND_LIGHT);
		logoCell.setPadding(10);
		logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
		logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
		Image logo = loadLogo();
		if (logo != null) {
			logo.scaleToFit(110, 48);
			logoCell.addElement(logo);
		}
		header.addCell(logoCell);

		PdfPCell titleCell = new PdfPCell();
		titleCell.setBorder(PdfPCell.NO_BORDER);
		titleCell.setBackgroundColor(BRAND_BLUE);
		titleCell.setPadding(12);
		Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, Font.BOLD, Color.WHITE);
		Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Font.NORMAL, Color.WHITE);
		titleCell.addElement(new Paragraph("SRM-MS — Mutuelle entreprise", titleFont));
		titleCell.addElement(new Paragraph("Société Régionale Multiservices Marrakech-Safi", subFont));
		titleCell.addElement(new Paragraph("Carte d'affiliation santé", subFont));
		header.addCell(titleCell);

		document.add(header);
		document.add(new Paragraph(" "));
	}

	private void addCardBody(Document document, MutualCard card, Agent agent) {
		Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Font.BOLD, BRAND_BLUE);
		Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

		Paragraph title = new Paragraph("CARTE D'AFFILIATION MUTUELLE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Font.BOLD, BRAND_BLUE));
		title.setAlignment(Element.ALIGN_CENTER);
		title.setSpacingAfter(12);
		document.add(title);

		String holderName = formatHolderName(card);
		String link = card.getCardLabel() != null ? card.getCardLabel() : "Titulaire";
		String cin = nullToDash(card.getHolderCin());
		String birth = card.getHolderDateNaissance() != null ? DATE_FMT.format(card.getHolderDateNaissance()) : "—";
		String issued = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
				.withZone(ZoneId.systemDefault())
				.format(card.getIssuedAt() != null ? card.getIssuedAt() : Instant.now());

		PdfPTable grid = new PdfPTable(2);
		grid.setWidthPercentage(100);
		grid.setSpacingBefore(4);
		addRow(grid, "Matricule porteur", agent.getMatricule(), labelFont, valueFont);
		addRow(grid, "Bénéficiaire", holderName, labelFont, valueFont);
		addRow(grid, "Lien de parenté", link, labelFont, valueFont);
		addRow(grid, "CIN", cin, labelFont, valueFont);
		addRow(grid, "Date de naissance", birth, labelFont, valueFont);
		addRow(grid, "Entité / Direction", nullToDash(agent.getEntiteName()), labelFont, valueFont);
		addRow(grid, "N° carte", "SRM-" + agent.getMatricule() + "-" + card.getId(), labelFont, valueFont);
		addRow(grid, "Date d'émission", issued, labelFont, valueFont);
		document.add(grid);
	}

	private void addFooter(Document document) {
		document.add(new Paragraph(" "));
		Font foot = FontFactory.getFont(FontFactory.HELVETICA, 9, Font.ITALIC, Color.DARK_GRAY);
		Paragraph p = new Paragraph(
				"Document officiel généré par la plateforme mutuelle SRM-MS. "
						+ "À présenter aux professionnels de santé conventionnés. "
						+ "Toute falsification est passible de sanctions.",
				foot);
		p.setAlignment(Element.ALIGN_JUSTIFIED);
		document.add(p);
	}

	private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
		PdfPCell l = new PdfPCell(new Phrase(label, labelFont));
		l.setBackgroundColor(BRAND_LIGHT);
		l.setPadding(8);
		PdfPCell v = new PdfPCell(new Phrase(value, valueFont));
		v.setPadding(8);
		table.addCell(l);
		table.addCell(v);
	}

	private Image loadLogo() {
		try {
			if (logoResource == null || !logoResource.exists()) {
				return null;
			}
			try (InputStream in = logoResource.getInputStream()) {
				byte[] bytes = in.readAllBytes();
				if (bytes.length == 0) {
					return null;
				}
				return Image.getInstance(bytes);
			}
		} catch (Exception e) {
			return null;
		}
	}

	private String formatHolderName(MutualCard card) {
		String p = card.getHolderPrenom() != null ? card.getHolderPrenom().trim() : "";
		String n = card.getHolderNom() != null ? card.getHolderNom().trim() : "";
		String full = (p + " " + n).trim();
		return full.isEmpty() ? "—" : full;
	}

	private String nullToDash(String s) {
		return s == null || s.isBlank() ? "—" : s;
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
