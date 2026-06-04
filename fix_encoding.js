const fs = require('fs');
const path = require('path');

const srcPath  = path.join(__dirname, 'import_medicines.sql');
const destPath = path.join(
  __dirname,
  'srm-mutuelle-backend/src/main/resources/db/migration/V27__seed_medicaments_lord.sql'
);

// Lire en binaire puis décoder en UTF-8
let content = fs.readFileSync(srcPath, 'utf8');

// Corrections mojibake (UTF-8 bytes lus comme Latin-1 puis re-encodés UTF-8)
const replacements = [
  // Patterns les plus fréquents dans ce fichier
  ['GÃ©nÃ©rique',   'Générique'],
  ['Ã©',            'é'],
  ['Ã¨',            'è'],
  ['Ãª',            'ê'],
  ['Ã«',            'ë'],
  ['Ã\xa0',        'à'],  // Ã + espace insécable latin
  ['Ã\u00c2\u00a0','à'],
  ['Ã ',            'à'],
  ['Ã¢',            'â'],
  ['Ã§',            'ç'],
  ['Ã®',            'î'],
  ['Ã¯',            'ï'],
  ['Ã´',            'ô'],
  ['Ã\xb6',        'ö'],
  ['Ã»',            'û'],
  ['Ã¹',            'ù'],
  ['Ã¼',            'ü'],
  ['Ã\x89',        'É'],
  ['Ã\x8a',        'Ê'],
  ['Ã\x80',        'À'],
  ['Ã\x87',        'Ç'],
  // Apostrophes et guillemets cassés
  ['â€™',           "'"],
  ['â€˜',           "'"],
  ['â€œ',           '"'],
  ['â€',            '"'],
  ['â€"',           '–'],
];

for (const [bad, good] of replacements) {
  // Remplacement global de toutes les occurrences
  while (content.includes(bad)) {
    content = content.split(bad).join(good);
  }
}

const header = [
  '-- V27 : Import referentiel medicaments marocain USER_COS.MEDICAMENT',
  '-- Source: lord_db.xlsx (USER_COS.MEDICAMENT)',
  '-- Date: ' + new Date().toISOString().split('T')[0],
  '-- Encodage: UTF-8 (accents corriges)',
  '',
  ''
].join('\n');

const final = header + content;

fs.writeFileSync(destPath, final, 'utf8');

// Rapport
const lines = final.split('\n').length;
const remaining = (final.match(/Ã/g) || []).length;
console.log(`V27 cree: ${destPath}`);
console.log(`Lignes: ${lines}`);
console.log(`Taille: ${Math.round(fs.statSync(destPath).size / 1024)} KB`);
if (remaining > 0) {
  console.log(`ATTENTION: ${remaining} occurrences d'artefacts 'Ã' restantes`);
} else {
  console.log('Encodage OK - aucun artefact restant');
}
