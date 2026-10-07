define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');

    var md = angular.module('catalogueFlowsetApp',['yxBase','yxDirective']);
    md.controller('catalogueFlowsetController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = baseService.getCache('dim') || {selectedCatalogue:{}};
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
            $scope.addDim.ruleRepositoryId = selectedApp.ruleRepositoryId;
            var url = "/api/catalogue/list?ruleRepositoryId="+selectedApp.ruleRepositoryId;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = (data && data.length != 0) ? data : [];
                $scope.options.treeData = angular.copy(result);
                if($scope.dim.ruleRepCatalogueId){
                    $scope.changeType($scope.dim.ruleRepCatalogueId);
                }
            },function(data){
				baseService.tips('获取规则分类失败：'+data,'danger',$scope);
			});
        }

        $scope.changeType = function(ruleRepCatalogueId){
            var catalogue = _.find($scope.options.treeData, {ruleRepCatalogueId:ruleRepCatalogueId});
            if(catalogue && catalogue.catalogueRels && catalogue.catalogueRels.length > 0){
                var param = {ruleIdList:[]};
                _.each(catalogue.catalogueRels,function(item){
                    param.ruleIdList.push(item.ruleId);
                })

                var url = '/api/rule/page';
                var promise = baseService.http(url,param);
                promise.then(function(data){
                    var result = (data.records && data.records.length != 0) ? data.records : [];
                    $scope.options.rules = angular.copy(result);
                    _.each($scope.options.rules,function(item){
                        item.resultName = $scope.getResultName(item.resultCode);
                        item.rowTokens = $scope.getRuleDesc(item.ruleNote);
                    })
                },function(data){
                    baseService.tips('获取规则失败：'+data,'danger',$scope);
                });
            }

            $scope.dim.selectedCatalogue = catalogue;
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
                baseService.tips('新增规则分类成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
                baseService.modal('hide','appCatalogueModal');
            },function(data){
				baseService.tips('新增规则分类失败，请联系开发'+data,'danger',$scope);
			});

            $scope.dim.selectedCatalogue = null;
        }

        $scope.delCatalogue = function(){
            if(!$scope.dim.selectedCatalogue || !$scope.dim.selectedCatalogue.ruleRepCatalogueId){
                baseService.tips('请选择要删除的规则分类','warning',$scope);
                return;
            }

            var url = "/api/catalogue/delete?id="+$scope.dim.selectedCatalogue.ruleRepCatalogueId;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                baseService.tips('删除规则分类成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
            },function(data){
				baseService.tips('删除规则分类失败，请联系开发'+data,'danger',$scope);
			});

            $scope.dim.selectedCatalogue = null;
        }

        $scope.delRules = function(){
            var ruleList = _.filter($scope.options.rules,{checked:true});
            if(_.isEmpty(ruleList)){
                baseService.tips('请选择要删除的规则','warning',$scope);
                return;
            }

            var url = "/api/catalogue/deleteChild";
            var promise = baseService.http(url,ruleList);
            promise.then(function(data){
                baseService.tips('删除规则成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
            },function(data){
                baseService.tips('删除规则失败，请联系开发'+data,'danger',$scope);
            });
        }

        $scope.addRule = function(){
            if(!$scope.dim.selectedCatalogue || !$scope.dim.selectedCatalogue.ruleRepCatalogueId){
                baseService.tips('请选择规则分类','danger',$scope);
                return;
            }

            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('resultDefines',$scope.dim.selectedResultDefines);
            baseService.setCache('editorTokens',null);
            baseService.setCache('tempDim',null);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/ruleEditFlowset.html";
        }

        $scope.delRule = function(rule){
            var ruleList = [rule];

            var url = "/api/catalogue/deleteChild";
            var promise = baseService.http(url,ruleList);
            promise.then(function(data){
                baseService.tips('删除规则成功','success',$scope);
                $scope.changeApp($scope.dim.idRuleApplication);
            },function(data){
                baseService.tips('删除规则失败，请联系开发'+data,'danger',$scope);
            });
        }


        $scope.editRule = function(rule){
            $scope.tempDim = rule;
            baseService.setCache('dim',$scope.dim);
            baseService.setCache('ruleRepCatalogueId',$scope.dim.selectedCatalogue.ruleRepCatalogueId);
            baseService.setCache('resultDefines',$scope.dim.selectedResultDefines);
            baseService.setCache('editorTokens',JSON.parse(rule.ruleNote.ruleNote));
            baseService.setCache('tempDim',$scope.tempDim);
            window.location = baseService.systemConfig.webRoot + "/docc/ruleManage/ruleEditFlowset.html";
        }

        init($scope);
    });
    angular.bootstrap(document,['catalogueFlowsetApp']);
});
