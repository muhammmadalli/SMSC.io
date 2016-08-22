import { ODatabaseService } from "../orientdb/orientdb.service";
import { Injectable } from "@angular/core";
import { RequestGetParameters } from "../orientdb/orientdb.requestGetParameters";
import { Router, ActivatedRoute } from "@angular/router";
import { Response } from "@angular/http";
import { TranslateService } from "ng2-translate/ng2-translate";
import { CrudModel } from "./crud.model";
import { GridOptions } from "ag-grid";
import { ServiceNotifications } from "../services/serviceNotification";

const squel = require('squel');

let cubeGridHtml = require('../common/spinner/cubeGrid/cubeGrid.html');
let cubeGridStyle = require('../common/spinner/cubeGrid/cubeGrid.scss');

@Injectable()
export class CrudService {
    crudModel = new CrudModel([], []);

    public pageSize = 50;
    public showCrudModify: boolean = false;
    public isEditForm: boolean = false;
    public lastCrudElement: any;
    public allOfTheData;
    public focusedRow: any;
    public addingFormValid = false;
    public querySelectors = null;
    public embeddedList = null;
    public isActiveLinkset = null;
    public rowSelectionLinkset = null;
    public linkedClass = null;
    public showLinksetView = false;
    public initGridData: Promise<any>;
    public crud: Promise<any> = Promise.resolve();
    public parentPath = null;
    public className = null;
    public dataNotFound = false;
    public successExecute = false;
    public errorMessage = '';
    public successMessage = '';
    public multiCrud = [];
    public titleColumns = {};
    public model = {};

    public gridOptions: GridOptions = {
        columnDefs: this.crudModel.columnDefs,
        rowData: this.crudModel.rowData,
        rowSelection: 'multiple',
        rowHeight: 50,
        rowModelType: 'pagination'
    };

    constructor(public databaseService: ODatabaseService,
                public router: Router,
                public route: ActivatedRoute,
                public translate: TranslateService,
                public serviceNotifications: ServiceNotifications) {
    }

    onFilterChanged(value, gridOptions) {
        gridOptions.api.setQuickFilter(value);
    }

    cellValueChanged(value) {
        this.updateRecord(value.data);
    }

    createRecord(colsValue): Promise<any> {
        let params: RequestGetParameters = {
            "nameClass": this.getClassName(),
            "colsValue": colsValue
        };

        this.crud = this.databaseService.insert(params)
            .then((res) => {
                this.serviceNotifications.createNotification('success', 'message.create', 'orientdb.successCreate');
                return res;
            }, (error) => {
                this.dataNotFound = true;
                this.errorMessage = 'orientdb.dataNotCorrect';
            });

        return this.crud;
    }

    updateRecord(value) {
        let colsValue = [];

        for (let key in value) {
            if (key !== 'rid' && key !== 'version') {
                colsValue.push(value[ key ]);
            }
        }

        let params = {
            "rid": value.rid,
            "version": value.version,
            "colsValue": value
        };

        this.crud = this.databaseService.update(params)
            .then((res) => {
                value.version++;
                this.serviceNotifications.createNotification('success', 'message.update', 'orientdb.successUpdate');
            }, (error) => {
                this.dataNotFound = true;
                this.errorMessage = 'orientdb.dataNotCorrect';
            });

        return this.crud;
    }

    deleteRecord(rid): Promise<any> {
        this.crud = this.databaseService.delete(rid)
            .then((res) => {
                this.serviceNotifications.createNotification('success', 'message.delete', 'orientdb.successDelete');
            }, (error) => {
                this.dataNotFound = true;
                this.errorMessage = 'orientdb.dataNotFound';
            });

        return this.crud;
    }

    multipleDeleteRecords(): Promise<any> {
        let result: Promise<any>;

        this.gridOptions.api.getSelectedRows().forEach((i) => {
            result = this.deleteRecord(i.rid);
        });

        return result;
    }

    clickOnCell(event) {
        let columnDefs = event.colDef;

        switch (columnDefs.type) {
            case 'LINKSET':
            case 'LINK':
                this.isActiveLinkset = columnDefs.field;
                break;

            case 'EMBEDDEDLIST':
                this.embeddedList = columnDefs.custom[ 'type' ] || '';
                break;
        }
    }

    rowSelected(gridOptions) {
        if (gridOptions.api.getSelectedRows().length === gridOptions.rowData.length) {
            this.changeCheckboxState('allSelected', gridOptions);
        } else if (!gridOptions.api.getSelectedRows().length) {
            this.changeCheckboxState('notSelected', gridOptions);
        } else {
            this.changeCheckboxState('notAllSelected', gridOptions);
        }
    }

