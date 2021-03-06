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

define(['jquery', 'oae.core', 'jquery.fileupload', 'jquery.iframe-transport'], function($, oae) {

    return function(uid, showSettings) {

        //////////////////////
        // WIDGET VARIABLES //
        //////////////////////

        // The widget container
        var $rootel = $('#' + uid);

        // Keeps track of the selected file to send to the upload API
        var selectedFile = null;

        // IE9 and below don't support XHR file uploads and we fall back to iframe transport
        var useIframeTransport = !$.support.xhrFileUpload && !$.support.xhrFormDataFileUpload;

        ///////////////
        // UTILITIES //
        ///////////////

        /**
         * Resets the upload new version widget
         */
        var reset = function() {
            // Reset the upload form
            $('#uploadnewversion-form', $rootel)[0].reset();

            // Show the drop zone
            $('#uploadnewversion-dropzone', $rootel).show();

            // Hide the progress indicator
            $('#uploadnewversion-progress', $rootel).hide();

            // If we need an iframe for the upload, progress will probably not be supported
            if (!useIframeTransport) {
                // Reset the progress bar
                $('.progress', $rootel).hide();
                updateProgress(0);
            }

            // Remove the focus style on the Browse button
            $('#uploadnewversion-browse-button', $rootel).removeClass('oae-focus');
        };

        /**
         * Updates the progress indicator
         *
         * @param  {Number}   progress   Number between 0 and 100 indicating the upload progress
         */
        var updateProgress = function(progress) {
            $('.progress-bar', $rootel).css('width', progress + '%').attr('aria-valuenow', progress);
            $('.progress-bar .sr-only', $rootel).text(progress + '%');
        };

        /**
         * Checks if the user selected/dropped an acceptable file.
         *
         * @param  {Object}   ev     The event sent out by jquery fileupload change or drop
         * @param  {Object}   data   The data coming from the jquery fileupload drop or change event
         */
        var checkValidFile = function(ev, data) {

            // New version can only be a single file
            if (data.files.length !== 1) {
                oae.api.util.notification(
                    oae.api.i18n.translate('__MSG__VERSION_NOT_UPLOADED__', 'uploadnewversion'),
                    oae.api.i18n.translate('__MSG__ONLY_A_SINGLE_FILE_MAY_BE_UPLOADED__', 'uploadnewversion'),
                    'error'
                );

            // A valid file name must be provided and the file must have content
            } else if (!data.files[0].name || (!useIframeTransport && data.files[0].size <= 0)) {
                oae.api.util.notification(
                    oae.api.i18n.translate('__MSG__VERSION_NOT_UPLOADED__', 'uploadnewversion'),
                    oae.api.i18n.translate('__MSG__PLEASE_SELECT_A_VALID_FILE_TO_UPLOAD__', 'uploadnewversion'),
                    'error'
                );

            // If valid, save the file name and update the content
            } else {
                selectedFile = data.files[0];
                uploadNewVersion();
            }
        };

        ////////////////////////
        // UPLOAD NEW VERSION //
        ////////////////////////

        /**
         * Sets up the single file upload field for uploading a new version.
         *
         * @param  {Object}    ev         The `oae.context.send` event
         * @param  {Object}    context    The content profile data
         */
        var setUpNewVersionInput = function(ev, context) {
            var fileuploadOptions = {
                'url': '/api/content/' + context.id + '/newversion',
                'dropZone': $('#uploadnewversion-dropzone', $rootel),
                'replaceFileInput': false,
                'forceIframeTransport': useIframeTransport,
                'add': checkValidFile,
                'singleFileUploads': false, // Ensure plugin calls add function once for all files
                'progress': function(ev, data) {
                    // If we need an iframe for the upload, progress will probably not be supported
                    if (!useIframeTransport) {
                        // Update the progress bar
                        updateProgress((data.loaded / data.total) * 100);
                    }
                }
            };

            $('#uploadnewversion-input', $rootel).fileupload(fileuploadOptions);
        };

        /**
         * Uploads the new version and closes the dialog when complete.
         */
        var uploadNewVersion = function() {
            // Hide the drop zone
            $('#uploadnewversion-dropzone', $rootel).hide();

            // Show the progress indicator
            $('#uploadnewversion-progress', $rootel).show();
            // If we need an iframe for the upload, progress will probably not be supported
            if (!useIframeTransport) {
                // Show the progress bar
                $('.progress', $rootel).show();
            } else {
                // Show the spinner
                $('.fa-spinner' , $rootel).show();
            }

            // Lock the modal so it cannot be closed during upload
            $('#uploadnewversion-modal', $rootel).modal('lock');

            // Upload the new version and hide the dialog on completion
            oae.api.content.uploadNewVersion($('#uploadnewversion-input', $rootel), selectedFile, function(err, updatedContent) {
                // Unlock the modal
                $('#uploadnewversion-modal', $rootel).modal('unlock');
                // Hide the modal
                $('#uploadnewversion-modal', $rootel).modal('hide');

                if (err) {
                    oae.api.util.notification(
                        oae.api.i18n.translate('__MSG__VERSION_NOT_UPLOADED__', 'uploadnewversion'),
                        oae.api.i18n.translate('__MSG__VERSION_NOT_SUCCESSFULLY_UPLOADED__', 'uploadnewversion'),
                        'error'
                    );
                } else {
                    $(document).trigger('oae.content.update', updatedContent);
                    // If we need an iframe for the upload, progress will probably not be supported
                    if (!useIframeTransport) {
                        updateProgress(100);
                    }
                    // Show a notification when the upload is complete
                    oae.api.util.notification(
                        oae.api.i18n.translate('__MSG__VERSION_UPLOADED__', 'uploadnewversion'),
                        oae.api.i18n.translate('__MSG__VERSION_SUCCESSFULLY_UPLOADED__', 'uploadnewversion')
                    );
                }
            });

            return false;
        };

        /**
         * Initializes the upload new version modal dialog
         */
        var initUploadNewVersionModal = function() {
            $(document).on('click', '.oae-trigger-uploadnewversion', function() {
                // Show the modal
                $('#uploadnewversion-modal', $rootel).modal({
                    'backdrop': 'static'
                });

                // Request the content profile information
                $(document).trigger('oae.context.get', 'uploadnewversion');

                // Hide the spinner icon using jQuery
                // @see https://github.com/FortAwesome/Font-Awesome/issues/729
                $('.fa-spinner', $rootel).hide();
            });

            // Receive the content profile information and set up the fileupload plugin
            $(document).on('oae.context.send.uploadnewversion', setUpNewVersionInput);

            // Reset the widget when it's fully hidden
            $('#uploadnewversion-modal', $rootel).on('hidden.bs.modal', reset);
        };

        initUploadNewVersionModal();

    };
});
