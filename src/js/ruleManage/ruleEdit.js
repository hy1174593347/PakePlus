define(function (require) {
    require('../common/base').init();
    require('../common/ruleEditorDirective');
    var md = angular.module('ruleEditApp', ['yxBase', 'ruleEditorDirective','angular-jsoneditor']);

    md.controller('ruleEditController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.ruleRepCatalogueId = baseService.getCache('ruleRepCatalogueId');
            scope.ctrl = { previewCollapsed: false ,whenCollapsed:true,thenCollapsed:false,elseCollapsed:false};
            scope.addDim = baseService.getCache('tempDim') || {};
            scope.ctrl.isEdit = scope.addDim.idRuleDefine ? true : false;
            scope.tempSave = {};
            scope.previewTokens = {};
            scope.options = {};
            scope.bomTree = [];
            scope.baseDatas = [];
            scope.operators = [];
            scope.editorTokens = baseService.getCache('editorTokens') || [];
            scope.preTokens = baseService.getCache('preTokens') || [];
            scope.thenTokens = baseService.getCache('thenTokens') || [];
            scope.elseTokens = baseService.getCache('elseTokens') || [];
            if(scope.preTokens && scope.preTokens.length > 0) {
                scope.ctrl.previewCollapsed = true;
            }
            if(scope.thenTokens && scope.thenTokens.length > 0) {
                scope.ctrl.thenCollapsed = true;
            }
            if(scope.elseTokens && scope.elseTokens.length > 0) {
                scope.ctrl.elseCollapsed = true;
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


            initBom();
            getOperatorsByType();
        }

        function initBom() {
            baseService.httpNoModal('/bom/primaries', null, 'get').then(function (data) {
                var result = data || [];
                $scope.bomTree = result;                 // ⭐ 原始树喂给指令做回退定位
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

        // 需求7：基础数据（选完判断符后取值用）
        $scope.queryBaseData = function (baseType) {
            return baseService.httpNoModal('/api/base-data/list?baseType=' + baseType, null, 'get');
        }

        // 需求6：按类名拉属性，作为 method 返回类型的下一层
        $scope.getPropertyByClass = function (property) {
            baseService.httpNoModal('/bom/getPropertyByClass?className=' + property, null, 'get').then(function (data) {
                var result = data || [];
                $scope.filterCommands(result, true);
            }, function (data) {
                baseService.tips('获取属性失败：' + data, 'danger', $scope);
            });
        }

        $scope.toBack = function(){
            baseService.setCache('ruleRepCatalogueId',null);
            baseService.setCache('preTokens',null);
            baseService.setCache('editorTokens',null);
            baseService.setCache('thenTokens',null);
            baseService.setCache('elseTokens',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/catalogue.html";
        }

        $scope.saveRule = function(ruleForm){
            if(!baseService.validForm(ruleForm)){
                return;
            }
            buildSaveEdit();

            var url = '/api/rule/add';
            if($scope.addDim.idRuleDefine){
                url = '/api/rule/update';
            }
            baseService.http(url, angular.copy($scope.addDim)).then(function (data) {
                baseService.tips('保存规则成功', 'success', $scope);
            }, function (data) {
                baseService.tips('保存规则失败：' + data, 'danger', $scope);
            });

        }

        function buildSaveEdit(){
            var ruleSpel = '';
            ruleSpel = buildWhenRule(ruleSpel,$scope.addDim);
            buildResultRule();

            $scope.addDim.ruleSpel = ruleSpel;
            $scope.addDim.ruleNote = {ruleId : $scope.addDim.ruleId,ruleNote : JSON.stringify($scope.editorTokens)};
            $scope.addDim.ruleRepCatalogueRelDTO = {ruleId : $scope.addDim.ruleId,ruleRepCatalogueId:$scope.ruleRepCatalogueId};
        }

        function buildResultRule(){
            var defineResults = [];
            if(!_.isEmpty($scope.thenTokens)){
                buildResultRuleDetail(defineResults,$scope.thenTokens,'1');
            }

            if(!_.isEmpty($scope.elseTokens)){
                buildResultRuleDetail(defineResults,$scope.elseTokens,'2');
            }
            $scope.addDim.defineResults = defineResults;
        }

        function isStringType(type) {
            return type === 'java.lang.String';
        }
        function isDateType(type) {
            return type === 'java.util.Date';
        }

        function buildResultRuleDetail(defineResults,tokens,type){
            var ruleResultSpel = '';
            var index = 0;
            var thenResult = {};
            var resultParams = [];
            var preOperatorIndex = 0;
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (!token.context && token.text !== '的') {
                    var tokenText = _.find($scope.customerTextDataRel, { key: token.text });
                    if (tokenText) {
                        ruleResultSpel += tokenText.value;
                    }

                    if (token.text === ';') {
                        index++;
                    }
                }

                if (token.context != 'operator') {
                    continue;
                } else {
                    var paramToken1 = buildParamToken(tokens,preOperatorIndex,i-1);
                    var paramToken2 = buildParamToken(tokens,i+1);

                    var metaRule = token.dataRef;
                    var bomParam = {};
                    bomParam.paramCode = metaRule.metaDefineParams[0].metaRuleParamId;
                    bomParam.paramValue = paramToken1.dataRef.path;
                    bomParam.metaRuleId = metaRule.metaRuleId;
                    bomParam.metaRuleNo = index;
                    resultParams.push(bomParam);

                    var resultParam = {};
                    resultParam.paramCode = metaRule.metaDefineParams[metaRule.metaDefineParams.length - 1].metaRuleParamId;
                    if(paramToken2.dataRef){
                        resultParam.paramValue = paramToken2.dataRef.path;
                    }else{
                        resultParam.paramValue = paramToken2.text;
                        if(isStringType(paramToken1.dataRef.propertyType) || isDateType(paramToken1.dataRef.propertyType)){
                            resultParam.paramValue = '"' + resultParam.paramValue + '"';
                        }
                    }
                    resultParam.metaRuleId = metaRule.metaRuleId;
                    resultParam.metaRuleNo = index;
                    resultParams.push(resultParam);

                    ruleResultSpel += bomParam.paramValue;
                    ruleResultSpel += metaRule.metaRuleId;
                    ruleResultSpel += resultParam.paramValue;
                    preOperatorIndex = i;
                }
            }
            thenResult.ruleResultNote = JSON.stringify(tokens);
            thenResult.ruleResultSpel = ruleResultSpel;
            thenResult.ruleResultType = type;
            thenResult.paramList = resultParams;
            defineResults.push(thenResult);
        }

        function buildWhenRule(ruleSpel,dim){
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

                dim.defineParams = defineParams;
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
            $scope.thenTokens = [];
            $scope.elseTokens = [];
            $scope.tempSave = {};
        };

        $scope.previewSave = function(){
            $scope.previewTokens = {preTokens : $scope.preTokens,editorTokens:$scope.editorTokens,thenTokens:$scope.thenTokens,elseTokens:$scope.elseTokens};
            $scope.tempSave = angular.copy($scope.addDim);
            var ruleSpel = '';
            ruleSpel = buildWhenRule(ruleSpel,$scope.tempSave);
            buildPreResultRule();

            $scope.tempSave.ruleSpel = ruleSpel;
            $scope.tempSave.ruleNote = {ruleId : $scope.addDim.ruleId,ruleNote : JSON.stringify($scope.editorTokens)};
            $scope.tempSave.ruleRepCatalogueRelDTO = {ruleId : $scope.addDim.ruleId,ruleRepCatalogueId:$scope.ruleRepCatalogueId};
        }

        function buildPreResultRule(){
            var defineResults = [];
            if(!_.isEmpty($scope.thenTokens)){
                buildResultRuleDetail(defineResults,$scope.thenTokens,'1');
            }

            if(!_.isEmpty($scope.elseTokens)){
                buildResultRuleDetail(defineResults,$scope.elseTokens,'2');
            }
            $scope.tempSave.defineResults = defineResults;
        }

        init($scope);
    });

    angular.bootstrap(document, ['ruleEditApp']);
});