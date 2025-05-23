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

pimcore.registerNS("pimcore.object.tags.manyToManyObjectRelation");
/**
 * @private
 */
pimcore.object.tags.manyToManyObjectRelation = Class.create(pimcore.object.tags.abstractRelations, {

    type: "manyToManyObjectRelation",
    dataChanged: false,
    idProperty: "id",
    pathProperty: "fullpath",
    allowBatchAppend: true,
    allowBatchRemove: true,

    initialize: function (data, fieldConfig) {
        this.data = [];
        this.fieldConfig = fieldConfig;
        if (data) {
            this.data = data;
        }

        var visibleFields = Ext.isString(this.fieldConfig.visibleFields) ? this.fieldConfig.visibleFields.split(",") : [];
        this.visibleFields = visibleFields;

        var fields = [
            "id",
            "path",
            "classname",
            "published"
        ];

        if (visibleFields) {
            for (i = 0; i < visibleFields.length; i++) {
                fields.push(visibleFields[i]);
            }
        }

        let storeConfig = {
            data: this.data,
            listeners: {
                add: function () {
                    this.dataChanged = true;
                }.bind(this),
                remove: function () {
                    this.dataChanged = true;
                }.bind(this),
                clear: function () {
                    this.dataChanged = true;
                }.bind(this)
            },
            fields: fields

        };

        if (pimcore.helpers.hasSearchImplementation() && this.fieldConfig.displayMode === 'combo') {
            storeConfig.proxy = {
                type: 'ajax',
                url: pimcore.helpers.getObjectRelationInlineSearchRoute(),
                extraParams: {
                    fieldConfig: JSON.stringify(this.fieldConfig),
                    data: JSON.stringify(this.data.map(function(element) {
                        return {id: element.id, type: element.type};
                    })),
                },
                reader: {
                    type: 'json',
                    rootProperty: 'options',
                    successProperty: 'success',
                    messageProperty: 'message'
                }
            };
            storeConfig.fields = ['id', 'label'];
            storeConfig.autoLoad = true;
            storeConfig.listeners = {
                beforeload: function(store) {
                    store.getProxy().setExtraParam('unsavedChanges', this.object && typeof this.object.getSaveData === "function" ? this.object.getSaveData().data : {});
                    store.getProxy().setExtraParam('context', JSON.stringify(this.getContext()));
                }.bind(this)
            };
        }

        this.store = new Ext.data.JsonStore(storeConfig);
    },

    getGridColumnConfig: function (field) {
        return {
            text: t(field.label), width: 150, sortable: false, dataIndex: field.key, renderer:
                function (key, value, metaData, record) {
                    this.applyPermissionStyle(key, value, metaData, record);

                    if (record.data.inheritedFields && record.data.inheritedFields && record.data.inheritedFields[key] && record.data.inheritedFields[key].inherited == true) {
                        metaData.tdCls += " grid_value_inherited";
                    }

                    if (value && value.length > 0) {

                        // only show 10 relations in the grid
                        var maxAmount = 10;
                        var result = [];
                        var i;
                        for (i = 0; i < value.length && i < maxAmount; i++) {
                            var item = value[i];
                            result.push(item["fullpath"]);
                        }
                        if (value.length > maxAmount) {
                            result.push("...");
                        }

                        return result.join("<br />");
                    }
                }.bind(this, field.key),
            getRelationFilter: this.getRelationFilter,
            getEditor: this.getWindowCellEditor.bind(this, field)
        };
    },

    getRelationFilter: function (dataIndex, editor) {
        var filterValues = editor.store.getData().items;
        if (!filterValues || !Array.isArray(filterValues) || !filterValues.length) {
            filterValues = null;
        } else {
            filterValues = filterValues.map(function (item) {
                return item.data.id;
            }).join(',');
        }

        return new Ext.util.Filter({
            operator: "like",
            type: "string",
            id: "x-gridfilter-" + dataIndex,
            property: dataIndex,
            dataIndex: dataIndex,
            value: filterValues
        });
    },

    openParentSearchEditor: function () {
        pimcore.helpers.itemselector(false, function (selection) {
                this.parentField.setValue(selection.fullpath);
                this.parentIdField.setValue(selection.id);
            }.bind(this), {
                type: ["object"],
                subtype: {
                    object: ["object", "folder"]
                },
                specific: {
                    classes: null
                }
            },
            {
                context: this.getContext()
            });
    },

    create: function (className) {

        this.window = new Ext.Window({
            width: 500,
            height: 200,
            modal: true,
            title: t('add_object'),
            layout: "fit"
        });

        this.nameField = new Ext.form.TextField({
            fieldLabel: t('name'),
            width: 300

        });

        this.parentIdField = new Ext.form.Hidden({});

        this.parentField = new Ext.form.TextField({
            name: 'parent',
            fieldLabel: t('parent'),
            width: 300,
            disabled: true
        });

        const panelFcItems = [
            this.parentField
        ];

        if(pimcore.helpers.hasSearchImplementation()) {
            this.parentChooseButton = new Ext.Button({
                labelStyle: 'padding-left: 10px;',
                iconCls: 'pimcore_icon_search',
                handler: this.openParentSearchEditor.bind(this)
            });

            panelFcItems.push(this.parentChooseButton);
        }

        var panel = new Ext.Panel({
            bodyStyle: "padding: 10px;",
            items: [
                this.nameField,
                new Ext.form.FieldContainer({
                    layout: 'hbox',
                    items: panelFcItems
                })

            ],
            buttons: [
                {
                    text: t("create"),
                    iconCls: "pimcore_icon_apply",
                    handler: function () {
                        this.addCreateObject(className);
                    }.bind(this)
                }
            ]
        });

        this.window.add(panel);

        this.window.show();

    },

    addCreateObject: function (className) {

        var name = this.nameField.getValue();

        var parent = this.parentField.getValue();
        var parentId = this.parentIdField.getValue();
        var classStore = pimcore.globalmanager.get("object_types_store");
        var record = classStore.getAt(classStore.find('text', className));
        var classId = record.getId();

        var invalid = false;
        if (!parent || !parentId) {
            this.parentField.markInvalid();
            invalid = true;
        }
        if (!name) {
            this.nameField.markInvalid();
            invalid = true;
        }

        if (!invalid) {
            Ext.Ajax.request({
                url: Routing.generate('pimcore_admin_dataobject_dataobject_add'),
                method: 'POST',
                params: {
                    className: className,
                    classId: classId,
                    parentId: parentId,
                    key: pimcore.helpers.getValidFilename(name, "object")
                },
                success: function (response) {
                    var data = Ext.decode(response.responseText);
                    if (data.success) {
                        var initData = {
                            id: data.id
                        };

                        this.loadObjectData(initData, this.visibleFields);
                        pimcore.helpers.openElement(data.id, "object", "object");

                        this.window.close();
                    } else {
                        pimcore.helpers.showNotification(t("error"), t("saving_failed"), "error", data.message);
                    }

                }.bind(this)
            });
        } else {
            pimcore.helpers.showNotification(t("error"), t("mandatory_field_empty"), "error");
        }
    },

    getCreateControl: function () {
        var allowedClasses;
        var i;

        var classStore = pimcore.globalmanager.get("object_types_store");
        if (this.fieldConfig.classes != null && this.fieldConfig.classes.length > 0) {
            allowedClasses = [];
            for (i = 0; i < this.fieldConfig.classes.length; i++) {
                if (this.fieldConfig.classes[i].classes) {
                    allowedClasses.push(this.fieldConfig.classes[i].classes);
                }
            }
        } else if (this.fieldConfig.ownerClassName) {
            allowedClasses = [];
            allowedClasses.push(this.fieldConfig.ownerClassName);
        } else if (classStore.data && classStore.data.items && classStore.data.items.length > 0) {
            allowedClasses = [];
            for (i = 0; i < classStore.data.items.length; i++) {
                allowedClasses.push(classStore.data.items[i].data.text);
            }

        }

        var collectionMenu = [];

        if (allowedClasses && allowedClasses.length > 0) {
            for (i = 0; i < allowedClasses.length; i++) {
                collectionMenu.push({
                    text: t(allowedClasses[i]),
                    handler: this.create.bind(this, allowedClasses[i]),
                    iconCls: "pimcore_icon_fieldcollection"
                });
            }
        }
        var items = [];

        if (this.fieldConfig.allowToCreateNewObject) {
            if (collectionMenu.length == 1) {
                items.push({
                    cls: "pimcore_block_button_plus",
                    iconCls: "pimcore_icon_plus",
                    tooltip: t("add"),
                    handler: collectionMenu[0].handler
                });
            } else if (collectionMenu.length > 1) {
                items.push({
                    cls: "pimcore_block_button_plus",
                    iconCls: "pimcore_icon_plus",
                    tooltip: t("add"),
                    menu: collectionMenu
                });
            } else {
                items.push({
                    xtype: "tbtext",
                    text: t("no_collections_allowed")
                });
            }
        }

        return items[0];
    },

    getVisibleColumns: function () {
        var visibleFields = this.visibleFields || [];

        var columns = [];

        if(visibleFields.length === 0) {
            columns.push(
                {text: 'ID', dataIndex: 'id', width: 50},
                {text: t("reference"), dataIndex: 'fullpath', flex: 200, renderer: this.fullPathRenderCheck.bind(this)},
                {text: t("class"), dataIndex: 'classname', width: 100}
            );
        }

        for (i = 0; i < visibleFields.length; i++) {
            if (!empty(this.fieldConfig.visibleFieldDefinitions) && !empty(visibleFields[i])) {
                var layout = this.fieldConfig.visibleFieldDefinitions[visibleFields[i]];

                var field = {
                    key: visibleFields[i],
                    label: layout.title == "fullpath" ? t("reference") : layout.title,
                    layout: layout,
                    position: i,
                    type: layout.fieldtype
                };

                var fc = pimcore.object.tags[layout.fieldtype].prototype.getGridColumnConfig(field);

                fc.flex = 100;
                fc.hidden = false;
                fc.layout = field;
                fc.editor = null;
                fc.sortable = false;

                if (fc.layout.key === "fullpath") {
                    fc.renderer = this.fullPathRenderCheck.bind(this);
                } else if (fc.layout.layout.fieldtype == 'select'
                    || fc.layout.layout.fieldtype == 'multiselect'
                    || fc.layout.layout.fieldtype == 'booleanSelect'
                ) {
                    fc.layout.layout.options.forEach(option => {
                        option.key = t(option.key);
                    });
                }

                let filterType = 'list';

                if (fc.layout.layout.fieldtype === 'checkbox' || fc.layout.key === 'published') {
                    filterType = 'boolean';
                }

                fc.filter = {
                    type: filterType
                }

                columns.push(fc);
            }
        }

        columns = Ext.Array.map(columns, function(column) {
            let columnWidth = this.getColumnWidth(column.dataIndex);
            if (columnWidth > 0) {
                column.width = columnWidth;
            }

            if (typeof column.width !== "undefined") {
                delete column.flex;
            }

            if(typeof column.listeners === "undefined") {
                column.listeners = {};
            }
            column.listeners.resize = function (columnKey, column, width) {
                localStorage.setItem(this.getColumnWidthLocalStorageKey(columnKey), width);
            }.bind(this, column.dataIndex);

            return column;
        }.bind(this));

        return columns;
    },

    getLayoutEdit: function () {
        if (!this.fieldConfig.height) {
            this.fieldConfig.height = null;
        }

        if (pimcore.helpers.hasSearchImplementation() && this.fieldConfig.displayMode === 'combo') {
            this.component = Ext.create('Ext.form.field.Tag', {
                store: this.store,
                autoLoadOnValue: true,
                height: 'auto',
                width: '100%',
                value: this.data.map(function(item) {
                    return item.id;
                }),
                typeAhead: true,
                minChars: 3,
                filterPickList: true,
                triggerAction: "all",
                displayField: "label",
                valueField: "id",
                fieldLabel: this.fieldConfig.title,
                tpl: new Ext.XTemplate(
                    '<tpl for="."><li role="option" unselectable="on" class="x-boundlist-item" data-recordid="{id}" style="display:flex;">',
                    '  {label}',
                    '</li></tpl>'
                ),
                listeners: {
                    change: function() {
                        this.dataChanged = true;
                    }.bind(this),
                    focus: function() {
                        this.store.getProxy().setExtraParam('data', '');
                    }.bind(this)
                },
                plugins: 'dragdroptag'
            });
        } else {
            let columns = this.getVisibleColumns();
            let toolbarItems = this.getEditToolbarItems();

            columns.push({
                xtype: 'actioncolumn',
                menuText: t('up'),
                width: 40,
                hideable: false,
                items: [
                    {
                        tooltip: t('up'),
                        icon: "/bundles/pimcoreadmin/img/flat-color-icons/up.svg",
                        handler: function (grid, rowIndex) {
                            if (rowIndex > 0) {
                                var rec = grid.getStore().getAt(rowIndex);
                                grid.getStore().removeAt(rowIndex);
                                grid.getStore().insert(rowIndex - 1, [rec]);
                            }
                        }.bind(this)
                    }
                ]
            });

            columns.push({
                xtype: 'actioncolumn',
                menuText: t('down'),
                width: 40,
                hideable: false,
                items: [
                    {
                        tooltip: t('down'),
                        icon: "/bundles/pimcoreadmin/img/flat-color-icons/down.svg",
                        handler: function (grid, rowIndex) {
                            if (rowIndex < (grid.getStore().getCount() - 1)) {
                                var rec = grid.getStore().getAt(rowIndex);
                                grid.getStore().removeAt(rowIndex);
                                grid.getStore().insert(rowIndex + 1, [rec]);
                            }
                        }.bind(this)
                    }
                ]
            });

            columns.push({
                xtype: 'actioncolumn',
                menuText: t('open'),
                width: 40,
                hideable: false,
                items: [
                    {
                        tooltip: t('open'),
                        icon: "/bundles/pimcoreadmin/img/flat-color-icons/open_file.svg",
                        handler: function (grid, rowIndex) {
                            var data = grid.getStore().getAt(rowIndex);
                            pimcore.helpers.openObject(data.data.id, "object");
                        }.bind(this)
                    }
                ]
            });

        columns.push({
            xtype: 'actioncolumn',
            menuText: t('remove'),
            width: 40,
            hideable: false,
            items: [
                {
                    tooltip: t('remove'),
                    icon: "/bundles/pimcoreadmin/img/flat-color-icons/delete.svg",
                    handler: function (grid, rowIndex) {
                        let data = grid.getStore().getAt(rowIndex);
                        pimcore.helpers.deleteConfirm(t('relation'), data.data.path, function () {
                            grid.getStore().removeAt(rowIndex);
                        }.bind(this));
                    }.bind(this)
                }
            ]
        });

            this.component = Ext.create('Ext.grid.Panel', {
                store: this.store,
                border: true,
                style: "margin-bottom: 10px",
                viewConfig: {
                    markDirty: false,
                    enableTextSelection: this.fieldConfig.enableTextSelection,
                    plugins: {
                        ptype: 'gridviewdragdrop',
                        draggroup: 'element'
                    },
                    listeners: {
                        drop: function (node, data, dropRec, dropPosition) {
                            this.dataChanged = true;

                            // this is necessary to avoid endless recursion when long lists are sorted via d&d
                            // TODO: investigate if there this is already fixed 6.2
                            if (this.object.toolbar && this.object.toolbar.items && this.object.toolbar.items.items) {
                                this.object.toolbar.items.items[0].focus();
                            }
                        }.bind(this),
                        afterrender: function (gridview) {
                            this.requestNicePathData(this.store.data, true);
                        }.bind(this)
                    }
                },
                multiSelect: true,
                columns: {
                    defaults: {
                        sortable: false
                    },
                    items: columns
                },
                componentCls: this.getWrapperClassNames(),
                autoExpandColumn: 'path',
                width: this.fieldConfig.width,
                height: this.fieldConfig.height,
                tbar: {
                    items: toolbarItems,
                    ctCls: "pimcore_force_auto_width",
                    cls: "pimcore_force_auto_width"
                },
                bodyCssClass: "pimcore_object_tag_objects",
                listeners: {
                    rowdblclick: this.gridRowDblClickHandler
                },
                plugins: [
                    'gridfilters'
                ]
            });

            this.component.on("rowcontextmenu", this.onRowContextmenu);
            this.component.reference = this;

            this.component.on("afterrender", function () {
                let dropTargetEl = this.component.getEl();
                let gridDropTarget = new Ext.dd.DropZone(dropTargetEl, {
                    ddGroup: 'element',
                    getTargetFromEvent: function (e) {
                        return this.component.getEl().dom;
                        //return e.getTarget(this.grid.getView().rowSelector);
                    }.bind(this),

                    onNodeOver: function (overHtmlNode, ddSource, e, data) {
                        try {
                            let returnValue = Ext.dd.DropZone.prototype.dropAllowed;
                            data.records.forEach(function (record) {
                                var fromTree = this.isFromTree(ddSource);
                                if (!this.dndAllowed(record.data, fromTree)) {
                                    returnValue = Ext.dd.DropZone.prototype.dropNotAllowed;
                                }
                            }.bind(this));

                            return returnValue;
                        } catch (e) {
                            console.log(e);
                            return Ext.dd.DropZone.prototype.dropNotAllowed;
                        }
                    }.bind(this),

                    onNodeDrop: function (target, dd, e, data) {

                        this.nodeElement = data;
                        let fromTree = this.isFromTree(dd);
                        let toBeRequested = new Ext.util.Collection();

                        data.records.forEach(function (record) {
                            let data = record.data;
                            if (this.dndAllowed(data, fromTree)) {
                                if (data["grid"] && data["grid"] == this.component) {
                                    var rowIndex = this.component.getView().findRowIndex(e.target);
                                    if (rowIndex !== false) {
                                        var rec = this.store.getAt(data.rowIndex);
                                        this.store.removeAt(data.rowIndex);
                                        toBeRequested.add(this.store.insert(rowIndex, [rec]));
                                        this.requestNicePathData(toBeRequested);
                                    }
                                } else {
                                    let initData = {
                                        id: data.id,
                                        metadata: '',
                                        inheritedFields: {},
                                        fullpath: data.path
                                    };

                                    if (!this.objectAlreadyExists(initData.id)) {
                                        toBeRequested.add(this.loadObjectData(initData, this.visibleFields));
                                    }
                                }
                            }
                        }.bind(this));

                        if (toBeRequested.length) {
                            this.requestNicePathData(toBeRequested);
                            return true;
                        }

                        return false;

                    }.bind(this)
                });
            }.bind(this));
        }

        return this.component;
    },

    getEditToolbarItems: function (readOnly) {
        var toolbarItems = [
            {
                xtype: "tbspacer",
                width: 24,
                height: 24,
                cls: "pimcore_icon_droptarget"
            },
            {
                xtype: "tbtext",
                text: "<b>" + this.fieldConfig.title + "</b>"
            },
            "->"
        ];

        toolbarItems = toolbarItems.concat(this.getFilterEditToolbarItems());

        if (!readOnly) {
            if (this.fieldConfig.allowToClearRelation) {
                toolbarItems.push({
                    xtype: "button",
                    iconCls: "pimcore_icon_delete",
                    tooltip: t("empty"),
                    handler: function () {
                        pimcore.helpers.deleteConfirm(t('all'), t('relations'), function () {
                            this.empty();
                        }.bind(this));
                    }.bind(this)
                });
            }

            toolbarItems = toolbarItems.concat(this.getCreateControl());

            if(pimcore.helpers.hasSearchImplementation()) {
                toolbarItems.push({
                    xtype: "button",
                    iconCls: "pimcore_icon_search",
                    tooltip: t("search"),
                    handler: this.openSearchEditor.bind(this)
                });
            }
        }

        return toolbarItems;
    },

    isFromTree: function (ddSource) {
        var klass = Ext.getClass(ddSource);
        var className = klass.getName();
        var fromTree = className == "Ext.tree.ViewDragZone";
        return fromTree;
    },


    getLayoutShow: function () {
        var autoHeight = false;
        if (!this.fieldConfig.height) {
            autoHeight = true;
        }

        var columns = this.getVisibleColumns();
        columns.push({
            xtype: 'actioncolumn',
            menuText: t('open'),
            width: 40,
            sortable: false,
            items: [
                {
                    tooltip: t('open'),
                    icon: "/bundles/pimcoreadmin/img/flat-color-icons/open_file.svg",
                    handler: function (grid, rowIndex) {
                        var data = grid.getStore().getAt(rowIndex);
                        pimcore.helpers.openObject(data.data.id, "object");
                    }.bind(this)
                }
            ]
        });

        this.component = Ext.create('Ext.grid.Panel', {
            store: this.store,
            columns: {
                defaults: {
                    sortable: false
                },
                items: columns
            },
            width: this.fieldConfig.width,
            height: this.fieldConfig.height,
            autoHeight: autoHeight,
            border: true,
            cls: "object_field object_field_type_" + this.type,
            autoExpandColumn: 'path',
            style: "margin-bottom: 10px",
            title: this.fieldConfig.title,
            viewConfig: {
                enableTextSelection: this.fieldConfig.enableTextSelection,
                listeners: {
                    afterrender: function (gridview) {
                        this.requestNicePathData(this.store.data, true);
                    }.bind(this)
                }
            },
            plugins: [
                'gridfilters'
            ]
        });

        return this.component;
    }
    ,

    onRowContextmenu: function (grid, record, tr, rowIndex, e, eOpts) {

        var menu = new Ext.menu.Menu();
        var data = grid.getStore().getAt(rowIndex);

        menu.add(new Ext.menu.Item({
            text: t('remove'),
            iconCls: "pimcore_icon_delete",
            handler: this.reference.removeObject.bind(this, rowIndex)
        }));

        menu.add(new Ext.menu.Item({
            text: t('open'),
            iconCls: "pimcore_icon_open",
            handler: function (data, item) {
                item.parentMenu.destroy();
                pimcore.helpers.openObject(data.data.id, "object");
            }.bind(this, data)
        }));

        if(pimcore.helpers.hasSearchImplementation()) {
            menu.add(new Ext.menu.Item({
                text: t('search'),
                iconCls: "pimcore_icon_search",
                handler: function (item) {
                    item.parentMenu.destroy();
                    this.openSearchEditor();
                }.bind(this.reference)
            }));
        }

        e.stopEvent();
        menu.showAt(e.getXY());
    },

    openSearchEditor: function () {
        var allowedClasses;
        if (this.fieldConfig.classes != null && this.fieldConfig.classes.length > 0) {
            allowedClasses = [];
            for (var i = 0; i < this.fieldConfig.classes.length; i++) {
                allowedClasses.push(this.fieldConfig.classes[i].classes);
            }
        }

        pimcore.helpers.itemselector(true, this.addDataFromSelector.bind(this), {
                type: ["object"],
                subtype: {
                    object: ["object", "variant"]
                },
                specific: {
                    classes: allowedClasses
                }
            },
            {
                context: Ext.apply({scope: "objectEditor"}, this.getContext())
            });
    },

    removeObject: function (index, item) {
        this.getStore().removeAt(index);
        item.parentMenu.destroy();
    },

    empty: function () {
        this.store.removeAll();
    },

    addDataFromSelector: function (items) {

        if (items.length > 0) {
            var toBeRequested = new Ext.util.Collection();

            for (var i = 0; i < items.length; i++) {
                var fields = this.visibleFields;
                if (this.fieldConfig.allowMultipleAssignments || !this.objectAlreadyExists(items[i].id)) {
                    toBeRequested.add(this.loadObjectData(items[i], fields));
                }
            }
            this.requestNicePathData(toBeRequested);
        }
    },

    getCellEditValue: function () {
        return this.getValue();
    },

    objectAlreadyExists: function (id) {

        // check max amount in field
        if (this.fieldConfig["maxItems"] && this.fieldConfig["maxItems"] >= 1) {
            if ((this.store.getData().getSource() || this.store.getData()).count() >= this.fieldConfig.maxItems) {
                Ext.Msg.alert(t("error"), t("limit_reached"));
                return true;
            }
        }

        // check for existing object
        var result = this.store.query("id", new RegExp("^" + id + "$"));

        if (result.length < 1) {
            return false;
        }
        return true;
    },

    getValue: function () {

        var tmData = [];

        if (this.fieldConfig.displayMode === 'combo') {
            return this.component.getValue().map(function(value) {
                return {id: value}
            });
        }

        var data = this.store.queryBy(function (record, id) {
            return true;
        });


        for (var i = 0; i < data.items.length; i++) {
            tmData.push(data.items[i].data);
        }
        return tmData;
    },

    getName: function () {
        return this.fieldConfig.name;
    },

    dndAllowed: function (data, fromTree) {

        // check if data is a treenode, if not allow drop because of the reordering
        if (!fromTree) {
            if (data["grid"] && data["grid"] == this.component) {
                return true;
            }
            return false;
        }

        // only allow objects not folders
        if (data.type == "folder" || data.elementType != "object") {
            return false;
        }

        var classname = data.className;
        var isAllowedClass = false;
        if (this.fieldConfig.classes != null && this.fieldConfig.classes.length > 0) {
            for (var i = 0; i < this.fieldConfig.classes.length; i++) {
                if (this.fieldConfig.classes[i].classes == classname) {
                    isAllowedClass = true;
                    break;
                }
            }

        } else {
            isAllowedClass = true;
        }
        return isAllowedClass;
    },

    isDirty: function () {
        if (!this.isRendered()) {
            return false;
        }

        return this.dataChanged;
    },

    requestNicePathData: function (targets, isInitialLoad) {
        if (!this.object) {
            return;
        }

        targets = this.normalizeTargetData(targets);

        var fields = [];
        var context = this.getContext();
        var loadEditModeData = false;
        if(isInitialLoad && this.fieldConfig.optimizedAdminLoading && context['containerType'] == 'object') {
            loadEditModeData = true;

            if(this.visibleFields) {
                fields = fields.concat(this.visibleFields);
            }

            if(this.fieldConfig.columnKeys) {
                fields = fields.concat(this.fieldConfig.columnKeys);
            }
        }


        var nicePathRequested = pimcore.helpers.requestNicePathData(
            {
                type: "object",
                id: this.object.id
            },
            targets,
            {
                idProperty: this.idProperty,
                loadEditModeData: loadEditModeData
            },
            this.fieldConfig,
            context,
            pimcore.helpers.requestNicePathDataGridDecorator.bind(this, this.component.getView()),
            pimcore.helpers.getNicePathHandlerStore.bind(this, this.store, {
                idProperty: this.idProperty,
                pathProperty: this.pathProperty,
                loadEditModeData: loadEditModeData,
                fields: fields
            }, this.component.getView())
        );

        // unfortunately we have to use a timeout here to adjust the height of grids configured
        // with autoHeight: true, there are no other events that would work, see also:
        // - https://github.com/pimcore/pimcore/pull/4337
        // - https://github.com/pimcore/pimcore/pull/4909
        // - https://github.com/pimcore/pimcore/pull/5367
        window.setTimeout(function () {
            this.component.getView().refresh();
        }.bind(this), 500);
    },

    normalizeTargetData: function (targets) {
        if (!targets) {
            return targets;
        }

        targets.each(function (record) {
            var type = record.data.type;
            record.data.type = "object";
            record.data.subtype = type;
            record.data.path = record.data.fullpath;
        }, this);

        return targets;
    },

    loadObjectData: function (item, fields) {

        var newItem = this.store.add(item);

        Ext.Ajax.request({
            url: Routing.generate('pimcore_admin_dataobject_dataobjecthelper_loadobjectdata'),
            params: {
                id: item.id,
                'fields[]': fields
            },
            success: function (response) {
                var rdata = Ext.decode(response.responseText);
                var key;

                if (rdata.success) {
                    var rec = newItem[0];
                    for (key in rdata.fields) {
                        //add all key exept fullpath to not overwrite possible nice path
                        if(key !== 'fullpath') {
                            rec.set(key, rdata.fields[key]);
                        }
                    }
                }
            }.bind(this)
        });

        return newItem;
    },

});
