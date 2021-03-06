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

casper.test.begin('Widget - Delete comment', function(test) {

    /**
     * Add a comment to the currently visited content item profile
     *
     * @param  {Function}    callback    Standard callback function
     */
    var addComment = function(callback) {
        casper.waitForSelector('.comments-new-comment-form', function() {
            // Fill the form
            casper.fill('.comments-new-comment-form', {
                'comments-new-comment': 'New Test comment'
            }, true);
            // Wait for the comment to show up in the list before executing the callback
            casper.waitForSelector('.comments-level-0', function() {
                callback();
            });
        });
    };

    /**
     * Verify opening the delete comment modal with assertions
     */
    var openDeleteComment = function() {
        casper.waitForSelector('.comments-level-0 .media-body .oae-trigger-deletecomment', function() {
            test.assertExists('.comments-level-0 .media-body .oae-trigger-deletecomment', 'Verify the delete comment trigger is present');
            casper.click('.comments-level-0 .media-body .oae-trigger-deletecomment');
            casper.waitUntilVisible('#deletecomment-modal', function() {
                test.assertVisible('#deletecomment-modal', 'Delete comment pane is showing after trigger');
            });
        });
    };

    /**
     * Verify all delete comment elements are present
     */
    var verifyDeleteCommentElements = function() {
        // Verify headers
        test.assertExists('#deletecomment-modal .modal-header h3', 'Verify that the modal header is present');
        test.assertSelectorHasText('#deletecomment-modal .modal-header h3', 'Delete comment', 'Verify that the modal header has the correct title');
        test.assertExists('#deletecomment-modal .modal-body h4', 'Verify that the modal subheader is present');
        test.assertSelectorHasText('#deletecomment-modal .modal-body h4', 'Are you sure you want to delete this comment?', 'Verify that the modal subheader has the correct title');

        // Verify warning
        test.assertExists('#deletecomment-modal .modal-body .alert-danger', 'Verify that the warning message is present');
        test.assertSelectorHasText('#deletecomment-modal .modal-body .alert-danger', 'Caution: this action cannot be undone!', 'Verify that the warning message has the correct message');

        // Cancel and submit
        test.assertExists('#deletecomment-modal .modal-footer button[data-dismiss="modal"]', 'Verify that the cancel button is present');
        test.assertExists('#deletecomment-modal .modal-footer button#deletecomment-delete', 'Verify that the submit button is present');
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a user to test with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            contentUtil.createFile(null, null, null, null, null, null, function(err, contentProfile) {
                uiUtil.openContentProfile(contentProfile);

                // Place a comment
                casper.then(function() {
                    addComment(function() {
                        casper.then(function() {
                            casper.echo('# Verify open delete comment modal', 'INFO');
                            openDeleteComment();
                        });

                        casper.then(function() {
                            casper.echo('# Verify delete comment elements', 'INFO');
                            verifyDeleteCommentElements();
                        });

                        casper.then(function() {
                            casper.echo('# Verify deleting a comment', 'INFO');
                            casper.echo('@see comments tests for verifying delete comment functionality', 'PARAMETER');
                        });

                        // Log out the admin user
                        userUtil.doLogOut();
                    });
                });
            });
        });
    });

    casper.run(function() {
        test.done();
    });
});
