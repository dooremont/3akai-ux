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

casper.test.begin('Widget - Content library', function(test) {

    /**
     * Verify that the share widget can be triggered from within the list options
     */
    var verifyContentLibraryShare = function() {
        // Verify that the share button is disabled by default
        test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-share:disabled', 'The share button is disabled by default');
        // Select the first content item in the list
        casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
        // Verify that the share button is now enabled
        test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-share:not([disabled])', 'The share button is enabled after checking a content item');
        // Click the share button
        casper.click('#contentlibrary-widget .oae-list-header-actions .oae-trigger-share');
        // Verify that the share popover is shown
        casper.waitForSelector('#share-container', function() {
            test.assertExists('#share-container', 'The share popover can be triggered from within the list options');
            // Uncheck the first item from the list
            casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
            // Verify that the share button is disabled again
            test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-share:disabled', 'The share button is disabled again after unchecking all content items');
        });
    };

    /**
     * Verify that the deleteresources widget can be triggered from within the list options
     */
    var verifyContentLibraryDelete = function() {
        casper.waitForSelector('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]', function() {
            // Verify that delete button is disabled by default
            test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-deleteresources:disabled', 'The delete button is disabled by default');
            // Select the first content item in the list
            casper.waitForSelector('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]', function() {
                casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
                // Verify that the delete button is now enabled
                test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-deleteresources:not([disabled])', 'The delete button is enabled after checking a content item');
                // Click the delete button
                casper.click('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-deleteresources');
                // Verify that the deleteresources widget modal is shown
                casper.waitForSelector('#deleteresources-modal', function() {
                    test.assertExists('#deleteresources-modal', 'The deleteresources modal can be triggered from within the list options');
                    // Close the modal
                    casper.click('#deleteresources-modal .close');
                    // Uncheck the first item from the list
                    casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
                    // Verify that the delete button is disabled again
                    test.assertExists('#contentlibrary-widget .oae-list-header-actions button.oae-trigger-deleteresources:disabled', 'The delete button is disabled again after unchecking all content items');
                });
            });
        });
    };

    /**
     * Verify that the content library can be searched
     */
    var verifyContentLibrarySearch = function() {
        // Search for something that doesn't match any results
        casper.fill('form.form-search', {
            'search-query': '---'
        }, false);
        casper.click('form.form-search button[type="submit"]');
        // Verify that no results come back and a message is shown
        casper.waitForSelector('#contentlibrary-widget .oae-list .alert-info', function() {
            test.assertExists('#contentlibrary-widget .oae-list .alert-info', 'No results are returned for non-matching search and a message is shown');
            // Search for 'baloons' which should return 1 result
            casper.fill('form.form-search', {
                'search-query': 'balloons'
            }, false);
            casper.click('form.form-search button[type="submit"]');
            // Verify one search result comes back
            casper.waitForSelector('#contentlibrary-widget .oae-list li', function() {
                test.assertExists('#contentlibrary-widget .oae-list li', '1 result is returned for \'balloons\'');
                test.assertSelectorHasText('#contentlibrary-widget .oae-list li .oae-tile-metadata a', 'balloons.jpg', 'The returned file has the title \'balloons.jpg\'');
                // Reset the form
                casper.fill('form.form-search', {
                    'search-query': ''
                }, false);
                casper.click('form.form-search button[type="submit"]');
            });
        });
    };

    /**
     * Verify that the view mode can be changed through the list options
     */
    var verifyContentLibraryViewMode = function() {
        // Toggle the list options
        casper.click('.oae-list-header-toggle');
        // Verify compact list
        casper.click('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-compact"]');
        test.assertExists('.oae-list.oae-list-compact', 'Content library can be switched to compact view');
        // Verify details list
        casper.click('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-details"]');
        test.assertExists('.oae-list.oae-list-details', 'Content library can be switched to details view');
        // Switch back to grid view
        casper.click('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-grid"]');
        test.assertExists('.oae-list.oae-list-grid', 'Content library can be switched to grid view');
    };

    /**
     * Verify if all elements are present in the content library
     */
    var verifyContentLibraryElements = function() {
        // Verify there is a dummy list item with action buttons
        test.assertExists('#contentlibrary-widget .oae-list li:first-child', 'Initial dummy list item is present');
        // Verify dummy list item has upload button
        test.assertExists('#contentlibrary-widget .oae-list li:first-child .oae-trigger-upload', 'The first list item has a \'upload\' trigger');
        // Verify upload button triggers upload widget
        casper.click('#contentlibrary-widget .oae-list li:first-child .oae-trigger-upload');
        casper.waitForSelector('#upload-modal', function() {
            test.assertExists('#upload-modal #upload-modal-title', 'The upload widget can be triggered from the dummy list item');
            casper.click('#upload-modal .close');
        });
        // Verify dummy list item has new document button
        test.assertExists('#contentlibrary-widget .oae-list li:first-child .oae-trigger-createcollabdoc', 'The first list item has a \'New document\' trigger');
        // Verify new document button triggers the createcollabdoc widget
        casper.click('#contentlibrary-widget .oae-list li:first-child .oae-trigger-createcollabdoc');
        casper.waitForSelector('#createcollabdoc-modal', function() {
            test.assertExists('#createcollabdoc-modal #createcollabdoc-modal-title', 'The createcollabdoc widget can be triggered from the dummy list item');
            casper.click('#createcollabdoc-modal .close');
        });
        // Verify list options are there
        test.assertExists('#contentlibrary-widget .oae-list-header-actions', 'The list options are present');
        // Verify list options contain a checkbox that selects all
        test.assertExists('#contentlibrary-widget .oae-list-header-actions input[type="checkbox"]', 'The \'Select all\' checkbox is present in the list options');
        // Verify list options contain a share button
        test.assertExists('#contentlibrary-widget .oae-list-header-actions .oae-trigger-share', 'The share button is present in the list options');
        // Verify list options contain a delete button
        test.assertExists('#contentlibrary-widget .oae-list-header-actions .oae-trigger-deleteresources', 'The delete button is present in the list options');
        // Verify list options contain a switch view button
        test.assertExists('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-compact"]', 'The \'Compact\' list view button is present');
        test.assertExists('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-details"]', 'The \'Details\' list view button is present');
        test.assertExists('#contentlibrary-widget .oae-list-header-actions button[data-type="oae-list-grid"]', 'The \'Grid\' list view button is present');
        // Verify list options contain a search field
        test.assertExists('#contentlibrary-widget .oae-list-header-search .oae-list-header-search-query', 'The search box is present');
    };

    /**
     * Verify that the content library updates after a file has been uploaded
     */
    var verifyContentLibraryUpdatesAfterUpload = function() {
        casper.waitForSelector('#contentlibrary-widget .oae-list li:first-child .oae-trigger-upload', function() {
            // Trigger the upload widget
            casper.click('#contentlibrary-widget .oae-list li:first-child .oae-trigger-upload');
            casper.waitForSelector('#upload-dropzone form', function() {
                // TODO: This wait needs to be replaced once widgets have 'ready' events
                casper.wait(configUtil.modalWaitTime, function() {
                    // Select a file to upload
                    casper.fill('#upload-dropzone form', {
                        'file': 'tests/casperjs/data/balloons.jpg'
                    }, false);

                    // Upload the file
                    casper.click('button#upload-upload');

                    // Verify that the file has been uploaded by going to the content profile provided in the notification
                    casper.waitForSelector('#oae-notification-container .alert', function() {
                        test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'File successfully uploaded');
                    });

                    // Verify that the file has been added to the content library list
                    casper.waitForSelector('li.oae-list-actions + li', function() {
                        test.assertExists('li.oae-list-actions + li', 'The content library refreshes after file upload');
                        test.assertSelectorHasText('li.oae-list-actions + li .oae-tile-metadata a', 'balloons.jpg', 'The uploaded file shows up in the list correctly');
                    });
                });
            });
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            uiUtil.openMyLibrary();

            casper.then(function() {
                casper.echo('# Verify content library updates after upload', 'INFO');
                verifyContentLibraryUpdatesAfterUpload();
            });

            casper.then(function() {
                casper.echo('# Verify content library elements present', 'INFO');
                verifyContentLibraryElements();
            });

            casper.then(function() {
                casper.echo('# Verify content library view modes', 'INFO');
                verifyContentLibraryViewMode();
            });

            casper.then(function() {
                casper.echo('# Verify content library delete', 'INFO');
                verifyContentLibraryDelete();
            });

            casper.then(function() {
                casper.echo('# Verify content library share', 'INFO');
                verifyContentLibraryShare();
            });

            casper.then(function() {
                casper.echo('# Verify content library search', 'INFO');
                casper.wait(configUtil.searchWaitTime, function() {
                    verifyContentLibrarySearch();
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
