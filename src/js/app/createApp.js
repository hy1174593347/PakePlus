define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('application',['yxBase','yxDirective']);
    md.controller('appController',function($scope,baseService){

        function init(scope){
            scope.ctrl = {addRepository:'true'};
            scope.addDim = {remark:'初始版本。',resultDefines:[{resultCode:"1",resultName:"通过",resultOrder:"1"}]};
            scope.options = {appTypeList:[{name:'规则流',path:'01'},{name:'流程集配置',path:'02'}]};

            initBaseData();
        }

        function initBaseData(){
            var url = "/bom/getAllBom";
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.bomList = result;
            },function(data){
				baseService.tips('获取模型失败：'+data,'danger',$scope);
			});
        }

        $scope.changeBom = function(bomBaseInfoId){
            var list = _.filter($scope.options.bomList,{bomBaseInfoId:bomBaseInfoId});
            if(bomBaseInfoId){
                var bom = list[0];
                $scope.addDim.bomBaseInfoId = bomBaseInfoId;
                $scope.queryRepository(bomBaseInfoId);
                $scope.queryDim(bom.mainBomClass);
            }
        }

        $scope.queryRepository = function(bomBaseInfoId){
            var url = "/app/getRepository?bomBaseInfoId="+bomBaseInfoId;
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.repositoryList = result;
            },function(data){
				baseService.tips('获取规则库信息失败：'+data,'danger',$scope);
			});
        }

        $scope.changeRepository = function(name){
            var list = _.filter($scope.options.repositoryList,{name:name});
            if(!_.isEmpty(list)){
                var bom = list[0];
                $scope.addDim.decisionRepositoryId = bom.decisionRepositoryId;
            }
        }

        $scope.clearRepository = function(){
            $scope.addDim.decisionRepositoryId = null;
            $scope.addDim.decisionRepositoryName = null;
        }

        $scope.queryDim = function(mainBomClass){
            var url = "/bom/getDimByClass?className="+mainBomClass;
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.dimList = result;
            },function(data){
				baseService.tips('获取维度信息失败：'+data,'danger',$scope);
			});
        }

        $scope.addResultRow = function(){
            $scope.addDim.resultDefines.push({resultCode:$scope.addDim.resultDefines.length + 2,resultName:"",resultOrder:$scope.addDim.resultDefines.length + 2});
        }

        $scope.removeResultRow = function(index){
            $scope.addDim.resultDefines.splice(index,1);
        }

        $scope.saveAppData = function(appForm){
            if(!baseService.validForm(appForm)){
                return;
            }

            var dims = _.filter($scope.options.dimList,function(item){
                return $scope.addDim.path.includes(item.path);
            });

            if(_.isEmpty(dims)){
                baseService.tips('请选择维度','danger',$scope);
            }

            if(_.isEmpty($scope.addDim.decisionRepositoryId) && _.isEmpty($scope.addDim.decisionRepositoryName)){
                baseService.tips('请选规则库','danger',$scope);
            }

            $scope.addDim.dimDefines = [];
            _.each(dims,function(item){
                var obj = {};
                obj.dimName = item.name;
                obj.baseType = item.baseType;
                obj.dimFieldPath = item.path;
                $scope.addDim.dimDefines.push(obj);
            })

            _.each($scope.addDim.resultDefines,function(item,i){
                item.resultCode = (i + 1);
                item.resultOrder = (i + 1);
            });

            var url = "/app/createApp";
            var promise = baseService.http(url,angular.copy($scope.addDim));
            promise.then(function(data){
                baseService.tips('保存成功','success',$scope);
            },function(data){
				baseService.tips('保存失败，请联系开发：'+data,'danger',$scope);
			});
        }

        $scope.cleanData = function(obj){
            $scope.addDim = {remark:'初始版本。'};
        }

        init($scope);
    });
    angular.bootstrap(document,['application']);
});
