define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');

    var md = angular.module('templateApp',['yxBase','yxDirective']);
    md.controller('templateController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = baseService.getCache('dim') || {};
            scope.addDim = {};
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
            var url = "/api/template/list?idRuleApplication="+idRuleApplication;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = (data && data.length != 0) ? data : [];
                $scope.options.templates = result;
                if($scope.dim.idRuleTemplate){
                    $scope.changeType($scope.dim.idRuleTemplate);
                }
            },function(data){
				baseService.tips('获取模板失败：'+data,'danger',$scope);
			});
        }

        $scope.changeType = function(idRuleTemplate){
            var template = _.find($scope.options.templates, {idRuleTemplate:idRuleTemplate});
            $scope.dim = {...$scope.dim,...template};
            if(template && template.templateRels && template.templateRels.length > 0){
                var param = {ruleIdList:[],pageNum: 1,pageSize:2000};
                _.each(template.templateRels,function(item){
                    param.ruleIdList.push(item.ruleId);
                });
                $scope.dim.templateRels = template.templateRels;

                var url = '/api/rule/page';
                var promise = baseService.http(url,param);
                promise.then(function(data){
                    var result = (data.records && data.records.length != 0) ? data.records : [];
                    $scope.options.rules = result;
                    _.each($scope.options.rules,function(item){
                        var rule = _.find($scope.dim.templateRels,{ruleId:item.ruleId});
                        if(rule){
                            item.isRequired = rule.isRequired;
                        }
                        item.resultName = $scope.getResultName(item.resultCode);
                        item.rowTokens = $scope.getRuleDesc(item.ruleNote);
                    })
                },function(data){
                    baseService.tips('获取规则失败：'+data,'danger',$scope);
                });
            }
        }

        $scope.getResultName = function(code){
            try {
                var result = _.find($scope.dim.selectedResultDefines, {resultCode:code});
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

        $scope.addTemplate = function(){
            var dim = {idRuleApplication: $scope.dim.idRuleApplication};
            baseService.setCache('dim',$scope.dim);
            baseService.setCache('tempDim',dim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/templateEdit.html";
        }

        $scope.editTemplate = function(){
            if(!$scope.dim.idRuleTemplate){
                baseService.tips('请选择模板','warning',$scope);
                return;
            }

            baseService.setCache('dim',$scope.dim);
            baseService.setCache('tempDim',$scope.dim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/templateEdit.html";
        }

        $scope.delTemplate = function(){
            if(!$scope.dim.idRuleTemplate){
                baseService.tips('请选择要删除的模板','warning',$scope);
                return;
            }

            var url = "/api/template/remove?id="+$scope.dim.idRuleTemplate;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                baseService.tips('删除模板成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
            },function(data){
				baseService.tips('删除模板失败，请联系开发'+data,'danger',$scope);
			});
        }

        init($scope);
    });
    angular.bootstrap(document,['templateApp']);
});
