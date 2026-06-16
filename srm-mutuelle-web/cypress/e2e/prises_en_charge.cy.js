describe('Test du module Prises en Charge (Cypress)', () => {
  beforeEach(() => {
    // 1. Intercepter la requête de connexion pour gérer le mot de passe obligatoire
    cy.intercept('POST', '**/api/auth/login').as('loginRequest');

    // 2. Visiter la page de connexion
    cy.visit('/');

    // 3. Se connecter en tant qu'adhérent
    cy.get('#loginEmail').type('adherent@srm-ms.ma');
    cy.get('#loginPassword').type('11111111');
    cy.get('.login-split-form').submit();

    // 4. Gérer le changement obligatoire de mot de passe si c'est la première connexion
    cy.wait('@loginRequest').then((interception) => {
      const body = interception.response.body;
      if (body && body.forcePasswordChange === true) {
        cy.get('#newPassword').type('11111111');
        cy.get('#confirmPassword').type('11111111');
        cy.get('button[type="submit"]').click();
      }
    });

    // 5. Vérifier qu'on est connecté et redirigé vers l'application
    cy.url().should('include', '/app');
  });

  it('devrait soumettre avec succès une nouvelle demande PEC en 3 étapes', () => {
    // 1. Cliquer sur la carte "Mon Espace" dans le portail pour faire apparaître le menu latéral
    cy.contains('.portal-space-card', 'Mon Espace').click();

    // 2. Cliquer sur l'onglet "Mes prises en charge" dans le menu
    cy.contains('.nav-item', 'Mes prises en charge').click();

    // 3. Cliquer sur le bouton "Nouvelle demande PEC (3 étapes)"
    cy.contains('button', 'Nouvelle demande PEC (3 étapes)').click();

    // ------------------------------------------------
    // ÉTAPE 1 du Wizard : Informations Générales
    // ------------------------------------------------
    // Sélectionner le premier bénéficiaire
    cy.contains('.searchable-select-wrapper', 'Bénéficiaire')
      .find('input')
      .click();
    cy.get('.searchable-select-dropdown button').first().click();

    // Saisir le type de prestation
    cy.get('input[placeholder="Rechercher ou saisir un type..."]')
      .type('Hospitalisation');

    // Saisir l'établissement
    cy.get('input[placeholder="Rechercher ou saisir un établissement..."]')
      .type('Clinique Internationale Marrakech');

    // Passer à l'étape suivante
    cy.contains('button', 'Suivant').click();

    // ------------------------------------------------
    // ÉTAPE 2 du Wizard : Montant & Justificatif
    // ------------------------------------------------
    // Saisir le montant demandé
    cy.get('input[type="number"]').type('5000');

    // Charger un fichier PDF fictif pour le justificatif
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fictif pdf content'),
      fileName: 'justificatif_pec.pdf',
      mimeType: 'application/pdf',
    });

    // Passer à l'étape suivante
    cy.contains('button', 'Suivant').click();

    // ------------------------------------------------
    // ÉTAPE 3 du Wizard : Confirmation & Enregistrement
    // ------------------------------------------------
    // Vérifier les détails du récapitulatif
    cy.contains('.detail-item', 'Bénéficiaire').should('exist');
    cy.contains('.detail-item', 'Hospitalisation').should('exist');
    cy.contains('.detail-item', '5 000 DH').should('exist');

    // Soumettre le formulaire final
    cy.contains('button', 'Enregistrer la demande').click();

    // 9. Vérifier que la nouvelle demande apparaît bien dans la liste
    cy.contains('.data-table td', 'Hospitalisation').should('exist');
    cy.contains('.data-table td', 'Clinique Internationale Marrakech').should('exist');
  });
});
