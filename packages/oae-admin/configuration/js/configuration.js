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

define(['jquery', 'oae.core', 'jquery.jeditable'], function($, oae) {

    return function(uid, showSettings, widgetData) {

        // The widget container
        var $rootel = $('#' + uid);

        /**
         * Render the available configuration sections and their configured values
         */
        var renderConfigurationSections = function() {
            var schema = [];

            // Convert the configuration schema to an array as we can't sort a dictionary
            $.each(widgetData.configurationSchema, function(configurationSectionName, configurationSection) {
                schema.push({'configurationSection': configurationSection, 'configurationSectionName': configurationSectionName});
            });

            // Sort the array based on the configuration section title
            schema.sort(function(a, b) {
                if (a.configurationSection.title > b.configurationSection.title) {
                    return 1;
                }
                if (a.configurationSection.title < b.configurationSection.title) {
                    return -1;
                }

                return 0;
            });

            oae.api.util.template().render($('#configuration-template', $rootel), {
                'schema': schema,
                'configuration': widgetData.configuration,
                'context': widgetData.context,
                'languages': widgetData.configurationSchema['oae-principals'].user.elements.defaultLanguage.list
            }, $('#configuration-container', $rootel));
        };

        /**
         * Persist the configuration changes for the current tenant
         */
        var updateConfiguration = function() {
            // Get the filled out values from the form
            var $form = $(this);
            var values = $form.serializeObject();
            var configurationSection = $form.attr('data-configurationSection');

            // Object that will be used to construct the POST data
            var data = {};

            // Run over all the old configuration values to check which ones have been modified
            $.each(widgetData.configuration[configurationSection], function(option, optionValues) {
                $.each(optionValues, function(element, elementValue) {

                    // Convert the value in case it's a checkbox
                    var configPath = configurationSection + '/' + option + '/' + element;
                    if (widgetData.configurationSchema[configurationSection][option].elements[element].type === 'boolean') {
                        values[configPath] = values[configPath] ? true : false;
                    }

                    // Go one level deeper if it's an internationalizableText field
                    if (widgetData.configurationSchema[configurationSection][option].elements[element].type === 'internationalizableText') {
                        // Check if the default language changed
                        if (values[configPath + '/default'] !== widgetData.configuration[configurationSection][option][element]['default']) {
                            data[configPath + '/default'] = values[configPath + '/default'];
                            widgetData.configuration[configurationSection][option][element]['default'] = values[configPath + '/default'];
                        }

                        // Loop over the list of available languages
                        $.each(widgetData.configurationSchema['oae-principals'].user.elements.defaultLanguage.list, function(i, i18n) {
                            // Continue if the value has changed
                            if (values[configPath + '/' + i18n.value] !== widgetData.configuration[configurationSection][option][element][i18n.value]) {
                                // We shouldn't submit empty values
                                if (values[configPath + '/' + i18n.value] !== '') {
                                    data[configPath + '/' + i18n.value] = values[configPath + '/' + i18n.value];
                                    widgetData.configuration[configurationSection][option][element][i18n.value] = values[configPath + '/' + i18n.value];
                                }
                            }
                        });
                    }

                    // Check if the value has changed and overwrite if it has
                    if ((values[configPath] !== elementValue) &&
                        widgetData.configurationSchema[configurationSection][option].elements[element].type !== 'internationalizableText') {
                        data[configPath] = values[configPath];
                        widgetData.configuration[configurationSection][option][element] = values[configPath];
                    }
                });
            });

            var url = '/api/config';
            // Tenant and global servers do not need the tenantId to be specified in the URL
            // If a tenant server is accessed through the global server the tenantId needs to be specified
            if (widgetData.context.isTenantOnGlobalAdminServer) {
                url += '/' + widgetData.context.alias;
            }

            // Only update when a change has actually been made
            if (!$.isEmptyObject(data)) {
                $.ajax({
                    'url': url,
                    'type': 'POST',
                    'data': data,
                    'success': function() {
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__CONFIGURATION_SAVED__', 'configuration'),
                            oae.api.i18n.translate('__MSG__CONFIGURATION_SUCCESSFULLY_SAVED__', 'configuration'));
                    },
                    'error': function() {
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__CONFIGURATION_NOT_SAVED__', 'configuration'),
                            oae.api.i18n.translate('__MSG__CONFIGURATION_COULD_NOT_BE_SAVED__', 'configuration'),
                            'error');
                    }
                });
            }
            return false;
        };

        /**
         * Toggle internationalizable field container
         */
        var toggleInternationalizableFieldContainer = function() {
            // Define the target container
            var $targetContainer = $(this).parents('.configuration-internationalizable-text-container');
            // Hide all form groups except the first one (language select) in the target container
            $targetContainer.find('.form-group').hide();
            $targetContainer.find('.form-group:first-child').show();
            // Show the selected language form group in the target container
            $targetContainer.find('div[data-id="' + $(this).val() + '"]').show();
        };

        /**
         * Toggle a configuration section container
         */
        var toggleContainer = function() {
            $(this).next().toggle(400);
        };

        /**
         * Add event binding to the configuration related functionality
         */
        var addBinding = function() {
            // Configuration section toggle
            $rootel.on('click', '.admin-table-striped-toggle', toggleContainer);
            // Change configuration values
            $rootel.on('submit', '.configuration-form', updateConfiguration);
            // Toggle internationalizable field containers
            $rootel.on('change', '.admin-internationalizabletext-language-picker', toggleInternationalizableFieldContainer);
        };

        addBinding();
        renderConfigurationSections();

    };
});
