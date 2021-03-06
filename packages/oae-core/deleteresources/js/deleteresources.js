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

define(['jquery', 'oae.core'], function ($, oae) {

    return function (uid) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will keep track of the resourceType of the resource(s) being deleted (i.e. `content`, `folder`, `discussion`, `meeting-jitsi`)
        var resourceType = null;

        // Variable that will keep track of the current page context
        var contextProfile = null;

        // Variable that will keep track of the resources to delete
        var selectedResources = [];

        // Variable that will keep track of all the resources that the current user manages
        var selectedResourcesManage = [];

        // Variable that will keep track of all the resources that the current user doesn't manage
        var selectedResourcesMember = [];


        ///////////////
        // UTILITIES //
        ///////////////

        /**
         * Reset the state of the widget when the modal dialog has been closed
         */
        var setUpReset = function() {
            $('#deleteresources-modal').on('hidden.bs.modal', function(ev) {
                // Reset the selected resources
                selectedResources = [];
                selectedResourcesManage = [];
                selectedResourcesMember = [];

                // Reset the progress bar
                updateProgress(0);

                // Show the first step
                $('#deleteresources-overview-container', $rootel).hide();
                $('#deleteresources-progress-container', $rootel).show();

                // Reset the modal title
                $('#deleteresources-modal-title', $rootel).empty();
            });
        };

        /**
         * Update the progress indicator
         *
         * @param  {Number}   progress   Number between 0 and 100 indicating progress
         */
        var updateProgress = function(progress) {
            $('.progress-bar', $rootel).css('width', progress + '%').attr('aria-valuenow', progress);
            $('.progress-bar .sr-only', $rootel).text(progress + '%');
        };

        /**
         * Set the title of the modal
         *
         * @param  {String}     view     The view for which a title should be shown. The accepted values are `gathering`, `overview` and `deleting`
         */
        var setModalTitle = function(view) {
            oae.api.util.template().render($('#deleteresources-modal-title-template', $rootel), {
                'count': selectedResources.length,
                'resourceType': resourceType,
                'resourceSubType': selectedResources[0].resourceSubType,
                'view': view
            }, $('#deleteresources-modal-title', $rootel));
        };


        //////////////////////
        // DELETE RESOURCES //
        //////////////////////

        /**
         * Delete the selected resources
         *
         * @param  {Boolean}        hardDeleteManage        Whether or not the resources the user can manage should be delete from the system. If false, these resources will only be removed from the current library
         */
        var deleteResources = function(hardDeleteManage) {
            setModalTitle('deleting');

            // Reset the progress bar
            updateProgress(0);

            $('#deleteresources-overview-container', $rootel).hide();
            $('#deleteresources-progress-container', $rootel).show();

            // Lock the modal dialog
            $('#deleteresources-modal', $rootel).modal('lock');

            // Keep track of how many resource profiles need to be deleted in total
            var count = selectedResourcesManage.length + selectedResourcesMember.length;
            // Keep track of how many resources have already been removed for the progress indicator
            var done = 0;
            // Keep track of how many resources could not be deleted
            var errCount = 0;

            var deletedResource = function(err) {
                if (err) {
                    errCount++;
                }

                done++;
                updateProgress((done / count) * 100);

                if (selectedResourcesMember.length !== 0) {
                deleteResourceFromLibrary(selectedResourcesMember.pop(), deletedResource);
                } else if (selectedResourcesManage.length !== 0) {
                    if (hardDeleteManage) {
                        deleteResourceFromSystem(selectedResourcesManage.pop(), deletedResource);
                    } else {
                        deleteResourceFromLibrary(selectedResourcesManage.pop(), deletedResource);
                    }
                } else {
                    finishDeleteResource(count, errCount);
                }
            };

            // Sequentially delete all resources
            if (selectedResourcesMember.length !== 0) {
                deleteResourceFromLibrary(selectedResourcesMember.pop(), deletedResource);
            } else if (selectedResourcesManage.length !== 0) {
                if (hardDeleteManage) {
                    deleteResourceFromSystem(selectedResourcesManage.pop(), deletedResource);
                } else {
                    deleteResourceFromLibrary(selectedResourcesManage.pop(), deletedResource);
                }
            }
        };

        /**
         * Delete a resource from the system
         *
         * @param  {Object}     resource            The resource that needs to be deleted from the system
         * @param  {Function}   callback            A standard callback method
         * @param  {Object}     callback.err        An error object, if any
         */
        var deleteResourceFromSystem = function(resource, callback) {
            if (resource.resourceType === 'content') {
                oae.api.content.deleteContent(resource.id, callback);
            } else if (resource.resourceType === 'folder') {
                oae.api.folder.deleteFolder(resource.id, false, callback);
            } else if (resource.resourceType === 'discussion') {
                oae.api.discussion.deleteDiscussion(resource.id, callback);
            } else if (resource.resourceType === 'meeting-jitsi') {
                oae.api.meetingJitsi.deleteMeeting(resource.id, callback);
            }
        };

        /**
         * Delete a resource from the current library only
         *
         * @param  {Object}     resource            The resource that needs to be deleted from the current library
         * @param  {Function}   callback            A standard callback method
         * @param  {Object}     callback.err        An error object, if any
         */
        var deleteResourceFromLibrary = function(resource, callback) {
            if (contextProfile.resourceType === 'folder') {
                oae.api.folder.deleteContentFromFolder(contextProfile.id, resource.id, callback);
            } else if (resource.resourceType === 'content') {
                oae.api.content.deleteContentFromLibrary(contextProfile.id, resource.id, callback);
            } else if (resource.resourceType === 'folder') {
                oae.api.folder.deleteFolderFromLibrary(contextProfile.id, resource.id, callback);
            } else if (resource.resourceType === 'discussion') {
                oae.api.discussion.deleteDiscussionFromLibrary(contextProfile.id, resource.id, callback);
            } else if (resource.resourceType === 'meeting-jitsi') {
                oae.api.meetingJitsi.deleteMeetingFromLibrary(contextProfile.id, resource.id, callback);
            }
        };

        /**
         * Finish the delete resource process by showing an appropriate notification, hiding the modal and
         * sending out the event that will update the library list
         *
         * @param  {Number}         count           The total number of resources that was selected for deletion
         * @param  {Number}         errCount        The number of resources that couldn't be deleted
         */
        var finishDeleteResource = function(count, errCount) {
            var data = {
                'count': count,
                'errCount': errCount,
                'resourceType': resourceType,
                'resourceSubType': selectedResources[0].resourceSubType
            };

            var notificationTitle = oae.api.util.template().render($('#deleteresources-notification-title-template', $rootel), data);
            var notificationBody = oae.api.util.template().render($('#deleteresources-notification-body-template', $rootel), data);
            oae.api.util.notification(notificationTitle, notificationBody, errCount ? 'error' : 'success');

            // Unlock the modal dialog
            $('#deleteresources-modal', $rootel).modal('unlock');

            // Refresh the resources list
            $(document).trigger('oae.deleteresources.done');

            // Deselect all list items and disable list option buttons
            $(document).trigger('oae.list.deselectall');

            $('#deleteresources-modal', $rootel).modal('hide');
        };


        //////////////
        // OVERVIEW //
        //////////////

        /**
         * Depending on whether or not the current user has manage rights on some of the selected resources,
         * a different view will be shown:
         *
         *  - The current user is a viewer of all the resources. In this case, the user will see a single
         *    overview where the resources can only be removed from the current library
         *  - The current user is a manager of all the resources. In this case, the user will see a single
         *    overview where the resources can either be removed from the current library or from the entire system.
         *  - The current user can manage some of the items. In this case, the user will see a 2-step process where
         *    the first step shows the items the user doesn't manage and will allow for removal from the current library
         *    only. The second step will show the item the user does manage and will allow for the resources to be removed
         *    from the current library or the entire system.
         */
        var showOverview = function() {
            setModalTitle('overview');

            $('#deleteresources-progress-container', $rootel).hide();
            $('#deleteresources-overview-container', $rootel).show();

            // Render the view for the resources the current user doesn't manage
            showResourcesMember();
        };

        /**
         * Render the list of resources to be removed, as well as the action buttons
         *
         * @param  {Object[]}       resources       The array of resources that should be rendered
         * @param  {Boolean}        canManage       Whether or not the user can manage the provided resources
         */
        var renderOverview = function(resources, canManage) {
            oae.api.util.template().render($('#deleteresources-overview-template', $rootel), {
                'contextProfile': contextProfile,
                'canManage': canManage,
                'hasManageAndMember': (selectedResourcesManage.length > 0 && selectedResourcesMember.length > 0),
                'resources': resources,
                'resourceType': resourceType
            }, $('#deleteresources-overview-container', $rootel));
        };

        /**
         * Show the view for all of the resource the user can't manage, if any. This will
         * provide the user with the option to remove these items from the current library only
         */
        var showResourcesMember = function() {
            // If there are no resources the user doesn't manage, we can
            // just jump to the manage view
            if (selectedResourcesMember.length === 0) {
                return showResourcesManage();
            }

            // Render the list of resources the user doesn't manage
            renderOverview(selectedResourcesMember, false);
        };

        /**
         * Show the view for all of the resource the user manages, if any. This will
         * provide the user with the option to remove these items from the current library only
         * or from the entire system
         */
        var showResourcesManage = function() {
            // If there are no resources the user manages, we can start deleting
            if (selectedResourcesManage.length === 0) {
                return deleteResources(null);
            }

            // Render the list of resources the user manages
            renderOverview(selectedResourcesManage, true);
        };


        ///////////////////////////
        // GATHER SELECTED ITEMS //
        ///////////////////////////

        /**
         * Gather the profiles of the items that should be removed, in order to determine which ones the
         * user can delete from the library only (i.e. member) and which ones the user can delete from
         * the system as well (i.e. manager)
         */
        var gatherResourceProfiles = function() {
            setModalTitle('gathering');

            // Keep track of how many resource profiles have already been gathered
            var done = 0;
            var todo = selectedResources.length;

            // Depending on the resource type that is being deleted, different API functions
            // need to be used to get the resource profile
            var resourceProfileFunction = null;
            if (resourceType === 'content') {
                resourceProfileFunction =  oae.api.content.getContent;
            } else if (resourceType === 'folder') {
                resourceProfileFunction = oae.api.folder.getFolder;
            } else if (resourceType === 'discussion') {
                resourceProfileFunction = oae.api.discussion.getDiscussion;
            } else if (resourceType === 'meeting-jitsi') {
                resourceProfileFunction = oae.api.meetingJitsi.getMeeting;
            }

            var getResourceProfile = function() {
                resourceProfileFunction(selectedResources[done].id, function(err, resourceProfile) {
                    if (err) {
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__GATHERING_FAILED__', 'deleteresources'),
                            oae.api.i18n.translate('__MSG__GATHERING_FAILED_DESCRIPTION__', 'deleteresources'),
                            'error');
                    } else {
                        // Cache the resource profile
                        // TODO: Remove one of the options below once the `manage` property is the same for all entity types
                        if (resourceProfile.isManager || resourceProfile.canManage) {
                            selectedResourcesManage.push(resourceProfile);
                        } else {
                            selectedResourcesMember.push(resourceProfile);
                        }
                        done++;
                        // Update the progress bar
                        updateProgress((done / todo) * 100);
                        if (done === todo) {
                            // All resource profiles have been retrieved, show the overview list
                            showOverview();
                        } else {
                            getResourceProfile();
                        }
                    }
                });
            };

            getResourceProfile();
        };


        ////////////////////
        // INITIALIZATION //
        ////////////////////

        /**
         * Initialize the delete resources modal dialog
         */
        var setUpDeleteResourcesModal = function() {
            $(document).on('click', '.oae-trigger-deleteresources', function() {
                $('#deleteresources-modal', $rootel).modal({
                    'backdrop': 'static'
                });

                // The resourceType data attribute should be available on all delete resources triggers and
                // will tell us what type of resource is being deleted (i.e., `content`, `folder`, `discussion`, `meeting-jitsi`)
                resourceType = $(this).attr('data-resourceType');
                // Get the page context
                $(document).trigger('oae.context.get', 'deleteresources');
            });

            // Listen to the event that returns the current page context
            $(document).on('oae.context.send.deleteresources', function(ev, context) {
                contextProfile = context;
                // Get the list selection
                $(document).trigger('oae.list.getSelection', 'deleteresources');
            });

            // Listen to the event that returns the list of selected resources
            $(document).on('oae.list.sendSelection.deleteresources', function(ev, selected) {
                selectedResources = selected.results;
                // Gather the profiles for all selected items
                gatherResourceProfiles();
            });

            // Show the list of resources the user manages when he has finished the list of resource he can't manage
            $rootel.on('click', '#deleteresources-view-delete-library', showResourcesManage);

            // Start deleting resources when the user has worked through both the manage and the viewer screens
            $rootel.on('click', '#deleteresources-manage-delete-library', function() {
                deleteResources(false);
            });
            $rootel.on('click', '#deleteresources-manage-delete-system', function() {
                deleteResources(true);
            });
        };

        setUpReset();
        setUpDeleteResourcesModal();

    };
});
