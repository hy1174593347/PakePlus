define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');

    var md = angular.module('templateEditApp',['yxBase','yxDirective']);
    md.controller('templateEditController',function($scope,$timeout,baseService){

        function init(scope){
            scope.dim = baseService.getCache('tempDim') || {};
            scope.ctrl = {isDisabled:(scope.dim.idRuleTemplate ? true : false)};
            scope.options = {};

            initAppData();
        }

        function initAppData(){
            var url = "/app/queryFlowsetApps";
            var promise = baseService.http(url,{pageNum:1,pageSize:2000});
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

        $scope.changeApp = function(idRuleApplication){
            var selectedApp = _.find($scope.options.apps,{idRuleApplication:idRuleApplication});
            $scope.dim.selectedResultDefines = selectedApp.resultDefines;
            $scope.dim.ruleRepositoryId = selectedApp.ruleRepositoryId;
            var url = "/api/catalogue/list?ruleRepositoryId="+selectedApp.ruleRepositoryId;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = (data && data.length != 0) ? data : [];
                $scope.catalogues = result;
                getRules(result);
            },function(data){
                baseService.tips('获取规则失败：'+data,'danger',$scope);
            });
        }

        function getRules(catalogues){
            var param = {ruleIdList:[],pageNum: 1,pageSize: 2000};
            $scope.ruleMap = [];
            _.each(catalogues, function(catalogue){
                _.each(catalogue.catalogueRels,function(item){
                    param.ruleIdList.push(item.ruleId);
                    $scope.ruleMap.push({ruleId:item.ruleId,catalogue:catalogue.catalogue});
                });
            });

            var url = '/api/rule/page';
            var promise = baseService.http(url,param);
            promise.then(function(data){
                var result = (data.records && data.records.length != 0) ? data.records : [];
                $scope.options.rules = result;
                _.each($scope.options.rules,function(item){
                    var map = _.find($scope.ruleMap,{ruleId:item.ruleId});
                    if(map){
                        item.catalogue = map.catalogue;
                    }

                    if($scope.dim.templateRels && $scope.dim.templateRels.length > 0){
                        var rule = _.find($scope.dim.templateRels,{ruleId:item.ruleId});
                        if(rule){
                            item.checked = true;
                            item.isRequired = rule.isRequired;
                        }else{
                            item.isRequired = '0';
                        }
                    }

                    item.resultName = $scope.getResultName(item.resultCode);
                    item.rowTokens = $scope.getRuleDesc(item.ruleNote);
                });
                $scope.ruleMap = null;
            },function(data){
                baseService.tips('获取规则失败：'+data,'danger',$scope);
            });
        }

        $scope.getResultName = function(code){
            try {
                var result = _.find($scope.dim.selectedResultDefines, {resultCode:code}, function(item){});
                return result.resultName;
            } catch(err){
                console.log('getResultName_error:',err);
                return '';
            }
        }

        $scope.getRuleDesc = function(note){
            var editorTokens = JSON.parse(note.ruleNote);
            var rowTokens = [];
            var index = 0;
            var row = {id: 'row_' + Date.now() + "_" + index};
            for(var i = 0; i < editorTokens.length; i++){
                var token = editorTokens[i];
                if(!token.context){
                    row = {id: 'row_' + Date.now() + "_" + index};
                    row.rel = token.text;
                }
                if(token.context != 'operator'){
                    continue;
                }else{
                    var paramToken1 = editorTokens[i - 1];
                    var paramToken2 = editorTokens[i + 1];
                    var metaRule = token.dataRef;

                    row.param1 = paramToken1.dataRef.name;
                    row.param1Path = paramToken1.dataRef.path;

                    row.param2 = paramToken2.dataRef.name;
                    row.param2Path = paramToken2.dataRef.path;

                    row.metaRuleId = metaRule.metaRuleId;
                    row.metaRuleName = metaRule.metaRuleName;
                    rowTokens.push(row);
                    index++;
                }
            }
            return rowTokens;
        }

        $scope.saveTemplate = function(form){
            if(!baseService.validForm(form)){
                return;
            }

            if(!$scope.dim.idRuleApplication){
                baseService.tips('请选择应用','warning',$scope);
                return;
            }

            var param = angular.copy($scope.dim);
            param.templateRels = _.filter($scope.options.rules, {checked: true});

            if(_.isEmpty(param.templateRels)){
                baseService.tips('请选择规则','warning',$scope);
                return;
            }

            var url = param.idRuleTemplate ? '/api/template/update' : "/api/template/add";
            var promise = baseService.http(url,param);
            promise.then(function(data){
                baseService.tips('保存模板成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
                baseService.modal('hide','appCatalogueModal');
            },function(data){
                baseService.tips('保存模板失败，请联系开发'+data,'danger',$scope);
            });
        }

        $scope.toBack = function(){
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/template.html";
        }

        $scope.checkAll = function(checked){
            _.each($scope.options.rules,function(item){
                item.checked = checked;
            });
        }

        init($scope);
    });
    angular.bootstrap(document,['templateEditApp']);
});
