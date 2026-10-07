define(function (require) {
    require('../common/base').init();
    require('../common/treeView');
    require('../common/flowDirective');
    var md = angular.module('flowSettingApp', ['yxBase','myApp.tree', 'flowDirective']);

    md.controller('flowController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.dim = baseService.getCache('dim');
            // console.log('维度信息：', scope.dim);
            scope.addDim = {flowsetType:"2"};
            scope.ctrl = {pageNum:1,pageSize:1000};
            scope.options = {};
            scope.lf = {};
            scope.oriTreeData = [{label:'',children:[]}];
            scope.treeData = [{label:'',children:[]}];

            scope.graphData = {};

            if(scope.dim.idRuleFlowsetInfo){
                initData(scope.dim.idRuleFlowsetInfo,scope.dim.runFlag);
            }

            if(scope.dim.ruleRepositoryId){
                initRepository(scope.dim.ruleRepositoryId);
            }

            if(scope.dim){
                initFlowsets();
            }
        }

        function initData(idRuleFlowsetInfo,runFlag){
            var url = runFlag == '0' ? "/api/flowset/getById?idRuleFlowsetInfo="+idRuleFlowsetInfo : "/api/flowset/getEffectiveById?idRuleFlowsetInfo="+idRuleFlowsetInfo;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                $scope.addDim = data;
                var flowsetNote = JSON.parse(data.flowsetNote);
                $scope.graphData = flowsetNote;
                $scope.buildGraphData($scope.graphData);
            },function(data){
				baseService.tips('获取规则流信息失败：'+data,'danger',$scope);
			});
        }

        function initRepository(ruleRepositoryId){
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

        function initFlowsets(){
            var param = angular.copy($scope.dim);
            param.pageNum = $scope.ctrl.pageNum;
            param.pageNum = $scope.ctrl.pageSize;
            var url = "/api/flowset/list";
            var promise = baseService.http(url,param);
            promise.then(function(data){
                var result = data.records || [];
                var filterData = _.filter(result,function(item){
                    return item.flowsetType == '2';
                });
                $scope.options.flowsets = filterData;
            },function(data){
				baseService.tips('获取规则流列表失败：'+data,'danger',$scope);
			});
        }
        

        $scope.buildGraphData = function(flowSet){
            $scope.lf.render(flowSet);
        }

        // 可选配置
        $scope.flowOptions = {
            grid: {
                visible: false
            },
            // 更多选项...
        };

        // 节点点击回调
        $scope.onNodeClick = function(node) {
            $scope.ctrl.checkEdgeId = null;
            $scope.ctrl.checkNodeId = node.id;

            // console.log('节点点击：', node);
        };

        // 连线点击回调
        $scope.onEdgeClick = function(node) {
            $scope.ctrl.checkNodeId = null;
            $scope.ctrl.checkEdgeId = node.id;

            // console.log('连线点击：', node);
        };

        function checkedNode(ruleRepCatalogueId,ruleList,treeData){
            _.each(treeData,function(item){
                if(ruleRepCatalogueId && item.ruleRepCatalogueId == ruleRepCatalogueId){
                    item.checked = true;

                    if(item.catalogueRels && item.catalogueRels.length > 0){
                        _.each(item.catalogueRels,function(rule){
                            rule.checked = true;
                        });
                    }
                }else{
                    if(item.children && item.children.length > 0){
                        checkedNode(ruleRepCatalogueId,ruleList,item.children);
                    }else if(item.catalogueRels && item.catalogueRels.length > 0){
                        _.each(item.catalogueRels,function(rule){
                            var temp = _.find(ruleList,{ruleId:rule.ruleId});
                            if(temp){
                                rule.checked = true;
                            }else{
                                temp = _.find(ruleList,{idRuleTable:rule.idRuleTable});
                                if(temp){
                                    rule.checked = true;
                                }
                            }
                        });
                    }
                }
            });
        }

        $scope.saveFlow = function(form) {
            if(!baseService.validForm(form)){
                baseService.tips('请选择流程类型','danger',$scope);
                return;
            }

            if ($scope.lf) {
                $scope.graphData = $scope.lf.getGraphData();
                var flowsetNote = JSON.stringify($scope.graphData);
                var nodes = $scope.graphData.nodes;
                var edges = $scope.graphData.edges;
                var flowInfos = [];
                _.each(edges,function(item){
                    var edgeFlow;
                    if(item.properties.customData){
                        edgeFlow = {};
                        edgeFlow.idRuleFlowInfo = item.id;
                        edgeFlow.parentIdRuleFlowInfo = item.sourceNodeId;
                        edgeFlow.flowDesc = item.text.value;
                        edgeFlow.ruleSettings = item.properties.customData.ruleList;
                        edgeFlow.flowType = '1';
                        flowInfos.push(edgeFlow);
                    }

                    // 找到连线的上一个节点
                    var sourceNode = _.find(nodes,{id:item.sourceNodeId});
                    if(sourceNode && sourceNode.properties.customData){
                        var sourceFlow = _.find(flowInfos,{idRuleFlowInfo:item.sourceNodeId});
                        if(sourceFlow){
                            if(edgeFlow){
                                edgeFlow.parentIdRuleFlowInfo = sourceFlow.idRuleFlowInfo;
                            }
                        }else{
                            var flow = {};
                            flow.idRuleFlowInfo = sourceNode.id;
                            flow.flowDesc = sourceNode.text.value;
                            flow.ruleRepCatalogueId = sourceNode.properties.customData.ruleRepCatalogueId;
                            var rules = [];
                            var tables = [];
                            _.each(sourceNode.properties.customData.ruleList,function(rule){
                                if(rule.ruleId){
                                    rules.push(rule);
                                }else if(rule.idRuleTable){
                                    tables.push(rule);
                                }
                            });
                            flow.ruleSettings = rules;
                            flow.tableSettings = tables;
                            flow.childIdRuleFlowsetInfo = sourceNode.properties.customData.childIdRuleFlowsetInfo;
                            flowInfos.push(flow);
                        }
                    }

                    // 找到连线的下一个节点
                    var targetNode = _.find(nodes,{id:item.targetNodeId});
                    if(targetNode && targetNode.properties.customData){
                        var targetFlow = _.find(flowInfos,{idRuleFlowInfo:item.targetNodeId});
                        if(targetFlow){
                            targetFlow.parentIdRuleFlowInfo = item.id;
                        }else{
                            var flow = {};
                            flow.idRuleFlowInfo = targetNode.id;
                            flow.parentIdRuleFlowInfo = item.id;
                            flow.flowDesc = targetNode.text.value;
                            flow.ruleRepCatalogueId = targetNode.properties.customData.ruleRepCatalogueId
                            var rules = [];
                            var tables = [];
                            _.each(targetNode.properties.customData.ruleList,function(rule){
                                if(rule.ruleId){
                                    rules.push(rule);
                                }else if(rule.idRuleTable){
                                    tables.push(rule);
                                }
                            });
                            flow.ruleSettings = rules;
                            flow.tableSettings = tables;
                            flow.childIdRuleFlowsetInfo = targetNode.properties.customData.childIdRuleFlowsetInfo;
                            flowInfos.push(flow);
                        }
                    }
                });

                _.each(flowInfos,function(item){
                    if(item.parentIdRuleFlowInfo){
                        var pFlow = _.find(flowInfos,{idRuleFlowInfo:item.parentIdRuleFlowInfo});
                        if(!pFlow){
                            item.parentIdRuleFlowInfo = null;
                        }
                    }
                });

                var ruleFlowsetInfoDTOList = [];
                ruleFlowsetInfoDTOList[0] = $scope.addDim;
                ruleFlowsetInfoDTOList[0].flowsetNote = flowsetNote;
                ruleFlowsetInfoDTOList[0].flowInfos = flowInfos;
                $scope.dim.ruleFlowsetInfoDTOList = ruleFlowsetInfoDTOList;

                var url = $scope.dim.idRuleFlowsetInfo ? '/api/flowset/update' : "/api/flowset/add";
                var promise = baseService.http(url, $scope.dim);
                promise.then(function (data) {
                    baseService.tips('保存规则流成功', 'success', $scope);
                }, function (data) {
                    baseService.tips('保存规则流失败：' + data, 'danger', $scope);
                });
            } else {
                baseService.tips('流程图尚未初始化', 'danger', $scope);
            }
        };

        $scope.renderFlow = function () {
            $scope.lf.extension.dagre.layout({
                rankdir: 'LR',   // 从左到右的布局方向
                align: '',     // 居中
                ranker: 'tight-tree',
                nodesep: 80,     // 节点间距
                ranksep: 120,     // 层级间距
                isDefaultAnchor: true
            });
        }

        $scope.back = function(){
            window.location = baseService.systemConfig.webRoot + "/docc/ruleSetting/settingList.html";
        }

        $scope.filterRepository = function(name){
            if(!name || name == '' || name.length == 0){
                $scope.treeData = angular.copy($scope.oriTreeData);
                return;
            }
            var filterList = baseService.searchTree($scope.oriTreeData,name);
            $scope.treeData = filterList;
        }

        $scope.bindNode = function(){
            var nodeModel = null;
            if($scope.ctrl.checkNodeId){
                nodeModel = $scope.lf.getNodeModelById($scope.ctrl.checkNodeId);
            }
            if($scope.ctrl.checkEdgeId){
                nodeModel = $scope.lf.getEdgeModelById($scope.ctrl.checkEdgeId);
            }

            if(!nodeModel){
                return;
            }

            var customData = {ruleRepCatalogueId:null,ruleList:[]};
            customData = baseService.filterCheckTree($scope.treeData,customData);
            if($scope.ctrl.checkEdgeId && (customData.ruleRepCatalogueId || customData.ruleList.length > 1 || customData.ruleList[0].idRuleTable)){
                baseService.tips('连线只能选择单条规则，且不能使用决策表', 'danger', $scope);
                return;
            }
            nodeModel.setProperty('customData', customData);
            if ($scope.ctrl.checkNodeId && !nodeModel.text.value.startsWith('📀')) {
                if (nodeModel.text.value.startsWith('🔗')) {
                    nodeModel.text.value = nodeModel.text.value.replace('🔗','📀');
                } else {
                    nodeModel.text.value = '📀' + nodeModel.text.value;
                }
            }
            baseService.modal('hide','appUpdateModal');
        }

        $scope.onChooseChild = function(node){
            $scope.ctrl.showRules = false;
            $scope.ctrl.checkEdgeId = null;
            $scope.ctrl.showFlowsets = true;
            $scope.ctrl.checkNodeId = node.id;

            $scope.dim.childIdRuleFlowsetInfo = node.properties.customData.childIdRuleFlowsetInfo;

            baseService.modal('show','appUpdateModal');
            // console.log('右键子流：',node);
        }

        $scope.onChooseRule = function(node,type){
            if(type == 'node'){
                $scope.ctrl.checkEdgeId = null;
                $scope.ctrl.checkNodeId = node.id;
            }else{
                $scope.ctrl.checkEdgeId = node.id;
                $scope.ctrl.checkNodeId = null;
            }
            $scope.ctrl.showRules = true;
            $scope.ctrl.showFlowsets = false;

            $scope.treeData = angular.copy($scope.oriTreeData);
            var customData = node.properties.customData;
            if(customData && !customData.childIdRuleFlowsetInfo){
                checkedNode(customData.ruleRepCatalogueId,customData.ruleList,$scope.treeData);
            }
            baseService.modal('show','appUpdateModal');
            // console.log('右键规则：',node);
        }

        $scope.onEdgeChooseRule = function(node){
            $scope.ctrl.showRules = true;
            $scope.ctrl.checkEdgeId = node.id;
            $scope.ctrl.showFlowsets = false;
            $scope.ctrl.checkNodeId = null;

            $scope.treeData = angular.copy($scope.oriTreeData);
            var customData = node.properties.customData;
            if(customData && !customData.childIdRuleFlowsetInfo){
                checkedNode(customData.ruleRepCatalogueId,customData.ruleList,$scope.treeData);
            }
            // console.log('右键规则：',node);
        }

        $scope.bindNodeChild = function(idRuleFlowsetInfo){
            var nodeModel = $scope.lf.getNodeModelById($scope.ctrl.checkNodeId);
            var customData = {childIdRuleFlowsetInfo:idRuleFlowsetInfo};
            nodeModel.setProperty('customData', customData);
            if (!nodeModel.text.value.startsWith('🔗')) {
                if (nodeModel.text.value.startsWith('📀')) {
                    nodeModel.text.value = nodeModel.text.value.replace('📀', '🔗');
                } else {
                    nodeModel.text.value = '🔗' + nodeModel.text.value;
                }
            }
            baseService.modal('hide','appUpdateModal');
        }

        init($scope);
    });

    angular.bootstrap(document, ['flowSettingApp']);
});