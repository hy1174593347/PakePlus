define(function (require) {
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('flowApp', ['yxBase', 'yxDirective']);

    md.controller('flowController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.dim = baseService.getCache('dim');
            // console.log('维度信息：', scope.dim);
            scope.ctrl = {isDisabled:(scope.dim.idRuleTemplate ? true : false)};
            scope.options = {};

            if(scope.dim){
                initTemplate();
            }

            initBom();
            getOperatorsByType();
            initIdFlowsetInfo();
        }

        function initBom() {
            baseService.httpNoModal('/bom/primaries', null, 'get').then(function (data) {
                var result = data || [];
                $scope.bomTree = result;
            }, function (data) {
                baseService.tips('获取bom失败：' + data, 'danger', $scope);
            });
        }

        function getOperatorsByType () {
            baseService.http('/api/metaRule/list', null, 'get').then(function (data) {
                $scope.operators = data || [];
            }, function (data) {
                baseService.tips('获取元规则失败：' + data, 'danger', $scope);
            });
        }

        function initIdFlowsetInfo(){
            var url = "/api/flow/getIdRuleFlowset";
            var promise = baseService.http(url,angular.copy($scope.dim));
            promise.then(function(data){
                $scope.dim.idRuleFlowsetInfo = data;
            },function(data){
                baseService.tips('获取流程信息失败：'+data,'danger',$scope);
            });
        }

        function initTemplate(){
            var url = "/api/template/list?idRuleApplication="+$scope.dim.idRuleApplication;
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

        function initData(idRuleFlowInfo,runFlag){
            var url = runFlag == '0' ? "/api/flow/getById?idRuleFlowInfo="+idRuleFlowInfo : "/api/flow/getEffectiveById?idRuleFlowInfo="+idRuleFlowInfo;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                _.each($scope.options.rules,function(item){
                    var rule ;
                    if(runFlag == '0'){
                        rule = _.find(data.ruleSettings,{ruleId:item.ruleId});
                    }else{
                        rule = _.find(data.ruleEffectives,{ruleId:item.ruleId});
                    }
                    if(rule){
                        item.checked = true;
                    }

                    var temp = _.find($scope.templateRels,{ruleId:item.ruleId});
                    if(temp){
                        item.isRequired = temp.isRequired;
                    }
                    item.resultName = $scope.getResultName(item.resultCode);
                    item.rowTokens = $scope.getRuleDesc(item.ruleNote,rule);
                });
            },function(data){
                baseService.tips('获取流程信息失败：'+data,'danger',$scope);
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

                $scope.templateRels = template.templateRels;

                var url = '/api/rule/page';
                var promise = baseService.http(url,param);
                promise.then(function(data){
                    var result = (data.records && data.records.length != 0) ? data.records : [];
                    $scope.options.rules = result;
                    if($scope.dim.idRuleFlowInfo){
                        initData($scope.dim.idRuleFlowInfo,$scope.dim.runFlag);
                    }else{
                        _.each($scope.options.rules,function(item){
                            var rule = _.find($scope.templateRels,{ruleId:item.ruleId});
                            if(rule){
                                item.isRequired = rule.isRequired;
                            }

                            item.resultName = $scope.getResultName(item.resultCode);
                            item.rowTokens = $scope.getRuleDesc(item.ruleNote);
                        });
                    }
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

        $scope.getRuleDesc = function(note,rule){
            console.log('getRuleDesc:',rule);
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

                    if(rule && rule.params && rule.params.length > 0){
                        var temp = _.find(rule.params,{paramCode:metaRule.metaDefineParams[metaRule.metaDefineParams.length - 1].metaRuleParamId});
                        if(temp){
                            row.param2 = temp.paramValue;
                            row.param2Path = temp.paramValue;
                        }
                    }

                    row.metaRuleId = metaRule.metaRuleId;
                    row.metaRuleName = metaRule.metaRuleName;
                    rowTokens.push(row);
                    index++;
                }
            }
            return rowTokens;
        }

        $scope.back = function(){
            window.location = baseService.systemConfig.webRoot + "/docc/ruleSetting/flowsetList.html";
        }
        
        $scope.saveFlow = function() {
            var rules = _.filter($scope.options.rules,function(item){
                return item.checked;
            });

            if(_.isEmpty(rules)){
                baseService.tips('请选择规则：', 'warning', $scope);
                return;
            }

            _.each(rules,function(item){
                buildSaveEdit(item);
            })

            $scope.dim.ruleSettings = rules;
            console.log('保存的数据：', $scope.dim);

            var url = $scope.dim.idRuleFlowInfo ? '/api/flow/update' : '/api/flow/add';
            var promise = baseService.http(url, $scope.dim);
            promise.then(function (data) {
                baseService.tips('保存流程成功', 'success', $scope);
            }, function (data) {
                baseService.tips('保存流程失败：' + data, 'danger', $scope);
            });
        };

        function buildSaveEdit(rule){
            buildEditorTokens(rule);
            buildWhenRule(rule);
        }

        function buildEditorTokens(rule){
            var editorTokens = [];
            _.each(rule.rowTokens, function(token){
                if(token.rel){
                    var rel = {};
                    rel.text = token.rel;
                    editorTokens.push(rel);
                }

                var param1 = {context:'bom',dataRef:{}};
                param1.dataRef.name = token.param1;
                param1.dataRef.path = token.param1Path;
                editorTokens.push(param1);

                var metaRule = _.find($scope.operators,{metaRuleId:token.metaRuleId});
                editorTokens.push({context:'operator',dataRef:metaRule});

                var param2 = {context:'bom',dataRef:{}};
                param2.text = token.param2;
                param2.dataRef.name = token.param2;
                param2.dataRef.path = token.param2Path;
                editorTokens.push(param2);
            });
            rule.editorTokens = editorTokens;
        }

        function buildWhenRule(rule){
            var index = 0;
            if(!_.isEmpty(rule.editorTokens)){
                var params = [];
                for(var i = 0; i < rule.editorTokens.length; i++){
                    var token = rule.editorTokens[i];
                    if(token.context != 'operator'){
                        continue;
                    }else{
                        var paramToken1 = rule.editorTokens[i - 1];
                        var paramToken2 = rule.editorTokens[i + 1];
                        var bomParam = {};
                        var metaRule = token.dataRef;
                        bomParam.paramCode = metaRule.metaDefineParams[0].metaRuleParamId;
                        bomParam.paramValue = paramToken1.dataRef.path;
                        bomParam.metaRuleId = metaRule.metaRuleId;
                        bomParam.metaRuleNo = index;
                        params.push(bomParam);

                        var ruleParam = {};
                        ruleParam.paramCode = metaRule.metaDefineParams[metaRule.metaDefineParams.length - 1].metaRuleParamId;
                        ruleParam.paramValue = paramToken2.dataRef ? paramToken2.dataRef.path : paramToken2.text;
                        ruleParam.metaRuleId = metaRule.metaRuleId;
                        ruleParam.metaRuleNo = index;
                        params.push(ruleParam);

                        index++;
                    }
                }

                rule.params = params;
            }
        }

        $scope.checkAll = function(checked){
            _.each($scope.options.rules,function(item){
                item.checked = checked;
            });
        }

        init($scope);
    });

    angular.bootstrap(document, ['flowApp']);
});