    getStore(className) {
        return this.databaseService.query('select from ' + className)
            .then((res: Response) => {
                let result = res.json()[ 'result' ];

                result.forEach((item) => {
                    item[ 'rid' ] = item[ '@rid' ];
                    item[ 'version' ] = item[ '@version' ];

                    delete item[ '@rid' ];
                    delete item[ '@version' ];
                    delete item[ '@fieldTypes' ];
                    delete item[ '@class' ];
                    delete item[ '@type' ];
                });

                return result;
            })
    }

    overlayLoadingTemplate() {
        return cubeGridHtml + '<style>' + cubeGridStyle + '</style>';
    }

    addCheckboxSelection(columnDefs, gridOptions) {
        columnDefs.unshift({
            headerName: " ",
            field: "checkboxSel",
            width: 45,
            hideInForm: true,
            checkboxSelection: true,
            headerCellTemplate: () => {
                let that = this;
                let eCell = document.createElement('span');
                eCell.innerHTML =
                    '<div colid="checkboxSel" tabindex="-1" class="ag-cell-no-focus ag-cell ag-cell-not-inline-editing" style="left: 0px; width: 45px;"><span class="ag-cell-wrapper">' +
                    '   <span class="ag-selection-checkbox" id="select-all">' +
                    '       <img id="all-selected" style="display: none;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpFQ0VGQkU3ODM4MTFFNjExQjlCQzhERUVDNkNGMzFDMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBRkJCRDU1MTEyM0ExMUU2ODE4MUUyOTNBNTRGQkIxNyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBRkJCRDU1MDEyM0ExMUU2ODE4MUUyOTNBNTRGQkIxNyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjIzMkM4M0M1M0MxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkVDRUZCRTc4MzgxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+riMaEQAAAL5JREFUeNqUks0JhDAQhSd7tgtLMDUIyTXF2IdNWIE3c0ruYg9LtgcPzvpEF8SfHR8MGR75hpcwRERmrjQXCyutDKUQAkuFu2AUpsyiJ1JK0UtycRgGMsbsPBFYVRVZaw/+7Zu895znOY/j+PPWT7oGp2lirTU3TbPz/4IAAGLALeic47Ztlx7RELHrusPAAwgoy7LlrOuay7I8TXIadYOLouC+7+XgBiP2lTbw0crFGAF9ANq1kS75G8xXgAEAiqu9OeWZ/voAAAAASUVORK5CYII=">' +
                    '       <img id="not-selected" style="display: inline;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpFQ0VGQkU3ODM4MTFFNjExQjlCQzhERUVDNkNGMzFDMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2MkU1Rjk1NDExNDExMUU2ODhEQkMyRTJGOUNGODYyQyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2MkU1Rjk1MzExNDExMUU2ODhEQkMyRTJGOUNGODYyQyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjI1MkM4M0M1M0MxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkVDRUZCRTc4MzgxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+t+CXswAAAFBJREFUeNrsksENwDAIA023a9YGNqlItkixlAFIn1VOMv5wvACAOxOZWUwsB6Gqswp36QivJNhBRHDhI0f8j9jNrCy4O2twNMobT/7QeQUYAFaKU1yE2OfhAAAAAElFTkSuQmCC">' +
                    '       <img id="not-all-selected" style="display: none;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpFQ0VGQkU3ODM4MTFFNjExQjlCQzhERUVDNkNGMzFDMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMjU4MzhGQjEyM0ExMUU2QjAxM0Q2QjZFQ0IzNzM4NiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMjU4MzhGQTEyM0ExMUU2QjAxM0Q2QjZFQ0IzNzM4NiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjIzMkM4M0M1M0MxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkVDRUZCRTc4MzgxMUU2MTFCOUJDOERFRUM2Q0YzMUMzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+2Xml2QAAAGBJREFUeNpiYGBg8ATiZ0D8n0j8DKqH4dnhw4f/EwtAakF6GEGmAAEDKYCRkZGBiYFMQH+NLNjcjw2ghwMLIQWDx48Do/H5kSNHiNZw9OhREPUCRHiBNJOQyJ+A9AAEGACqkFldNkPUwwAAAABJRU5ErkJggg==">' +
                    '   </span>' +
                    '   <span class="ag-cell-value"></span></span>' +
                    '</div>';

                let clicked = false;

                this.querySelectors = {
                    eCalendar: eCell.querySelector('#select-all'),
                    allSelected: eCell.querySelector('#all-selected'),
                    notSelected: eCell.querySelector('#not-selected'),
                    notAllSelected: eCell.querySelector('#not-all-selected')
                };

                this.querySelectors.eCalendar.addEventListener('click', () => {
                    clicked = !clicked;

                    if (clicked) {
                        that.changeCheckboxState('allSelected', gridOptions);
                    } else {
                        that.changeCheckboxState('notSelected', gridOptions);
                    }
                });

                return eCell;
            }
        });
    }

