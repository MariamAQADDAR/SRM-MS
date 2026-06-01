"""Generate minimal DOCX templates for SRM-MS document downloads."""
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "srm-mutuelle-backend" / "src" / "main" / "resources" / "document-templates"
OUT.mkdir(parents=True, exist_ok=True)


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def make_docx(path: Path, title: str, lines: list[str]) -> None:
    paragraphs = [title, ""] + lines
    body = "".join(f"<w:p><w:r><w:t>{esc(line)}</w:t></w:r></w:p>" for line in paragraphs)
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}<w:sectPr/></w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)


make_docx(
    OUT / "modele-prise-en-charge.docx",
    "SRM-MS — Demande de prise en charge",
    [
        "Bénéficiaire :",
        "Matricule agent :",
        "Type de prestation :",
        "Établissement / corps médical :",
        "Médecin traitant / prescripteur :",
        "Date début / fin :",
        "Montant demandé (DH) :",
        "Observation :",
    ],
)
make_docx(
    OUT / "bulletin-adhesion-remboursement.docx",
    "SRM-MS — Bulletin adhésion remboursement",
    [
        "Bénéficiaire :",
        "Matricule agent :",
        "Type de soin :",
        "Médicament (si applicable) :",
        "Pharmacie / établissement :",
        "Montant demandé (DH) :",
        "Date de dépôt :",
    ],
)
make_docx(
    OUT / "bulletin-adhesion-carte-mutuelle.docx",
    "SRM-MS — Bulletin adhésion carte mutuelle",
    [
        "Agent (titulaire) :",
        "Bénéficiaire :",
        "Type de demande :",
        "Date :",
    ],
)
print(f"Created {len(list(OUT.glob('*.docx')))} templates in {OUT}")
