define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('baseApp',['yxBase','yxDirective']);
    md.controller('baseController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = {};
            scope.addDim = {};
            scope.options = {props:['baseCode','baseName','baseDesc','baseType']};

            initBaseData();
        }

        function initBaseData(){
            var url = "/api/base-type/list";
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.baseTypes = result;
                $scope.options.addBaseTypes = angular.copy(result);
            },function(data){
				baseService.tips('获取基础数据类型失败：'+data,'danger',$scope);
			});
        }

        $scope.changeType = function(baseType){
            var url = "/api/base-data/list?baseType="+baseType;
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.baseDatas = result;
            },function(data){
				baseService.tips('获取基础数据失败：'+data,'danger',$scope);
			});
        }

        $scope.checkAdd = function(baseType,obj){
            var temp = _.findWhere($scope.options.addBaseTypes,{baseType:baseType});
            obj.remark = temp.remark;
        }

        $scope.saveBaseData = function(baseForm){
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

        $scope.cleanData = function(obj){
            _.each($scope.options.props,function(prop){
                obj[prop] = null;
            });
        }

        $scope.showAdd = function(type,name){
            baseService.modal(type,name);
        }

        $scope.delete = function(){
            var list = _.chain($scope.options.baseDatas).filter({ checked: true }).pluck('baseDataId').value();
            if(_.isEmpty(list)){
                baseService.tips('请选择要删除的数据','danger',$scope);
                return;
            }

            var url = "/api/base-data/deletes";
            var promise = baseService.http(url,list);
            promise.then(function(data){
                baseService.tips('删除成功','success',$scope);
                $scope.changeType($scope.dim.baseType,$scope.dim);
            },function(data){
				baseService.tips('删除失败，请联系开发'+data,'danger',$scope);
			});
        }

        $scope.checkAll = function(checkAll){
            _.each($scope.options.baseDatas,function(item){
                item.checked = checkAll;
            });
        }

        init($scope);
    });
    angular.bootstrap(document,['baseApp']);
});