    changeCheckboxState(isSelectCheckbox, gridOptions) {
        switch (isSelectCheckbox) {
            case 'allSelected':
                gridOptions.api.selectAll();

                this.querySelectors.allSelected.setAttribute('style', 'display: inline;');
                this.querySelectors.notSelected.setAttribute('style', 'display: none;');
                this.querySelectors.notAllSelected.setAttribute('style', 'display: none;');
                break;

            case 'notSelected':
                gridOptions.api.deselectAll();

                this.querySelectors.allSelected.setAttribute('style', 'display: none;');
                this.querySelectors.notSelected.setAttribute('style', 'display: inline;');
                this.querySelectors.notAllSelected.setAttribute('style', 'display: none;');
                break;

            case 'notAllSelected':
                this.querySelectors.allSelected.setAttribute('style', 'display: none;');
                this.querySelectors.notSelected.setAttribute('style', 'display: none;');
                this.querySelectors.notAllSelected.setAttribute('style', 'display: inline;');
                break;
        }
    }

    btnRenderer(columnDefs, nameBtn) {
        columnDefs.push({
            headerName: " ",
            field: nameBtn.toLowerCase(),
            width: 66,
            cellRenderer: () => {
                let that = this;
                let eCell = document.createElement('button');
                eCell.innerHTML = that.translate.get(nameBtn.toUpperCase())[ 'value' ];
                eCell.setAttribute('style', "height: 19px; background-color: #009688; color: #fff; border: none; " +
                    "border-radius: 3px; cursor: pointer;");
                eCell.addEventListener('click', () => {
                    if (nameBtn === 'Edit') {
                        that.router.navigateByUrl(that.parentPath + '/edit');
                    } else if (nameBtn === 'Create') {
                        that.router.navigateByUrl(that.parentPath + '/create');
                    }
                });
                return eCell;
            },
            hideInForm: true
        });
    }

    createNewDatasource(allOfTheData, gridOptions) {
        if (!this.allOfTheData) {
            return;
        }

        var dataSource = {
            pageSize: this.pageSize,
            getRows: (params) => {
                setTimeout(() => {
                    var rowsThisPage = allOfTheData.slice(params.startRow, params.endRow);

                    var lastRow = -1;
                    if (allOfTheData.length <= params.endRow) {
                        lastRow = allOfTheData.length;
                    }
                    params.successCallback(rowsThisPage, lastRow);
                }, 500);
            }
        };

        gridOptions.api.setDatasource(dataSource);
    }

    setRowData(rowData, gridOptions) {
        this.allOfTheData = rowData;
        this.createNewDatasource(this.allOfTheData, gridOptions);
    }

    getColumnDefs(className, readOnly) {
        let columnDefs = [];

        columnDefs.push({
            headerName: "RID",
            field: "rid",
            hideInForm: true,
            width: 55
        });

        if (readOnly) {
            this.btnRenderer(columnDefs, 'Edit');
            this.btnRenderer(columnDefs, 'Delete');
        }

        return this.databaseService.getInfoClass(className)
            .then((res: Response) => {
                let result: Promise<any>;

                res.json().properties.forEach((item) => {
                    result = this.translate.get(item.name.toUpperCase()).toPromise().then((res: string) => {
                        columnDefs.push({
                            headerName: res,
                            field: item.name,
                            editable: !item.readonly,
                            required: item.mandatory,
                            type: item.type,
                            linkedClass: item.linkedClass,
                            custom: item.custom || ''
                        });
                    })
                        .then(() => {
                            return columnDefs;
                        });
                });

                return result;
            })
    }

    hideAllMessageBoxes() {
        this.dataNotFound = false;
        this.successExecute = false;
    }

    initializationGrid(className, initRowData?: (columnDefs) => void, initColumnDefs?: (rowData) => void): Promise<any> {
        this.initGridData = new Promise((resolve, reject) => {
            this.getColumnDefs(className, true)
                .then((columnDefs) => {
                    this.crudModel.columnDefs = columnDefs;
                    if (initColumnDefs) {
                        initColumnDefs(columnDefs);
                    }
                })
                .then((res) => {
                    // init the row data
                    this.getStore(className)
                        .then((store) => {
                            this.crudModel.rowData = store;
                            if (initRowData) {
                                initRowData(store);
                            }
                            resolve();
                        }, (error) => {
                            this.dataNotFound = true;
                            this.errorMessage = 'orientdb.dataNotFound';
                        });
                });
        });

        return this.initGridData;
    }

    getClassName() {
        if (this.linkedClass) {
            return this.linkedClass;
        } else {
            return this.className;
        }
    }
}
