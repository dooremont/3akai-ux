/*!
 * Copyright 2015 Apereo Foundation (AF) Licensed under the
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

        // Variable that will be used to keep track of the current infinite scroll instance
        var infinityScroll = null;

        /**
         * Initialize a new infinite scroll container that fetches the members
         *
         * @param  {Object}     contextProfile      Standard entity profile (with a `resourceType` and `id`) for which the members should be rendered from a standard members endpoint (/api/:resourceType/:id/members)
         */
        var getMembers = function(contextProfile) {
            // Disable the previous infinite scroll
            if (infinityScroll) {
                infinityScroll.kill();
            }

            // Change the endpoint based on the entity resource type
            var url = '/api/' + contextProfile.resourceType + '/' + contextProfile.id + '/members';

            // Set up the infinite scroll instance
            infinityScroll = $('.oae-list', $rootel).infiniteScroll(url, {
                'limit': 9
            }, '#sharedwith-template', {
                'scrollContainer': $('#sharedwith-container', $rootel),
                'postProcessor': function(data) {
                    // Map the member's profile directly to `data.results` to
                    // be able to pass it into the listItem macros
                    $.each(data.results, function(i, member) {
                        data.results[i] = _.extend(data.results[i].profile, data.results[i]);
                        delete data.results[i].profile;
                    });
                    data.displayOptions = {
                        'linkTarget': '_blank'
                    };
                    return data;
                }
            });
        };

        /**
         * Initialize the sharedwith modal dialog
         */
        var setUpSharedWith = function() {
            $(document).on('click', '.oae-trigger-sharedwith', function(ev, data) {
                // Request the context profile information
                $(document).trigger('oae.context.get', 'sharedwith');
            });

            // Receive the context's profile information and set up the sharedwith modal
            $(document).on('oae.context.send.sharedwith', function(ev, contextProfile) {
                // Render the members once the modal has loaded
                $('#sharedwith-modal').on('shown.bs.modal', function () {
                    getMembers(contextProfile);
                });

                // Show the sharedwith modal
                $('#sharedwith-modal', $rootel).modal();
            });
        };

        setUpSharedWith();

    };
});
