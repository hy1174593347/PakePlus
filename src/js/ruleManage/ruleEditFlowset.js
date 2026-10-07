define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');

    var md = angular.module('ruleEditFlowsetApp',['yxBase','yxDirective']);
    md.controller('ruleEditFlowsetController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ruleRepCatalogueId = baseService.getCache('ruleRepCatalogueId');
            scope.addDim = baseService.getCache('tempDim') || {};
            scope.editorTokens = baseService.getCache('editorTokens') || [];
            scope.resultDefines = baseService.getCache('resultDefines') || [];
            scope.ctrl = {};
            scope.dim = {selectedCatalogue:{}};
            scope.options = {};
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
                {key:'为',value:'='}
            ];
            scope.relList = [{key:'并且',value:'&&'},{key:'或者',value:'||'}];

            initBom();
            getOperatorsByType();
            buildRowTokens();
        }

        function initBom() {
            baseService.httpNoModal('/bom/primaries', null, 'get').then(function (data) {
                var result = data || [];
                $scope.bomTree = result;
            }, function (data) {
                baseService.tips('获取bom失败：' + data, 'danger', $scope);
            });
        }

        function getOperatorsByType (propertyType) {
            baseService.http('/api/metaRule/list', null, 'get').then(function (data) {
                $scope.operators = data || [];
            }, function (data) {
                baseService.tips('获取元规则失败：' + data, 'danger', $scope);
            });
        }

        function buildRowTokens () {
            $scope.rowTokens = [];
            if($scope.editorTokens && $scope.editorTokens.length > 0){
                $scope.rowTokens = buildEditRowTokens($scope.editorTokens);
            }else{
                $scope.rowTokens.push({id: 'row_' + Date.now()});
            }
        }

        function buildEditRowTokens (editorTokens) {
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

        $scope.toBack = function(){
            baseService.setCache('ruleRepCatalogueId',null);
            baseService.setCache('editorTokens',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/catalogueFlowset.html";
        }

        $scope.saveRule = function(form){
            if(!baseService.validForm(form)){
                return;
            }

            buildSaveEdit();

            var url = '/api/rule/add';
            if($scope.addDim.idRuleDefine){
                url = '/api/rule/update';
            }

            var promise = baseService.http(url,angular.copy($scope.addDim));
            promise.then(function(data){
                baseService.tips('新增规则成功','success',$scope);
                $scope.changeApp($scope.addDim.ruleRepositoryId);
                baseService.modal('hide','appCatalogueModal');
            },function(data){
				baseService.tips('新增规则失败，请联系开发'+data,'danger',$scope);
			});
        }

        function buildSaveEdit(){
            buildEditorTokens();
            var ruleSpel = '';
            ruleSpel = buildWhenRule(ruleSpel,$scope.addDim);

            $scope.addDim.ruleSpel = ruleSpel;
            $scope.addDim.ruleNote = {ruleId : $scope.addDim.ruleId,ruleNote : JSON.stringify($scope.editorTokens)};
            $scope.addDim.ruleRepCatalogueRelDTO = {ruleId : $scope.addDim.ruleId,ruleRepCatalogueId:$scope.ruleRepCatalogueId};
        }

        function buildEditorTokens(){
            var editorTokens = [];
            _.each($scope.rowTokens, function(token){
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
            $scope.editorTokens = editorTokens;
        }

        function buildWhenRule(ruleSpel,dim){
            var metaSpel = 'list[?]';
            var index = 0;
            if(!_.isEmpty($scope.editorTokens)){
                var defineParams = [];
                for(var i = 0; i < $scope.editorTokens.length; i++){
                    var token = $scope.editorTokens[i];
                    if(!token.context){
                        var tokenText = _.find($scope.customerTextDataRel,{key:token.text});
                        if(tokenText){
                            ruleSpel += tokenText.value;
                        }
                    }
                    if(token.context != 'operator'){
                        continue;
                    }else{
                        var paramToken1 = $scope.editorTokens[i - 1];
                        var paramToken2 = $scope.editorTokens[i + 1];
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
                        index++;
                    }
                }

                dim.defineParams = defineParams;
            }
            return ruleSpel;
        }

        $scope.addCondition = function(index){
            $scope.rowTokens.splice(index + 1,0,{id: 'row_' + Date.now(),rel:'并且'});
        }

        $scope.delCondition = function(index){
            $scope.rowTokens.splice(index,1);
        }

        init($scope);
    });
    angular.bootstrap(document,['ruleEditFlowsetApp']);
});
