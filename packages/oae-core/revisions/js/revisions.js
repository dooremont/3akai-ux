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

define(['jquery', 'oae.core'], function($, oae) {

    return function(uid, showSettings) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will be used to keep track of the current infinite scroll instance
        var infinityScroll = false;

        // Caches the content profile data
        var contentProfile = null;

        // Variable that keeps track of whether or not the first set of results has been retrieved
        var initialListLoaded = false;

        // Caches the etherpadHtml for the different revisions of an etherpad collaborative document
        var etherpadHtml = {};

        /**
         * Returns the clicked revision data object
         *
         * @return {Object}    The revision data object of the list item that was clicked
         */
        var getClickedRevision = function(ev, callback) {
            var $listItem = $(ev.target);
            if (!$listItem.hasClass('well')) {
                $listItem = $($(ev.target).parents('li'));
            }

            var revisionId = $listItem.attr('data-revisionid');

            var result = {
                'mediumUrl': $listItem.attr('data-mediumurl'),
                'resourceType': contentProfile.resourceType,
                'resourceSubType': contentProfile.resourceSubType,
                'revisionId': revisionId
            };

            // In case we're dealing with an etherpad collaborative document, we need to fetch the content
            // associated to the current revision
            if (contentProfile.resourceSubType === 'collabdoc') {
                // If the ehterpad HTML has already been retrieved return the result in the callback,
                // otherwise fetch the revision and return the result in the callback.
                if (etherpadHtml[revisionId]) {
                    result.etherpadHtml = etherpadHtml[revisionId];
                    callback(result);
                } else {
                    oae.api.content.getRevision(contentProfile.id, revisionId, function(err, revision) {
                        etherpadHtml[revisionId] = revision.etherpadHtml;
                        result.etherpadHtml = revision.etherpadHtml;
                        callback(result);
                    });
                }
            } else {
                callback(result);
            }
        };

        /**
         * Renders a preview of the selected revision list item
         *
         * @param  {Object}    ev    Click event object
         */
        var renderPreview = function(ev) {
            // Add the selected class to the list item
            $('.oae-list li', $rootel).removeClass('selected');
            $(ev.currentTarget).addClass('selected');

            getClickedRevision(ev, function(clickedRevision) {
                var $template = $('#revisions-preview-template', $rootel);
                var data = {
                    'revision': clickedRevision,
                    'displayOptions': {
                        'addVisibilityIcon': false,
                        'size': 'large',
                        'addLink': false
                    }
                };

                // Render the preview for the selected revision into both the large and small preview containers
                oae.api.util.template().render($template, data, $('#revisions-preview-large', $rootel));
                oae.api.util.template().render($template, data, $('.revisions-list-preview', $(ev.currentTarget)));
            });
        };

        /**
         * Restore a revision
         *
         * @param  {Object}    ev    Click event object
         */
        var restoreRevision = function(ev) {
            // Caches the revision data object that needs to be restored
            getClickedRevision(ev, function(clickedRevision) {
                // Restore the revision of the content
                oae.api.content.restoreRevision(contentProfile.id, clickedRevision.revisionId, function(err, data) {
                    if (!err) {
                        // Hide the modal
                        $('#revisions-modal', $rootel).modal('hide');

                        // Show a success notification
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__REVISION_RESTORED__', 'revisions'),
                            oae.api.i18n.translate('__MSG__REVISION_RESTORE_SUCCESS__', 'revisions')
                        );

                        // Fetch the updated content profile
                        oae.api.content.getContent(contentProfile.id, function(err, updatedContentProfile) {
                            // Refresh the content profile
                            $(document).trigger('oae.revisions.done', [data, updatedContentProfile]);
                        });
                    } else {
                        // Show a failure notification
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__REVISION_NOT_RESTORED__', 'revisions'),
                            oae.api.i18n.translate('__MSG__REVISION_RESTORE_FAIL__', 'revisions'),
                            'error'
                        );
                    }
                });
            });
        };

        /**
         * Initialize a new infinite scroll container that fetches the revisions of a content item.
         */
        var getRevisions = function() {
            // Disable the previous infinite scroll
            if (infinityScroll) {
                infinityScroll.kill();
            }

            initialListLoaded = false;

            var url = '/api/content/' + contentProfile.id + '/revisions';

            // Set up the infinite scroll for the revisions list
            infinityScroll = $('.oae-list', $rootel).infiniteScroll(url, {
                'limit': 8
            }, '#revisions-list-template', {
                'postProcessor': function(data) {
                    data.resourceSubType = contentProfile.resourceSubType;
                    return data;
                },
                'postRenderer': function() {
                    // Set focus on the first item if this is the first set of results
                    // that is being loaded
                    if (!initialListLoaded) {
                        initialListLoaded = true;
                        $('.oae-list li:first-child', $rootel).focus();
                    }
                },
                'scrollContainer': $('#revisions-list-container', $rootel)
            });
        };

        /**
         * Handles keyboard input on list items
         *
         * @param  {Object}    ev    The list item focus event object
         */
        var handleKeyboardNavigation = function(ev) {
            var $listItem = $(ev.currentTarget);
            // If the down arrow is hit go one revision down and preview it
            if (ev.which === 40) {
                ev.preventDefault();
                if ($listItem.next().length) {
                    $listItem.next().focus();
                }
            // If the up arrow is hit go one revision up and preview it
            } else if (ev.which === 38) {
                ev.preventDefault();
                if ($listItem.prev().length) {
                    $listItem.prev().focus();
                }
            }
        };

        /**
         * Initializes the revisions modal dialog
         */
        var setUpRevisionsModal = function() {
            // Catch the revision modal trigger
            $(document).on('click', '.oae-trigger-revisions', function() {
                $('#revisions-modal', $rootel).modal({
                    'backdrop': 'static'
                });
            });

            // Request the current page context when the modal is showing
            $('#revisions-modal', $rootel).on('shown.bs.modal', function () {
                $(document).trigger('oae.context.get', 'revisions');
            });

            // Catch the send context event, cache the content profile and retrieve the list revisions
            $(document).on('oae.context.send.revisions', function(ev, data) {
                contentProfile = data;
                getRevisions();
            });

            // Render a preview on focus of a list item
            $rootel.on('focus', '.oae-list li', renderPreview);

            // Handle keydown events on list items
            $rootel.on('keydown', '.oae-list li', handleKeyboardNavigation);

            // Restore a revision
            $rootel.on('click', '.revisions-list-actions-restore', restoreRevision);
        };

        setUpRevisionsModal();

    };
});
