import { addAndEditChannel, clickWorkflow, dragAndDrop, editChannel, fillBasicNotificationDetails, goBack } from '.';

describe('Workflow Editor - Main Functionality', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should not reset data when switching channel types', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    fillBasicNotificationDetails('Test not reset data when switching channel types');

    addAndEditChannel('inApp');
    cy.get('.ace_text-input').first().type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
      force: true,
    });
    goBack();

    dragAndDrop('email');
    editChannel('email');
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');
    goBack();

    editChannel('inApp');
    cy.get('.ace_text-layer').first().contains('{{firstName}} someone assigned you to {{taskName}}');
    goBack();
    editChannel('email');

    cy.getByTestId('editable-text-content').contains('This text is written from a test');
    cy.getByTestId('emailSubject').should('have.value', 'this is email subject');
    cy.getByTestId('emailPreheader').should('have.value', 'this is email preheader');
  });

  it('should edit notification', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('title').should('have.value', template.name);

    addAndEditChannel('inApp');

    cy.get('.ace_text-layer').first().contains('Test content for <b>{{firstName}}</b>');

    goBack();

    cy.getByTestId('settingsButton').click();
    cy.getByTestId('title').clear().type('This is the new notification title');
    clickWorkflow();

    editChannel('inApp', true);

    cy.getByTestId('use-feeds-checkbox').click();
    cy.getByTestId('feed-button-1').click({ force: true });

    cy.get('.ace_text-input')
      .first()
      .clear({
        force: true,
      })
      .type('new content for notification', {
        force: true,
      });
    cy.getByTestId('submit-btn').click();

    cy.visit('/templates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('template-edit-link');
    cy.getByTestId('notifications-template').get('tbody tr td').contains('This is the new', {
      matchCase: false,
    });

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    clickWorkflow();

    editChannel('inApp', true);

    cy.getByTestId('feed-button-1-checked');
    cy.getByTestId('create-feed-input').type('test4');
    cy.getByTestId('add-feed-button').click();
    cy.getByTestId('feed-button-2-checked');
  });

  it('should update notification active status', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('active-toggle-switch').get('label').contains('Enabled');
    cy.getByTestId('active-toggle-switch').click({ force: true });
    cy.getByTestId('active-toggle-switch').get('label').contains('Disabled');

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('active-toggle-switch').get('label').contains('Disabled');
  });

  it('should toggle active states of channels', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test toggle active states of channels');
    // Enable email from button click
    clickWorkflow();
    dragAndDrop('email');

    cy.clickWorkflowNode(`node-emailSelector`);

    cy.getByTestId(`step-active-switch`).should('have.value', 'on');
    cy.getByTestId(`step-active-switch`).click({ force: true });

    // enable email selector
    cy.getByTestId(`step-active-switch`).click({ force: true });
    cy.getByTestId(`close-side-menu-btn`).click();

    dragAndDrop('inApp');

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).should('have.value', 'on');
  });

  it('should show trigger snippet block when editing', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('triggerCodeSelector').click();
    cy.getByTestId('trigger-code-snippet').contains('test-event');
  });

  it('should validate form inputs', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('description').type('this is a notification template description');
    cy.getByTestId('submit-btn').click();
    cy.getByTestId('title').should('have.class', 'mantine-TextInput-invalid');
    fillBasicNotificationDetails('Test SMS Notification Title');
    clickWorkflow();
    dragAndDrop('inApp');

    cy.getByTestId('submit-btn').click();
    cy.getByTestId('workflowButton').getByTestId('error-circle').should('be.visible');
    cy.getByTestId('settingsButton').getByTestId('error-circle').should('be.visible');
  });

  it('should show error on node if message field is missing ', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails();
    clickWorkflow();
    dragAndDrop('email');
    cy.getByTestId('submit-btn').click();
    cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('be.visible');
    editChannel('email');
    cy.getByTestId('emailSubject').should('have.class', 'mantine-TextInput-invalid');

    cy.getByTestId('emailSubject').type('this is email subject');
    goBack();
    cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('not.exist');
  });

  it('should fill required settings before workflow btn is clickable', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('description').type('this is a notification template description');
    clickWorkflow();
    cy.getByTestId('title').should('have.class', 'mantine-TextInput-invalid');
    cy.getByTestId('title').type('filled title');
    clickWorkflow();

    cy.get('.react-flow__node').should('exist');
  });

  it('should allow uploading a logo from email editor', function () {
    cy.intercept('*/organizations', (r) => {
      r.continue((res) => {
        if (res.body) {
          delete res.body.data[0].branding.logo;
        }

        res.send({ body: res.body });
      });
    });
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test allow uploading a logo from email editor');
    addAndEditChannel('email');

    cy.getByTestId('upload-image-button').click();

    cy.get('.mantine-Modal-modal button').contains('Yes').click();
    cy.location('pathname').should('equal', '/brand');
  });

  it('should show the brand logo on main page', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test show the brand logo on main page');
    addAndEditChannel('email');

    cy.getByTestId('email-editor').getByTestId('brand-logo').should('have.attr', 'src', 'https://novu.co/img/logo.png');
  });

  it('should support RTL text content', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test support RTL text content');
    clickWorkflow();
    dragAndDrop('email');
    editChannel('email');

    cy.getByTestId('settings-row-btn').eq(0).invoke('show').click();
    cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'left');
    cy.getByTestId('align-right-btn').click();
    cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'right');
  });

  it('should create an SMS channel message', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test SMS Notification Title');
    addAndEditChannel('sms');

    cy.getByTestId('smsNotificationContent').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-sms-notification');
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-code-snippet')
      .contains("import { Novu } from '@novu/node'");

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('taskName');

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('firstName');

    cy.getByTestId('trigger-snippet-btn').click();
    cy.location('pathname').should('equal', '/templates');
  });

  it('should save HTML template email', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Custom Code HTML Notification Title');
    addAndEditChannel('email');

    cy.getByTestId('emailSubject').type('this is email subject');

    cy.getByTestId('editor-type-selector')
      .find('.mantine-Tabs-tabsList')
      .contains('Custom Code', { matchCase: false })
      .click();
    cy.get('#codeEditor').type('Hello world code {{name}} <div>Test', { parseSpecialCharSequences: false });

    cy.intercept('GET', '/v1/notification-templates?page=0&limit=10').as('notification-templates');
    cy.getByTestId('submit-btn').click();
    cy.getByTestId('trigger-snippet-btn').click();

    cy.wait('@notification-templates', { timeout: 60000 });
    cy.get('tbody').contains('Custom Code HTM').click();
    cy.waitForNetworkIdle(500);

    clickWorkflow();
    editChannel('email');
    cy.get('#codeEditor').contains('Hello world code {{name}} <div>Test</div>');
  });

  it('should redirect to dev env for edit template', function () {
    cy.intercept('POST', '*/notification-templates').as('createTemplate');
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });

    fillBasicNotificationDetails();
    cy.getByTestId('submit-btn').click();

    cy.wait('@createTemplate').then((res) => {
      cy.getByTestId('trigger-snippet-btn').click();
      cy.intercept('GET', '/v1/changes?promoted=false').as('unpromoted-changes');
      cy.visit('/changes');

      cy.waitLoadTemplatePage(() => {
        cy.getByTestId('promote-btn').eq(0).click({ force: true });
        cy.getByTestId('environment-switch').find(`input[value="Production"]`).click({ force: true });
        cy.getByTestId('notifications-template').find('tbody tr').first().click();

        cy.location('pathname').should('not.equal', `/templates/edit/${res.response?.body.data._id}`);

        cy.getByTestId('environment-switch').find(`input[value="Development"]`).click({ force: true });

        cy.location('pathname').should('equal', `/templates/edit/${res.response?.body.data._id}`);
      });
    });
  });

  it('New template button should be disabled in the Production', function () {
    cy.visit('/templates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('environment-switch').find(`input[value="Production"] ~ label`).click();

    cy.getByTestId('create-template-btn').should('be.disabled');
  });

  it('Should not allow to go to New Template page in Production', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive');
    cy.getByTestId('environment-switch').find(`input[value="Production"] ~ label`).click();

    cy.location('pathname').should('equal', `/templates`);
  });

  it('should save Cta buttons state in inApp channel', function () {
    cy.visit('/templates/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('In App CTA Button');
    addAndEditChannel('inApp');

    cy.get('.ace_text-input').first().type('Text content', {
      force: true,
    });

    cy.getByTestId('control-add').first().click();
    cy.getByTestId('template-container-click-area').eq(0).click();

    cy.getByTestId('submit-btn').click();

    cy.visit('/templates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('notifications-template')
      .get('tbody tr td')
      .contains('In App CTA Button', {
        matchCase: false,
      })
      .click();

    cy.waitForNetworkIdle(500);
    clickWorkflow();

    editChannel('inApp');

    cy.getByTestId('template-container').first().find('input').should('have.length', 1);

    cy.getByTestId('remove-button-icon').click();

    cy.getByTestId('submit-btn').click();
    cy.waitForNetworkIdle(500);

    goBack();

    editChannel('inApp');

    cy.getByTestId('control-add').first();
  });
});
