describe('Tests de connexion fonctionnels (Cypress)', () => {
  beforeEach(() => {
    // Intercepter la requête de connexion pour gérer le mot de passe obligatoire dynamiquement
    cy.intercept('POST', '**/api/auth/login').as('loginRequest');
  });

  it('devrait se connecter avec succès en tant qu\'adhérent et rediriger vers l\'application', () => {
    cy.visit('/');
    cy.get('#loginEmail').type('adherent@srm-ms.ma');
    cy.get('#loginPassword').type('11111111');
    cy.get('.login-split-form').submit();

    cy.wait('@loginRequest').then((interception) => {
      const body = interception.response.body;
      if (body && body.forcePasswordChange === true) {
        cy.get('#newPassword').type('11111111');
        cy.get('#confirmPassword').type('11111111');
        cy.get('button[type="submit"]').click();
      }
    });

    cy.url().should('include', '/app');
  });

  it('devrait se connecter avec succès en tant qu\'administrateur et rediriger vers l\'application', () => {
    cy.visit('/');
    cy.get('#loginEmail').type('admin@srm-ms.ma');
    cy.get('#loginPassword').type('admin123');
    cy.get('.login-split-form').submit();

    cy.wait('@loginRequest').then((interception) => {
      const body = interception.response.body;
      if (body && body.forcePasswordChange === true) {
        cy.get('#newPassword').type('admin123');
        cy.get('#confirmPassword').type('admin123');
        cy.get('button[type="submit"]').click();
      }
    });

    cy.url().should('include', '/app');
  });
});
