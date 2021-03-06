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

    return function(uid) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will keep track of the element that triggered the clickover
        var $trigger = null;

        // Variable that will keep track of the current page context
        var contextProfile = null;

        // Variables that will keep track of the resourceType of the resource(s) being shared (i.e. `content`, `folder`, `discussion`)
        var resourceType = null;

        // Variable that will keep track of the resources to share. For each resource, the `id` and `resourceSubType` will be stored
        var selectedResources = null;

        /**
         * Share the selected resources with the selected users and groups. When the sharing has completed,
         * the clickover will close.
         */
        var setUpShare = function() {
            $rootel.on('submit', '#share-form', function() {
                // Disable the form
                $('#share-form *', $rootel).prop('disabled', true);

                // Extract the resource ids and principal ids
                var resources = _.pluck(selectedResources, 'id');
                var targetIds = _.map(oae.api.util.autoSuggest().getSelection($rootel), function(target) {
                    // If the target user was found with an email query, we can pair their user id
                    // with the email to bypass interaction checks
                    if (oae.api.util.validation().isValidEmail(target.query)) {
                        return target.query + ':' + target.id;
                    } else {
                        return target.id;
                    }
                });

                // A different API function needs to be used, depending on whether we're sharing a
                // content item, folder or discussion
                var shareFunction = null;
                if (resourceType === 'content') {
                    shareFunction = oae.api.content.shareContent;
                } else if (resourceType === 'folder') {
                    shareFunction = oae.api.folder.shareFolder;
                } else if (resourceType === 'discussion') {
                    shareFunction = oae.api.discussion.shareDiscussion;
                }

                var done = 0;
                var share = function() {
                    shareFunction(resources[done], targetIds, function(err) {
                        done++;
                        if (done === resources.length) {
                            /*!
                             * TODO: The share action will return an error every time all of the selected
                             * principals have the content/discussion already in their library. Because this
                             * isn't actually a failure and there are many permutations, we need to come up
                             * with a good way of tracking the successes/errors. Currently, we only show an
                             * error message when the current user is not allowed to share.
                             */
                            var data = {
                                'count': resources.length,
                                'err': err && err.code === 401,
                                'mylibrary': _.contains(targetIds, oae.data.me.id),
                                'resourceType': resourceType,
                                'resourceSubType': selectedResources[0].resourceSubType
                            };

                            var notificationTitle = oae.api.util.template().render($('#share-notification-title-template', $rootel), data);
                            var notificationBody = oae.api.util.template().render($('#share-notification-body-template', $rootel), data);
                            oae.api.util.notification(notificationTitle, notificationBody, data.err ? 'error': 'success');

                            // Deselect all list items and disable list option buttons
                            $(document).trigger('oae.list.deselectall');

                            // Close the modal
                            $('#share-modal', $rootel).modal('hide');
                        } else {
                            share();
                        }
                    });
                };
                share();

                // Return false to prevent the default browser behavior
                return false;
            });
        };

        /**
         * Reset the widget to its original state when the modal dialog is opened and closed.
         * Ideally this would only be necessary when the modal is hidden, but IE10+ fires `input`
         * events while Bootstrap is rendering the modal, and those events can "undo" parts of the
         * reset. Hooking into the `shown` event provides the chance to compensate.
         */
        var setUpReset = function() {
            $('#share-modal', $rootel).on('shown.bs.modal hidden.bs.modal', function (evt) {
                // Enable the form
                $('#share-form *', $rootel).prop('disabled', false);
                $('#share-form button[type="submit"]', $rootel).prop('disabled', true);
            });
        };

        /**
         * Disable/enable the share button when an item has been added/removed from the autosuggest field
         */
        var autoSuggestChanged = function() {
            $('#share-save', $rootel).prop('disabled', oae.api.util.autoSuggest().getSelection($rootel).length ? false : true);
        };

        /**
         * Initialize the autosuggest field used to select the people and groups to share with
         */
        var setUpAutoSuggest = function() {
            // Render the autosuggest field
            oae.api.util.template().render($('#share-template', $rootel), {
                'count': selectedResources.length,
                'resourceType': resourceType,
                'resourceSubType': selectedResources[0].resourceSubType
            }, $('#share-container', $rootel));

            // We offer `My Library` or `My Discssions` as a ghost item, unless the user is
            // looking at his personal content/discussion library
            var ghosts = [];
            if (!contextProfile || contextProfile.id !== oae.data.me.id) {
                // If a content item or folder is being shared, we add `My Library` as the ghost option
                if (resourceType === 'content' || resourceType === 'folder') {
                    ghosts.push({
                        'id': oae.data.me.id,
                        'displayName': oae.api.i18n.translate('__MSG__MY_LIBRARY__'),
                        'ghost': true
                    });
                // If a discussion is being shared, we add `My Discussions` as the ghost option
                } else if (resourceType === 'discussion') {
                    ghosts.push({
                        'id': oae.data.me.id,
                        'displayName': oae.api.i18n.translate('__MSG__MY_DISCUSSIONS__'),
                        'ghost': true
                    });
                }
            }

            // Initialize the autoSuggest field
            oae.api.util.autoSuggest().setup($('#share-autosuggest', $rootel), {
                'allowEmail': true,
                'ghosts': ghosts,
                'selectionChanged': autoSuggestChanged
            }, null, function() {
                // Focus on the autosuggest field once it has been set up
                oae.api.util.autoSuggest().focus($rootel);
            });
        };

        /**
         * Determine whether or not the share widget is triggered for an individual element or for
         * a number of selected items in a list. In case it has been triggered by an individual resource,
         * we expect to find a `data-id` attribute on the element, as well as a `data-resouceSubType`
         * attribute for the various content types. If the `data-id` attribute cannot be found, we assume
         * that the selected items from a list are being shared
         */
        var getContext = function() {
            // The resourceType data attribute should be available on all share triggers
            // and will tell us what type of resource is being shared (i.e., `content`, `folder`, `discussion`)
            resourceType = $trigger.attr('data-resourceType');
            // If an individual item is shared, we expect to find the data-id attribute
            if ($trigger.attr('data-id')) {
                selectedResources = [{
                    'id': $trigger.attr('data-id'),
                    'resourceSubType': $trigger.attr('data-resourceSubType')
                }];
                setUpAutoSuggest();
            // If the selected items in a list are being shared, we first request the current page context.
            // If the current page context is the current user's personal library, we don't offer 'My Library'
            // as a ghost item, otherwise we always do. After that, we request the selected items from the current list
            } else {
                // Get the page context
                $(document).on('oae.context.send.share', function(ev, data) {
                    contextProfile = data;

                    // Get the list selection
                    $(document).on('oae.list.sendSelection.share', function(ev, data) {
                        selectedResources = data.results;
                        setUpAutoSuggest();
                    });
                    $(document).trigger('oae.list.getSelection', 'share');
                });
                $(document).trigger('oae.context.get', 'share');
            }
        };

        /**
         * Initialize the share modal dialog
         */
        var setUpShareModal = function() {
            $(document).on('click', '.oae-trigger-share', function() {
                $trigger = $(this);
                $('#share-modal', $rootel).modal({
                    'backdrop': 'static'
                });
                getContext();
            });

            $('#share-modal', $rootel).on('shown.bs.modal', function() {
                // Set focus to the autosuggest field
                oae.api.util.autoSuggest().focus($rootel);
            });
        };

        setUpReset();
        setUpShare();
        setUpShareModal();

    };
});
