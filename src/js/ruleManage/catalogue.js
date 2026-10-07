define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    require('../common/treeView');
    require('../common/ruleEditorDirective');

    agGrid.initialiseAgGridWithAngular1(angular);
    var md = angular.module('catalogueApp',['yxBase','yxDirective','myApp.tree','ruleEditorDirective','agGrid']);
    md.controller('catalogueController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = baseService.getCache('dim') || {selectedCatalogue:{}};
            scope.addDim = {};
            scope.oriTreeData = [{label:'',children:[]}];
            scope.treeData = [{label:'',children:[]}];
            scope.options = {};
            scope.fieldNames = [];

            scope.SHARED_COLUMN_CONFIG = {
                flex: 1,
                minWidth: 180,
                sortable: false,
                resizable: true,
                editable: false,
                cellEditorSelector: function (params) {
                    return {
                        component: 'comboEditor',
                        params: { editable: false }
                    };
                }
            };

            scope.gridOptions = {
                headerHeight: 0,
                pinnedTopRowData: [],
                rowData: [],
                columnDefs: buildColumnDefs(),
                components: {
                    comboEditor: ComboEditor
                },
                context: {
                    // 传递给自定义组件，用于触发 AngularJS digest
                    $timeout: $timeout
                },
                defaultColDef: {
                    sortable: false,
                    resizable: true,
                    editable: false
                },
                rowSelection: 'multiple',
                suppressRowClickSelection: true
            };

            initAppData();
        }

        function initAppData(){
            var url = "/app/queryFlowApps";
            var promise = baseService.http(url,{pageNum:1,pageSize:2000});
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.apps = result;
                if($scope.dim.ruleRepositoryId){
                    $scope.changeApp($scope.dim.ruleRepositoryId);
                }
            },function(data){
				baseService.tips('获取应用列表失败：'+data,'danger',$scope);
			});
        }

        $scope.changeApp = function(ruleRepositoryId){
            $scope.addDim.ruleRepositoryId = ruleRepositoryId;
            var url = "/api/catalogue/list?ruleRepositoryId="+ruleRepositoryId;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = (data && data.length != 0) ? data : [];
                $scope.oriTreeData = result;
                $scope.treeData = angular.copy(result);
            },function(data){
				baseService.tips('获取目录失败：'+data,'danger',$scope);
			});
        }

        $scope.changeSelected = function(node){
            if(node.ruleId && $scope.ctrl.currentRuleId != node.ruleId){
                clearTokens();
                var url = "/api/rule/detail?ruleId="+node.ruleId;
                var promise = baseService.http(url,null,'get');
                promise.then(function(data){
                    $scope.editorTokens = JSON.parse(data.ruleNote.ruleNote);
                    if(!_.isEmpty(data.defineResults)){
                        var thenResult = _.find(data.defineResults,{ruleResultType:'1'});
                        if(thenResult){
                            $scope.thenTokens = JSON.parse(thenResult.ruleResultNote);
                        }

                        var elseResult = _.find(data.defineResults,{ruleResultType:'2'});
                        if(elseResult){
                            $scope.elseTokens = JSON.parse(elseResult.ruleResultNote);
                        }
                    }
                    $scope.ctrl.currentRuleId = node.ruleId;
                    $scope.ctrl.currentTableId = null;
                    $scope.tempDim = {ruleId : node.ruleId,ruleName : node.label,idRuleDefine: data.idRuleDefine};
                },function(data){
                    baseService.tips('获取规则失败：'+data,'danger',$scope);
                });
            } else if(node.idRuleTable && $scope.ctrl.currentTableId != node.idRuleTable){
                clearTokens();
                var url = "/api/ruleTable/getById?idRuleTable="+node.idRuleTable;
                var promise = baseService.http(url,null,'get');
                promise.then(function(data){
                    $scope.tableData = data;
                    var tableRows = [];
                    var pinnedRowData = [];
                    var rowNum = null;
                    var row = null;
                    _.each(data.detailList,function(item){
                        if(rowNum != item.rowNum){
                            rowNum = item.rowNum;
                            row = {};
                            if(parseInt(item.rowNum) <= 1){
                                pinnedRowData.push(row);
                            }else{
                                tableRows.push(row);
                            }
                        }
                        row[item.columnNum] = item.cellValue;
                        row[item.columnNum + '_path'] = item.cellPath;
                        if(!$scope.fieldNames.includes(item.columnNum)){
                            $scope.fieldNames.push(item.columnNum);
                        }
                    });

                    $scope.gridOptions.api.setColumnDefs(buildColumnDefs());
                    $scope.gridOptions.api.setPinnedTopRowData(pinnedRowData);
                    $scope.gridOptions.api.setRowData(tableRows);

                    $scope.ctrl.currentTableId = node.idRuleTable;
                    $scope.ctrl.currentRuleId = null;
                    $scope.tempDim = {tableName : node.label,idRuleTable : data.idRuleTable};
                    if(data.ruleDefineDTO){
                        $scope.editorTokens = JSON.parse(data.ruleDefineDTO.ruleNote.ruleNote);
                        $scope.tempDim.ruleDefineDTO = {idRuleDefine:data.ruleDefineDTO.idRuleDefine,ruleId:data.ruleDefineDTO.ruleId};
                    }
                },function(data){
                    baseService.tips('获取决策表失败：'+data,'danger',$scope);
                });
            }
            $scope.dim.selectedCatalogue = node;
        }

        function clearTokens(){
            $scope.preTokens = null;
            $scope.editorTokens = null;
            $scope.thenTokens = null;
            $scope.elseTokens = null;
            $scope.tableData = null;
        }

        function buildColumnDefs() {
            return $scope.fieldNames.map(function (field) {
                return angular.extend({}, $scope.SHARED_COLUMN_CONFIG, { field: field });
            });
        }

        $scope.addCatalogue = function(type,name){
            baseService.modal(type,name);
        }

        $scope.saveCatalogue = function(form){
            if(!baseService.validForm(form)){
                return;
            }

            if(!$scope.addDim.ruleRepositoryId){
                baseService.tips('请选择应用','warning',$scope);
                return;
            }

            var param = {ruleRepositoryId:$scope.addDim.ruleRepositoryId};
            if($scope.dim.selectedCatalogue && $scope.dim.selectedCatalogue.catalogue){
                param.catalogue = $scope.dim.selectedCatalogue.catalogue + "/" + $scope.addDim.catalogue;
            }else{
                param.catalogue = $scope.addDim.catalogue;
            }

            var url = "/api/catalogue/add";
            var promise = baseService.http(url,param);
            promise.then(function(data){
                baseService.tips('新增目录成功','success',$scope);
                $scope.changeApp($scope.addDim.ruleRepositoryId);
                baseService.modal('hide','appCatalogueModal');
            },function(data){
				baseService.tips('新增目录失败，请联系开发'+data,'danger',$scope);
			});
        }

        $scope.delCatalogue = function(){
            if(!$scope.dim.selectedCatalogue || !$scope.dim.selectedCatalogue.ruleRepCatalogueId){
                baseService.tips('请选择要删除的目录','warning',$scope);
                return;
            }

            var url = "/api/catalogue/delete?id="+$scope.dim.selectedCatalogue.ruleRepCatalogueId;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                baseService.tips('删除目录成功','success',$scope);
                $scope.changeApp($scope.addDim.ruleRepositoryId);
            },function(data){
				baseService.tips('删除目录失败，请联系开发'+data,'danger',$scope);
			});
        }

        $scope.delRules = function(){
            var customData = {ruleRepCatalogueId:null,ruleList:[]};
            customData = baseService.filterCheckTree($scope.treeData,customData);
            if(_.isEmpty(customData.ruleList)){
                baseService.tips('请选择要删除的规则或决策表','warning',$scope);
                return;
            }

            var url = "/api/catalogue/deleteChild";
            var promise = baseService.http(url,customData.ruleList);
            promise.then(function(data){
                baseService.tips('删除规则或决策表成功','success',$scope);
                $scope.changeApp($scope.addDim.ruleRepositoryId);
            },function(data){
                baseService.tips('删除规则或决策表失败，请联系开发'+data,'danger',$scope);
            });
        }

        $scope.addRule = function(){
            if(!$scope.dim.selectedCatalogue || !$scope.dim.selectedCatalogue.ruleRepCatalogueId){
                baseService.tips('请选择目录','danger',$scope);
                return;
            }

            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('preTokens',null);
            baseService.setCache('editorTokens',null);
            baseService.setCache('thenTokens',null);
            baseService.setCache('elseTokens',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/ruleEdit.html";
        }

        $scope.addTable = function(){
            if(!$scope.dim.selectedCatalogue || !$scope.dim.selectedCatalogue.ruleRepCatalogueId){
                baseService.tips('请选择目录','danger',$scope);
                return;
            }

            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('preTokens',null);
            baseService.setCache('editorTokens',null);
            baseService.setCache('thenTokens',null);
            baseService.setCache('elseTokens',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/tableEdit.html";
        }

        $scope.editRule = function(){
            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('preTokens',$scope.preTokens);
            baseService.setCache('editorTokens',$scope.editorTokens);
            baseService.setCache('thenTokens',$scope.thenTokens);
            baseService.setCache('elseTokens',$scope.elseTokens);
            baseService.setCache('tempDim',$scope.tempDim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/ruleEdit.html";
        }

        $scope.editTable = function(){
            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('preTokens',$scope.preTokens);
            baseService.setCache('editorTokens',$scope.editorTokens);
            baseService.setCache('tableData',$scope.tableData);
            baseService.setCache('tempDim',$scope.tempDim);
            baseService.setCache('thenTokens',null);
            baseService.setCache('elseTokens',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/tableEdit.html";
        }

        $scope.filterRepository = function(name){
            if(!name || name == '' || name.length == 0){
                $scope.treeData = angular.copy($scope.oriTreeData);
                return;
            }
            var filterList = baseService.searchTree($scope.oriTreeData,name);
            $scope.treeData = filterList;
        }

        // ================================================================
        // 组件 C：可下拉可输入编辑器
        // ================================================================
        function ComboEditor() {}
        ComboEditor.prototype.init = function (params) {
            var self = this;
            self.params = params;
            self.selectedPath = null;
            self.selectedName = null;

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'combo-editor-input';
            // ✅ 初始展示：优先用 row 里的 _path
            var field = params.colDef.field;
            input.value = (params.data && params.data[field]) || params.value || '';

            self.eInput = input;

            input.addEventListener('focus', function () { showPanel(); });
            input.addEventListener('input', function () {
                // 手动输入 → 清空已选中记录，走"自由文本"逻辑
                self.selectedPath = null;
                self.selectedName = null;
            });
        };

        ComboEditor.prototype.afterGuiAttached = function () {
            if (this.eInput) {
                this.eInput.focus();
                this.eInput.select();
            }
        };

        // ✅ 核心：返回 path，同时把 name 写到 _path
        ComboEditor.prototype.getValue = function () {
            var field = this.params.colDef.field;
            var pathValue, nameValue;

            if (this.selectedPath !== null && this.selectedPath !== undefined) {
                // 从下拉里选的
                pathValue = this.selectedPath;
                nameValue = this.selectedName;
            } else {
                // 手动输入的：path 用输入文本兜底，name 用输入文本
                pathValue = this.eInput ? this.eInput.value : '';
                nameValue = pathValue;
            }

            // ✅ 写 name 字段（AG Grid 只会用 getValue() 的结果写 field，所以这里手动写 _path）
            if (this.params.data) {
                this.params.data[field + '_path'] = pathValue;
            }

            return nameValue;
        };

        ComboEditor.prototype.isPopup = function () { return false; };

        ComboEditor.prototype.refresh = function (params) {
            if (this.eInput) {
                var field = params.colDef.field;
                this.eInput.value = (params.data && params.data[field]) || params.value || '';
            }
            return true;
        };

        ComboEditor.prototype.destroy = function () {
            if (this.ePanel && this.ePanel.parentNode) {
                this.ePanel.parentNode.removeChild(this.ePanel);
            }
            if (this._docHandler) {
                document.removeEventListener('mousedown', this._docHandler);
            }
        };

        init($scope);
    });
    angular.bootstrap(document,['catalogueApp']);
});
