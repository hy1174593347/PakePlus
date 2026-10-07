define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('bomApp',['yxBase','yxDirective']);
    md.controller('bomController',function($scope,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.addDim = {};
            scope.options = {};

            initBaseData();
        }

        function initBaseData(){
            var url = "/bom/primariesList";
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.bomList = result;
            },function(data){
				baseService.tips('获取模型失败：'+data,'danger',$scope);
			});
        }

        $scope.changeType = function(propertyType){
            var list = _.filter($scope.options.bomList,{propertyType:propertyType});
            if(!_.isEmpty(list)){
                var bom = list[0];
                $scope.addDim.bomName = bom.name;
                $scope.addDim.remark = bom.name;
                $scope.addDim.mainBomClass = bom.propertyType;
            }
        }

        $scope.saveBomData = function(baseForm){
            if(!baseService.validForm(baseForm)){
                return;
            }

            var url = "/bom/createBom";
            var promise = baseService.http(url,angular.copy($scope.addDim));
            promise.then(function(data){
                baseService.tips('保存成功','success',$scope);
            },function(data){
				baseService.tips('保存失败，请联系开发：'+data,'danger',$scope);
			});
        }

        $scope.cleanData = function(obj){
            scope.addDim = {remark:'初始版本，包含基础分类功能。',name:''};
        }

        init($scope);
    });
    angular.bootstrap(document,['bomApp']);
});
