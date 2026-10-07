define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('cacheApp',['yxBase','yxDirective','angular-jsoneditor']);
    md.controller('cacheController',function($scope,$timeout,baseService){

        function init(scope){
            scope.ctrl = {};
            scope.dim = {};
            scope.addDim = {};
            scope.options = {};
            scope.ctrl.editorOptions = {
                mode: 'tree',
                modes: ['tree', 'code', 'text'],
                onChange: function () {
                }
            };

            initCacheData();
        }

        function initCacheData(){
            var url = "/api/cache/getAllCachePrefix";
            var promise = baseService.http(url,null,'get');
            promise.then(function(data){
                $scope.options.caches = data || [];
            },function(data){
				baseService.tips('获取缓存类型失败：'+data,'danger',$scope);
			});
        }

        $scope.changeType = function(){
            $scope.dim.key = null;
            var url = "/api/cache/getAllCacheKey";
            var promise = baseService.http(url,{prefix:$scope.dim.prefix});
            promise.then(function(data){
                var result = data || [];
                $scope.options.keys = result;
            },function(data){
                baseService.tips('获取缓存key失败：'+data,'danger',$scope);
            });
        }

        $scope.queryCache = function(){
            var url = "/api/cache/getCacheData";
            var promise = baseService.http(url,{key:$scope.dim.key});
            promise.then(function(data){
                try {
                    $scope.options.cacheData = JSON.parse(data);
                } catch(err){
                    $scope.options.cacheData = data;
                }
            },function(data){
				baseService.tips('获取缓存失败：'+data,'danger',$scope);
			});
        }

        $scope.refreshCache = function(){
            var url = "/api/cache/refreshCache";
            var promise = baseService.http(url,{prefix:$scope.dim.prefix});
            promise.then(function(data){
                $scope.changeType();
                baseService.tips('刷新缓存成功：','success',$scope);
            },function(data){
                baseService.tips('刷新缓存失败：'+data,'danger',$scope);
            });
        }

        $scope.checkCache = function(){
            var url = "/api/cache/checkCache";
            var promise = baseService.http(url,{prefix:$scope.dim.prefix});
            promise.then(function(data){
                $scope.changeType();
                baseService.tips('检查并刷新缓存成功：','success',$scope);
            },function(data){
                baseService.tips('检查并刷新缓存失败：'+data,'danger',$scope);
            });
        }

        init($scope);
    });
    angular.bootstrap(document,['cacheApp']);
});
