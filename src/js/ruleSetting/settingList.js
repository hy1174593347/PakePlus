define(function (require) {
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('settingListApp', ['yxBase', 'yxDirective']);

    md.controller('settingController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.dim = baseService.getCache('dim') || {runFlag:"0",dimSettingDTOList:[]};
            scope.ctrl = {pageNum:1,pageSize:20};
            scope.options = {};

            initAppData();
        }

        function initAppData(){
            var url = "/app/queryFlowApps";
            var promise = baseService.http(url,{pageNum:1,pageSize:1000});
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.apps = result;
                if($scope.dim.idRuleApplication){
                    $scope.changeApp($scope.dim.idRuleApplication);
                }
            },function(data){
				baseService.tips('获取应用列表失败：'+data,'danger',$scope);
			});
        }

        $scope.changeApp = function(id){
            var url = "/app/getApp?id="+id;
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                var result = (data && data.dimDefines && data.dimDefines.length != 0) ? data.dimDefines : [];
                $scope.dim.ruleRepositoryId = data.ruleRepositoryId;
                $scope.options.dims = result;
            },function(data){
				baseService.tips('获取维度失败：'+data,'danger',$scope);
			});
        }

        $scope.intDimData = function(baseType,idRuleDimDefine,dimFieldPath,index,dimSort){
            if(!$scope.dim.dimSettingDTOList[index]){
                $scope.dim.dimSettingDTOList[index] = {};
            }
            $scope.dim.dimSettingDTOList[index].dimFieldPath = dimFieldPath;
            $scope.dim.dimSettingDTOList[index].idRuleDimDefine = idRuleDimDefine;
            $scope.dim.dimSettingDTOList[index].dimSort = dimSort;
            
            if(baseType){
                var url = "/api/base-data/list?baseType="+baseType;
                var promise = baseService.httpNoModal(url,null,'get');
                promise.then(function(data){
                    var result = data || [];
                    result.unshift({baseCode:'AL',baseName:'所有'});
                    $scope.options.dims[dimFieldPath] = result;
                },function(data){
                    baseService.tips('获取基础数据失败：'+data,'danger',$scope);
                });
            }
        }

        $scope.query = function(form) {
            if(!baseService.validForm(form)){
                baseService.tips('请选择应用和维度','danger',$scope);
                return;
            }

            var param = angular.copy($scope.dim);
            if($scope.dim.runFlag == 3){
                param.runFlag = 1;
                param.status = 3;
            }
            param.pageNum = $scope.ctrl.pageNum;
            param.pageNum = $scope.ctrl.pageSize;
            var url = "/api/flowset/list";
            var promise = baseService.http(url,param);
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.flowsets = result;
            },function(data){
				baseService.tips('获取流程集列表失败：'+data,'danger',$scope);
			});
        };

        $scope.addFlowSet = function() {
            if(!$scope.dim.idRuleApplication || !$scope.dim){
                baseService.tips('请选择应用和维度','danger',$scope);
                return;
            }

            $scope.dim.isEdit = true;
            baseService.setCache('dim',$scope.dim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleSetting/flowSetting.html";
        };

        $scope.editFlowSet = function(idRuleFlowsetInfo,isEdit) {
            $scope.dim.idRuleFlowsetInfo = idRuleFlowsetInfo;
            $scope.dim.isEdit = isEdit;
            baseService.setCache('dim',$scope.dim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleSetting/flowSetting.html";
        };

        $scope.delFlowSet = function(idRuleFlowsetInfo){
            var url = "/api/flowset/remove?idRuleFlowsetInfo="+idRuleFlowsetInfo;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                baseService.tips('删除规则流成功','success',$scope);
                $scope.query($scope.queryForm);
            },function(data){
				baseService.tips('删除规则流失败：'+data,'danger',$scope);
			});
        }

        $scope.approval = function(form){
            if(!baseService.validForm(form)){
                baseService.tips('请选择应用和维度','danger',$scope);
                return;
            }

            if(!$scope.options.flowsets || $scope.options.flowsets.length == 0){
                baseService.tips('当前维度下没有规则流','danger',$scope);
                return;
            }

            var url = "/api/flowset/approval";
            var promise = baseService.http(url,angular.copy($scope.dim));
            promise.then(function(data){
                baseService.tips('已异步发起审批成功，请在待审批列表中查看','success',$scope);
                $scope.query($scope.queryForm);
            },function(data){
				baseService.tips('申请审批规则流失败：'+data,'danger',$scope);
			});
        }

        $scope.approvalSuccess = function(form){
            if(!baseService.validForm(form)){
                baseService.tips('请选择应用和维度','danger',$scope);
                return;
            }

            if(!$scope.options.flowsets || $scope.options.flowsets.length == 0){
                baseService.tips('当前维度下没有规则流','danger',$scope);
                return;
            }

            var url = "/api/flowset/approvalSuccess";
            var promise = baseService.http(url,angular.copy($scope.dim));
            promise.then(function(data){
                baseService.tips('审批规则流成功','success',$scope);
                $scope.query($scope.queryForm);
            },function(data){
				baseService.tips('审批规则流失败：'+data,'danger',$scope);
			});
        }

        $scope.checkAll = function(checked){
            _.each($scope.options.flowsets,function(item){
                item.checked = checked;
            });
        }

        $scope.resetFlowset = function(runFlag){
            $scope.options.flowsets = [];
            $scope.dim.checkAll = false;
        }

        init($scope);
    });

    angular.bootstrap(document, ['settingListApp']);
});