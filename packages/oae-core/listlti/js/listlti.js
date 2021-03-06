/*!
 * Copyright 2017 Apereo Foundation (AF) Licensed under the
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

    return function(uid, showSettings, widgetData) {
        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will be used to keep track of the current infinite scroll instance
        var infinityScroll = false;

        // Variable that will be used to keep track of the current group ID
        var groupId = null;

        /**
         * Initialize a new infinite scroll container that fetches the LTI tools for the current group
         */
        var getLtiTools = function() {

            // Disable the previous infinite scroll
            if (infinityScroll) {
                infinityScroll.kill();
            }

            var url = '/api/lti/' + groupId;

            var initialContent = null;
            if (widgetData.canManage) {
                initialContent = oae.api.util.template().render($('#listlti-list-actions-template', $rootel));
            }

            // Set up the infinite scroll instance
            infinityScroll = $('.oae-list', $rootel).infiniteScroll(url, {}, '#listlti-template', {
                'initialContent': initialContent,
                'postProcessor': function(data) {
                    data.displayOptions = {
                        'showCheckbox': widgetData.canManage ? true : false,
                        'addVisibilityIcon': false
                    };
                    return data;
                },
                'emptyListProcessor': function() {
                    oae.api.util.template().render($('#listlti-noresults-template', $rootel), null, $('.oae-list', $rootel));
                }
            });
        };

        /**
         * Set up the list header macro with its actions. If the current user can manage the group, they
         * have the option to add a new LTI tool or to delete an existing tool
         */
        var setUpListHeader = function() {
            groupId = widgetData.groupId;

            var listHeaderActions = [];
            if (widgetData.canManage) {
                listHeaderActions.push({
                    'icon': 'fa-trash-o',
                    'label': oae.api.i18n.translate('__MSG__DELETE_LTI_TOOLS__'),
                    'trigger': 'oae-trigger-deletelti'
                });
            }

            oae.api.util.template().render($('#listlti-list-header-template', $rootel), {'actions': listHeaderActions}, $('#listlti-list-header', $rootel));
        };

        /**
         * Add the different event bindings
         */
        var addBinding = function() {
            // Listen to the event that indicates that a new tool has been added.
            // In that case, we reload the list of LTI tools.
            $(window).on('done.addlti.oae', getLtiTools);

            // Listen to the event that indicates that a LTI tool has been deleted
            $(window).on('oae.deletelti.done', getLtiTools);
        };

        addBinding();
        setUpListHeader();
        getLtiTools();
    };
});
