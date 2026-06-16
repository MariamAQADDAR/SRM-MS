describe('Test du module Maladies Spéciales (Cypress)', () => {
  beforeEach(() => {
    // 1. Intercepter la requête de connexion pour gérer le mot de passe obligatoire
    cy.intercept('POST', '**/api/auth/login').as('loginRequest');

    // 2. Visiter la page de connexion
    cy.visit('/');

    // 3. Se connecter en tant qu'administrateur
    cy.get('#loginEmail').type('admin@srm-ms.ma');
    cy.get('#loginPassword').type('admin123');
    cy.get('.login-split-form').submit();

    // 4. Attendre et gérer le changement de mot de passe si c'est la première connexion
    cy.wait('@loginRequest').then((interception) => {
      const body = interception.response.body;
      if (body && body.forcePasswordChange === true) {
        cy.get('#newPassword').type('admin123');
        cy.get('#confirmPassword').type('admin123');
        cy.get('button[type="submit"]').click();
      }
    });

    // 5. Vérifier qu'on est bien redirigé vers l'application
    cy.url().should('include', '/app');
  });

  it('devrait créer avec succès un nouveau dossier de maladie spéciale avec l\'option "Autre"', () => {
    // 1. Cliquer sur la carte "Espace Gestion" dans le portail pour faire apparaître le menu d'administration
    cy.contains('.portal-space-card', 'Espace Gestion').click();

    // 2. Ouvrir la section "Gestion" du menu latéral
    cy.contains('.nav-section-title', 'Gestion').click();

    // 3. Cliquer sur "Maladies spéciales"
    cy.contains('.nav-item', 'Maladies spéciales').click();

    // 4. Cliquer sur le bouton "Nouveau dossier"
    cy.contains('button', 'Nouveau dossier').click();

    // 5. Sélectionner le porteur (Agent) dans le champ de recherche
    cy.contains('.searchable-select-wrapper', 'Porteur (Agent)')
      .find('input')
      .type('AGT-CONS');
    
    // Attendre et cliquer sur le premier résultat de l'agent dans la liste
    cy.get('.searchable-select-dropdown button').first().click();

    // 6. Sélectionner le bénéficiaire
    // Cliquer sur le champ pour ouvrir la liste
    cy.contains('.searchable-select-wrapper', 'Bénéficiaire')
      .find('input')
      .click();

    // Sélectionner le premier bénéficiaire disponible (le titulaire ou un ayant droit)
    cy.get('.searchable-select-dropdown button').first().click();

    // 7. Choisir l'option "Autre" pour le type de maladie
    cy.get('select[name="typePrestationSelect"]').then(($select) => {
      // Dans le cas où l'intitulé du select est différent, on s'adapte
      const selector = $select.length > 0 ? 'select[name="typePrestationSelect"]' : 'select[name="typeMaladieSelect"]';
      cy.get(selector).select('Autre');
    });

    // 8. Vérifier que le champ de texte libre s'affiche et saisir la maladie personnalisée
    cy.get('input[placeholder="Saisir le type de maladie..."]')
      .should('be.visible')
      .type('Asthme chronique');

    // 9. Cliquer sur "Enregistrer" pour soumettre le formulaire
    cy.contains('button', 'Enregistrer').click();

    // 10. Vérifier que le dossier a été créé et s'affiche dans le tableau
    cy.contains('.data-table td', 'Asthme chronique').should('exist');
  });
});
