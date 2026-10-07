define(function (require) {
    require('../common/base').init();
    require('../common/ruleEditorDirective');

    agGrid.initialiseAgGridWithAngular1(angular);
    var md = angular.module('tableEditApp', ['yxBase', 'ruleEditorDirective','agGrid','angular-jsoneditor']);

    md.controller('tableEditController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.ruleRepCatalogueId = baseService.getCache('ruleRepCatalogueId');
            var tableData = baseService.getCache('tableData');
            scope.ctrl = { previewCollapsed: false ,whenCollapsed:false,editable:true};
            scope.addDim = baseService.getCache('tempDim') || {};
            scope.tempSave = {};
            scope.options = {};
            scope.bomTree = [];
            scope.baseDatas = [];
            scope.operators = [];
            scope.fieldNames = [];
            scope.editorTokens = baseService.getCache('editorTokens') || [];
            scope.preTokens = baseService.getCache('preTokens') || [];
            if(scope.preTokens && scope.preTokens.length > 0) {
                scope.ctrl.previewCollapsed = true;
            }
            if(scope.editorTokens && scope.editorTokens.length > 0) {
                scope.ctrl.whenCollapsed = true;
            }
            scope.customerTextDataRel = [
                {key:'+',value:'+'},
                {key:'-',value:'-'},
                {key:'*',value:'*'},
                {key:'/',value:'/'},
                {key:'(',value:'('},
                {key:')',value:')'},
                {key:';',value:';'},
                {key:'并且',value:'&&'},
                {key:'或者',value:'||'},
                {key:'的',value:'.'},
                {key:'为',value:'='}
            ];

            scope.ctrl.editorOptions = {
                mode: 'text',
                modes: ['tree', 'code', 'text'],
                onChange: function () {
                }
            };

            // ★ 右键菜单状态
            scope.ctxMenu = {
                visible: false,
                x: 0,
                y: 0,
                field: null,        // 右键点击的列 field
                rowIndex: null,     // 右键点击的行索引（pinned 行为 pinned 内部索引）
                rowPinned: null     // 'top' 或 null
            };

            initBom();
            initTableData(tableData);
        }

        function initTableData(tableData){
            // 字段名列表（动态可增删）
            $scope.fieldNames = ['col1', 'col2', 'col3'];
            $scope.fieldLength = parseInt($scope.fieldNames[$scope.fieldNames.length - 1].substring(3));
            if(tableData){
                buildEditTableData(tableData);
            }else{
                buildDefaultTableData();
            }
            // ---------- Grid Options ----------
            $scope.gridOptions = {
                headerHeight: 0,
                pinnedTopRowData: $scope.pinnedRowData,
                rowData: $scope.tableData,
                columnDefs: buildColumnDefs(),
                components: {
                    treeSearchRenderer: TreeSearchRenderer,
                    simpleSelectRenderer: SimpleSelectRenderer,
                    comboEditor: ComboEditor
                },
                context: {
                    // 传递给自定义组件，用于触发 AngularJS digest
                    $timeout: $timeout
                },
                defaultColDef: {
                    sortable: false,
                    resizable: true,
                    editable: $scope.ctrl.editable
                },
                rowSelection: 'multiple',
                suppressRowClickSelection: true,

                // ★ 右键菜单：捕获右键事件
                onCellContextMenu: function (params) {
                    if (params.event) {
                        params.event.preventDefault();
                    }

                    // ★ 右键时，关闭所有可能打开的下拉面板
                    document.querySelectorAll('.tree-search-panel, .combo-editor-panel').forEach(function (el) {
                        el.style.display = 'none';
                    });

                    $scope.$apply(function () {
                        $scope.ctxMenu.visible = true;
                        $scope.ctxMenu.x = params.event.clientX;
                        $scope.ctxMenu.y = params.event.clientY;
                        $scope.ctxMenu.field = params.colDef ? params.colDef.field : null;
                        $scope.ctxMenu.rowPinned = params.node.rowPinned || null;
                        $scope.ctxMenu.rowIndex = params.node.rowIndex;
                    });
                }
            };
        }

        function buildEditTableData(tableData) {
            var tableRows = [];
            var pinnedRowData = [];
            var rowNum = null;
            var row = null;
            _.each(tableData.detailList,function(item){
                if(rowNum != item.rowNum){
                    rowNum = item.rowNum;
                    row = {};
                    if(parseInt(item.rowNum) <= 1){
                        if(parseInt(item.rowNum) === 0){
                            row._pinnedType='treeSearch';
                        }else{
                            row._pinnedType='simpleSelect';
                        }
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

            $scope.tableData = tableRows;
            $scope.pinnedRowData = pinnedRowData;
        }

        function buildDefaultTableData(){
            // ---------------- Pinned 两行数据 ----------------
            $scope.pinnedRowData = [
                // 第 1 行：树形搜索下拉（表头行）
                {
                    _pinnedType: 'treeSearch',
                    col1: '', col1_path: '',
                    col2: '', col2_path: '',
                    col3: '', col3_path: ''
                },
                // 第 2 行：普通下拉
                {
                    _pinnedType: 'simpleSelect',
                    col1: '', col1_path: '',
                    col2: '', col2_path: '',
                    col3: '', col3_path: ''
                }
            ];

            // ---------------- 数据行 ----------------
            $scope.tableData = [
                { col1: '',col1_path: '', col2: '', col2_path: '',col3: '',col3_path: '' }
            ];
        }

        function initBom() {
            baseService.httpNoModal('/bom/primaries', null, 'get').then(function (data) {
                var result = data || [];
                $scope.bomTree = result;                 // ⭐ 原始树喂给指令做回退定位
                getOperatorsByType();
            }, function (data) {
                baseService.tips('获取bom失败：' + data, 'danger', $scope);
            });
        }

        function getOperatorsByType (propertyType) {
            baseService.http('/api/metaRule/list', null, 'get').then(function (data) {
                $scope.operators = data || [];
                $scope.operators.unshift({metaRuleId:'RESULT_COLUMN',metaRuleName:'决策列'});
                _.each($scope.operators,function(item){
                    item.name = item.metaRuleName;
                    item.path = item.metaRuleId;
                });


                // ---------- 共享列配置模板 ----------
                $scope.SHARED_COLUMN_CONFIG = {
                    flex: 1,
                    minWidth: 180,
                    sortable: false,
                    resizable: true,
                    editable: $scope.ctrl.editable,          // ✅ 显式声明可编辑
                    cellRendererSelector: function (params) {
                        if (params.node.rowPinned !== 'top') return null;
                        if (params.data._pinnedType === 'treeSearch') {
                            return {
                                component: 'treeSearchRenderer',
                                params: { treeData: $scope.bomTree, placeholder: '搜索...',editable: $scope.ctrl.editable }
                            };
                        }
                        return {
                            component: 'simpleSelectRenderer',
                            params: { options: $scope.operators, placeholder: '请选择...',editable: $scope.ctrl.editable }
                        };
                    },
                    cellEditorSelector: function (params) {
                        if (params.node.rowPinned === 'top') return null;
                        return {
                            component: 'comboEditor',
                            params: { treeData: $scope.bomTree, placeholder: '搜索...',editable: $scope.ctrl.editable }
                        };
                    }
                };
                $scope.gridOptions.api.setColumnDefs(buildColumnDefs());
            }, function (data) {
                baseService.tips('获取元规则失败：' + data, 'danger', $scope);
            });
        };

        // 需求7：基础数据（选完判断符后取值用）
        $scope.queryBaseData = function (baseType) {
            return baseService.httpNoModal('/api/base-data/list?baseType=' + baseType, null, 'get');
        };

        // 需求6：按类名拉属性，作为 method 返回类型的下一层
        $scope.getPropertyByClass = function (property) {
            baseService.httpNoModal('/bom/getPropertyByClass?className=' + property, null, 'get').then(function (data) {
                var result = data || [];
                $scope.filterCommands(result, true);
            }, function (data) {
                baseService.tips('获取属性失败：' + data, 'danger', $scope);
            });
        };

        $scope.toBack = function(){
            baseService.setCache('ruleRepCatalogueId',null);
            baseService.setCache('preTokens',null);
            baseService.setCache('editorTokens',null);
            baseService.setCache('tableData',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/catalogue.html";
        }

        $scope.saveRule = function(ruleForm){
            if(!baseService.validForm(ruleForm)){
                return;
            }
            buildSaveEdit();

            var url = '/api/ruleTable/save';
            if($scope.addDim.idRuleTable){
                url = '/api/ruleTable/update';
            }
            baseService.http(url, angular.copy($scope.addDim)).then(function (data) {
                baseService.tips('保存决策表成功', 'success', $scope);
            }, function (data) {
                baseService.tips('保存决策表失败：' + data, 'danger', $scope);
            });

        }

        function buildSaveEdit(){
            if(!_.isEmpty($scope.editorTokens)){
                var ruleSpel = '';
                var ruleDefineDTO = {};
                ruleSpel = buildWhenRule(ruleSpel,ruleDefineDTO);
                ruleDefineDTO.ruleSpel = ruleSpel;
                ruleDefineDTO.ruleNote = {ruleNote : JSON.stringify($scope.editorTokens)};
                $scope.addDim.ruleDefineDTO = {...$scope.addDim.ruleDefineDTO,...ruleDefineDTO};
            }

            buildTableData($scope.addDim);
            $scope.addDim.ruleRepCatalogueRelDTO = {idRuleTable : $scope.addDim.idRuleTable,ruleRepCatalogueId:$scope.ruleRepCatalogueId};
        }

        function buildTableData(dim) {
            var list = [];

            // Pinned 第 1 行（树形选择）
            var pinnedTree = {};
            $scope.fieldNames.forEach(function (field) {
                pinnedTree[field] = {value : $scope.pinnedRowData[0][field],path:$scope.pinnedRowData[0][field+'_path']};
            });
            list.push(pinnedTree);

            // Pinned 第 2 行（普通选择）
            var pinnedSimple = {};
            $scope.fieldNames.forEach(function (field) {
                pinnedSimple[field] = {value : $scope.pinnedRowData[1][field],path:$scope.pinnedRowData[1][field+'_path']};
            });
            list.push(pinnedSimple);

            // 数据行
            var tableRows = $scope.tableData.map(function (row) {
                var item = {};
                $scope.fieldNames.forEach(function (field) {
                    item[field] = {value : row[field],path:row[field+'_path']};
                });
                return item;
            });

            list = list.concat(tableRows);

            var detailList = []
            for(var i = 0; i < list.length; i++) {
                for(var property in list[i]){
                    var item = {};
                    item.rowNum = i;
                    item.cellValue = list[i][property].value;
                    item.cellPath = list[i][property].path;
                    item.columnNum = property;
                    item.cellAddress = property + "_" + i;
                    detailList.push(item);
                }
            }

            dim.detailList = detailList;
        }

        function buildWhenRule(ruleSpel,ruleDefineDTO){
            var metaSpel = 'list[?]';
            var index = 0;
            if(!_.isEmpty($scope.editorTokens)){
                var defineParams = [];
                var preOperatorIndex = 0;
                for(var i = 0; i < $scope.editorTokens.length; i++){
                    var token = $scope.editorTokens[i];
                    if(!token.context && token.text !== '的'){
                        var tokenText = _.find($scope.customerTextDataRel,{key:token.text});
                        if(tokenText){
                            ruleSpel += tokenText.value;
                        }
                    }
                    if(token.context != 'operator'){
                        continue;
                    }else{
                        var paramToken1 = buildParamToken($scope.editorTokens,preOperatorIndex,i-1);
                        var paramToken2 = buildParamToken($scope.editorTokens,i+1);
                        var bomParam = {};
                        var metaRule = token.dataRef;
                        bomParam.paramCode = metaRule.metaDefineParams[0].metaRuleParamId;
                        bomParam.paramValue = paramToken1.dataRef.path;
                        bomParam.metaRuleId = metaRule.metaRuleId;
                        bomParam.metaRuleNo = index;
                        defineParams.push(bomParam);

                        var ruleParam = {};
                        ruleParam.paramCode = metaRule.metaDefineParams[metaRule.metaDefineParams.length - 1].metaRuleParamId;
                        ruleParam.paramValue = paramToken2.dataRef ? paramToken2.dataRef.path : paramToken2.text;
                        ruleParam.metaRuleId = metaRule.metaRuleId;
                        ruleParam.metaRuleNo = index;
                        defineParams.push(ruleParam);

                        var ruleSpelTemp = metaSpel.replace('?',index);

                        ruleSpel += ruleSpelTemp;
                        preOperatorIndex = i;
                        index++;
                    }
                }

                ruleDefineDTO.defineParams = defineParams;
            }
            return ruleSpel;
        }

        function buildParamToken(editorTokens,preOperatorIndex,index){
            var token = {dataRef:{}};
            var path = '';
            var isStart = preOperatorIndex ? false : true;
            for(var i = preOperatorIndex; i < editorTokens.length; i ++){
                var temp = editorTokens[i];
                if(index){
                    if(preOperatorIndex && (temp.text == '并且' || temp.text == '或者')){
                        isStart = true;
                        continue;
                    }

                    if(!isStart){
                        continue;
                    }

                    if(i > index){
                        break;
                    }
                }else{
                    if(temp.text == '并且' || temp.text == '或者'){
                        break;
                    }
                }

                if(!temp.context){
                    var tokenText = _.find($scope.customerTextDataRel,{key:temp.text});
                    if(tokenText){
                        path += tokenText.value;
                    }
                }else{
                    path += temp.dataRef ? temp.dataRef.property : temp.text;
                }
            }
            token.dataRef.path = path;
            return token;
        }

        $scope.clear = function () {
            $scope.editorTokens = [];
            $scope.preTokens = [];
            $scope.tempSave = {};
        };

        $scope.previewSave = function(){
            $scope.tempSave = angular.copy($scope.addDim);
            if(!_.isEmpty($scope.editorTokens)){
                var ruleSpel = '';
                var ruleDefineDTO = {};
                ruleSpel = buildWhenRule(ruleSpel,ruleDefineDTO);
                ruleDefineDTO.ruleSpel = ruleSpel;
                ruleDefineDTO.ruleNote = {ruleNote : JSON.stringify($scope.editorTokens)};
                $scope.tempSave.ruleDefineDTO = {...$scope.addDim.ruleDefineDTO,...ruleDefineDTO};
            }

            buildTableData($scope.tempSave);
            $scope.tempSave.ruleRepCatalogueRelDTO = {idRuleTable : $scope.addDim.idRuleTable,ruleRepCatalogueId:$scope.ruleRepCatalogueId};
        }

        // ============================================================
        // ★ 右键菜单：统一动作处理
        // ============================================================
        $scope.ctxMenuAction = function (action,pinnedName,pinnedPath) {
            var fieldIndex = $scope.fieldNames.indexOf($scope.ctxMenu.field);
            var rowIndex = $scope.ctxMenu.rowIndex;
            var rowPinned = $scope.ctxMenu.rowPinned;

            switch (action) {
                case 'insertColLeft':
                    if (fieldIndex === -1) break;
                    addColumnAt(fieldIndex, 'left');
                    break;

                case 'insertColRight':
                    if (fieldIndex === -1) break;
                    addColumnAt(fieldIndex, 'right',pinnedName,pinnedPath);
                    break;

                case 'insertRowAbove':
                    if (rowPinned) break;           // pinned 行不允许增删
                    addRowAt(rowIndex);
                    break;

                case 'insertRowBelow':
                    if (rowPinned) break;
                    addRowAt(rowIndex + 1);
                    break;

                case 'deleteRow':
                    if (rowPinned) break;
                    deleteRowAt(rowIndex);
                    break;

                case 'deleteCol':
                    if (fieldIndex === -1) break;
                    deleteColumnAt(fieldIndex);
                    break;
            }
            $scope.ctxMenu.visible = false;
        }

        // ---------- 列操作 ----------
        function addColumnAt(index, position,pinnedName,pinnedPath) {
            var fieldName = 'col' + ($scope.fieldLength + 1);
            $scope.fieldLength++;

            var insertIndex = position === 'left' ? index : index + 1;

            // 给所有行（数据行 + pinned 行）补新字段的初始值
            $scope.tableData.forEach(function (row) {
                row[fieldName] = '';
                row[fieldName + '_path'] = '';
            });
            $scope.pinnedRowData.forEach(function (row,index) {
                row[fieldName] = '';
                row[fieldName + '_path'] = '';
                if(index === 0 && pinnedName && pinnedPath){
                    row[fieldName] = pinnedName;
                    row[fieldName + '_path'] = pinnedPath;
                }
            });

            $scope.fieldNames.splice(insertIndex, 0, fieldName);
            $scope.gridOptions.api.setColumnDefs(buildColumnDefs());
        }

        function deleteColumnAt(index) {
            if ($scope.fieldNames.length <= 1) {
                alert('至少保留一列');
                return;
            }
            var fieldName = $scope.fieldNames[index];
            $scope.fieldNames.splice(index, 1);

            $scope.tableData.forEach(function (row) {
                delete row[fieldName];
                delete row[fieldName + '_path'];
            });
            $scope.pinnedRowData.forEach(function (row) {
                delete row[fieldName];
                delete row[fieldName + '_path'];
            });

            $scope.gridOptions.api.setColumnDefs(buildColumnDefs());
        }

// ---------- 行操作 ----------
        function addRowAt(index) {
            var colData = {};
            _.each($scope.fieldNames, function (item) {
                colData[item] = '';
                colData[item + '_path'] = '';
            });

            // 注意：applyTransaction({ add: [...] }) 只能追加到末尾，
            // 要插入到指定位置，直接操作 tableData 后用 setRowData 刷新
            $scope.tableData.splice(index, 0, colData);
            $scope.gridOptions.api.setRowData($scope.tableData);
        }

        function deleteRowAt(index) {
            if ($scope.tableData.length <= 1) {
                alert('至少保留一行');
                return;
            }
            $scope.tableData.splice(index, 1);
            $scope.gridOptions.api.setRowData($scope.tableData);
        }

        // ---------- 生成 columnDefs ----------
        function buildColumnDefs() {
            return $scope.fieldNames.map(function (field) {
                return angular.extend({}, $scope.SHARED_COLUMN_CONFIG, { field: field });
            });
        }

        // ================================================================
        // 工具函数：树形展平（属性名改为 name / path）
        // ================================================================
        // 返回的每一项：
        //   name      - 显示文本
        //   path      - 存储值（唯一标识）
        //   key       - 内部层级 key（用于过滤时判断祖先关系，不对外暴露）
        //   level     - 层级深度（用于缩进）
        function flattenTree(tree, level, parentKey, result) {
            level = level || 0;
            parentKey = parentKey || '';
            result = result || [];
            tree.forEach(function(node) {
                var key = parentKey ? parentKey + '/' + node.path : node.path;
                result.push({
                    name: node.name,
                    pathName: node.pathName,
                    path: node.path,
                    paramList: node.paramList,
                    key: key,
                    level: level
                });
                if (node.children && node.children.length) {
                    flattenTree(node.children, level + 1, key, result);
                }
            });
            return result;
        }

        // 模糊过滤：保留匹配项及其所有祖先
        function filterTree(flatList, keyword) {
            if (!keyword) return flatList;
            var kw = keyword.toLowerCase();
            var matches = flatList.filter(function(item) {
                return item.name.toLowerCase().indexOf(kw) !== -1;
            });
            var visibleKeys = {};
            matches.forEach(function(item) {
                var parts = item.key.split('/');
                var current = '';
                parts.forEach(function(part) {
                    current = current ? current + '/' + part : part;
                    visibleKeys[current] = true;
                });
            });
            return flatList.filter(function(item) { return visibleKeys[item.key]; });
        }

        // ================================================================
        // 组件 A：树形搜索下拉
        // ================================================================
        function TreeSearchRenderer() {}
        TreeSearchRenderer.prototype.init = function (params) {
            var self = this;
            self.params = params;
            self.editable = params.editable;   // 默认 true

            var field = params.colDef.field;             // ✅ 提前声明，修复 hoisting bug
            self.flatData = flattenTree(params.treeData || []);
            self.selectedPath = (params.data && params.data[field + '_path']) || params.value;
            self._docHandler = null;

            var field = params.colDef.field;

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'tree-search-input';
            input.placeholder = params.placeholder || '搜索或选择...';
            // ✅ 初始展示：优先读 _path，回退用 path 反查
            input.value = self._resolveName(params.data, field, params.value);
            self.eInput = input;

            // ★ 不可编辑：只渲染只读输入框，不绑定任何事件，不创建面板
            if (!self.editable) {
                input.readOnly = true;
                input.disabled = true;
                input.classList.add('is-disabled');
                self.eInput = input;
                return;
            }

            var panel = document.createElement('div');
            panel.className = 'tree-search-panel';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            self.ePanel = panel;

            function hidePanel() { panel.style.display = 'none'; }

            function renderPanel(keyword) {
                var list = filterTree(self.flatData, keyword);
                panel.innerHTML = '';
                if (list.length === 0) {
                    var empty = document.createElement('div');
                    empty.className = 'tree-search-empty';
                    empty.textContent = '无匹配结果';
                    panel.appendChild(empty);
                    return;
                }
                list.forEach(function (item) {
                    var div = document.createElement('div');
                    div.className = 'tree-search-item';
                    if (item.path === self.selectedPath) div.classList.add('selected');
                    div.style.paddingLeft = (12 + item.level * 18) + 'px';
                    div.textContent = item.name;
                    div.addEventListener('mousedown', function (e) {
                        e.preventDefault(); e.stopPropagation();
                        self.selectedPath = item.path;
                        input.value = item.pathName;
                        // ✅ 同时写 path 和 name
                        if (self.params.node && self.params.node.data) {
                            self.params.node.data[field] = item.pathName;
                            self.params.node.data[field + '_path'] = item.path;
                            if(item.paramList && item.paramList.length > 0) {
                                self.params.node.data[field + '_path'] += '(?';
                                for(var i = 1; i < item.paramList.length; i++) {
                                    self.params.node.data[field + '_path'] += ',?';
                                }
                                self.params.node.data[field + '_path'] += ')';

                                for(var i = 1; i < item.paramList.length; i++) {
                                    $scope.ctxMenu.field = self.params.colDef ? self.params.colDef.field : null;
                                    $scope.ctxMenu.rowIndex = params.node.rowIndex;
                                    $scope.ctxMenuAction('insertColRight',item.pathName,self.params.node.data[field + '_path']);
                                }

                            }
                        }
                        if (self.params.context && self.params.context.$timeout) {
                            self.params.context.$timeout(angular.noop);
                        }
                        hidePanel();
                    });
                    panel.appendChild(div);
                });
            }

            function showPanel() {
                var rect = input.getBoundingClientRect();
                panel.style.left = rect.left + 'px';
                panel.style.top = (rect.bottom + 2) + 'px';
                panel.style.minWidth = Math.max(rect.width, 220) + 'px';
                panel.style.display = 'block';
                renderPanel('');
            }

            // ★ 记录最近一次 mousedown 的按键类型（0=左键，2=右键）
            var lastMouseButton = 0;

            input.addEventListener('mousedown', function (e) {
                lastMouseButton = e.button;
                // 右键：立即隐藏搜索面板，且不阻止默认行为，让 ag-Grid 弹出自定义右键菜单
                if (e.button === 2) {
                    hidePanel();
                }
            });

            // ★ 只有左键触发 focus 时才弹出面板
            input.addEventListener('focus', function () {
                if (lastMouseButton === 2) return;   // 右键不弹
                showPanel();
            });

            input.addEventListener('input', function () { renderPanel(input.value); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { hidePanel(); input.blur(); }
            });

            self._docHandler = function (e) {
                if (e.target !== input && !panel.contains(e.target)) hidePanel();
            };
            document.addEventListener('mousedown', self._docHandler);
        };

        // ✅ 统一：显示值优先用 row[field]（name），只有拿不到 name 时才用 value 反查
        TreeSearchRenderer.prototype._resolveName = function (rowData, field, value) {
            if (rowData && rowData[field]) return rowData[field];
            if (!value) return '';
            for (var i = 0; i < this.flatData.length; i++) {
                if (this.flatData[i].pathName === value) return value;
                if (this.flatData[i].path === value) return this.flatData[i].name;
            }
            return value;
        };

        TreeSearchRenderer.prototype.getGui = function () { return this.eInput; };

        TreeSearchRenderer.prototype.refresh = function (params) {
            if (this.eInput) {
                var field = params.colDef.field;
                this.eInput.value = this._resolveName(params.data, field, params.value);
            }
            return true;
        };

        TreeSearchRenderer.prototype.destroy = function () {
            if (this.ePanel && this.ePanel.parentNode) this.ePanel.parentNode.removeChild(this.ePanel);
            if (this._docHandler) document.removeEventListener('mousedown', this._docHandler);
        };

        // ================================================================
        // 组件 B：普通下拉
        // ================================================================
        function SimpleSelectRenderer() {}
        SimpleSelectRenderer.prototype.init = function (params) {
            var field = params.colDef.field;
            var editable = params.editable;
            var currentPath = (params.data && params.data[field + '_path']) || params.value || '';

            var select = document.createElement('select');
            select.className = 'simple-select';

            var emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = params.placeholder || '请选择...';
            select.appendChild(emptyOpt);

            (params.options || []).forEach(function (opt) {
                var o = document.createElement('option');
                o.value = opt.path;
                o.textContent = opt.name;
                if (opt.path === currentPath) o.selected = true;  // ✅ 用 path 比较
                select.appendChild(o);
            });

            // ★ 不可编辑：禁用 select
            if (!editable) {
                select.disabled = true;
                select.classList.add('is-disabled');
            }

            select.addEventListener('change', function (e) {
                var selectedPath = e.target.value;
                var selectedName = e.target.selectedIndex >= 0
                    ? e.target.options[e.target.selectedIndex].textContent
                    : '';
                if (params.node && params.node.data) {
                    params.node.data[field] = selectedName;              // 显示用
                    params.node.data[field + '_path'] = selectedPath;    // 保存用
                }
                if (params.context && params.context.$timeout) {
                    params.context.$timeout(angular.noop);
                }
            });

            this.eSelect = select;
        };

        SimpleSelectRenderer.prototype.getGui = function () { return this.eSelect; };

        SimpleSelectRenderer.prototype.refresh = function (params) {
            if (this.eSelect) {
                var field = params.colDef.field;
                var currentPath = (params.data && params.data[field + '_path']) || params.value || '';
                this.eSelect.value = currentPath;
            }
            return true;
        };

        // ================================================================
        // 组件 C：可下拉可输入编辑器
        // ================================================================
        function ComboEditor() {}
        ComboEditor.prototype.init = function (params) {
            var self = this;
            self.params = params;
            self.options = params.treeData ? flattenTree(params.treeData) : (params.options || []);
            self.selectedPath = null;
            self.selectedName = null;
            self._docHandler = null;

            var wrapper = document.createElement('div');
            wrapper.className = 'combo-editor-wrapper';

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'combo-editor-input';
            // ✅ 初始展示：优先用 row 里的 _path
            var field = params.colDef.field;
            input.value = (params.data && params.data[field]) || params.value || '';
            wrapper.appendChild(input);

            var panel = document.createElement('div');
            panel.className = 'combo-editor-panel';
            panel.style.display = 'none';
            document.body.appendChild(panel);

            self.eInput = input;
            self.ePanel = panel;
            self.eWrapper = wrapper;

            function hidePanel() { panel.style.display = 'none'; }

            function renderPanel(keyword) {
                var list = self.options;
                if (keyword) {
                    var kw = keyword.toLowerCase();
                    list = list.filter(function (opt) {
                        return String(opt.name).toLowerCase().indexOf(kw) !== -1;
                    });
                }
                panel.innerHTML = '';
                if (list.length === 0) {
                    var empty = document.createElement('div');
                    empty.className = 'combo-editor-empty';
                    empty.textContent = '无匹配项，可直接输入';
                    panel.appendChild(empty);
                    return;
                }
                list.forEach(function (opt) {
                    var div = document.createElement('div');
                    div.className = 'combo-editor-item';
                    if (opt.level) div.style.paddingLeft = (12 + opt.level * 18) + 'px';
                    div.textContent = opt.name;
                    div.addEventListener('mousedown', function (e) {
                        e.preventDefault(); e.stopPropagation();
                        input.value = opt.pathName;
                        // ✅ 记住选中的 path 和 name
                        self.selectedPath = opt.path;
                        self.selectedName = opt.pathName;
                        hidePanel();
                    });
                    panel.appendChild(div);
                });
            }

            function showPanel() {
                var rect = input.getBoundingClientRect();
                panel.style.left = rect.left + 'px';
                panel.style.top = (rect.bottom + 2) + 'px';
                panel.style.minWidth = Math.max(rect.width, 220) + 'px';
                panel.style.display = 'block';
                renderPanel('');
            }

            input.addEventListener('focus', function () { showPanel(); });
            input.addEventListener('input', function () {
                // 手动输入 → 清空已选中记录，走"自由文本"逻辑
                self.selectedPath = null;
                self.selectedName = null;
                renderPanel(input.value);
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' || e.key === 'Enter') hidePanel();
            });

            self._docHandler = function (e) {
                if (e.target !== input && !panel.contains(e.target)) hidePanel();
            };
            document.addEventListener('mousedown', self._docHandler);

            self.showPanel = showPanel;
        };

        ComboEditor.prototype.afterGuiAttached = function () {
            if (this.eInput) {
                this.eInput.focus();
                this.eInput.select();
                var self = this;
                setTimeout(function () { self.showPanel(); }, 0);
            }
        };

        ComboEditor.prototype.getGui = function () { return this.eWrapper; };

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

        // ★ 点击任意处关闭菜单
        var closeMenuHandler = function (e) {
            if (!$scope.ctxMenu.visible) return;

            // ★ 关键：如果点击在菜单内部，不关闭（让 click 事件正常触发）
            var menuEl = document.querySelector('.ag-context-menu');
            if (menuEl && menuEl.contains(e.target)) {
                return;
            }

            if ($scope.ctxMenu.visible) {
                $scope.$apply(function () { $scope.ctxMenu.visible = false; });
            }
        };
        document.addEventListener('mousedown', closeMenuHandler);

        $scope.$on('$destroy', function () {
            document.removeEventListener('mousedown', closeMenuHandler);
        });

        // ★ 屏蔽整个表格区域的浏览器默认右键菜单
        var blockContextMenu = function (e) {
            // 只在 ag-Grid 区域内阻止
            var gridEl = document.querySelector('.ag-theme-balham');
            if (gridEl && gridEl.contains(e.target)) {
                e.preventDefault();
            }
        };
        document.addEventListener('contextmenu', blockContextMenu);

        $scope.$on('$destroy', function () {
            document.removeEventListener('mousedown', closeMenuHandler);
            document.removeEventListener('contextmenu', blockContextMenu);
        });

        init($scope);
    });

    angular.bootstrap(document, ['tableEditApp']);
});
