define(function (require) {
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('testApp', ['yxBase', 'yxDirective','angular-jsoneditor']);

    md.controller('testController', function ($scope,$timeout, baseService) {

        function init(scope) {
            scope.dim = {};
            scope.ctrl = {};
            scope.options = {};
            scope.ctrl.editorOptions = {
                mode: 'tree',
                modes: ['tree', 'code', 'text'], 
                onChange: function () {
                }
            };

            initAppData();
        }

        function initAppData(){
            var url = "/app/queryApps";
            var promise = baseService.http(url,{pageNum:1,pageSize:1000});
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.apps = result;
            },function(data){
				baseService.tips('获取应用列表失败：'+data,'danger',$scope);
			});
        }

        $scope.changeApp = function(id){
            var app = _.find($scope.options.apps,{idRuleApplication:id});
            var url = "/bom/getJson?bomBaseInfoId="+app.bomBaseInfoId;
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                $scope.options.bomJson = JSON.parse(data);
            },function(data){
				baseService.tips('获取BOM信息失败：'+data,'danger',$scope);
			});
        }

        $scope.executeRule = function(id){
            var url = "/app/executeForHTML?appId="+id+"&type=1";
            var promise = baseService.httpNoModal(url,$scope.options.bomJson);
            promise.then(function(data){
                $scope.options.bomResult = data.bom;
                $scope.options.ruleResult = data.ruleResult;
            },function(data){
				baseService.tips('执行规则失败：'+data,'danger',$scope);
			});
        }

        init($scope);
    });

    angular.bootstrap(document, ['testApp']);
});