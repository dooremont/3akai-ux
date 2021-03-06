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

casper.test.begin('Widget - Terms and Conditions', function(test) {

    /**
     * Verify that markdown is rendered properly
     */
    var verifyMarkdownRendering = function() {
        casper.click('#footer-container button.oae-trigger-termsandconditions');
        casper.waitForSelector('#termsandconditions-modal .modal-body .well', function(){
            test.assertExists('#termsandconditions-modal .modal-body .well img[alt="OAE"]', 'Terms and conditions markdown renders properly');
        });
    };

    /**
     * Verify that the terms and conditions need to be accepted after changes were made to it
     *
     * @param  {User}      user           User profile object
     */
    var openTermsAfterChange = function(user) {
        casper.waitForSelector('#termsandconditions-modal .modal-body .well', function() {
            test.assertExists('#termsandconditions-modal .modal-body .alert.alert-info', 'The terms and conditions changed notification is present');
            test.assertExists('#termsandconditions-modal .modal-body .well', 'The terms and conditions are shown in the register modal');
            test.assertExists('#termsandconditions-modal .modal-footer form[action="/api/auth/logout"] button', 'The terms and conditions have a cancel button');
            test.assertExists('#termsandconditions-modal .modal-footer #termsandconditions-accept', 'The terms and conditions have an accept button');

            // Verify that not accepting logs the user out of the system
            casper.click('#termsandconditions-modal .modal-footer form[action="/api/auth/logout"] button');
            casper.waitForSelector('#topnavigation-signin', function() {
                test.assertExists('#topnavigation-signin', 'The user is logged out when choosing to not accept the terms and conditions');

                // Verify that accepting the terms and conditions allows the user to continue
                userUtil.doLogIn(user.username, user.password);
                uiUtil.openIndex();

                casper.waitForSelector('#termsandconditions-modal .modal-body .well', function() {
                    casper.click('#termsandconditions-modal .modal-footer #termsandconditions-accept');

                    // Refresh the page and verify the terms and conditions don't need to be accepted
                    casper.wait(configUtil.modalWaitTime, function() {
                        uiUtil.openIndex();
                        casper.then(function() {
                            casper.wait(configUtil.searchWaitTime, function() {
                                test.assertDoesntExist('#termsandconditions-modal.in', 'The user can continue using the system after accepting the changed terms and conditions');
                            });
                        });
                    });
                });
            });
        });
    };

    /*
     * Verify that the terms and conditions are shown in the register widget
     */
    var openTermsRegister = function() {
        casper.waitForSelector('#topnavigation-left > button.oae-trigger-register', function(){
            casper.click('#topnavigation-left > button.oae-trigger-register');
            casper.wait(configUtil.searchWaitTime, function() {
                test.assertExists('#register-modal input#register-accept-terms-and-conditions', 'The terms and conditions accepted checkbox is present');
                test.assertExists('#register-modal a#register-terms-and-conditions', 'The terms and conditions are accessible through the register widget');
                casper.click('#register-modal a#register-terms-and-conditions');
                casper.waitForSelector('#register-modal .modal-body .well', function() {
                    test.assertExists('#register-modal .modal-body .well', 'The terms and conditions are shown in the register modal');
                    test.assertExists('#register-modal .modal-footer #register-continue-signup', 'The terms and conditions have a back button');
                });
            });
        });
    };

    /**
     * Verify that the terms and conditions be opened from the footer
     */
    var openTermsFooter = function() {
        casper.waitForSelector('#footer-container button.oae-trigger-termsandconditions', function(){
            test.assertExists('#footer-container button.oae-trigger-termsandconditions', 'Terms and conditions trigger exists in the footer');
            casper.click('#footer-container button.oae-trigger-termsandconditions');
            // TODO: When widgets have an event that indicates it's done loading this wait needs to be replaced
            casper.wait(configUtil.searchWaitTime, function() {
                test.assertVisible('#termsandconditions-modal', 'The terms and conditions modal is shown after trigger');
                test.assertExists('#termsandconditions-modal .modal-body .well', 'The terms and conditions are shown in the modal');
                test.assertExists('#termsandconditions-modal .modal-footer button[data-dismiss="modal"]', 'The terms and conditions have a close button');
            });
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Make a user to test with
        userUtil.createUsers(1, function(user1) {
            // Verify that the terms and conditions modal can be opened
            casper.then(function() {
                casper.echo('# Verify terms and conditions modal', 'INFO');
                openTermsFooter();
            });

            // Verify the terms and conditions are shown in the register widget
            casper.then(function() {
                casper.echo('# Verify the terms and conditions are shown in the register widget', 'INFO');
                openTermsRegister();
            });

            // Verify markdown rendering
            casper.then(function() {
                casper.echo('# Verify markdown rendering', 'INFO');
                verifyMarkdownRendering();
            });

            // Verify the terms and conditions are shown after a change is made to them
            casper.then(function() {
                casper.echo('# Verify the terms and conditions are shown after a change is made to them', 'INFO');
                // Make a change to the terms and conditions
                uiUtil.openAdmin();
                userUtil.doLogIn(configUtil.adminUsername, configUtil.adminPassword);

                adminUtil.writeConfig(configUtil.tenantAlias, {
                    'oae-principals/termsAndConditions/text/default': '![OAE](/shared/oae/img/oae-logo.png) Changed terms and conditions'
                }, function() {
                    userUtil.doLogOut();
                });

                uiUtil.openIndex();
                userUtil.doLogIn(user1.username, user1.password);
                uiUtil.openIndex();

                casper.then(function() {
                    openTermsAfterChange(user1);
                });
            });

            // Log out at the end of the test
            userUtil.doLogOut();
        });
    });

    casper.run(function() {
        test.done();
    });
});
