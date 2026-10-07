define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('bomApp',['yxBase','yxDirective']);
    md.controller('bomController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = {};
            scope.addDim = {};
            scope.options = {props:['baseCode','baseName','baseDesc','baseType']};

            initBomData();
        }

        function initBomData(){
            var url = "/bom/getAllBom";
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.bomList = result;
            },function(data){
				baseService.tips('获取BOM列表失败：'+data,'danger',$scope);
			});
        }

        $scope.saveAppData = function(baseForm){
            if(!baseService.validForm(baseForm)){
                return;
            }

            var url = "/api/base-data/save";
            var promise = baseService.http(url,angular.copy($scope.addDim));
            promise.then(function(data){
                baseService.tips('保存成功','success',$scope);
                $scope.dim.baseType = $scope.addDim.baseType;
                $scope.changeType($scope.dim.baseType,$scope.dim);
                baseService.modal('hide','baseAddModal');
            },function(data){
				baseService.tips('保存失败，请联系开发'+data,'danger',$scope);
			});
        }

        init($scope);
    });
    angular.bootstrap(document,['bomApp']);
});
