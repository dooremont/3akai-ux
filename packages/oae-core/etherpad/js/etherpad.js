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

    // When this widget is loaded, the content profile object representing the collaborative document
    // that needs to be rendered will be passed in as the widgetData
    return function(uid, showSettings, contentObj) {

        // The widget container
        var $rootel = $('#' + uid);

        /**
         * When the current user is a manager of the collaborative document, we join the document. This
         * returns a URL that can be used to create the iFrame that will contain the Etherpad UI.
         */
        var showEditMode = function() {
            $.ajax({
                'url': '/api/content/' + contentObj.id + '/join',
                'type': 'POST',
                'success': function(data) {
                    // We construct an iFrame with the provided URL
                    oae.api.util.template().render($('#etherpad-template', $rootel), data, $('#etherpad-container', $rootel));
                },
                'error': function() {
                    oae.api.util.notification(
                        oae.api.i18n.translate('__MSG__CANNOT_EDIT__', 'etherpad'),
                        oae.api.i18n.translate('__MSG__CANNOT_EDIT_THIS_DOCUMENT__', 'etherpad'),
                        'error');
                }
            });
        };

        /**
         * When the current user is not a manager of the collaborative document, we show the document's
         * latest published content in view mode.
         */
        var showViewMode = function() {
            var etherpadHTML = contentObj.latestRevision.etherpadHtml || '';

            // The etherpad content is rendered in view mode. If the document is empty, a
            // default message will be shown
            oae.api.util.template().render($('#etherpad-view-mode-template', $rootel), {
                'etherpadHTML': etherpadHTML,
                'isBlank': oae.api.util.isBlank(etherpadHTML)
            }, $('#etherpad-container', $rootel));
        };

        /**
         * Remove the Etherpad iFrame from the DOM
         */
        var removeEtherpad = function() {
            $('#etherpad-editor', $rootel).remove();
        };

        /**
         * Set up the etherpad widget. Managers of the document will be shown the Etherpad UI (edit mode) and
         * viewers of the document will be shown the document's content in view mode.
         */
        var setUpEtherpad = function() {
            if (contentObj.isManager || contentObj.isEditor) {
                showEditMode();

                // The Etherpad iFrame is removed to avoid the 'Reconnecting Pad' message showing up.
                // Rather than hiding the iframe, we need to remove it from the DOM, as the back button
                // would otherwise break in IE10
                // @see https://github.com/oaeproject/3akai-ux/pull/2918
                $(window).on('beforeunload', removeEtherpad);
            } else {
                showViewMode();
            }
        };

        setUpEtherpad();

    };
});
