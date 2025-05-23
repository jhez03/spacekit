/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS("pimcore.object.tags.select");
/**
 * @private
 */
pimcore.object.tags.select = Class.create(pimcore.object.tags.abstract, {

    type: "select",

    initialize: function (data, fieldConfig) {
        this.data = data;
        this.fieldConfig = fieldConfig;
    },

    getGridColumnConfigDynamic: function(field) {
        var renderer = function (key, data, metaData, record) {
            var value = data;
            var options = record.data[key + "%options"];

            if (data && typeof data.options !== "undefined") {
                options = data.options;
                value = data.value;
            }

            this.applyPermissionStyle(key, value, metaData, record);

            if (record.data.inheritedFields[key] && record.data.inheritedFields[key].inherited == true) {
                try {
                    metaData.tdCls += " grid_value_inherited";
                } catch (e) {
                    console.log(e);
                }
            }

            if (options) {
                for (var i = 0; i < options.length; i++) {
                    if (options[i]["value"] == value) {
                        return replace_html_event_attributes(strip_tags(options[i]["key"], 'div,span,b,strong,em,i,small,sup,sub'));
                    }
                }
            }

            if (value) {
                return replace_html_event_attributes(strip_tags(value, 'div,span,b,strong,em,i,small,sup,sub'));
            }
        }.bind(this, field.key);

        return {
            text: t(field.label),
            sortable:true,
            dataIndex:field.key,
            renderer: renderer,
            getEditor:this.getCellEditor.bind(this, field)
        };
    },

    getGridColumnConfigStatic: function(field) {
        var renderer = function (key, value, metaData, record) {
            this.applyPermissionStyle(key, value, metaData, record);

            if (record.data.inheritedFields && record.data.inheritedFields[key] && record.data.inheritedFields[key].inherited == true) {
                try {
                    metaData.tdCls += " grid_value_inherited";
                } catch (e) {
                    console.log(e);
                }
            }

            for(var i=0; i < field.layout.options.length; i++) {
                if(field.layout.options[i]["value"] == value) {
                    return replace_html_event_attributes(strip_tags(field.layout.options[i]["key"], 'div,span,b,strong,em,i,small,sup,sub'));
                }
            }

            if (value) {
                return replace_html_event_attributes(strip_tags(value, 'div,span,b,strong,em,i,small,sup,sub'));
            }
        }.bind(this, field.key);

        return {
            text: t(field.label),
            sortable: true,
            dataIndex: field.key,
            renderer: renderer,
            editor: this.getGridColumnEditor(field)
        };
    },

    getGridColumnConfig:function (field) {
        if (field.layout.optionsProviderType !== pimcore.object.helpers.selectField.OPTIONS_PROVIDER_TYPE_CONFIGURE
            && field.layout.optionsProviderClass) {
            return this.getGridColumnConfigDynamic(field);
        } else {
            return this.getGridColumnConfigStatic(field);
        }
    },

    getCellEditor: function (field, record) {
        if (field.layout.noteditable) {
            return null;
        }

        const key = field.key;
        const value = record.data[key];
        let options = record.data[key +  '%options'];
        options = this.prepareStoreDataAndFilterLabels(options);

        const store = new Ext.data.Store({
            autoDestroy: true,
            fields: ['key', 'value'],
            data: options
        });

        if (!field.layout.mandatory) {
            options.unshift({'value': '', 'key': '(' + t('empty') + ')'});
        }

        let editorConfig = this.initEditorConfig(field);

        editorConfig = Object.assign(editorConfig, {
            store: store,
            triggerAction: 'all',
            editable: false,
            mode: 'local',
            valueField: 'value',
            displayField: 'key',
            value: value,
            displayTpl: Ext.create('Ext.XTemplate',
                '<tpl for=".">',
                '{[Ext.util.Format.stripTags(values.key)]}',
                '</tpl>'
            )
        });

        return new Ext.form.ComboBox(editorConfig);
    },

    getGridColumnEditor: function(field) {
        if (field.layout.noteditable) {
            return null;
        }

        const storeData = this.prepareStoreDataAndFilterLabels(field.layout.options);
        
        if (!field.layout.mandatory) {
            storeData.unshift({'value': '', 'key': '(' + t('empty') + ')'});
        }

        const store = new Ext.data.Store({
            autoDestroy: true,
            fields: ['key', 'value'],
            data: storeData
        });

        let editorConfig = this.initEditorConfig(field);

        editorConfig = Object.assign(editorConfig, {
            store: store,
            triggerAction: 'all',
            editable: false,
            mode: 'local',
            valueField: 'value',
            displayField: 'key',
            displayTpl: Ext.create('Ext.XTemplate',
                '<tpl for=".">',
                '{[Ext.util.Format.stripTags(values.key)]}',
                '</tpl>'
            )
        });

        return new Ext.form.ComboBox(editorConfig);
    },

    prepareStoreDataAndFilterLabels: function(options) {
        var filteredStoreData = [];
        if (options) {
            for (var i = 0; i < options.length; i++) {

                var label = t(options[i].key);
                if(label.indexOf('<') >= 0) {
                    label = replace_html_event_attributes(strip_tags(label, "div,span,b,strong,em,i,small,sup,sub2"));
                }

                filteredStoreData.push({'value': options[i].value, 'key': label});
            }
        }

        return filteredStoreData;
    },

    getGridColumnFilter: function(field) {
        if (field.layout.dynamicOptions) {
            return {type: 'string', dataIndex: field.key};
        } else {
            var store = Ext.create('Ext.data.JsonStore', {
                fields: ['key', "value"],
                data: this.prepareStoreDataAndFilterLabels(field.layout.options)
            });

            return {
                type: 'list',
                dataIndex: field.key,
                labelField: "key",
                idField: "value",
                options: store
            };
        }
    },

    getLayoutEdit: function () {
        // generate store
        var validValues = [];
        var storeData = [];
        var hasHTMLContent = false;

        if(!this.fieldConfig.mandatory) {
            storeData.push({'value': '', 'key': "(" + t("empty") + ")"});
        }

        if (this.fieldConfig.options) {
            for (var i = 0; i < this.fieldConfig.options.length; i++) {
                var value = this.fieldConfig.options[i].value;
                var label = t(this.fieldConfig.options[i].key);
                if(label.indexOf('<') >= 0) {
                    hasHTMLContent = true;
                    label = replace_html_event_attributes(strip_tags(label, "div,span,b,strong,em,i,small,sup,sub2"));
                }

                storeData.push({'value': value, 'key': label});

                validValues.push(value);
            }
        }

        var store = Ext.create('Ext.data.Store', {
            fields: ['value', 'key'],
            data : storeData
        });


        var options = {
            name: this.fieldConfig.name,
            triggerAction: "all",
            editable: true,
            queryMode: 'local',
            anyMatch: true,
            autoComplete: false,
            forceSelection: true,
            selectOnFocus: true,
            fieldLabel: this.fieldConfig.title,
            store: store,
            listeners: {
                focusenter: function(selectField, e) {
                    if (this.fieldConfig.dynamicOptions) {
                        Ext.Ajax.request({
                            url: Routing.generate('pimcore_admin_dataobject_dataobject_getSelectOptions'),
                            method: 'POST',
                            params: {
                                objectId: this.object.id,
                                changedData: this.object.getSaveData().data,
                                fieldDefinition: JSON.stringify(this.fieldConfig),
                                context: JSON.stringify(this.context)
                            },
                            success: function (response) {
                                response = Ext.decode(response.responseText);
                                if (!(response && response.success)) {
                                    pimcore.helpers.showNotification(t("error"), t(response.message), "error", t(response.message));
                                } else {
                                    if (!this.fieldConfig.mandatory) {
                                        response.options.unshift({'value': '', 'key': "(" + t("empty") + ")"});
                                    }
                                    store.setData(response.options);
                                }
                            }.bind(this)
                        });
                    }
                }.bind(this)
            },
            componentCls: this.getWrapperClassNames(),
            width: 250,
            tpl: Ext.create('Ext.XTemplate',
                '<ul class="x-list-plain"><tpl for=".">',
                '<li role="option" class="x-boundlist-item">{key}</li>',
                '</tpl></ul>'
            ),
            displayTpl: Ext.create('Ext.XTemplate',
                '<tpl for=".">',
                '{[Ext.util.Format.stripTags(values.key)]}',
                '</tpl>'
            ),
            displayField: 'key',
            valueField: 'value',
            labelWidth: 100
        };

        if (this.fieldConfig.labelWidth) {
            options.labelWidth = this.fieldConfig.labelWidth;
        }

        if (this.fieldConfig.width) {
            options.width = this.fieldConfig.width;
        }

        if (this.fieldConfig.labelAlign) {
            options.labelAlign = this.fieldConfig.labelAlign;
        }

        if (!this.fieldConfig.labelAlign || 'left' === this.fieldConfig.labelAlign) {
            options.width = this.sumWidths(options.width, options.labelWidth);
        }

        if (typeof this.data == "string" || typeof this.data == "number") {
            if (in_array(this.data, validValues)) {
                options.value = this.data;
            } else {
                options.value = "";
                if (this.data != "") {
                    pimcore.helpers.showNotification(
                        t("error"),
                        t("invalid_option", '', {option: this.data, field: this.getName()}),
                        "error"
                    );
                }
            }
        } else {
            options.value = "";
        }

        this.component = new Ext.form.ComboBox(options);

        return this.component;
    },


    getLayoutShow: function () {

        this.component = this.getLayoutEdit();
        this.component.setReadOnly(true);

        return this.component;
    },

    getValue:function () {
        if (this.isRendered()) {
            return this.component.getValue();
        } else if (this.defaultValue) {
            return this.defaultValue;
        }
        return this.data;
    },


    getName: function () {
        return this.fieldConfig.name;
    },

    isDirty:function () {
        var dirty = false;

        if(this.defaultValue) {
            return true;
        }

        if (this.component && typeof this.component.isDirty == "function") {
            if (this.component.rendered) {
                dirty = this.component.isDirty();

                // once a field is dirty it should be always dirty (not an ExtJS behavior)
                if (this.component["__pimcore_dirty"]) {
                    dirty = true;
                }
                if (dirty) {
                    this.component["__pimcore_dirty"] = true;
                }

                return dirty;
            }
        }

        return false;
    },

    applyDefaultValue: function() {

        this.defaultValue = null;
        if ((typeof this.data === "undefined" || this.data === null) && this.fieldConfig.defaultValue) {
            this.data = this.fieldConfig.defaultValue;
            this.defaultValue = this.data;
        }
    }

});
