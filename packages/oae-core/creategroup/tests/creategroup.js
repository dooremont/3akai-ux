/*!
 * Copyright 2014 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

casper.test.begin('Widget - Create group', function(test) {

    /**
     * Open the create group modal with assertions
     */
    var openCreateGroup = function() {
        // Wait till the widget loading mechanisme is ready
        // Do this by waiting till a template has been rendered
        casper.waitForSelector('#me-clip-container .oae-clip', function() {
            casper.waitForSelector('.oae-clip-secondary .oae-clip-content > button', function() {
                casper.click('.oae-clip-secondary .oae-clip-content > button');
                test.assertExists('.oae-trigger-creategroup', 'Create group trigger exists');
                casper.click('.oae-trigger-creategroup');
                casper.waitUntilVisible('#creategroup-modal', function() {
                    test.assertVisible('#creategroup-modal', 'Create group pane is showing after trigger');
                    casper.click('.oae-clip-secondary .oae-clip-content > button');
                });
            });
        });
    };

    /**
     * Goes through the workflow of creating a group
     */
    var verifyCreateGroup = function() {
        casper.waitForSelector('form#creategroup-form', function() {
            // Verify the form is present
            test.assertExists('form#creategroup-form', 'The create group form is present');
            test.assertExists('#creategroup-name', 'The group name field is present');
            // Fill the form
            casper.fill('form#creategroup-form', {
                'creategroup-name': 'CasperJS test group'
            }, false);

            // Verify the 'create group' button is present
            test.assertExists('form#creategroup-form button[type="submit"]', 'The \'Create group\' button is present');
            // Click the submit button
            casper.click('form#creategroup-form button[type="submit"]');
            // Wait for a second and verify that the user was redirected to the group
            casper.waitForSelector('#group-clip-container h1', function() {
                test.assertVisible('#group-clip-container', 'Group profile is shown after creation of the group');
                test.assertSelectorHasText('#group-clip-container h1', 'CasperJS test group', 'Title matches \'CasperJS test group\'');
            });
        });
    };

    /**
     * Verify the form validation by checking the following:
     *     - Try submitting a form without putting in a title
     */
    var verifyCreateGroupValidation = function() {
        casper.waitForSelector('form#creategroup-form', function() {
            // Fill the form
            casper.fill('form#creategroup-form', {
                'creategroup-name': ''
            }, false);
            // Click the submit button
            casper.click('form#creategroup-form button[type="submit"]');
            // Verify that an error label is shown
            test.assertExists('#creategroup-name-error', 'Create group form successfully validated empty form');
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test creategroup with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);
            uiUtil.openMe();

            // Open the creategroup modal
            casper.then(function() {
                casper.echo('# Verify open create group modal', 'INFO');
                openCreateGroup();
            });

            // Create a group
            casper.then(function() {
                casper.echo('# Verify create group', 'INFO');
                verifyCreateGroup();
            });

            uiUtil.openMe();

            // Verify the group form validation
            casper.then(function() {
                casper.echo('# Verify create group validation', 'INFO');
                casper.then(openCreateGroup);
                casper.then(verifyCreateGroupValidation);
            });

            // Log out at the end of the test
            userUtil.doLogOut();
        });
    });

    casper.run(function() {
        test.done();
    });
});
