define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('appInfoApp',['yxBase','yxDirective']);
    md.controller('appController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = {};
            scope.addDim = {};
            scope.options = {props:['baseCode','baseName','baseDesc','baseType'],appTypeList:[{name:'规则流',path:'01'},{name:'流程集配置',path:'02'}]};

            initAppData();
        }

        function initAppData(){
            var url = "/app/queryApps";
            var promise = baseService.http(url,{pageNum:1,pageSize:20});
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.apps = result;
            },function(data){
				baseService.tips('获取应用列表失败：'+data,'danger',$scope);
			});
        }

        $scope.checkAdd = function(baseType,obj){
            var temp = _.findWhere($scope.options.baseTypes,{baseType:baseType});
            obj.remark = temp.remark;
        }

        $scope.saveAppData = function(baseForm){
            if(!baseService.validForm(baseForm)){
                return;
            }

            var url = "/app/updateApp";
            var promise = baseService.http(url,angular.copy($scope.addDim));
            promise.then(function(data){
                baseService.tips('保存成功','success',$scope);
                baseService.modal('hide','appUpdateModal');
            },function(data){
				baseService.tips('保存失败，请联系开发'+data,'danger',$scope);
			});
        }

        $scope.showUpdate = function(type,name,app){
            baseService.modal(type,name);
            $scope.queryBom(app.bomBaseInfoId);
            $scope.addDim = angular.copy(app);
            $scope.addDim.path = [];
            _.each(app.dimDefines,function(item){
                $scope.addDim.path.push(item.dimFieldPath);
            });
        }

        $scope.queryBom = function(bomBaseInfoId){
            var url = "/bom/getBom";
            var promise = baseService.httpNoModal(url,{bomBaseInfoId:bomBaseInfoId});
            promise.then(function(data){
                var result = data;
                if(null != result && null != result.mainBomClass){
                    $scope.queryDim(result.mainBomClass);
                }
                $scope.addDim.bomName = result.bomName;
            },function(data){
				baseService.tips('获取BOM信息失败：'+data,'danger',$scope);
			});
        }

        $scope.queryDim = function(mainBomClass){
            var url = "/bom/getDimByClass?className="+mainBomClass;
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.dimList = result;
                _.each($scope.options.dimList,function(item){
                    return 
                });
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

        init($scope);
    });
    angular.bootstrap(document,['appInfoApp']);
});
