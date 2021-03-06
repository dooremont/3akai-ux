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

define(['jquery', 'oae.core', 'jquery.autosize'], function($, oae) {

    return function(uid, showSettings) {

        // Cache the widget container
        var $rootel = $('#' + uid);

        // Variable used to keep track of current context profile
        var contextProfile = null;

        // Variable used to keep track of the current infinite scroll
        var infinityScroll = null;

        /**
         * Show a notification when an error occurs
         *
         * @param  {Boolean}    [isReply]           Whether or not the failed comment was a reply
         */
        var showErrorNotification = function(isReply) {
            var notificationTitle = oae.api.util.template().render($('#comment-notification-title-template', $rootel), {'isReply': isReply});
            var notificationBody = oae.api.util.template().render($('#comment-notification-body-template', $rootel), {'isReply': isReply});
            oae.api.util.notification(notificationTitle, notificationBody, 'error');
        };

        /**
         * When a reply or comment is made, the comment is added into the comments list.
         *
         * @param  {Comment}    comment    The Comment object representing the comment/reply that has been made
         */
        var renderComment = function(comment) {
            // Top level comment
            if (!comment.replyTo) {
                // Insert the comment at the beginning of the list after the new comment box
                $('#comments-container li.media:first-child', $rootel).after(
                    oae.api.util.template().render($('#comments-comment-template', $rootel), {
                        'results': [comment],
                        'canManage': contextProfile.isManager
                    })
                );
                // Apply timeago to the reply timestamp
                oae.api.l10n.timeAgo($('#comments-container li:first-child + li', $rootel));
            // Reply on an existing comment
            } else {
                // Insert the reply after the comment it is a reply to
                $('li.media[data-id="' + comment.replyTo + '"]', $rootel).after(
                    oae.api.util.template().render($('#comments-comment-template', $rootel), {
                        'results': [comment],
                        'canManage': contextProfile.isManager
                    })
                );
                // Apply timeago to the reply timestamp
                oae.api.l10n.timeAgo($('li.media[data-id="' + comment.replyTo + '"] + li', $rootel));
            }
            setUpValidation();
        };

        /**
         * Set up the delete comment functionality. When a comment has no replies, it will be
         * removed from the list. When the comment does have replies, it is marked as deleted
         * without removing it from the list.
         *
         * @param  {Event}      ev         `oae.deletecomment.done` event
         * @param  {Comment}    data       The comment that was deleted
         */
        var deleteComment = function(ev, data) {
            // Replace the deleted comment with a dummy placeholder that indicates the comment
            // was soft-deleted
            if (data.softDeleted) {
                $('li.media[data-id="' + data.softDeleted.created + '"]', $rootel).replaceWith(
                    oae.api.util.template().render($('#comments-comment-template', $rootel), {
                        'results': [data.softDeleted],
                        'canManage': contextProfile.isManager
                    })
                );
            // Remove the deleted comment from the list if it had no replies
            } else {
                infinityScroll.removeItems(data.commentId);
            }
        };

        /**
         * Bind all functionality related to creating a new top-level comment.
         *
         * @param  {Object}    form    The form DOM element passed in by the validation plugin
         */
        var createComment = function(form) {
            var $form = $(form);

            // Disable the form controls
            $('button, textarea', $form).prop('disabled', true);

            // Post the comment and re-render the results
            var comment = $.trim($('textarea', $form).val());
            oae.api.comment.createComment(contextProfile.id, contextProfile.resourceType, comment, null, function(err, comment) {
                if (!err) {
                    renderComment(comment);
                    // Reset the form
                    $form[0].reset();
                    // Resize the textarea as it is now empty
                    $('textarea', $form).trigger('autosize.resize');
                } else {
                    showErrorNotification();
                }
                // Enable the form controls
                $('button, textarea', $form).prop('disabled', false);
            });
            // Return false to prevent the default browser behavior
            return false;
        };

        /**
         * Reply to a comment. This will also reset and hide the reply form.
         *
         * @param  {Object}    form    The form DOM element passed in by the validation plugin
         */
        var createReply = function(form) {
            var $form = $(form);

            // Disable the form controls
            $('button, textarea', $form).prop('disabled', true);

            // Post the comment and re-render the results
            var replyTo = $form.attr('data-replyTo');
            var comment = $.trim($form.find('textarea').val());
            oae.api.comment.createComment(contextProfile.id, contextProfile.resourceType, comment, replyTo, function(err, comment) {
                if (!err) {
                    renderComment(comment);
                    // Reset the form
                    $form[0].reset();
                    $form.parents('.comments-reply-container').hide();
                } else {
                    showErrorNotification(true);
                }
                // Enable the form controls
                $('button, textarea', $form).prop('disabled', false);
            });
            // Return false to prevent the default browser behavior
            return false;
        };

        /**
         * Set up the validation on the comment and reply forms. We only initialize validation on the forms that haven't
         * been initialized yet. As jQuery.validate sets `novalidate="novalidate"` once a form has been initialized for
         * validation, we use this to find the forms that haven't been initialized.
         */
        var setUpValidation = function() {
            oae.api.util.validation().validate($('.comments-new-comment-form[novalidate!="novalidate"]', $rootel), {
                'submitHandler': createComment
            });

            $('.comments-new-reply-form[novalidate!="novalidate"]', $rootel).each(function(i, form) {
                oae.api.util.validation().validate($(form), {
                    'submitHandler': createReply
                });
            });
        };

        /**
         * Bind all reply related functionality.
         */
        var setUpReplyComment = function() {
            $rootel.on('click', '.comments-reply-button', function() {
                var $replyContainer = $(this).parent().siblings('.comments-reply-container');
                var $replyTextArea = $('textarea', $replyContainer);
                // IE10 has a problem where it treats the placeholder text as the textarea's
                // value. Therefore, we need to explicitly clear the value of the textarea to
                // make the placeholder behave like a placeholder.
                // @see https://github.com/oaeproject/3akai-ux/pull/2906
                $replyTextArea.val('');
                // Show the reply container
                $replyContainer.toggle();
                // Autosize the reply comment field when a users enters text
                $replyTextArea.autosize().trigger('autosize.resize');
                // Focus the input field
                $replyTextArea.focus();
            });
        };

        /**
         * Prepend the textarea that allows creation of new top level comments to the list of comments if
         * the current user is logged in
         */
        var renderCreateNewComment = function() {
            $('#comments-container', $rootel).prepend(oae.api.util.template().render($('#comments-new-comment-template'), $rootel));

            // Adjust the height of the new comment field based on its content
            $('#comments-new-comment', $rootel).autosize();

            // Focuses the new comment field when the comment clip is clicked
            $(document).on('click', '.comments-focus-new-comment', function() {
                $('.comments-new-comment-form textarea', $rootel).focus();
            });
        };

        /**
         * Subscribe to comment push notifications, allowing for comments that are made after the initial
         * pageload to be added to the list of comments.
         */
        var setUpPushNotifications = function() {
            oae.api.push.subscribe(contextProfile.id, 'message', contextProfile.signature, 'internal', false, false, function(activities) {
                // The `message` stream pushes out activities on routing so it's always
                // safe to just pick the first item from the `activities` array
                var activity = activities[0];

                var supportedActivities = ['content-comment', 'folder-comment', 'discussion-message'];
                // Only add new comments that weren't created by the current user
                if (activity.actor.id !== oae.data.me.id && _.contains(supportedActivities, activity['oae:activityType'])) {
                    // Insert the comment into the correct position of the comment list. When the new comment is not a reply to an
                    // existing comment, it is added to the top of the list. When the new comment is a reply to an existing comment,
                    // it is added below that comment
                    renderComment(activity.object);

                    // Show a notification about the comment, including a link to the comment
                    var notificationBody = oae.api.util.template().render($('#comments-new-comment-notifications-template', $rootel), {
                        'actorURL': oae.api.util.profilePath(activity.actor.profilePath),
                        'actor': oae.api.util.security().encodeForHTML(activity.actor.displayName),
                        'commentURL': '#' + activity.object.threadKey
                    });
                    oae.api.util.notification(null, notificationBody, null, activity['oae:activityType'] + '#' + activity.published);
                }
            });
        };

        /**
         * Initialize a new infinite scroll container that fetches the comments.
         */
        var setUpInfiniteScroll = function() {
            // Render the new comment textarea
            renderCreateNewComment();

            // Kill the infinite scroll if there is one
            if (infinityScroll) {
                infinityScroll.kill();
            }

            var url = '/api/' + contextProfile.resourceType + '/' + contextProfile.id + '/messages';

            // Set up the infinite scroll for comments
            infinityScroll = $('#comments-container', $rootel).infiniteScroll(url, null, $('#comments-comment-template', $rootel), {
                'postProcessor': function(data) {
                    data.canManage = contextProfile.isManager;
                    return data;
                },
                'postRenderer': setUpValidation
            });

            setUpReplyComment();
        };


        /**
         * Initialize the comments widget
         */
        var setUpComments = function() {
            // Receive the context's profile information and set up the infinite scroll for comments
            $(document).on('oae.context.send.comments', function(ev, contextData) {
                contextProfile = contextData;
                setUpInfiniteScroll();
                setUpPushNotifications();
            });
            // Request the context profile information
            $(document).trigger('oae.context.get', 'comments');

            // Catch when a comment has been successfully deleted
            $(document).on('oae.deletecomment.done', deleteComment);
        };

        setUpComments();

    };
});
